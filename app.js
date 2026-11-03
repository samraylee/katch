/* Katch v4 - J direction: dark plum depth, Fraunces serif, violet accent.
   Modes:
   - local: no backend configured -> demo content, saves to localStorage. Demo content only - not Kat's real data.
   - cloud: Supabase configured -> Google sign-in, per-user private state synced to a row only that user can read/write (RLS). */
const SWATCHES = ['#BFB065','#D08A92','#B84A52','#E8B74A','#E95FB8','#8B86A3','#8A5CF6','#A9C0CB','#7FB069','#E8843C'];
const CONFIG = {
  seed: {
    events: [
      {time:'9:00 AM',  title:'Ethics Seminar', bucket:'classes', note:'Reading discussion', done:false, next:true, date:null},
      {time:'12:30 PM', title:'Lunch with Sam', bucket:'other',   note:'', place:'Joe\u2019s Coffee', done:false, photo:'coffee.jpg', date:null},
      {time:'6:30 PM',  title:'Lemon chicken night', bucket:'hoe', note:'', door:'2 recipes + list', done:false, photo:'meal-hero2.jpg', date:null},
    ],
    routines: [
      {name:'Morning pages', bucket:'other', done:true},
      {name:'Korean flashcards', bucket:'language', done:true},
      {name:'Gym', bucket:'other', done:false},
    ],
    buckets: [
      {id:'classes',  name:'Classes',          color:'#BFB065', tasks:[{name:'reading ch.4',tag:'ethics',done:false},{name:'response post',tag:'gender in media',done:false},{name:'case brief',tag:'law',done:false},{name:'essay outline',tag:'innovation in media',done:false}]},
      {id:'language', name:'Language',         color:'#D08A92', tasks:[{name:'flashcards review',tag:'korean',done:false},{name:'verbs drill',tag:'italian',done:false}]},
      {id:'hoe',      name:'House of Eras',    color:'#B84A52', tasks:[{name:'example task - add your own',tag:'',done:false}]},
      {id:'atelier',  name:'Atelier',          color:'#E8B74A', tasks:[{name:'example task - add your own',tag:'',done:false}]},
      {id:'messages', name:'Messages to Send', color:'#E95FB8', tasks:[{name:'example task - add your own',tag:'',done:false}]},
      {id:'other',    name:'Other',            color:'#8B86A3', tasks:[{name:'example task - add your own',tag:'',done:false}]},
    ],
    places: [
      {name:'Joe\u2019s Coffee', note:'12:30 \u00b7 with Sam', date:null},
    ],
    grocery: [
      {name:'chicken thighs', done:false},
      {name:'lemons', done:false},
      {name:'garlic', done:false},
      {name:'pasta', done:false},
      {name:'parmesan', done:false},
    ],
  }
};
const KEY = 'katch-demo-v3';
const SUPABASE_URL = 'https://mkiuzakwiggcnxqabxzy.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1raXV6YWt3aWdnY254cWFieHp5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM2NzAxMzcsImV4cCI6MjEwOTI0NjEzN30.64buiVe94UvkA6fiBDeU6cwVrckgCTKsP02re7TX_DQ';
let sb = null, mode = 'local', userEmail = null, uid = null, syncTimer = null, booted = false;
const EMPTY_SEED = () => ({ events:[], routines:[], places:[], grocery:[],
  buckets:[
    {id:'classes',  name:'Classes',          color:'#BFB065', tasks:[]},
    {id:'language', name:'Language',         color:'#D08A92', tasks:[]},
    {id:'hoe',      name:'House of Eras',    color:'#B84A52', tasks:[]},
    {id:'atelier',  name:'Atelier',          color:'#E8B74A', tasks:[]},
    {id:'messages', name:'Messages to Send', color:'#E95FB8', tasks:[]},
    {id:'other',    name:'Other',            color:'#8B86A3', tasks:[]},
  ]});
