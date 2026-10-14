'use strict';
const roster = [
  ['atlas','Atlas','Balanced captain',.15,2,'atk'],
  ['aegis','Aegis','Defense and consistency',.05,3,'def'],
  ['nova','Nova','Aggressive progression',.3,1,'atk'],
  ['sage','Sage','Magic specialist',.15,2,'int'],
  ['ember','Ember','Physical specialist',.2,2,'atk'],
  ['echo','Echo','Collection specialist',.1,2,'spd'],
  ['flux','Flux','Evolution specialist',.15,1,'hp'],
  ['orbit','Orbit','Team builder',.1,2,'def'],
  ['pixel','Pixel','Value trader',.1,3,'spd'],
  ['harbor','Harbor','Fair-price trader',.05,3,'hp'],
  ['sol','Sol','Raid specialist',.15,2,'atk'],
  ['luna','Luna','Care and resilience',.05,3,'hp'],
  ['rune','Rune','Tactical specialist',.2,2,'int'],
  ['scout','Scout','Discovery specialist',.2,1,'spd'],
].map(([id,name,strategy,risk,trainEvery,stat])=>({id,name:`GPT ${name}`,strategy,risk,trainEvery,stat}));

function choose(s, bot, now=Date.now()) {
  if (s.pending) return {type:'settle',reason:'Finish the recorded trade before doing anything else'};
  if (!s.partner) return {type:'hatch',reason:'Start with a normal starter egg'};
  if (s.daily) return {type:'daily',reason:'Claim the ordinary daily reward'};
  if (s.poop) return {type:'care',key:'clean',reason:'Clean before making progress'};
  if (s.sick && s.money>=s.medicineCost) return {type:'care',key:'med',reason:'Treat sickness'};
  if (s.sleeping) return {type:'wait',reason:'Let the partner sleep'};
  if (s.hunger<55) return {type:'care',key:'feed',reason:'Feed without overfeeding'};
  if (s.energy<45) return {type:'care',key:'rest',reason:'Recover energy before spending it'};
  if (s.mood<65) return {type:'care',key:'play',reason:'Keep the partner happy'};
  if (s.sick) return {type:'wait',reason:'Cannot afford medicine yet'};
  if (s.canEvolve && now-s.lastEvolveAttempt>15*60000) return {type:'evolve',reason:'Choose an unlocked evolution'};
  // A new raider adds 1200 HP. Join early with a strong team, not near the weekly reset.
  if (s.bestStage>=5 && s.raidLeft>0 && (s.raidJoined || s.raidDaysLeft>=3) && now-s.lastRaidAttempt>3600000) {
    if(s.active!==s.bestSlot)return {type:'switch',slot:s.bestSlot,reason:'Bring the strongest partner to the raid'};
    return {type:'raid',reason:'Contribute within the normal raid attempt limit'};
  }
  if (now-s.lastMarket>30*60000) return {type:'market',reason:'Settle sales and look for a useful, affordable trade'};
  if (s.eggs && s.partySize<s.partyMax) return {type:'hatch-extra',reason:'Raise another partner from an earned egg'};
  if (s.stage>=5 && s.money>350 && s.partySize<s.partyMax && !s.eggs) return {type:'buy-egg',reason:'Invest earned DigiData in another partner'};
  if (s.stage>=5 && s.youngSlot>=0 && s.youngSlot!==s.active) return {type:'switch',slot:s.youngSlot,reason:'Progress a younger partner'};
  if (s.surplusSlot>=0 && s.boxRoom) return {type:'box',slot:s.surplusSlot,reason:'Make a spare mature partner available for trading'};
  const fought=s.wins+s.losses;
  if ((fought>0 && s.lastBattleLost) || s.steps%(bot.trainEvery+2)===0) return {type:'train',stat:bot.stat,reason:`Develop ${bot.stat.toUpperCase()} through the training minigame`};
  let difficulty=s.stage<3?'easy':s.stage<5?'normal':'hard';
  if(s.stage>=5 && s.level>=55 && bot.risk>=.2 && !s.lastBattleLost)difficulty='nightmare';
  if(s.lastBattleLost)difficulty='easy';
  return {type:'battle',difficulty,reason:'Earn experience and resources through a normal battle'};
}

function pickTrade(offers,s,bot){
  if(s.buysToday>=2 || !s.boxRoom)return null;
  const budget=Math.min(Math.floor(s.money*.2),bot.id==='pixel'?350:250);
  return offers.filter(t=>t.from!==s.uid && !/^GPT /i.test(t.fromName||'') && t.status==='open' && Number.isSafeInteger(t.price) && t.price>=0 && t.price<=budget && t.mon && Number.isSafeInteger(t.mon.id) && Number.isInteger(t.monStage) && t.monStage>=0 && t.monStage<=5 && Number.isInteger(t.monLevel) && t.monLevel>=1 && t.monLevel<=100 && (!s.owned.includes(t.mon.id)))
    .sort((a,b)=>(b.monStage*30+b.monLevel-b.price/8)-(a.monStage*30+a.monLevel-a.price/8))[0]||null;
}
module.exports={roster,choose,pickTrade};
