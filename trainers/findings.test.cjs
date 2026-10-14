const {test}=require('node:test'),assert=require('node:assert/strict');
const {inspect,record,runnerFlag}=require('./findings.cjs');
const healthy={partner:true,money:100,partySize:1,partyMax:3,raidLeft:2,hunger:70,energy:70,mood:70,stage:2};
test('ordinary play produces no speculative reports',()=>assert.deepEqual(inspect(healthy,healthy,{type:'wait'}),[]));
test('invalid balances and exceeded limits are flagged with evidence',()=>{
 const flags=inspect(healthy,{...healthy,money:-1,partySize:4,raidLeft:-1},{type:'raid'});
 assert.deepEqual(flags.map(x=>x.category),['bug','possible exploit','possible exploit']);
});
test('balance signals require ten battles in the same stage and difficulty',()=>{
 const history={};
 for(let i=0;i<9;i++)assert.equal(inspect(healthy,{...healthy,lastBattleLost:true},{type:'battle',difficulty:'easy'},history).length,0);
 assert.equal(inspect(healthy,{...healthy,lastBattleLost:true},{type:'battle',difficulty:'hard'},history).length,0);
 assert.equal(inspect(healthy,{...healthy,lastBattleLost:true},{type:'battle',difficulty:'easy'},history)[0].category,'balance');
});
test('reports deduplicate and survive JSON persistence',()=>{
 let records=record([],[runnerFlag()],100);
 records=record(JSON.parse(JSON.stringify(records)),[runnerFlag()],200);
 assert.equal(records.length,1);assert.equal(records[0].count,2);assert.equal(records[0].firstSeen,100);assert.equal(records[0].lastSeen,200);
 assert.equal(records[0].category,'runner');
});
test('care cap is not a false failure',()=>{
 assert.equal(inspect({...healthy,energy:100},{...healthy,energy:100},{type:'rest'}).length,0);
 assert.equal(inspect(healthy,healthy,{type:'rest'})[0].key,'care-rest');
});