let state, view = {tab:'today', bucket:null, date:null};
const iso = d => d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
const TODAY = iso(new Date());
const selDate = () => view.date || TODAY;
const WD = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const MN = ['January','February','March','April','May','June','July','August','September','October','November','December'];
function parseDay(s){ const [y,m,d]=s.split('-').map(Number); return new Date(y,m-1,d); }
function mondayOf(d){ const x=new Date(d); const off=(x.getDay()+6)%7; x.setDate(x.getDate()-off); return x; }
function addDays(d,n){ const x=new Date(d); x.setDate(x.getDate()+n); return x; }
const fmtShort = s => { const d=parseDay(s); return MN[d.getMonth()].slice(0,3)+' '+d.getDate(); };
const fmtDayName = s => WD[parseDay(s).getDay()];
function load(){
  CONFIG.seed.events.forEach(e=>{ if(!e.date) e.date = TODAY; });
  try{ const s = localStorage.getItem(KEY); if(s){ state = JSON.parse(s);
    if(!state.grocery) state.grocery = JSON.parse(JSON.stringify(CONFIG.seed.grocery));
    (state.events||[]).forEach(e=>{ if(!e.date) e.date = TODAY; });
    (state.places||[]).forEach(p=>{ if(!p.date) p.date = TODAY; });
    return; } }catch(e){}
  CONFIG.seed.places.forEach(p=>{ if(!p.date) p.date = TODAY; });
  state = JSON.parse(JSON.stringify(CONFIG.seed));
  save();
}
function save(){
  try{ localStorage.setItem(cacheKey(), JSON.stringify(state)); }catch(e){}
  if(mode==='cloud' && sb && uid){
    clearTimeout(syncTimer);
    syncTimer = setTimeout(async ()=>{
      try{ await sb.from('user_state').upsert({user_id: uid, state: state, updated_at: new Date().toISOString()}); }catch(e){}
    }, 600);
  }
}
const cacheKey = () => mode==='cloud' && uid ? KEY+'-'+uid : KEY;
const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const bucket = id => state.buckets.find(b => b.id === id) || state.buckets.find(b => b.id === 'other');

const IMGBUCKET = 'plan-images';
const imgUrlCache = {};
function downscaleImage(file){
  return new Promise((resolve,reject)=>{
    const img = new Image();
    img.onload = ()=>{
      const max = 1280; let w = img.naturalWidth, h = img.naturalHeight;
      if(Math.max(w,h) > max){ const s = max/Math.max(w,h); w = Math.round(w*s); h = Math.round(h*s); }
      const c = document.createElement('canvas'); c.width=w; c.height=h;
      c.getContext('2d').drawImage(img,0,0,w,h);
      c.toBlob(b=> b?resolve(b):reject(new Error('image processing failed')),'image/jpeg',0.85);
      URL.revokeObjectURL(img.src);
    };
    img.onerror = ()=>{ URL.revokeObjectURL(img.src); reject(new Error('could not read that image')); };
    img.src = URL.createObjectURL(file);
  });
}
function blobToDataURL(blob){ return new Promise((res,rej)=>{ const r=new FileReader(); r.onload=()=>res(r.result); r.onerror=rej; r.readAsDataURL(blob); }); }
async function uploadPlanImage(file){
  const blob = await downscaleImage(file);
  const path = uid + '/' + Date.now() + '.jpg';
  const {error} = await sb.storage.from(IMGBUCKET).upload(path, blob, {contentType:'image/jpeg'});
  if(error) throw error;
  return path;
}
async function hydrateImages(){
  if(mode!=='cloud' || !sb) return;
  for(const img of document.querySelectorAll('img[data-imgpath]')){
    const p = img.dataset.imgpath;
    try{
      const hit = imgUrlCache[p];
      if(hit && hit.exp > Date.now()){ img.src = hit.url; continue; }
      const {data} = await sb.storage.from(IMGBUCKET).createSignedUrl(p, 3600);
      if(data && data.signedUrl){ imgUrlCache[p] = {url:data.signedUrl, exp:Date.now()+50*60*1000}; img.src = data.signedUrl; }
    }catch(e){}
  }
}
function planFormHTML(ev, editIdx){
  const d = ev.date || selDate();
  return `<form class="planform" data-planform${editIdx!=null?` data-edit-idx="${editIdx}"`:''}>
    <input data-f-title type="text" placeholder="Plan title" value="${esc(ev.title||'')}" autocomplete="off">
    <div class="fgrid">
      <label>Date<input data-f-date type="date" value="${d}"></label>
      <label>Time<input data-f-time type="text" placeholder="Anytime" value="${esc(ev.time&&ev.time!=='Anytime'?ev.time:'')}" autocomplete="off"></label>
    </div>
    <label class="flab">Bucket<select data-f-bucket>${state.buckets.map(b=>`<option value="${b.id}"${b.id===(ev.bucket||'other')?' selected':''}>${esc(b.name)}</option>`).join('')}</select></label>
    <input data-f-place type="text" placeholder="Place (optional)" value="${esc(ev.place||'')}" autocomplete="off">
    <input data-f-link type="url" placeholder="Link (optional)" value="${esc(ev.link||'')}" autocomplete="off">
    <textarea data-f-note placeholder="Notes (optional)" rows="2">${esc(ev.note||'')}</textarea>
    <label class="imgpick"><span data-imglabel>${ev.imgpath||ev.photo?'Change photo':'Add a photo'}</span><input data-f-img type="file" accept="image/*" hidden></label>
    <label class="doorchk"><input data-f-door type="checkbox"${ev.door?' checked':''}> Attach recipes &amp; grocery list</label>
    <div class="ferr" data-ferr hidden></div>
    <button type="submit" class="saveplan">${editIdx!=null?'Save changes':'Add plan'}</button>
    ${editIdx!=null?'<button type="button" class="cancelplan" data-cancel-edit>Cancel</button>':''}
  </form>`;
}

