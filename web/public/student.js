import {apiRoot,demoMode,pageUrl,workspaceUrl} from '/context.js';
import {renderStudentMap} from '/student-map.js';
const form=document.querySelector('#lookup-form'),sessions=document.querySelector('#lookup-session'),button=document.querySelector('#lookup-submit'),message=document.querySelector('#lookup-message'),result=document.querySelector('#lookup-result'),map=document.querySelector('#student-room-layout'),availability=document.querySelector('#lookup-availability'),refresh=document.querySelector('#lookup-refresh');
const e=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let published=[],loading=false,lookupBusy=false,shownSession='',shownVersion=null,online=false;
if(demoMode){document.title='Find your seat · Seyra practice';document.querySelector('.brand').href=pageUrl('/student');document.querySelector('#demo-rolls').classList.remove('hidden');const banner=document.createElement('div');banner.className='student-demo-banner';banner.innerHTML='<span class="sandbox-badge">PRACTICE MODE</span><span>Published example ready · try <b>0001</b> or <b>0031</b>.</span><a href="/demo">Back to practice workspace ↗</a>';document.querySelector('.portal-intro').before(banner);}
function controls(){sessions.disabled=loading||lookupBusy||!online||!published.length;button.disabled=loading||lookupBusy||!online||!sessions.value;refresh.disabled=loading||lookupBusy;document.querySelectorAll('[data-sample-roll]').forEach(b=>b.disabled=button.disabled);}
function clearMap(){map.classList.add('hidden');map.innerHTML='';shownSession='';shownVersion=null;}
function placeholder(title,description){clearMap();result.className='card portal-card portal-placeholder';result.innerHTML=`<h2>${e(title)}</h2><p>${e(description)}</p>`;}
async function load({manual=false}={}){
  if(loading||lookupBusy)return;loading=true;controls();if(manual)refresh.textContent='Refreshing…';
  try{
    const response=await fetch(apiRoot+'public/sessions',{cache:'no-store',signal:AbortSignal.timeout(25000)}),data=await response.json();if(!response.ok)throw new Error(data.error||'Could not load exams.');if(!Array.isArray(data))throw Error('The exam list could not be read.');
    online=true;published=data;const previous=sessions.value;
    sessions.innerHTML=data.length?'<option value="">Choose your exam sitting</option>'+data.map(s=>`<option value="${s.id}">${e(s.name)} · ${e(s.exam_date)} ${e(s.start_time.slice(0,5))}</option>`).join(''):'<option value="">No published exams yet</option>';
    sessions.value=data.some(s=>String(s.id)===previous)?previous:data.length===1?String(data[0].id):'';
    availability.classList.remove('offline');availability.textContent=data.length?`${data.length===1?'One published exam is ready.':'Choose one of the published exams.'} Enter your full roll number below.`:'No plan has been published yet. This page will update automatically after publication.';
    if(shownSession&&!data.some(s=>String(s.id)===shownSession&&Number(s.version_no)===Number(shownVersion))){placeholder('The publication has changed.','Search again to see your current assignment.');message.textContent='The coordinator changed or withdrew the plan. Please look up your seat again.';}
    if(!data.length){placeholder('Waiting for a published plan.','The coordinator must generate, review and publish a plan before students can find seats.');result.insertAdjacentHTML('beforeend',`<a href="${workspaceUrl}">Open ${demoMode?'practice workspace':'coordinator'} ↗</a>`);message.textContent=demoMode?'The practice publication was withdrawn. Publish a replacement in the practice workspace.':'Ask your coordinator to publish this sitting. You can leave this page open.';}
    else if(manual)message.textContent='Exam list refreshed. Choose your sitting and look up your seat.';
  }catch(error){online=false;availability.classList.add('offline');availability.textContent='Cannot reach the server. Choose Refresh exam list to retry.';placeholder('Connection unavailable.','Your previous seat is hidden until the current publication can be checked.');message.textContent=error.name==='TimeoutError'?'The server took too long. Please retry.':error.message||'Unable to load sessions.';}
  finally{loading=false;refresh.textContent='Refresh exam list ↻';controls();}
}
sessions.addEventListener('change',()=>{placeholder('Ready for this sitting.','Enter your roll number and choose Find my seat.');message.textContent='';controls();});
refresh.addEventListener('click',()=>load({manual:true}));
document.querySelectorAll('[data-sample-roll]').forEach(sample=>sample.addEventListener('click',()=>{document.querySelector('#lookup-roll').value=sample.dataset.sampleRoll;form.requestSubmit();}));
form.addEventListener('submit',async event=>{
  event.preventDefault();if(lookupBusy||loading||!form.reportValidity())return;
  const session=sessions.value,roll=document.querySelector('#lookup-roll').value.trim().toUpperCase();
  lookupBusy=true;controls();button.textContent='Finding your seat…';message.textContent='';placeholder('Checking the published plan…','');
  try{
    const response=await fetch(`${apiRoot}public/sessions/${encodeURIComponent(session)}/assignment?roll=${encodeURIComponent(roll)}`,{cache:'no-store',signal:AbortSignal.timeout(25000)}),data=await response.json();if(!response.ok)throw new Error(data.error||'Lookup failed.');
    result.className='card portal-card assignment-card';result.innerHTML=`<p class="eyebrow">${demoMode?'PRACTICE':'YOUR PUBLISHED'} ASSIGNMENT</p><h2>${e(data.room_code)}</h2><div class="assignment-roll">${e(data.roll)}</div><div class="assignment-position"><div><span>ROW</span><strong>${e(data.row_no)}</strong></div><div><span>BENCH</span><strong>${e(data.bench_no)}</strong></div><div><span>SEAT</span><strong>${e(data.seat_label)}</strong></div></div><p>${e(data.session_name)}<br>${e(data.exam_date)} · ${e(data.start_time.slice(0,5))}–${e(data.end_time.slice(0,5))} IST</p><p>Published version ${e(data.version_no)} · Check again if the coordinator announces a change.</p><button type="button" class="button ghost" id="show-my-seat">View my seat in the room ↓</button>`;
    map.innerHTML=renderStudentMap(data);map.classList.remove('hidden');shownSession=session;shownVersion=data.version_no;document.querySelector('#show-my-seat').addEventListener('click',()=>map.querySelector('.your-seat')?.scrollIntoView({block:'center',inline:'center',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'}));message.textContent='Assignment found.';
  }catch(error){placeholder('No assignment to show.','Check the sitting and roll number, or ask your coordinator.');message.textContent=error.name==='TimeoutError'?'The server took too long. Please retry.':error.message||'Lookup failed. Please retry.';}
  finally{lookupBusy=false;button.textContent='Find my seat →';controls();}
});
window.addEventListener('focus',()=>load());document.addEventListener('visibilitychange',()=>{if(!document.hidden)load();});
setInterval(()=>{if(!document.hidden)load();},30000);
load();
