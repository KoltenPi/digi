const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
function setup(){const O={};const ctx={onl:()=>O,saveGame:()=>{},Date,Number,String,Object,crypto:require('node:crypto').webcrypto};vm.createContext(ctx);vm.runInContext(fs.readFileSync(path.join(__dirname,'../social.js'),'utf8'),ctx);return {O,ctx};}
test('rivalries, alliances and replay protection',()=>{
 const {ctx,O}=setup();
 ctx.relationshipEvent('opponent','Rook','win','match1');ctx.relationshipEvent('opponent','Rook','win','match1');
 ctx.relationshipEvent('opponent','Rook','loss','match2');ctx.relationshipEvent('opponent','Rook','win','match3');
 const r=O.relationships['u:opponent'];assert.equal(r.wins,2);assert.equal(ctx.relationshipLabel(r),'Rival');
 for(let i=0;i<3;i++)ctx.relationshipEvent('opponent','Rook','trade','trade'+i);
 assert.equal(ctx.relationshipLabel(r),'Friendly rival');
});
test('request expires and closes only on matching acquisition',()=>{
 const {ctx,O}=setup();O.tradeRequest={id:'r',active:true,monId:10,monName:'Test',price:50,expiresAt:Date.now()+10000};
 ctx.completeTradeRequest({id:11});assert.equal(ctx.tradeRequestProfile().active,true);
 ctx.completeTradeRequest({id:10});assert.equal(ctx.tradeRequestProfile().active,false);
 O.tradeRequest.active=true;O.tradeRequest.expiresAt=1;assert.equal(ctx.tradeRequestProfile().active,false);
});
test('relationship names cannot replace object prototype',()=>{
 const {ctx,O}=setup();ctx.relationshipEvent('__proto__','<img>','trade','t');assert.equal(O.relationships['u:__proto__'].trades,1);
});
