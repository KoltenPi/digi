'use strict';
// Passive observations only. These flags are hypotheses, never confirmed exploits.
function inspect(before,after,action,history={}){
  const flags=[];
  const add=(key,category,title,evidence)=>flags.push({key,category,title,evidence});
  if(!Number.isFinite(after.money)||after.money<0)add('invalid-money','bug','Invalid DigiData balance',`After ${action.type}: balance ${after.money}`);
  if(after.partySize>after.partyMax)add('party-cap','possible exploit','Party exceeds its capacity',`After ${action.type}: ${after.partySize} partners, capacity ${after.partyMax}`);
  if(after.raidLeft<0)add('raid-limit','possible exploit','Raid attempt limit exceeded',`After ${action.type}: ${after.raidLeft} attempts remaining`);
  for(const stat of ['hunger','energy','mood'])if(after[stat]<0||after[stat]>100)add('range-'+stat,'bug',`${stat} outside expected range`,`After ${action.type}: ${stat}=${after[stat]}`);
  if(action.type==='battle'){
    const key=`${before.stage}:${action.diff||action.difficulty||'default'}`;
    const sample=history[key]||(history[key]={battles:0,losses:0});
    sample.battles++;if(after.lastBattleLost)sample.losses++;
    if(sample.battles>=10&&sample.losses/sample.battles>=0.8)add('battle-loss-'+key,'balance','Frequent battle losses',`${sample.losses}/${sample.battles} battles lost at stage ${before.stage}, difficulty ${action.diff||action.difficulty||'default'}. Equipment and trainer strategy may explain this.`);
  }
  if(['feed','rest','play'].includes(action.type)&&before.partner&&after.partner){
    const stat={feed:'hunger',rest:'energy',play:'mood'}[action.type];
    if(before[stat]<90&&after[stat]<=before[stat])add('care-'+action.type,'bug',`${action.type} did not improve ${stat}`,`${stat}: ${before[stat]} → ${after[stat]}. Action completed; passive decay or game rules may explain this.`);
  }
  return flags;
}
function record(records,flags,now=Date.now()){
  for(const flag of flags){
    let item=records.find(x=>x.key===flag.key);
    if(!item){item={...flag,firstSeen:now,lastSeen:now,count:0};records.push(item);}
    item.lastSeen=now;item.count++;item.evidence=flag.evidence;
  }
  return records.sort((a,b)=>b.lastSeen-a.lastSeen).slice(0,40);
}
function runnerFlag(){return {key:'runner-action-failure',category:'runner',title:'Trainer action could not finish',evidence:'An action failed or timed out. Check the private runner log; this may be automation, network, or game behavior.'};}
module.exports={inspect,record,runnerFlag};
