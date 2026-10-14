const {chromium,devices}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch();
 try{
  const page=await browser.newPage({...devices['iPhone 13']});
  await page.goto('http://127.0.0.1:4178/',{waitUntil:'domcontentloaded'});
  await page.evaluate(async()=>{
    const fixture={name:'GPT <Atlas>',tamerLv:2,found:3,code:'TESTCODE',partner:{name:'Tsubumon',level:2},ai:{team:'chatgpt',strategy:'Balanced captain',updatedAt:Date.now(),weekRaidDamage:0,lastAction:'Training <not markup>',recent:[{at:Date.now(),text:'Normal battle completed'}]}};
    net=async()=>({F:{collection:()=>{},where:()=>{},limit:()=>{},query:()=>{},getDocs:async()=>({docs:[{data:()=>fixture}]})},db:{}});
    document.querySelectorAll('main>section').forEach(el=>el.hidden=true);
    const view=document.querySelector('#worldView');view.hidden=false;await viewAiTrainers(view);
  });
  assert.equal(await page.locator('#worldView h3').count(),3);
  assert.ok((await page.locator('#worldView').innerText()).includes('GPT <Atlas>'));
  assert.ok((await page.locator('#worldView').innerText()).includes('14 trainers'));
  assert.equal(await page.locator('#worldView atlas').count(),0);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.screenshot({path:require('path').join(__dirname,'..','..','trainer-board.png')});
  console.log('PASS: mobile activity board, escaped names, native Claude roster, viewport width.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
