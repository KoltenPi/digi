/* Public, read-only trainer scoreboard. The private runner is never loaded by the game. */
function aiTrainerProfile(){
  const a=G.aiTrainer;
  if(!a || !['chatgpt','claude'].includes(a.team))return null;
  return {team:a.team,id:String(a.id||'').slice(0,30),strategy:String(a.strategy||'').slice(0,80),policyVersion:1,
    startedAt:a.startedAt||0,updatedAt:Date.now(),actions:a.actions||0,raidDamage:a.raidDamage||0,weekRaidDamage:G.raid?.week===raidWeek()?G.raid.dmg||0:0,
    tradesBought:a.tradesBought||0,tradesSold:a.tradesSold||0,tradeRevenue:a.tradeRevenue||0,
    findings:(a.findings||[]).slice(0,40).map(x=>({key:String(x.key).slice(0,80),category:String(x.category).slice(0,30),title:String(x.title).slice(0,100),evidence:String(x.evidence).slice(0,400),firstSeen:Number(x.firstSeen)||0,lastSeen:Number(x.lastSeen)||0,count:Number(x.count)||1})),
    lastAction:String(a.lastAction||'Starting').slice(0,160),recent:(a.recent||[]).slice(-5).map(x=>({at:x.at,text:String(x.text).slice(0,160)}))};
}
async function viewAiTrainers(el){
  const N=await net(),F=N.F;
  const snap=await F.getDocs(F.query(F.collection(N.db,'users'),F.where('ai.team','in',['chatgpt','claude']),F.limit(60)));
  const rows=snap.docs.map(d=>d.data()).sort((a,b)=>(b.tamerLv||0)-(a.tamerLv||0)||(b.found||0)-(a.found||0));
  // The existing built-in team is time-based simulation, not a set of Firebase accounts.
  if(!rows.some(r=>r.ai?.team==='claude')&&typeof BOT_TAMERS!=='undefined'){
    const raid=typeof botRaid==='function'?botRaid():[];
    BOT_TAMERS.forEach((_,i)=>{const r=botStats(i);rows.push({...r,ai:{team:'claude',id:'builtin-'+i,simulation:true,started:r.started,startedAt:botStart(i),updatedAt:Date.now(),strategy:'Built-in time-based simulation',weekRaidDamage:raid.find(x=>x.name===r.name)?.dmg||0,lastAction:r.started?'Progress calculated by the built-in simulation':'Scheduled to start '+new Date(botStart(i)).toLocaleString(),recent:[]}});});
  }
  const num=n=>Number.isFinite(+n)?Math.max(0,+n).toLocaleString():'0';
  const group=team=>{
    const list=rows.filter(r=>r.ai?.team===team),label=team==='chatgpt'?'ChatGPT team':'Claude team';
    return '<h3>'+label+' <span>'+list.length+' trainers</span></h3>'+(list.length?'<div class="lbs">'+list.map(r=>{
      const a=r.ai,age=Math.max(0,Date.now()-(a.updatedAt||0)),status=a.simulation?(a.started?'Simulated':'Scheduled'):age<10*60000?'Active recently':age<3600000?'Last active '+Math.floor(age/60000)+'m ago':'Offline · '+Math.floor(age/3600000)+'h ago';
      return '<div class="upd"><b>'+esc(r.name)+'</b> <span class="stage">'+esc(status)+'</span><p class="ownline">'+esc(a.strategy||'Automated trainer')+' · Tamer Lv '+num(r.tamerLv)+' · '+num(r.found)+' found</p>'+
        '<p class="ownline">'+esc(r.partner?.name||'Waiting to hatch')+' · Lv '+num(r.partner?.level)+' · Raid damage this week '+num(a.weekRaidDamage)+' · Trades '+(a.simulation?'not tracked':num((a.tradesBought||0)+(a.tradesSold||0)))+'</p>'+
        '<p>'+esc(a.lastAction||'Starting')+'</p>'+(r.code?'<small>Friend code: '+esc(r.code)+'</small>':'')+
        '<details><summary>Recent activity</summary><ul>'+(a.recent||[]).map(x=>'<li>'+esc(new Date(x.at).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}))+' · '+esc(x.text)+'</li>').join('')+'</ul></details></div>';
    }).join('')+'</div>':'<p class="ownline">No '+label+' trainers have checked in yet.</p>');
  };
  el.innerHTML='<h3>🤖 Trainer challenge</h3><p class="ownline">14 ChatGPT-coded trainers raise partners, trade, and help with raids. No paid AI API.</p>'+
    '<details class="guide"><summary>How the comparison works</summary><p class="ownline">The teams use different methods and start times: ChatGPT plays saved game accounts with no bonus resources; the built-in Claude team simulates progress over time. Compare their visible results with that difference in mind. ChatGPT activity updates when its runner checks in.</p></details><button class="act" id="aiRefresh">Refresh activity</button>'+trainerFindings(rows)+group('chatgpt')+group('claude');
  el.querySelector('#aiRefresh').onclick=()=>viewAiTrainers(el).catch(e=>onlSay(netErr(e)));
}
function trainerFindings(rows){
  const items=new Map();
  for(const r of rows)for(const f of (r.ai?.findings||[]).slice(0,40)){
    const key=r.ai.team+':'+f.key;
    let item=items.get(key);
    if(!item){item={...f,count:0,names:[]};items.set(key,item);}
    item.count+=Math.max(0,Number(f.count)||0);item.names.push(r.name);
    item.firstSeen=Math.min(item.firstSeen,f.firstSeen);
    if(f.lastSeen>=item.lastSeen){item.lastSeen=f.lastSeen;item.evidence=f.evidence;}
  }
  return '<details class="guide" id="trainerFindings"><summary>Findings for future fixes · '+items.size+'</summary><p class="ownline">Suspected bugs, possible exploits, balance signals, and runner problems observed during normal play. These need review; trainers do not deliberately exploit the game. Repeated reports are grouped. Only instrumented trainers contribute.</p>'+(!items.size?'<p>No findings recorded yet. Monitoring starts with this update.</p>':[...items.values()].sort((a,b)=>b.lastSeen-a.lastSeen).map(f=>'<div class="upd"><b>'+esc(f.title)+'</b><p>'+esc(f.category)+' · Needs review · '+f.count+' observations</p><p>'+esc(f.evidence)+'</p><small>'+esc([...new Set(f.names)].join(', '))+' · First '+esc(new Date(f.firstSeen).toLocaleString())+' · Latest '+esc(new Date(f.lastSeen).toLocaleString())+'</small></div>').join(''))+'</details>';
}
