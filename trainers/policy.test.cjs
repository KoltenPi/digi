const {test}=require('node:test'),assert=require('node:assert/strict');
const {roster,choose,pickTrade}=require('./policy.cjs');
const healthy={partner:true,pending:false,daily:false,money:1000,medicineCost:20,poop:0,sick:0,sleeping:false,hunger:80,energy:80,mood:80,stage:2,level:10,canEvolve:false,lastEvolveAttempt:0,lastMarket:Date.now(),lastRaidAttempt:0,bestStage:2,raidLeft:3,raidDaysLeft:6,raidJoined:false,eggs:0,partySize:1,partyMax:3,active:0,bestSlot:0,youngSlot:0,surplusSlot:-1,boxRoom:true,wins:2,losses:0,lastBattleLost:false,steps:1,buyToday:0,owned:[],uid:'self'};
test('14 distinct strategies and identities',()=>{assert.equal(roster.length,14);assert.equal(new Set(roster.map(b=>b.id)).size,14);assert.ok(roster.every(b=>b.name.length<=16));});
test('pending trades precede new actions',()=>assert.equal(choose({...healthy,pending:true,daily:true},roster[0]).type,'settle'));
test('care precedes battles',()=>{assert.equal(choose({...healthy,hunger:30},roster[0]).key,'feed');assert.equal(choose({...healthy,energy:20},roster[0]).key,'rest');assert.equal(choose({...healthy,sleeping:true},roster[0]).type,'wait');});
test('weak or late-week fresh entrants do not add raid HP',()=>{assert.notEqual(choose({...healthy,bestStage:4},roster[0]).type,'raid');assert.notEqual(choose({...healthy,bestStage:5,raidDaysLeft:1},roster[0]).type,'raid');assert.equal(choose({...healthy,bestStage:5,raidDaysLeft:1,raidJoined:true},roster[0]).type,'raid');});
test('daily raid limit cannot be exceeded',()=>assert.notEqual(choose({...healthy,bestStage:5,raidLeft:0},roster[0]).type,'raid'));
test('trade budget, daily cap, ownership and own-team filter',()=>{
 const offer={id:'trade',from:'other',fromName:'Human',status:'open',price:100,mon:{id:4},monStage:2,monLevel:10};
 assert.equal(pickTrade([offer],healthy,roster[0]).id,'trade');
 for(const state of [{money:20},{buysToday:2},{boxRoom:false},{owned:[4]}])assert.equal(pickTrade([offer],{...healthy,...state},roster[0]),null);
 for(const patch of [{price:-1},{price:NaN},{from:'self'},{fromName:'GPT Atlas'},{status:'taken'},{monLevel:99999}])assert.equal(pickTrade([{...offer,...patch}],healthy,roster[0]),null);
});
