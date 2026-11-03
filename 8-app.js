/* Katch demo v3 - J direction: dark plum depth, Fraunces serif, violet accent.
   Functional: editable bucket names + colors with persistence, checkable events/tasks/routines.
   Demo content only - not Kat's real data. */
const SWATCHES = ['#BFB065','#D08A92','#B84A52','#E8B74A','#E95FB8','#8B86A3','#8A5CF6','#A9C0CB','#7FB069','#E8843C'];
const CONFIG = {
  seed: {
    events: [
      {time:'9:00 AM',  title:'Ethics Seminar', bucket:'classes', note:'Reading discussion', done:false, next:true},
      {time:'12:30 PM', title:'Lunch with Sam', bucket:'other',   note:'', place:'Joe\u2019s Coffee', done:false, photo:'coffee.jpg'},
      {time:'6:30 PM',  title:'Lemon chicken night', bucket:'hoe', note:'', door:'2 recipes + list', done:false, photo:'meal-hero2.jpg'},
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
      {name:'Joe\u2019s Coffee', note:'12:30 \u00b7 with Sam'},
    ],
  }
};
const KEY = 'katch-demo-v3';
let state, view = {tab:'today', bucket:null};
function load(){
  try{ const s = localStorage.getItem(KEY); if(s){ state = JSON.parse(s); return; } }catch(e){}
  state = JSON.parse(JSON.stringify(CONFIG.seed));
  save();
}
function save(){ try{ localStorage.setItem(KEY, JSON.stringify(state)); }catch(e){} }
const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const bucket = id => state.buckets.find(b => b.id === id) || state.buckets.find(b => b.id === 'other');

