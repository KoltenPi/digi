const {chromium,devices}=require('playwright'),http=require('node:http'),fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict');
(async()=>{
 const root=path.resolve(__dirname,'..');
 const server=http.createServer(async(req,res)=>{const name=new URL(req.url,'http://localhost').pathname;const files={'/':'index.html','/social.js':'social.js','/ai-trainers.js':'ai-trainers.js','/wiki_evo.js':'wiki_evo.js'};if(!files[name]){res.writeHead(404);return res.end();}res.setHeader('Content-Type',name.endsWith('.js')?'application/javascript':'text/html');res.end(await fs.readFile(path.join(root,files[name])));});
 await new Promise(r=>server.listen(4190,'127.0.0.1',r));const browser=await chromium.launch();
 try{
  const page=await browser.newPage({...devices['iPhone 13']});await page.goto('http://127.0.0.1:4190/');
  await page.waitForFunction(()=>typeof viewTradeRequests==='function');
  await page.evaluate(async()=>{
   state.all=[{id:1,name:'Agumon'},{id:2,name:'Gabumon'}];G.box=[{id:1,name:'Agumon',stage:2,level:5,image:''},{id:1,name:'Favorite',fav:true,stage:2,level:5,image:''}];G.data=500;onl().name='Tester';
   window.sent=[];window.synced=[];
   net=async()=>({uid:'me',db:{},F:{collection:()=>{},where:()=>{},limit:()=>{},query:()=>{},getDocs:async()=>({docs:[{id:'other',data:()=>({name:'Rival <img>',tradeRequest:{id:'r',active:true,monId:1,monName:'Agumon',price:50,expiresAt:Date.now()+100000}})}]}),addDoc:async(c,data)=>sent.push(data),serverTimestamp:()=>1}});
   netSync=async()=>synced.push(tradeRequestProfile());onlineView=()=>{};
   document.querySelectorAll('main>section').forEach(x=>x.hidden=true);const el=document.querySelector('#worldView');el.hidden=false;await viewTradeRequests(el);
  });
  await page.locator('#requestPrice').fill('70');await page.locator('#requestPost').click();
  assert.equal(await page.evaluate(()=>synced.at(-1).price),70);
  await page.locator('[data-request-offer]').click();assert.equal(await page.locator('[data-tpick]').count(),1);
  await page.locator('[data-tpick]').click();await page.locator('#tPrice').fill('999');await page.locator('#tSend').click();
  assert.equal(await page.evaluate(()=>sent[0].price),50);assert.equal(await page.evaluate(()=>G.box.length),1);
  assert.equal(await page.evaluate(()=>onl().tradeRequest.active),true);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.locator('#requestCancel').click();assert.equal(await page.evaluate(()=>synced.at(-1).active),false);
  await page.evaluate(()=>{relationshipEvent('r','Rival <img>','win','1');relationshipEvent('r','Rival <img>','loss','2');relationshipEvent('r','Rival <img>','win','3');viewRivalries(document.querySelector('#worldView'));});
  assert.ok((await page.locator('#worldView').innerText()).includes('2 wins · 1 losses'));
  assert.equal(await page.locator('#worldView img').count(),0);
  console.log('PASS mobile request posting, capped offer, favorites, cancellation, rivalry records and escaping');
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
