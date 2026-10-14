/* Relationships and wanted ads use existing saves and public profiles. */
function relationshipEvent(uid,name,kind,eventId){
  if(!uid||!['win','loss','trade','gift'].includes(kind))return;
  const O=onl();O.relationships=O.relationships||{};
  const key='u:'+uid;
  const r=O.relationships[key]||(O.relationships[key]={uid,name,wins:0,losses:0,trades:0,gifts:0,events:[]});
  if(eventId&&r.events.includes(eventId))return;
  r.name=String(name||r.name||'Trainer').slice(0,40);r.updatedAt=Date.now();
  r[{win:'wins',loss:'losses',trade:'trades',gift:'gifts'}[kind]]++;
  if(eventId)r.events=r.events.concat(eventId).slice(-100);
  const recent=Object.values(O.relationships).sort((a,b)=>b.updatedAt-a.updatedAt).slice(0,60);
  O.relationships=Object.fromEntries(recent.map(x=>['u:'+x.uid,x]));saveGame();
}
function relationshipLabel(r){
  const battles=r.wins+r.losses,help=r.trades+r.gifts;
  return battles>=3?(help>=3?'Friendly rival':'Rival'):help>=3?'Ally':battles?'New challenger':'Trading acquaintance';
}
function viewRivalries(el){
  const rows=Object.values(onl().relationships||{}).sort((a,b)=>b.updatedAt-a.updatedAt);
  el.innerHTML='<h3>🤝 Rivalries & allies</h3><p class="ownline">Battle a trainer three times to become rivals. Three trades or gifts build an alliance. Your history starts now and stays with your save. Relationships are personal; practice matches do not change your opponent’s record.</p>'+
    (rows.length?rows.map(r=>'<div class="upd"><b>'+esc(r.name)+'</b> <span class="stage">'+esc(relationshipLabel(r))+'</span><p>'+r.wins+' wins · '+r.losses+' losses · '+r.trades+' trades · '+r.gifts+' gifts</p><p>'+esc(r.wins+r.losses>=3?(r.wins===r.losses?'An even rivalry. Who will take the lead?':r.wins>r.losses?'You lead the series. Expect a rematch!':'They lead the series. Time for a comeback?'):'Keep playing together to build your history.')+'</p></div>').join(''):'<p>Battle someone from Friends or complete a trade to meet your first rival or ally.</p>');
}
function tradeRequestProfile(){
  const r=onl().tradeRequest;
  return r?{id:String(r.id).slice(0,60),active:!!r.active&&Date.now()<r.expiresAt,monId:Number(r.monId),monName:String(r.monName).slice(0,100),price:Number(r.price),expiresAt:Number(r.expiresAt)}:null;
}
function completeTradeRequest(mon){
  const r=onl().tradeRequest;if(r?.active&&Number(r.monId)===Number(mon.id)){r.active=false;r.completedAt=Date.now();onl().synced=0;saveGame();}
}
async function openTradeRequests(){
  const N=await net(),F=N.F;
  const q=await F.getDocs(F.query(F.collection(N.db,'users'),F.where('tradeRequest.active','==',true),F.limit(60)));
  return q.docs.map(d=>({uid:d.id,name:d.data().name,...d.data().tradeRequest})).filter(r=>r.active&&r.expiresAt>Date.now()&&Number.isSafeInteger(r.monId)&&Number.isSafeInteger(r.price)&&r.price>=0&&r.price<=9999);
}
async function viewTradeRequests(el){
  const N=await net(),mine=tradeRequestProfile();
  let requests=[];try{requests=await openTradeRequests();}catch(e){el.textContent='Could not load requests. '+netErr(e);return;}
  el.innerHTML='<h3>📣 Trade requests</h3><p class="ownline">Ask for a Digimon and set your maximum price. One request at a time, lasting seven days. No DigiData is charged until you buy an offer. Responses are public trade listings, so another player may buy first.</p>'+
    (mine?.active?'<div class="upd">You want <b>'+esc(mine.monName)+'</b> · up to '+mine.price+' DD <button class="ghost" id="requestCancel">Cancel request</button><button class="act" id="requestOffers">Find matching offers</button></div>':'')+
    '<div style="display:grid;gap:10px"><label>Find a Digimon<input style="width:100%;box-sizing:border-box" class="onlin" id="requestSearch" maxlength="80" placeholder="Search by name"></label><select style="max-width:100%" class="onlin" id="requestMon" aria-label="Wanted Digimon"></select><label>Maximum DigiData<input style="width:100%;box-sizing:border-box" class="onlin" id="requestPrice" type="number" min="0" max="9999" value="100" inputmode="numeric"></label><button class="act" id="requestPost">'+(mine?.active?'Replace request':'Post request')+'</button></div><p id="requestMsg" role="status"></p><div id="requestList"></div>';
  const offers=el.querySelector('#requestOffers');if(offers)offers.onclick=()=>{state.requestOffers=mine;state.onlSub='trades';onlineView();};
  const select=el.querySelector('#requestMon');
  function filter(){const term=el.querySelector('#requestSearch').value.toLowerCase().trim();select.innerHTML=state.all.filter(m=>m.name.toLowerCase().includes(term)).slice(0,60).map(m=>'<option value="'+Number(m.id)+'">'+esc(m.name)+'</option>').join('');}
  filter();el.querySelector('#requestSearch').oninput=filter;
  el.querySelector('#requestPost').onclick=async function(){
    const m=state.all.find(m=>m.id===Number(select.value)),price=Number(el.querySelector('#requestPrice').value);
    if(!m||!Number.isSafeInteger(price)||price<0||price>9999){el.querySelector('#requestMsg').textContent='Choose a Digimon and a whole-number price from 0 to 9999.';return;}
    this.disabled=true;const previous=onl().tradeRequest;
    onl().tradeRequest={id:crypto.randomUUID(),active:true,monId:m.id,monName:m.name,price,expiresAt:Date.now()+7*864e5};saveGame();
    try{await netSync();await viewTradeRequests(el);}catch(e){onl().tradeRequest=previous;saveGame();el.querySelector('#requestMsg').textContent=netErr(e);this.disabled=false;}
  };
  const cancel=el.querySelector('#requestCancel');if(cancel)cancel.onclick=async()=>{cancel.disabled=true;onl().tradeRequest.active=false;saveGame();try{await netSync();await viewTradeRequests(el);}catch(e){el.querySelector('#requestMsg').textContent=netErr(e);cancel.disabled=false;}};
  el.querySelector('#requestList').innerHTML=requests.length?requests.map((r,i)=>'<div class="upd"><b>'+esc(r.name)+'</b> wants '+esc(r.monName)+'<p>Up to '+r.price+' DD · expires '+esc(new Date(r.expiresAt).toLocaleDateString())+'</p>'+(r.uid!==N.uid?'<button class="act" data-request-offer="'+i+'">Offer from your Box</button><div data-request-form="'+i+'" hidden></div>':'<small>Your request</small>')+'</div>').join(''):'<p>No active requests yet.</p>';
  el.querySelectorAll('[data-request-offer]').forEach(b=>b.onclick=()=>{el.querySelectorAll('[data-request-form]').forEach(x=>{x.innerHTML='';x.hidden=true;});tradePostForm(el.querySelector('[data-request-form="'+b.dataset.requestOffer+'"]'),requests[+b.dataset.requestOffer]);});
}