function render(){
  document.getElementById('dateSummary').textContent = `Nov 2 \u00b7 ${state.events.length} plans \u00b7 ${state.places.length} place`;
  const days = ['M','T','W','T','F','S','S'];
  document.getElementById('week').innerHTML = days.map((d,i)=>
    `<div class="d${i===0?' today':''}"><span>${d}</span><span class="n">${2+i}</span></div>`).join('');
  const app = document.getElementById('app');
  if(view.tab==='today') app.innerHTML = viewToday();
  else if(view.tab==='month') app.innerHTML = viewMonth();
  else if(view.tab==='places') app.innerHTML = viewPlaces();
  else app.innerHTML = view.bucket ? viewBucketDetail(view.bucket) : viewBuckets();
  const ICONS = {today:`<path d="M3 5h.01"/><path d="M3 12h.01"/><path d="M3 19h.01"/><path d="M8 5h13"/><path d="M8 12h13"/><path d="M8 19h13"/>`,month:`<path d="M8 2v3"/><path d="M16 2v3"/><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M8 13h.01"/><path d="M12 13h.01"/><path d="M16 13h.01"/><path d="M8 17h.01"/><path d="M12 17h.01"/><path d="M16 17h.01"/>`,buckets:`<path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z"/><circle cx="7.5" cy="7.5" r=".5" fill="currentColor"/>`,places:`<path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/>`};
  document.getElementById('tabbar').innerHTML = [['today','Today'],['month','Month'],['buckets','Buckets'],['places','Places']]
    .map(([id,l])=>`<button class="${view.tab===id?'on':''}" data-tab="${id}"><span class="g"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICONS[id]}</svg></span>${l}</button>`).join('');
  bind();
}
function viewToday(){
  const feats = state.events.filter(e=>e.next), rest = state.events.filter(e=>!e.next);
  let h = `<div class="section"><h2>The lineup</h2><span>${state.events.length} today</span></div>`;
  feats.forEach(ev=>{ const b = bucket(ev.bucket);
    h += `<div class="feat"><span class="strip" style="background:${b.color}"></span>
      <div class="up">Up next \u00b7 ${esc(ev.time)}</div><h3>${esc(ev.title)}</h3><div class="sub">${esc(ev.note)}</div>
      <div class="row"><span class="btag"><span class="dot" style="background:${b.color}"></span>${esc(b.name)}</span>
      <button class="openbtn" data-open-event="0">Open \u2192</button></div></div>`; });
  h += `<div class="card">` + rest.map((ev)=>{ const b = bucket(ev.bucket); const i = state.events.indexOf(ev);
    return `<button class="evrow${ev.done?' done':''}" data-toggle-event="${i}">
      <span class="strip" style="background:${b.color}"></span>
      ${ev.photo?`<img src="${ev.photo}" alt="">`:''}
      <span class="tt"><span class="name"><span class="star">\u2605</span>${esc(ev.title)}</span>
      <span class="meta"><span class="dot" style="background:${b.color}"></span>${esc(ev.time)}
      ${ev.place?`<span>\u00b7</span><span class="place">${esc(ev.place)}</span>`:''}
      ${ev.door?`<span>\u00b7</span><span class="door">${esc(ev.door)}</span>`:''}</span></span>
      <span class="arr">\u2192</span></button>`; }).join('') + `</div>`;
  const done = state.routines.filter(r=>r.done).length;
  h += `<div class="card" style="margin-top:12px"><div class="routhead"><h3>Routines</h3><em>the daily drill</em><span>${done}/${state.routines.length}</span></div>`
    + state.routines.map((r,i)=>{ const b = bucket(r.bucket);
      return `<button class="routrow${r.done?' done':''}" data-toggle-routine="${i}"><span class="bdot" style="background:${b.color}"></span><span class="chk"></span><span class="nm">${esc(r.name)}</span></button>`; }).join('')
    + `</div>`;
  h += `<button class="quickadd" data-quickadd>+ Add to today</button>`;
  h += footnote(); return h;
}
function viewMonth(){
  const first = 6; // Nov 1 2026 = Sunday; grid starts Monday -> 6 leading cells
  const evDays = {2: state.events.map(e=>bucket(e.bucket).color)};
  let h = `<div class="section"><h2>November 2026</h2><span>demo</span></div><div class="card"><div class="mgrid">`;
  ['M','T','W','T','F','S','S'].forEach(d=> h += `<div class="h">${d}</div>`);
  for(let i=0;i<first;i++) h += `<div class="c dim">${26+i}</div>`;
  for(let d=1;d<=30;d++){
    const dots = evDays[d] ? `<span style="display:flex;gap:2px">${evDays[d].map(c=>`<span class="ed" style="background:${c}"></span>`).join('')}</span>` : '';
    h += `<div class="c${d===2?' today':''}">${d}${dots}</div>`;
  }
  return h + `</div></div>` + footnote();
}
function viewPlaces(){
  return `<div class="section"><h2>Places</h2><span>${state.places.length}</span></div><div class="card">`
    + state.places.map(p=>`<div class="placecard"><span class="pin">\u2691</span><span><div class="nm">${esc(p.name)}</div><div class="nt">${esc(p.note)}</div></span>
       <a href="https://maps.google.com/?q=${encodeURIComponent(p.name)}" target="_blank" rel="noopener">Map \u2192</a></div>`).join('')
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
function footnote(){
  return `<div class="footnote">Demo content - example data only, not anyone\u2019s real plans.<br>Edits save in this browser (localStorage).</div>
          <button class="reset" data-reset>Reset demo</button>`;
}
function bind(){
  document.querySelectorAll('[data-tab]').forEach(el=> el.onclick = ()=>{ view = {tab:el.dataset.tab, bucket:null}; render(); });
  document.querySelectorAll('[data-toggle-event]').forEach(el=> el.onclick = ()=>{ const e = state.events[+el.dataset.toggleEvent]; e.done = !e.done; save(); render(); });
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
  if(qa) qa.onclick = ()=>{ const v = prompt('Add to today (goes to \u201cother\u201d bucket):'); if(v && v.trim()){ bucket('other').tasks.push({name:v.trim(), tag:'', done:false}); save(); } };
  const rs = document.querySelector('[data-reset]');
  if(rs) rs.onclick = ()=>{ localStorage.removeItem(KEY); load(); view = {tab:'today', bucket:null}; render(); };
}
load();
render();
