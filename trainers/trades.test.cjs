const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
function setup(pending,records={}){
 const database=new Map(Object.entries(records));
 const F={doc:(_db,_collection,id)=>id,runTransaction:async(_db,fn)=>fn({get:async id=>({exists:()=>database.has(id),data:()=>database.get(id)}),update:(id,patch)=>database.set(id,{...database.get(id),...patch}),set:(id,data)=>database.set(id,data)}),serverTimestamp:()=>123};
 const G={data:200,box:[],boxCap:5,col:{},online:{name:'GPT Test'},aiTrainer:{day:'today',pending,buysToday:0,postsToday:0,strategy:'Test'}};
 const sandbox={window:{},G,net:async()=>({F,db:{},uid:'bot'}),dayKey:()=> 'today',onl:()=>sandbox.G.online,saveGame:()=>{},jclean:o=>JSON.parse(JSON.stringify(o)),Date,setTimeout,crypto:require('node:crypto').webcrypto};
 vm.createContext(sandbox);vm.runInContext(fs.readFileSync(require('node:path').join(__dirname,'browser-agent.js'),'utf8'),sandbox);
 return {sandbox,database,settle:()=>sandbox.window.DigiTrainer.settle()};
}
test('purchase recovered after server commit without paying or receiving twice',async()=>{
 const mon={id:1,name:'Test',stage:2};const journal={kind:'buy',id:'t',price:50,mon,from:'human'};
 const t=setup(journal,{t:{status:'open',from:'human',price:50,mon}});
 const before=JSON.parse(JSON.stringify(t.sandbox.G));await t.settle();assert.equal(t.sandbox.G.data,150);assert.equal(t.sandbox.G.box.length,1);
 t.sandbox.G=before;await t.settle();assert.equal(t.sandbox.G.data,150);assert.equal(t.sandbox.G.box.length,1);
 await t.settle();assert.equal(t.sandbox.G.box.length,1);
});
test('another buyer or changed price cannot charge this account',async()=>{
 for(const change of [{status:'taken',taker:'other'},{price:999}]){
  const mon={id:1,name:'Test'};const t=setup({kind:'buy',id:'t',price:50,mon,from:'human'},{t:{status:'open',from:'human',price:50,mon,...change}});
  await t.settle();assert.equal(t.sandbox.G.data,200);assert.equal(t.sandbox.G.box.length,0);
 }
});
test('missing ambiguous purchase keeps its recovery journal and grants nothing',async()=>{
 const t=setup({kind:'buy',id:'gone',price:50,mon:{id:1},from:'human'});await assert.rejects(t.settle(),/needs review/);assert.ok(t.sandbox.G.aiTrainer.pending);assert.equal(t.sandbox.G.data,200);
});
test('sale recovered after server commit removes exactly one inventory item',async()=>{
 const mon={id:2,name:'Spare',agentItemId:'item',stage:3};const t=setup({kind:'sell',id:'sale',price:80,mon});t.sandbox.G.box=[mon];const before=JSON.parse(JSON.stringify(t.sandbox.G));
 await t.settle();assert.equal(t.sandbox.G.box.length,0);assert.equal(t.database.size,1);
 t.sandbox.G=before;await t.settle();assert.equal(t.sandbox.G.box.length,0);assert.equal(t.database.size,1);
});