function render(){
  const sd = selDate();
  const dayEvents = state.events.filter(e=>e.date===sd);
  document.querySelector('h1.day').textContent = fmtDayName(sd);
  const dayPlaces = state.places.filter(p=>!p.date || p.date===sd);
  document.getElementById('dateSummary').textContent = `${fmtShort(sd)} \u00b7 ${dayEvents.length} plan${dayEvents.length===1?'':'s'} \u00b7 ${dayPlaces.length} place${dayPlaces.length===1?'':'s'}`;
  const mon = mondayOf(new Date());
  document.getElementById('week').innerHTML = ['M','T','W','T','F','S','S'].map((d,i)=>{
    const dd = addDays(mon,i), di = iso(dd);
    return `<button class="d${di===TODAY?' today':''}${di===sd?' sel':''}" data-day="${di}"><span>${d}</span><span class="n">${dd.getDate()}</span></button>`;
  }).join('');
  const app = document.getElementById('app');
  if(view.view==='event') app.innerHTML = viewEventDetail(view.eventIndex);
  else if(view.view==='event-edit') app.innerHTML = `<button class="backlink" data-open-event="${view.eventIndex}">\u2190 Back</button><div class="detail">${planFormHTML(state.events[view.eventIndex]||{}, view.eventIndex)}</div>` + footnote();
  else if(view.view==='recipes') app.innerHTML = viewRecipes();
  else if(view.view==='grocery') app.innerHTML = viewGrocery();
  else if(view.tab==='today') app.innerHTML = viewToday();
  else if(view.tab==='month') app.innerHTML = viewMonth();
  else if(view.tab==='places') app.innerHTML = viewPlaces();
  else app.innerHTML = view.bucket ? viewBucketDetail(view.bucket) : viewBuckets();
  const ICONS = {today:`<path d="M3 5h.01"/><path d="M3 12h.01"/><path d="M3 19h.01"/><path d="M8 5h13"/><path d="M8 12h13"/><path d="M8 19h13"/>`,month:`<path d="M8 2v3"/><path d="M16 2v3"/><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M8 13h.01"/><path d="M12 13h.01"/><path d="M16 13h.01"/><path d="M8 17h.01"/><path d="M12 17h.01"/><path d="M16 17h.01"/>`,buckets:`<path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z"/><circle cx="7.5" cy="7.5" r=".5" fill="currentColor"/>`,places:`<path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/>`};
  document.getElementById('tabbar').innerHTML = [['today','Today'],['month','Month'],['buckets','Buckets'],['places','Places']]
    .map(([id,l])=>`<button class="${view.tab===id?'on':''}" data-tab="${id}"><span class="g"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICONS[id]}</svg></span>${l}</button>`).join('');
  bind();
  hydrateImages();
}
function viewToday(){
  const sd = selDate();
  const todays = state.events.filter(e=>e.date===sd);
  const feats = todays.filter(e=>e.next), rest = todays.filter(e=>!e.next);
  let h = `<div class="section"><h2>The lineup</h2><span>${todays.length} ${sd===TODAY?'today':fmtShort(sd)}</span></div>`;
  if(!todays.length) h += `<div class="card" style="padding:18px;text-align:center;color:var(--mut);font-size:13px">No plans ${sd===TODAY?'today':'on '+fmtShort(sd)} yet.</div>`;
  feats.forEach(ev=>{ const b = bucket(ev.bucket);
    h += `<div class="feat"><span class="strip" style="background:${b.color}"></span>
      <div class="up">Up next \u00b7 ${esc(ev.time)}</div><h3>${esc(ev.title)}</h3><div class="sub">${esc(ev.note)}</div>
      <div class="row"><span class="btag"><span class="dot" style="background:${b.color}"></span>${esc(b.name)}</span>
      <button class="openbtn" data-open-event="${state.events.indexOf(ev)}">Open \u2192</button></div></div>`; });
  if(feats.length||rest.length){ h += `<div class="card">` + rest.map((ev)=>{ const b = bucket(ev.bucket); const i = state.events.indexOf(ev);
    return `<div class="evrow${ev.done?' done':''}" data-open-event="${i}">
      <span class="strip" style="background:${b.color}"></span>
      <span class="chk evchk" data-toggle-event="${i}"></span>
      ${ev.photo?`<img src="${ev.photo}" alt="">`:''}
      <span class="tt"><span class="name"><span class="star">\u2605</span>${esc(ev.title)}</span>
      <span class="meta"><span class="dot" style="background:${b.color}"></span>${esc(ev.time)}
      ${ev.place?`<span>\u00b7</span><span class="place">${esc(ev.place)}</span>`:''}
      ${ev.door?`<span>\u00b7</span><span class="door">${esc(typeof ev.door==='string'?ev.door:'recipes + list')}</span>`:''}</span></span>
      <span class="arr">\u2192</span></div>`; }).join('') + `</div>`; }
  const done = state.routines.filter(r=>r.done).length;
  h += `<div class="card" style="margin-top:12px"><div class="routhead"><h3>Routines</h3><em>the daily drill</em><span>${done}/${state.routines.length}</span></div>`
    + state.routines.map((r,i)=>{ const b = bucket(r.bucket);
      return `<button class="routrow${r.done?' done':''}" data-toggle-routine="${i}"><span class="bdot" style="background:${b.color}"></span><span class="chk"></span><span class="nm">${esc(r.name)}</span></button>`; }).join('')
    + `</div>`;
  h += `<button class="quickadd" data-quickadd>+ Add to today</button>`;
  h += `<div data-qawrap hidden>${planFormHTML({})}</div>`;
  h += footnote(); return h;
}
function viewMonth(){
  const now = new Date(); const y = now.getFullYear(), m = now.getMonth();
  const firstD = new Date(y,m,1); const first = (firstD.getDay()+6)%7; // leading cells from prev month
  const dimStart = new Date(y,m,1-first);
  const daysIn = new Date(y,m+1,0).getDate();
  const byDay = {};
  state.events.forEach(e=>{ const d=parseDay(e.date); if(d.getFullYear()===y&&d.getMonth()===m){ (byDay[d.getDate()] = byDay[d.getDate()]||[]).push(bucket(e.bucket).color); } });
  let h = `<div class="section"><h2>${MN[m]} ${y}</h2><span>${mode==='cloud'?'':'demo'}</span></div><div class="card"><div class="mgrid">`;
  ['M','T','W','T','F','S','S'].forEach(d=> h += `<div class="h">${d}</div>`);
  for(let i=0;i<first;i++) h += `<div class="c dim">${dimStart.getDate()+i}</div>`;
  for(let d=1;d<=daysIn;d++){
    const dots = byDay[d] ? `<span style="display:flex;gap:2px">${byDay[d].map(c=>`<span class="ed" style="background:${c}"></span>`).join('')}</span>` : '';
    h += `<div class="c tap${iso(new Date(y,m,d))===TODAY?' today':''}" data-mday="${iso(new Date(y,m,d))}">${d}${dots}</div>`;
  }
  return h + `</div></div>` + footnote();
}
function viewPlaces(){
  let h = `<div class="section"><h2>Places</h2><span>${state.places.length}</span></div><div class="card">`;
  if(!state.places.length) h += `<div style="padding:16px;text-align:center;color:var(--mut);font-size:13px">No places yet - add one below.</div>`;
  return h
    + state.places.map(p=>`<div class="placecard"><span class="pin">\u2691</span><span><div class="nm">${esc(p.name)}</div><div class="nt">${esc(p.note)}</div></span>
       <a href="https://maps.google.com/?q=${encodeURIComponent(p.name)}" target="_blank" rel="noopener">Map \u2192</a></div>`).join('')
    + `<div class="addtask"><input id="newPlace" placeholder="add a place\u2026"><button data-add-place>Add</button></div>`
    + `</div>` + footnote();
}
function viewBuckets(){
  return `<div class="section"><h2>Buckets</h2><span>${state.buckets.length}</span></div><div class="card">`
    + state.buckets.map(b=>{ const open = b.tasks.filter(t=>!t.done).length;
      return `<button class="buckrow" data-open-bucket="${b.id}"><span class="dot" style="background:${b.color}"></span><span class="nm">${esc(b.name)}</span><span class="ct">${open} open</span><span class="arr">\u2192</span></button>`; }).join('')
    + `</div>` + footnote();
}
function viewBucketDetail(id){
  const b = bucket(id);
  return `<button class="backlink" data-back-buckets>\u2190 All buckets</button>
    <div class="section"><h2 style="color:${b.color}">${esc(b.name)}</h2><span>${b.tasks.filter(t=>!t.done).length} open</span></div>
    <div class="card">`
    + b.tasks.map((t,i)=>`<button class="taskrow${t.done?' done':''}" data-toggle-task="${i}" style="border-left:4px solid ${b.color}"><span class="chk"></span><span class="nm">${esc(t.name)}</span>${t.tag?`<span class="tag">${esc(t.tag)}</span>`:''}</button>`).join('')
    + `<div class="addtask"><input id="newTask" placeholder="add a task\u2026"><button data-add-task>Add</button></div>
    <div class="editbar">
      <label>Bucket name</label><input type="text" id="bucketName" value="${esc(b.name)}">
      <label>Bucket color</label><div class="swatches">${SWATCHES.map(c=>`<button class="${c.toLowerCase()===b.color.toLowerCase()?'sel':''}" style="background:${c}" data-color="${c}"></button>`).join('')}</div>
    </div></div>` + footnote();
}
function viewEventDetail(i){
  const ev = state.events[i];
  if(!ev) return `<button class="backlink" data-back-today>\u2190 Today</button><div class="card" style="padding:18px;color:var(--mut);font-size:13px">That plan was removed.</div>` + footnote();
  const b = bucket(ev.bucket);
  let h = `<button class="backlink" data-back-today>\u2190 Today</button>
    <div class="detail">`
    + (ev.imgpath?`<img class="hero" data-imgpath="${esc(ev.imgpath)}" alt="">`:(ev.photo?`<img class="hero" src="${ev.photo}" alt="">`:''))
    + `<h2 class="dtitle"><span class="star">\u2605</span> ${esc(ev.title)}</h2>
    <div class="dmeta"><span class="dot" style="background:${b.color}"></span>${esc(ev.time)} \u00b7 ${esc(b.name)} \u00b7 ${fmtShort(ev.date)}</div>`
    + (ev.note?`<div class="dnote">${esc(ev.note)}</div>`:'')
    + (ev.place?`<div class="dplace"><span class="pin">\u2691</span>${esc(ev.place)} <a href="https://maps.google.com/?q=${encodeURIComponent(ev.place)}" target="_blank" rel="noopener">Map \u2192</a></div>`:'')
    + (ev.link?`<div class="dplace"><a href="${esc(ev.link)}" target="_blank" rel="noopener">Open link \u2192</a></div>`:'')
    + `<button class="donebtn${ev.done?' on':''}" data-toggle-event="${i}">${ev.done?'Done \u2713':'Mark done'}</button>
    <div class="dbtns"><button class="editbtn" data-edit-event="${i}">Edit</button>
    <button class="delbtn" data-del-event="${i}">Delete</button></div>`;
  if(ev.door){
    h += `<div class="doorhead">Open the door</div><div class="doorcards">
      <button class="doorcard" data-open-recipes><span class="dc-t">Recipes</span><span class="dc-s">2 sample recipes</span><span class="arr">\u2192</span></button>
      <button class="doorcard" data-open-grocery><span class="dc-t">Grocery list</span><span class="dc-s">${state.grocery.filter(g=>!g.done).length} to get</span><span class="arr">\u2192</span></button>
    </div>`;
  }
  return h + `</div>` + footnote();
}
function viewRecipes(){
  const ev = state.events[view.eventIndex];
  return `<button class="backlink" data-open-event="${view.eventIndex}">\u2190 ${esc(ev?ev.title:'Back')}</button>
    <div class="section"><h2>Recipes</h2><span>sample</span></div><div class="card">
    <div class="recipe"><h4>Lemon herb chicken</h4><p>Chicken thighs, lemon, garlic, olive oil, thyme. Sear 6 min a side, rest 5. ~25 min.</p></div>
    <div class="recipe"><h4>Garlic butter pasta</h4><p>Pasta, garlic, butter, parmesan, pasta water. One pan, ~15 min.</p></div>
    </div>` + footnote();
}
function viewGrocery(){
  const left = state.grocery.filter(g=>!g.done).length;
  const ev = state.events[view.eventIndex];
  return `<button class="backlink" data-open-event="${view.eventIndex}">\u2190 ${esc(ev?ev.title:'Back')}</button>
    <div class="section"><h2>Grocery list</h2><span>${left} to get</span></div><div class="card">`
    + state.grocery.map((g,i)=>`<button class="taskrow${g.done?' done':''}" data-toggle-grocery="${i}"><span class="chk"></span><span class="nm">${esc(g.name)}</span></button>`).join('')
    + `<div class="addtask"><input id="newGrocery" placeholder="add an item\u2026"><button data-add-grocery>Add</button></div></div>` + footnote();
}
function footnote(){
  if(mode==='cloud') return `<div class="footnote">Private to your account in Katch.</div>`;
  return `<div class="footnote">Demo content - example data only, not anyone\u2019s real plans.<br>Edits save in this browser (localStorage).</div>
          <button class="reset" data-reset>Reset demo</button>`;
}
function bind(){
  document.querySelectorAll('[data-tab]').forEach(el=> el.onclick = ()=>{ view = {tab:el.dataset.tab, bucket:null}; render(); });
  document.querySelectorAll('[data-day]').forEach(el=> el.onclick = ()=>{ view.date = el.dataset.day; view.view = null; render(); });
  document.querySelectorAll('[data-toggle-event]').forEach(el=> el.onclick = (ev)=>{ ev.stopPropagation(); const e = state.events[+el.dataset.toggleEvent]; e.done = !e.done; save(); render(); });
  document.querySelectorAll('[data-open-event]').forEach(el=> el.onclick = ()=>{ view = {tab:'today', view:'event', eventIndex:+el.dataset.openEvent}; render(); });
  document.querySelectorAll('[data-back-today]').forEach(el=> el.onclick = ()=>{ view = {tab:'today'}; render(); });
  document.querySelectorAll('[data-open-recipes]').forEach(el=> el.onclick = ()=>{ view = {tab:'today', view:'recipes', eventIndex:view.eventIndex}; render(); });
  document.querySelectorAll('[data-open-grocery]').forEach(el=> el.onclick = ()=>{ view = {tab:'today', view:'grocery', eventIndex:view.eventIndex}; render(); });
  document.querySelectorAll('[data-toggle-grocery]').forEach(el=> el.onclick = ()=>{ const g = state.grocery[+el.dataset.toggleGrocery]; g.done = !g.done; save(); render(); });
  const ag = document.querySelector('[data-add-grocery]');
  if(ag) ag.onclick = ()=>{ const inp = document.getElementById('newGrocery'); const v = inp.value.trim();
    if(v){ state.grocery.push({name:v, done:false}); save(); render(); } };
  document.querySelectorAll('[data-toggle-routine]').forEach(el=> el.onclick = ()=>{ const r = state.routines[+el.dataset.toggleRoutine]; r.done = !r.done; save(); render(); });
  document.querySelectorAll('[data-open-bucket]').forEach(el=> el.onclick = ()=>{ view.bucket = el.dataset.openBucket; render(); });
  document.querySelectorAll('[data-back-buckets]').forEach(el=> el.onclick = ()=>{ view.bucket = null; render(); });
  document.querySelectorAll('[data-toggle-task]').forEach(el=> el.onclick = ()=>{ const t = bucket(view.bucket).tasks[+el.dataset.toggleTask]; t.done = !t.done; save(); render(); });
  document.querySelectorAll('[data-color]').forEach(el=> el.onclick = ()=>{ bucket(view.bucket).color = el.dataset.color; save(); render(); });
  const bn = document.getElementById('bucketName');
  if(bn) bn.oninput = ()=>{ bucket(view.bucket).name = bn.value; save();
    const h = document.querySelector('.section h2'); if(h) h.textContent = bn.value; };
  const at = document.querySelector('[data-add-task]');
  if(at) at.onclick = ()=>{ const inp = document.getElementById('newTask'); const v = inp.value.trim();
    if(v){ bucket(view.bucket).tasks.push({name:v, tag:'', done:false}); save(); render(); } };
  const qa = document.querySelector('[data-quickadd]');
  const qw = document.querySelector('[data-qawrap]');
  if(qa && qw){
    qa.onclick = ()=>{ qw.hidden = false; qa.hidden = true; qw.querySelector('[data-f-title]').focus(); };
  }
  const pf = document.querySelector('[data-planform]');
  if(pf){
    const fi = pf.querySelector('[data-f-img]');
    fi.onchange = ()=>{ pf.querySelector('[data-imglabel]').textContent = fi.files[0] ? fi.files[0].name : 'Add a photo'; };
    pf.onsubmit = async (e)=>{
      e.preventDefault();
      const btn = pf.querySelector('.saveplan');
      const title = pf.querySelector('[data-f-title]').value.trim();
      if(!title){ pf.querySelector('[data-f-title]').focus(); return; }
      btn.disabled = true; btn.textContent = 'Saving\u2026';
      const editIdx = pf.dataset.editIdx!=null ? +pf.dataset.editIdx : null;
      const ev = editIdx!=null ? state.events[editIdx] : {done:false};
      ev.title = title;
      ev.date = pf.querySelector('[data-f-date]').value || selDate();
      ev.time = pf.querySelector('[data-f-time]').value.trim() || 'Anytime';
      ev.bucket = pf.querySelector('[data-f-bucket]').value;
      ev.place = pf.querySelector('[data-f-place]').value.trim();
      ev.link = pf.querySelector('[data-f-link]').value.trim();
      ev.note = pf.querySelector('[data-f-note]').value.trim();
      ev.door = pf.querySelector('[data-f-door]').checked;
      const file = fi.files[0];
      if(file){
        try{
          if(mode==='cloud'){ ev.imgpath = await uploadPlanImage(file); delete ev.photo; }
          else { ev.photo = await blobToDataURL(await downscaleImage(file)); }
        }catch(err){
          const fe = pf.querySelector('[data-ferr]'); fe.hidden = false; fe.textContent = 'Photo upload failed - the plan was saved without it. You can retry from Edit.';
        }
      }
      if(editIdx==null) state.events.push(ev);
      if(ev.place && !state.places.some(p=>p.name===ev.place)) state.places.push({name:ev.place, note:ev.time, date:ev.date});
      save();
      view = editIdx!=null ? {tab:'today', view:'event', eventIndex:editIdx} : {tab:'today', date:ev.date};
      render();
    };
  }
  document.querySelectorAll('[data-edit-event]').forEach(el=> el.onclick = ()=>{ view = {tab:'today', view:'event-edit', eventIndex:+el.dataset.editEvent}; render(); });
  document.querySelectorAll('[data-cancel-edit]').forEach(el=> el.onclick = ()=>{ view = {tab:'today', view:'event', eventIndex:view.eventIndex}; render(); });
  document.querySelectorAll('[data-del-event]').forEach(el=> el.onclick = ()=>{
    if(el.dataset.armed){ state.events.splice(+el.dataset.delEvent, 1); save(); view = {tab:'today'}; render(); }
    else { el.dataset.armed = '1'; el.textContent = 'Tap again to delete'; el.classList.add('armed'); }
  });
  document.querySelectorAll('[data-mday]').forEach(el=> el.onclick = ()=>{ view = {tab:'today', date:el.dataset.mday}; render(); });
  const ap = document.querySelector('[data-add-place]');
  if(ap) ap.onclick = ()=>{ const inp = document.getElementById('newPlace'); const v = inp.value.trim();
    if(v){ state.places.push({name:v, note:'', date:null}); save(); render(); } };
  const rs = document.querySelector('[data-reset]');
  if(rs) rs.onclick = ()=>{ localStorage.removeItem(KEY); load(); view = {tab:'today', bucket:null}; render(); };
}
async function loadCloud(){
  const {data, error} = await sb.from('user_state').select('state').eq('user_id', uid).maybeSingle();
  if(!error && data && data.state && Object.keys(data.state).length){
    state = data.state;
    (state.events||[]).forEach(e=>{ if(!e.date) e.date = TODAY; });
    if(!state.grocery) state.grocery = [];
    try{ localStorage.setItem(cacheKey(), JSON.stringify(state)); }catch(e){}
  } else {
    state = EMPTY_SEED();
    try{ await sb.from('user_state').upsert({user_id: uid, state: state, updated_at: new Date().toISOString()}); }catch(e){}
  }
}
function renderAuth(msg){
  document.querySelector('header').style.display = 'none';
  document.getElementById('app').innerHTML = '';
  document.getElementById('tabbar').innerHTML = '';
  const a = document.getElementById('auth');
  a.hidden = false;
  a.innerHTML = `<div class="authcard">
    <h1 class="auth-title">Katch</h1>
    <p class="auth-sub">Your plans, buckets and places - private to you.</p>
    <button class="authbtn" data-google>Continue with Google</button>
    ${msg?`<p class="auth-err">${esc(msg)}</p>`:''}
  </div>`;
  a.querySelector('[data-google]').onclick = async ()=>{
    const {error} = await sb.auth.signInWithOAuth({provider:'google', options:{redirectTo: location.origin + location.pathname}});
    if(error) renderAuth(error.message);
  };
}
function renderShell(){
  document.getElementById('auth').hidden = true;
  document.querySelector('header').style.display = '';
  const pill = document.querySelector('.demo-pill');
  const acct = document.getElementById('accountPill');
  if(mode==='cloud'){
    if(pill) pill.style.display = 'none';
    if(acct){ acct.innerHTML = `<span class="acctmail">${esc(userEmail||'')}</span> <button class="signout" data-signout>Sign out</button>`;
      acct.querySelector('[data-signout]').onclick = async ()=>{ await sb.auth.signOut(); }; }
  } else {
    if(pill) pill.style.display = '';
    if(acct) acct.innerHTML = '';
  }
  render();
}
async function enterCloud(session){
  booted = true;
  mode = 'cloud'; uid = session.user.id; userEmail = session.user.email || '';
  await loadCloud();
  renderShell();
}
async function boot(){
  if(SUPABASE_URL && SUPABASE_ANON_KEY && window.supabase){
    sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const {data:{session}} = await sb.auth.getSession();
    if(session){ await enterCloud(session); }
    else renderAuth();
    sb.auth.onAuthStateChange(async (ev, sess)=>{
      if(ev==='SIGNED_IN' && sess && (!booted || sess.user.id!==uid)){ await enterCloud(sess); }
      else if(ev==='SIGNED_OUT'){ booted = false; mode = 'local'; uid = null; userEmail = null; renderAuth(); }
    });
  } else {
    load();
    renderShell();
  }
}
if(window.supabase){ boot(); } else { load(); renderShell(); }
