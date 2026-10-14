/* Injected only into isolated runner accounts. Never include this file in index.html. */
(() => {
  const delay=ms=>new Promise(r=>setTimeout(r,ms));
  const click=selector=>{const b=document.querySelector(selector);if(!b||b.disabled)throw Error('Action unavailable: '+selector);b.click();};
  async function until(test,timeout=180000){const end=Date.now()+timeout;while(Date.now()<end){if(test())return;await delay(100);}throw Error('Game action timed out');}
  function note(text){const a=G.aiTrainer;a.lastAction=text;a.recent=(a.recent||[]).concat({at:Date.now(),text}).slice(-15);saveGame();}
  function day(){const a=G.aiTrainer;if(a.day!==dayKey()){a.day=dayKey();a.buysToday=0;a.postsToday=0;}return a;}
  function snapshot(){
    if(!busy)tick();const a=day(),p=P(),R=raidLocal();
    const bestSlot=G.party.reduce((best,m,i)=>!G.party[best]||m.stage>G.party[best].stage||(m.stage===G.party[best].stage&&(m.level||1)>(G.party[best].level||1))?i:best,-1);
    return {partner:!!p,pending:!!a.pending,uid:NET?.uid,daily:dailyReady(),money:G.data||0,medicineCost:MED_COST,
      stage:p?.stage||0,level:p?.level||1,hunger:p?.hunger||0,energy:p?.energy||0,mood:p?.mood||0,poop:p?.poop||0,sick:p?.sick||0,sleeping:p?asleep(p):false,
      canEvolve:p?canEvolve(p):false,lastEvolveAttempt:a.lastEvolveAttempt||0,lastRaidAttempt:a.lastRaidAttempt||0,lastMarket:a.lastMarket||0,
      raidLeft:RAID_TRIES-R.used,raidJoined:R.joined,raidDaysLeft:((weekNo()+1)*7*864e5-3*864e5-Date.now())/864e5,
      active:G.active,bestSlot,bestStage:G.party[bestSlot]?.stage||0,youngSlot:G.party.findIndex(m=>m.stage<5&&!m.final),
      surplusSlot:G.party.findIndex((m,i)=>i!==bestSlot&&m.stage>=4&&!m.fav&&!m.exp),
      partySize:G.party.length,partyMax:PARTY_MAX,boxRoom:G.box.length<G.boxCap,eggs:G.eggs.length,
      wins:p?.wins||0,losses:p?.losses||0,lastBattleLost:!!a.lastBattleLost,steps:a.actions||0,buysToday:a.buysToday||0,
      owned:[...G.party,...G.box].map(m=>m.id)};
  }
  async function finishBattle(){
    await until(()=>!!$('#bDone'));
    click('#bDone');
    if($('#raidRes')){
      await until(()=>!$('#raidRes')?.textContent.includes('Sending your damage'));
      if($('#raidRes')?.textContent.includes('Something went wrong')||$('#raidRes')?.textContent.includes('permission denied'))throw Error('Raid result could not be uploaded');
    }
    if(!$('#overlay').hidden)closeOv();
    setTab('partner');
  }
  async function equip(bot){
    await syncMoves(P());
    const p=P(),st=partnerStats(p);
    const score=m=>{const b=toBattle(m,p.stage);return (b.kind==='heal'||b.kind==='drain'?15:0)+(b.power||1)*(b.kind==='mag'?st.int:st.atk)/(1+(b.cost||0)/8)+(bot.stat==='int'&&b.kind==='mag'?5:0);};
    const desired=p.moves.slice().sort((a,b)=>score(b)-score(a)).slice(0,4).map(m=>m.name);
    if(desired.every(n=>p.equip.includes(n))&&desired.length===p.equip.length)return;
    await movesScreen();
    const press=n=>{const b=[...document.querySelectorAll('[data-eq]')].find(b=>b.dataset.eq===n);if(b)b.click();};
    // Keep at least one move equipped while replacing the loadout through its normal controls.
    for(const n of [...p.equip])if(!desired.includes(n)&&p.equip.length>1)press(n);
    for(const n of desired)if(!p.equip.includes(n)&&p.equip.length<4)press(n);
    for(const n of [...p.equip])if(!desired.includes(n)&&p.equip.length>1)press(n);
    for(const n of desired)if(!p.equip.includes(n)&&p.equip.length<4)press(n);
    click('#mvDone');
  }
  async function run(action,bot){
    const a=day();if(busy)throw Error('Another game action is still running');
    setTab('partner');const p=P();
    switch(action.type){
      case 'wait': note(action.reason);return;
      case 'hatch':
        if(p)break;for(let i=0;i<3;i++)click('#egg');await until(()=>!!P()&&!busy);break;
      case 'daily':claimDaily();break;
      case 'care':click('#partnerView [data-act="'+action.key+'"]');break;
      case 'switch':click('#partnerView [data-slot="'+action.slot+'"]');break;
      case 'box':
        click('#partnerView [data-slot="'+action.slot+'"]');click('#boxBtn');break;
      case 'hatch-extra':
        if(!G.eggs.length||G.party.length>=PARTY_MAX)break;
        hatchOverlay(G.eggs[0]);for(let i=0;i<3;i++)click('#egg2');await until(()=>!busy);break;
      case 'buy-egg':
        setTab('shop');click('#shopView [data-buy="mystery"]');setTab('partner');break;
      case 'train': {
        if(!p||asleep(p)||p.sick||p.energy<trainCost(false))throw Error('Training requirements not met');
        train();click('[data-tm="0"]');click('[data-train="'+action.stat+'"]');
        const end=Date.now()+45000;
        while($('#hit')?.textContent!=='Done'&&Date.now()<end){
          const z=$('#zone')?.getBoundingClientRect(),m=$('#mark')?.getBoundingClientRect();
          if(z&&m&&m.left>z.left+z.width*.3&&m.left<z.right-z.width*.2)click('#hit');
          await delay(100+Math.random()*70);
        }
        await until(()=>$('#hit')?.textContent==='Done'&&$('#hit').onclick?.toString().includes('closeOv'),30000);click('#hit');a.lastBattleLost=false;break;
      }
      case 'battle': {
        if(!p||asleep(p)||p.sick||p.energy<25)throw Error('Battle requirements not met');
        await equip(bot);const losses=p.losses||0;store.set('dx_auto',true);
        await battle(DIFFS.find(d=>d.key===action.difficulty));await finishBattle();
        a.lastBattleLost=(p.losses||0)>losses;break;
      }
      case 'evolve': {
        a.lastEvolveAttempt=Date.now();saveGame();if(!canEvolve(p))break;
        await digivolve();const opts=[...document.querySelectorAll('[data-pick]')];
        // Favor a new form; tie-breaking varies across trainers without inventing locked paths.
        opts.sort((x,y)=>Number(raised(+x.dataset.pick))-Number(raised(+y.dataset.pick))||((+x.dataset.pick+bot.id.length)%17)-((+y.dataset.pick+bot.id.length)%17));
        if(opts.length){opts[0].click();await until(()=>typeof $('#ovClose')?.onclick==='function');click('#ovClose');}
        else if($('#evoLater'))click('#evoLater');else if($('#ovClose'))click('#ovClose');
        break;
      }
      case 'raid': {
        a.lastRaidAttempt=Date.now();saveGame();
        if(!p||p.stage<5||asleep(p)||p.sick||p.energy<50||raidLocal().used>=RAID_TRIES)break;
        const d=await raidDoc();if(d.hitters>0&&d.hp<=0)break;
        const before=raidLocal().dmg;await equip(bot);store.set('dx_auto',true);
        raidFight(d.boss);await finishBattle();a.raidDamage=(a.raidDamage||0)+Math.max(0,raidLocal().dmg-before);break;
      }
      default:throw Error('Unknown action '+action.type);
    }
    a.actions=(a.actions||0)+1;note(action.reason);saveGame();
  }
  async function market(){
    const N=await net(),F=N.F,a=day(),O=onl();a.lastMarket=Date.now();
    const mine=await F.getDocs(F.query(F.collection(N.db,'trades'),F.where('from','==',N.uid)));
    O.claimed=O.claimed||{};
    for(const d of mine.docs){const t=d.data();if(t.status==='taken'&&!O.claimed[d.id]){
      O.claimed[d.id]=1;G.data+=t.paid||0;a.tradesSold=(a.tradesSold||0)+1;a.tradeRevenue=(a.tradeRevenue||0)+(t.paid||0);note('Sold '+t.monName+' for '+(t.paid||0)+' DigiData');
    }}
    note('Checked the trade board using earned DigiData');saveGame();
    const offers=await F.getDocs(F.query(F.collection(N.db,'trades'),F.where('status','==','open'),F.limit(60)));
    return {offers:offers.docs.map(d=>({id:d.id,...d.data()})),hasOpen:mine.docs.some(d=>d.data().status==='open'),snapshot:snapshot()};
  }
  async function prepareTrade(offer,hasOpen,bot){
    const a=day(),N=await net(),F=N.F;if(a.pending)throw Error('Trade already pending');
    if(offer){
      if(a.buysToday>=2||G.box.length>=G.boxCap||G.data<offer.price)throw Error('Purchase limit');
      a.pending={kind:'buy',id:offer.id,price:offer.price,mon:offer.mon,from:offer.from};
    }else if(!hasOpen&&a.postsToday<1){
      const m=G.box.filter(m=>!m.fav&&!m.exp).sort((a,b)=>b.stage-a.stage)[0];
      if(!m)return false;
      if(!m.agentItemId)m.agentItemId=crypto.randomUUID();
      const mon=jclean(m);delete mon.msg;
      a.pending={kind:'sell',id:F.doc(F.collection(N.db,'trades')).id,mon,price:Math.max(1,Math.min(9999,Math.round(releaseValue(m)*(bot.id==='harbor'?.8:1.1))))};
    }else return false;
    saveGame();return true; // Runner MUST persist this journal before settlement.
  }
  async function settle(){
    const a=day(),p=a.pending;if(!p)return;
    const N=await net(),F=N.F,ref=F.doc(N.db,'trades',p.id);
    if(p.kind==='buy'){
      const ok=await F.runTransaction(N.db,async tx=>{
        const s=await tx.get(ref);if(!s.exists())throw Error('Pending trade disappeared; needs review');const t=s.data();
        if(t.status==='taken'&&t.taker===N.uid)return true;
        if(t.status!=='open')return false;
        if(t.from!==p.from||t.price!==p.price||JSON.stringify(t.mon)!==JSON.stringify(p.mon))return false;
        if(G.data<p.price||G.box.length>=G.boxCap)return false;
        tx.update(ref,{status:'taken',taker:N.uid,takerName:onl().name,paid:p.price});return true;
      });
      if(ok){const m=jclean(p.mon);delete m.fav;delete m.exp;delete m.agentItemId;m.last=Date.now();G.data-=p.price;G.box.push(m);G.col[m.id]='raised';a.buysToday++;a.tradesBought=(a.tradesBought||0)+1;note('Bought '+m.name+' for '+p.price+' DigiData');}
    }else{
      const index=G.box.findIndex(m=>m.agentItemId===p.mon.agentItemId);if(index<0)throw Error('Pending sale inventory missing');
      await F.runTransaction(N.db,async tx=>{
        const s=await tx.get(ref);if(s.exists()){if(s.data().from!==N.uid)throw Error('Trade identity mismatch');return;}
        tx.set(ref,{from:N.uid,fromName:onl().name,mon:p.mon,monName:p.mon.name,monImage:p.mon.image,monStage:p.mon.stage,monLevel:p.mon.level||1,price:p.price,note:'ChatGPT strategy bot · '+a.strategy.slice(0,12),status:'open',t:F.serverTimestamp()});
      });
      G.box.splice(index,1);a.postsToday++;note('Listed '+p.mon.name+' for '+p.price+' DigiData');
    }
    delete a.pending;saveGame();
  }
  window.DigiTrainer={snapshot,run,market,prepareTrade,settle,note,
    async init(bot){
      if(G.aiTrainer&&G.aiTrainer.id!==bot.id)throw Error('Wrong trainer save');
      G.aiTrainer=Object.assign({team:'chatgpt',id:bot.id,strategy:bot.strategy,startedAt:Date.now(),actions:0},G.aiTrainer);
      onl().name=bot.name;saveGame();setTab('partner');await net();
    },
    async publish(){await netSync();return {name:onl().name,code:myCode(NET.uid),partner:P()?.name,level:P()?.level||0,actions:G.aiTrainer.actions||0,lastAction:G.aiTrainer.lastAction};}
  };
})();
