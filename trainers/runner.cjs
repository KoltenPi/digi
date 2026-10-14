'use strict';
const fs=require('node:fs/promises'),syncfs=require('node:fs'),path=require('node:path'),http=require('node:http'),crypto=require('node:crypto');
const {chromium}=require('playwright');
const {roster,choose,pickTrade}=require('./policy.cjs');
const {inspect,record,runnerFlag}=require('./findings.cjs');
const root=path.resolve(__dirname,'..');
const data=path.resolve(process.env.TRAINER_DATA_DIR||path.join(__dirname,'data'));
const count=Math.max(1,Math.min(14,Number(process.env.TRAINER_COUNT)||14));
const cadence=Math.max(30000,(Number(process.env.TRAINER_INTERVAL_SECONDS)||90)*1000);
const cycles=Number(process.env.TRAINER_CYCLES)||Infinity;
const port=Number(process.env.TRAINER_PORT)||4178;
const wait=ms=>new Promise(r=>setTimeout(r,ms));
let stopping=false,browser,server,lockOwned=false;const sessions=new Map(),status={startedAt:new Date().toISOString(),trainers:{}};
async function atomic(file,obj){const temp=file+'.tmp';await fs.writeFile(temp,JSON.stringify(obj),{mode:0o600});await fs.rename(temp,file);}
async function checkpoint(session){
  // Includes Firebase IndexedDB authentication. Never publish this state or put it in a public artifact.
  const state=await session.context.storageState({indexedDB:true});
  await atomic(path.join(data,session.bot.id+'.json'),state);
}
async function findings(session,before,after,action,error=false){
  const saved=await session.page.evaluate(()=>({records:G.aiTrainer.findings||[],history:G.aiTrainer.findingHistory||{}}));
  const flags=error?[runnerFlag()]:inspect(before,after,action,saved.history);
  saved.records=record(saved.records,flags);
  await session.page.evaluate(saved=>{G.aiTrainer.findings=saved.records;G.aiTrainer.findingHistory=saved.history;saveGame();},saved);
  // A readable report without browser state, account IDs, or credentials.
  await atomic(path.join(data,session.bot.id+'-findings.json'),{trainer:session.bot.name,findings:saved.records});
}
async function launch(bot){
  const file=path.join(data,bot.id+'.json');
  const context=await browser.newContext({storageState:syncfs.existsSync(file)?file:undefined,viewport:{width:800,height:1000},timezoneId:'America/New_York'});
  await context.route('**/*',async route=>{
    const req=route.request();
    if(['image','font','media'].includes(req.resourceType()))return route.abort();
    if(req.method()==='GET'&&req.url().startsWith('https://digi-api.com/api/v1/')){
      const file=path.join(data,'api',crypto.createHash('sha256').update(req.url()).digest('hex')+'.json');
      try{
        const stat=await fs.stat(file).catch(()=>null);
        if(stat&&Date.now()-stat.mtimeMs<7*864e5)return route.fulfill({status:200,contentType:'application/json',body:await fs.readFile(file,'utf8')});
        const response=await route.fetch({timeout:45000});
        if(response.status()===200){const body=await response.text();await fs.writeFile(file,body);return route.fulfill({response,body});}
        return route.fulfill({response});
      }catch{return route.abort();}
    }
    return route.continue();
  });
  try{
    const page=await context.newPage();
    await page.goto(`http://127.0.0.1:${port}/`,{waitUntil:'domcontentloaded',timeout:60000});
    await page.waitForFunction(()=>typeof state!=='undefined'&&state.ready&&state.stageIds?.[0]?.length,{},{timeout:180000});
    await page.addScriptTag({path:path.join(__dirname,'browser-agent.js')});
    await page.evaluate(bot=>DigiTrainer.init(bot),bot);
    const session={bot,context,page};await checkpoint(session);sessions.set(bot.id,session);return session;
  }catch(e){
    // Preserve any identity created before an initialization failure.
    try{await atomic(file,await context.storageState({indexedDB:true}));}catch{}
    await context.close();throw e;
  }
}
async function step(bot){
  let session=sessions.get(bot.id);let timer;
  try{
    if(!session)session=await launch(bot);
    const {page}=session;
    const execute=async()=>{
      const observation=await page.evaluate(()=>DigiTrainer.snapshot());
      const action=choose(observation,bot);
      status.trainers[bot.id]={...status.trainers[bot.id],name:bot.name,state:'working',action:action.type,updatedAt:new Date().toISOString()};
      // Persist a pre-action recovery point. Trade intent is additionally checkpointed before its network write.
      await checkpoint(session);
      if(action.type==='settle')await page.evaluate(()=>DigiTrainer.settle());
      else if(action.type==='market'){
        const market=await page.evaluate(()=>DigiTrainer.market());
        const offer=pickTrade(market.offers,market.snapshot,bot);
        const prepared=await page.evaluate(({offer,hasOpen,bot})=>DigiTrainer.prepareTrade(offer,hasOpen,bot),{offer,hasOpen:market.hasOpen,bot});
        await checkpoint(session);
        if(prepared)await page.evaluate(()=>DigiTrainer.settle());
      }else await page.evaluate(({action,bot})=>DigiTrainer.run(action,bot),{action,bot});
      await findings(session,observation,await page.evaluate(()=>DigiTrainer.snapshot()),action);
      await checkpoint(session);
      const result=await page.evaluate(()=>DigiTrainer.publish());
      await checkpoint(session);
      status.trainers[bot.id]={...result,state:'running',updatedAt:new Date().toISOString()};
      console.log(JSON.stringify({trainer:bot.name,action:action.type,...result}));
    };
    await Promise.race([execute(),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Trainer action timeout')),240000);})]);
  }catch(e){
    const message=String(e.message).replace(/AIza[\w-]+/g,'[redacted]').slice(0,240);
    status.trainers[bot.id]={name:bot.name,state:'error',error:message,updatedAt:new Date().toISOString()};
    console.error(JSON.stringify({trainer:bot.name,error:message}));
    if(session){try{await findings(session,null,null,null,true);await checkpoint(session);}catch{}await session.context.close().catch(()=>{});sessions.delete(bot.id);}
    // No newly minted replacement account after failure: the saved identity is reused on retry.
  }finally{clearTimeout(timer);}
}
async function main(){
  await fs.mkdir(path.join(data,'api'),{recursive:true});
  const lock=path.join(data,'runner.lock');
  try{await fs.writeFile(lock,String(process.pid),{flag:'wx',mode:0o600});lockOwned=true;}
  catch(e){if(e.code!=='EEXIST')throw e;const pid=Number(await fs.readFile(lock,'utf8'));let alive=true;try{process.kill(pid,0);}catch{alive=false;}if(alive)throw Error('A trainer runner is already active.');await fs.unlink(lock);await fs.writeFile(lock,String(process.pid),{flag:'wx'});lockOwned=true;}
  await fs.rm(path.join(data,'stop'),{force:true});
  server=http.createServer(async(req,res)=>{
    const routes={'/':'index.html','/index.html':'index.html','/wiki_evo.js':'wiki_evo.js','/ai-trainers.js':'ai-trainers.js'};
    const file=routes[new URL(req.url,'http://localhost').pathname];if(!file){res.writeHead(404);return res.end();}
    res.setHeader('Content-Type',file.endsWith('.js')?'application/javascript':'text/html');res.end(await fs.readFile(path.join(root,file)));
  });
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,'127.0.0.1',resolve);});
  browser=await chromium.launch({headless:true,args:['--disable-background-timer-throttling','--disable-renderer-backgrounding','--disable-backgrounding-occluded-windows']});
  const bots=roster.slice(0,count);
  for(let cycle=0;cycle<cycles&&!stopping;cycle++){
    const started=Date.now();let next=0;
    await Promise.all([0,1].map(async()=>{while(next<bots.length&&!stopping){const bot=bots[next++];await step(bot);if(syncfs.existsSync(path.join(data,'stop')))stopping=true;}}));
    await atomic(path.join(data,'status.json'),status);
    if(cycle+1>=cycles)break;
    while(!stopping&&Date.now()-started<cadence){await wait(1000);if(syncfs.existsSync(path.join(data,'stop')))stopping=true;}
  }
}
process.on('SIGINT',()=>{stopping=true;});process.on('SIGTERM',()=>{stopping=true;});
main().catch(e=>{console.error(e.message);process.exitCode=1;}).finally(async()=>{
  for(const session of sessions.values())try{await checkpoint(session);}catch{}
  if(browser)await browser.close();if(server)server.close();
  if(lockOwned)await fs.rm(path.join(data,'runner.lock'),{force:true});
});
