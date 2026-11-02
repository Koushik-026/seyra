import { renderSeating, setBenchColumns } from "/seating.js";
import { roomRows, roomBenchCount, benchLabel } from "/layout.js";
import { createRoomEditor } from "/room-editor.js";
import { guideState, workflowSteps } from "/workflow.js";
import {demoMode,apiRoot,pageUrl,workspaceUrl} from '/context.js';
import {mountDemoTour,renderDemoTour,selectDemoScene} from '/demo-tour.js';
const $ = selector => document.querySelector(selector);
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const e = escapeHtml;
const roomEditor = createRoomEditor($("#room-form"));
const sessionStorageKey=demoMode?'seyra-demo-session':'planner-session';
mountDemoTour();
document.querySelectorAll('a[href="/student"]').forEach(link=>link.href=pageUrl('/student'));
document.querySelector('.brand').href=workspaceUrl;
if(demoMode){document.title='Seyra · Practice workspace';$('#open-demo').href='/';$('#open-demo').textContent='Return to your workspace ↗';}
let state = {students:[],rooms:[],sessions:[],branches:[]}, current = null, selected = localStorage.getItem(sessionStorageKey) || '', roster = new Set(), planId = null, activePlan = null, busy = false, previewValid = false, rosterDirty = false, roomsDirty = false;
const titles = {overview:['Every student. A place to belong.','Bring your roster, choose your rooms, and turn exam-day logistics into a beautifully simple plan.'],students:['A roster, ready.','The right students, in the right sitting. Start with the people behind the plan.'],rooms:['Room for everyone.','A clear view of your spaces. Configure benches, choose rooms, and make every seat count.'],plans:['Every seat, considered.','From a private draft to a published plan. Review the details, then make it official.']};
async function api(path, method = 'GET', body) {
  let response;
  try { response = await fetch(apiRoot + path, {method, headers:{'Content-Type':'application/json'}, body:body === undefined ? undefined : JSON.stringify(body), cache:'no-store',signal:AbortSignal.timeout(25000)}); }
  catch(error) { throw new Error(error.name==='TimeoutError'?'The server took too long. Refresh to check the saved state before retrying.':'Cannot reach the local server. Check that the application terminal is still running.'); }
  let data; try { data = await response.json(); } catch { throw new Error('The server returned an unreadable response.'); }
  if (!response.ok) throw new Error(data.error || 'Request failed.'); return data;
}
function notice(message, error = false) {
  $('#notice-text').textContent=message;$('#notice').className='notice'+(error?' error':'');
  const modal=document.querySelector('dialog[open]:not(#confirmation-dialog) .form-message');
  if(modal&&error){modal.textContent=message;modal.classList.remove('hidden');modal.scrollIntoView({block:'nearest'});}
}
function syncControls() {
  renderGuide();
  document.body.classList.toggle('ui-busy',busy);$('.workspace').setAttribute('aria-busy',String(busy));
  $('#connection-state').textContent=busy?'Syncing your workspace…':demoMode?'Practice workspace':'Coordinator workspace';
  for(const button of document.querySelectorAll('[data-command],[data-edit-student],[data-edit-room],[data-delete-student],[data-delete-room],#session-form button[type=submit],#student-form button[type=submit],#room-form button[type=submit]')){
    const command=button.dataset.command;let blocked=busy;
    if(command==='edit-session')blocked ||= !current || !!current.session.current_plan_id;
    if(['save-roster','roster-all','roster-none','save-rooms','generate'].includes(command))blocked ||= !current;
    if(command==='generate')blocked ||= rosterDirty||roomsDirty||!current?.capacity.students||!current?.input.rooms.length||current?.capacity.shortage>0;
    if(command==='withdraw')blocked ||= !current?.session.current_plan_id;
    if(command==='publish')blocked ||= rosterDirty||roomsDirty||!activePlan || activePlan.status!=='DRAFT' || activePlan.stale || activePlan.validationErrors.length>0;
    if(command==='discard')blocked ||= activePlan?.status!=='DRAFT';
    if(command==='commit-import')blocked ||= !previewValid || !current;
    if(command==='demo')blocked ||= state.students.length>0 || state.sessions.length>0 || state.rooms.length>0;
    button.disabled=blocked;
  }
  document.querySelectorAll('[data-room],[data-roster]').forEach(input=>input.disabled=busy||!current);
  document.querySelectorAll('[data-session-bench]').forEach(button=>{const id=button.dataset.sessionBench.split(':')[0];button.disabled=busy||button.hasAttribute('data-default-off')||!document.querySelector(`[data-room="${id}"]`)?.checked;});
  document.querySelectorAll('[data-continue]').forEach(button=>button.disabled=busy||(button.dataset.continue==='rooms'?(!current?.capacity.students||rosterDirty):(!current?.input.rooms.length||roomsDirty||rosterDirty||current?.capacity.shortage>0)));
  $('#session-select').disabled=busy||!state.sessions.length;
  $('#session-hint').textContent=busy&&!current?'Connecting to your saved sessions…':!state.sessions.length?'No sittings yet. Choose + New session above, or try the demo below.':current?.session.current_plan_id?'A plan is published. Withdraw it before editing session details.':state.sessions.length===1?'One saved sitting. Create another to switch between sessions.':'Choose the exam sitting you want to work on.';
  const demoExists=state.students.length||state.sessions.length||state.rooms.length;
  $('#demo-hint').textContent=demoMode?'You are using fictional practice records. Follow the walkthrough above.':'40 fictional students, two rooms and a guided walkthrough. Opens separately from your saved exam records.';
}
function confirmAction(message,label='Continue',title='Ready to continue?') {
  const modal=$('#confirmation-dialog');$('#confirmation-title').textContent=title;$('#confirmation-message').textContent=message;
  $('#confirmation-accept').textContent=label;$('#confirmation-accept').classList.toggle('danger',/Delete|Withdraw|Discard/.test(label));modal.returnValue='cancel';
  return new Promise(resolve=>{modal.addEventListener('close',()=>resolve(modal.returnValue==='confirm'),{once:true});modal.showModal();});
}
async function run(work) {
  if (busy) return; busy=true; syncControls();
  try { await work(); } catch(error) { notice(error.message,true); }
  finally { busy=false;syncControls(); }
}
function requireSession() { if (!selected || !current) throw new Error('Create or select an exam session first.'); return selected; }
function view(name) {
  document.body.dataset.view=name;
  window.scrollTo({top:0,behavior:'instant'});
  document.querySelectorAll('.view').forEach(v=>v.classList.toggle('hidden',v.id!==`view-${name}`));
  document.querySelectorAll('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===name));
  $('#page-label').textContent=name.toUpperCase();
  if(name==='overview')$('#page-title').innerHTML='Every student.<br><span>A place to belong.</span>';else $('#page-title').textContent=titles[name][0];
  $('#page-subtitle').textContent=titles[name][1];
}
async function refresh() {
  state=await api('admin/state');
  if(!state.sessions.some(s=>String(s.id)===String(selected))) selected=state.sessions[0]?.id ? String(state.sessions[0].id):'';
  $('#session-select').innerHTML=state.sessions.length?state.sessions.map(s=>`<option value="${s.id}" ${String(s.id)===String(selected)?'selected':''}>${e(s.name)} · ${e(s.exam_date)}</option>`).join(''):'<option value="">Create a session first</option>';
  $('#branch-select').innerHTML=state.branches.map(b=>`<option value="${e(b.code)}">${e(b.code.replaceAll('_','-'))}</option>`).join('');
  current=selected?await api(`admin/sessions/${selected}`):null;
  localStorage.setItem(sessionStorageKey,selected);roster=new Set(current?.input.students.map(s=>s.id)||[]);rosterDirty=false;roomsDirty=false;
  $('#session-meta').textContent=current?`${current.input.date} · ${current.input.start.slice(0,5)}–${current.input.end.slice(0,5)} · Asia/Kolkata`:'No session selected';
  renderOverview();renderStudents();renderRooms();renderPlans();
  if(!planId&&current?.plans.length){const guide=guideState(current);planId=(guide.draft||guide.published||current.plans[0]).id;}
  if(planId && current?.plans.some(p=>p.id===planId)) await showPlan(planId); else {planId=null;activePlan=null;$('#plan-detail').innerHTML='<div class="empty-state"><span class="empty-symbol">▦</span><h2>No plan selected</h2><p>Generate a draft or choose a version to review its room-wise seating.</p></div>';}
  syncControls();
}
function renderGuide() {
  renderDemoTour(current);
  const guide=guideState(current,{rosterDirty,roomsDirty,view:document.body.dataset.view,activePlanId:planId});
  const {next,done}=guide;
  $('#workflow-steps').innerHTML=workflowSteps.map(([label,hint],i)=>`<button type="button" class="workflow-step ${done[i]?'complete':''} ${next.step===i?'current':''}" data-step="${i}" ${next.step===i?'aria-current="step"':''}><span>${done[i]?'✓':i+1}</span><strong>${label}<small>${hint}</small></strong></button>`).join('');
  $('#workflow-position').textContent=`STEP ${next.step+1} OF 5`;
  $('#workflow-title').textContent=next.title;$('#workflow-description').textContent=next.description;
  for(const button of [$('#workflow-next'),$('#next-action')]) {
    delete button.dataset.command;delete button.dataset.goto;delete button.dataset.openPlan;
    if(next.command)button.dataset.command=next.command;
    if(next.goto)button.dataset.goto=next.goto;
    if(next.planId)button.dataset.openPlan=next.planId;
    button.textContent=next.label;button.disabled=busy;
  }
  $('#roster-save-note').textContent=rosterDirty?'Unsaved choices. Click Save roster before continuing.':current?`${current.capacity.students} appearing students saved for this sitting.`:'Create an exam session before saving a roster.';
  $('#room-save-note').textContent=roomsDirty?'Unsaved room choices. Save before generating a draft.':current?.input.rooms.length?`${current.input.rooms.length} room(s) saved · ${current.capacity.usableBenches} usable benches.`:'No room selected for this exam yet.';
}
function renderOverview() {
  const c=current?.capacity || {students:0,largestGroup:0,usableBenches:0,physicalSeats:0,requiredBenches:0,shortage:0};
  const guide=guideState(current,{rosterDirty,roomsDirty});const {published}=guide;
  $('#stats').innerHTML=[['Appearing students',c.students,'Saved exam roster'],['Usable benches',c.usableBenches,`${c.physicalSeats} usable seats`],['Benches required',c.requiredBenches,`Largest year/branch group: ${c.largestGroup}`],['Current publication',published?'v'+published.version_no:'—',published?(published.stale?'Saved inputs changed; current plan is preserved':'Visible in student lookup'):'Drafts are private']].map(([label,value,hint],i)=>`<div class="stat ${i===2?'highlight':''}"><p>${label}</p><strong>${value}</strong><small>${hint}</small></div>`).join('');
  $('#next-title').textContent=guide.next.title;$('#next-description').textContent=guide.next.description;
  const message=$('#capacity-message');message.classList.toggle('warning',!!c.shortage);
  message.textContent=!c.students?'Add the appearing students to calculate capacity.':c.shortage?`Shortage: ${c.shortage} benches. Need ${c.requiredBenches}; available ${c.usableBenches}. Students in the largest year/branch group each need a different bench.`:`Capacity fits: ${c.pairs} compatible pair${c.pairs===1?'':'s'} + ${c.singles} student${c.singles===1?'':'s'} sitting alone; ${c.requiredBenches} benches required.`;
  $('#checklist').innerHTML=workflowSteps.map(([label,hint],i)=>`<li><span class="checkmark ${guide.done[i]?'done':''}">${guide.done[i]?'✓':i+1}</span><span>${label}<small>${e(hint)}${guide.done[i]?' · saved':''}</small></span></li>`).join('');
  const groups=new Map();current?.input.students.forEach(s=>{const key=`Year ${s.year} · ${s.branch.replaceAll('_','-')}`;groups.set(key,(groups.get(key)||0)+1);});
  $('#group-list').innerHTML=groups.size?[...groups].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0])).map(([label,n])=>`<div class="group-row"><div><span>${e(label)}</span><strong>${n} students</strong></div><div class="group-bar"><span data-percent="${Math.round(n/c.students*100)}"></span></div></div>`).join(''):'<p class="muted">Your year-and-branch groups will appear here.</p>';
  document.querySelectorAll('[data-percent]').forEach(el=>el.style.width=el.dataset.percent+'%');
}
function renderStudents() {
  const searchText=value=>String(value).toLowerCase().replace(/[_-]/g,' ');
  const query=searchText($('#student-search').value.trim());
  const students=state.students.filter(s=>searchText(`${s.roll} ${s.name} ${s.branch}`).includes(query));
  $('#student-rows').innerHTML=students.length?students.map(s=>`<tr><td><input type="checkbox" data-roster="${s.id}" ${roster.has(s.id)?'checked':''} aria-label="Include ${e(s.roll)} in roster"></td><td><span class="roll">${e(s.roll)}</span></td><td>${e(s.name)}</td><td>${s.year}</td><td>${e(s.branch.replaceAll('_','-'))}<span class="muted">${s.section?' / '+e(s.section):''}</span></td><td><div class="row-actions"><button class="text-button" data-edit-student="${s.id}">Edit</button><button class="text-button danger-text" data-delete-student="${s.id}">Delete</button></div></td></tr>`).join(''):'<tr><td colspan="6" class="muted">No matching students. Add records or import a CSV.</td></tr>';
  $('#roster-count').textContent=current?`${roster.size} selected${rosterDirty?' · unsaved changes':' for this sitting'}`:'Create or select a session to save a roster';
  document.querySelectorAll('[data-roster]').forEach(box=>box.disabled=!current);
}
function renderRooms() {
  const selections=new Map();current?.roomSelections.forEach(r=>{if(!selections.has(r.room_id))selections.set(r.room_id,[]);if(r.row_no!==null)selections.get(r.room_id).push(`${r.row_no}:${r.bench_no}`);});
  $('#rooms-list').innerHTML=state.rooms.length?state.rooms.map(r=>{
    const counts=roomRows(r),defaults=new Set(r.excluded),extra=new Set(selections.get(r.id)||[]),selected=selections.has(r.id);
    const usable=roomBenchCount(r)-new Set([...defaults,...extra]).size;
    const benches=counts.map((n,i)=>`<div class="layout-row"><div class="layout-row-title">Row ${i+1}<small>${n} benches</small></div><div class="layout-bench-scroll"><div class="layout-bench-strip">${Array.from({length:n},(_,j)=>{const key=`${i+1}:${j+1}`,permanent=defaults.has(key),off=permanent||extra.has(key);return `<button type="button" class="bench-toggle ${off?'unavailable':''} ${permanent?'default-off':''}" data-session-bench="${r.id}:${key}" ${permanent?'data-default-off':''} aria-pressed="${off}" aria-label="${e(r.code)}, ${benchLabel(key)}, ${permanent?'unavailable in saved layout':off?'unavailable this sitting':'usable'}" ${!selected||permanent?'disabled':''}><span>Bench ${j+1}</span><i aria-hidden="true">${permanent?'×':'▰ ▰'}</i></button>`;}).join('')}</div></div></div>`).join('');
    return `<section class="card room-card ${selected?'selected-room':''}"><div class="card-heading"><div><h2>${e(r.code)}</h2><p>${counts.length} rows · ${roomBenchCount(r)} bench positions · 2 seats per usable bench</p></div><span class="badge" data-usable-summary="${r.id}">${usable} USABLE BENCHES</span></div><label class="checkbox-line room-use"><input type="checkbox" data-room="${r.id}" ${selected?'checked':''}>Use this room for the selected exam</label><p class="room-card-note">${selected?'Click a usable bench below to make it unavailable for this sitting only.':'Check Use this room to include its benches in this exam.'}</p><div class="room-front-label">FRONT OF ROOM</div><div class="session-layout">${benches}</div><input type="hidden" data-exclusions="${r.id}" value="${e([...extra].join(','))}"><div class="bench-legend"><span><i></i>Usable · 2 seats</span><span><i class="off"></i>Unavailable</span></div><p class="field-explanation">Rows are counted front to back; benches run left to right. The unavailable benches already in the saved layout cannot be restored here—edit the saved layout instead.</p><div class="actions"><button class="text-button" data-edit-room="${r.id}">Edit saved layout</button><button class="text-button danger-text" data-delete-room="${r.id}">Delete</button></div></section>`;
  }).join(''):'<section class="card empty-state"><h2>Add your first room layout</h2><p>Enter its rows and bench count. Uneven rows are supported. Saving a layout does not yet reserve it for this exam.</p><button class="button primary" data-command="new-room">+ Add room</button></section>';
}
function updateRoomUsable(roomId) {
  const room=state.rooms.find(r=>String(r.id)===String(roomId));const extra=coordinates(document.querySelector(`[data-exclusions="${roomId}"]`).value);
  const usable=roomBenchCount(room)-new Set([...room.excluded,...extra]).size;
  document.querySelector(`[data-usable-summary="${roomId}"]`).textContent=`${usable} USABLE BENCHES`;
}
function renderPlans() {
  $('#plan-list').innerHTML=current?.plans.length?current.plans.map(p=>`<button class="plan-option ${p.id===planId?'selected':''}" data-plan="${p.id}"><span class="badge ${p.status.toLowerCase()}">${e(p.status)}</span><strong>Version ${p.version_no}</strong><small>${new Date(p.created_at).toLocaleString('en-IN')}</small>${p.status==='DRAFT'&&p.stale?'<span class="badge stale">INPUTS CHANGED</span>':''}</button>`).join(''):'<p class="muted">No versions yet. Save your inputs and generate a draft.</p>';
}
async function showPlan(id) {
  planId=Number(id);activePlan=await api(`admin/plans/${planId}`);const p=activePlan;renderPlans();
  const stale=p.status==='DRAFT'&&p.stale;
  $('#plan-detail').innerHTML=`<div class="plan-top"><div><p class="eyebrow">${e(p.input.sessionName)}</p><h2>Seating plan · v${p.version_no}</h2><span class="badge ${p.status.toLowerCase()}">${e(p.status)}</span></div><div class="actions"><a class="button small" href="/print?plan=${p.id}" target="_blank" rel="noopener">Print / preview ↗</a><button class="button small" data-command="export">Export CSV</button></div></div><div class="validation-box ${stale||p.validationErrors.length?'warning':''}">${p.validationErrors.length?e(p.validationErrors.join(' ')):stale?'Inputs changed after generation. This draft cannot be published; generate a new version.':`Independent validation passed · ${p.assignments.length} students assigned once · ${p.capacity.pairs} pairs · ${p.capacity.singles} singles`}</div>${p.status==='DRAFT'?`<div class="actions"><button class="button primary" data-command="publish" ${stale?'disabled':''}>Publish this version</button><button class="text-button danger-text" data-command="discard">Discard draft</button></div>`:''}<p class="plan-review-note"><strong>Before publishing:</strong> confirm the exam name/time, roster size, room choices and unavailable benches. A single student on a bench is allowed. <strong>Seats A and B</strong> are the two places on the same bench.</p><details class="inline-help"><summary>Why can seats be empty even when the room has space?</summary><p>Students with the same year and branch cannot share a bench. The planner may leave seat B empty to keep that rule. The required bench count is the larger of half the roster (rounded up) and the largest year-and-branch group. Uneven room rows do not change this rule.</p></details>${p.status==='PUBLISHED'?'<div class="actions"><a class="button primary small" href="/student" target="_blank" rel="noopener">Open student lookup ↗</a><span class="field-explanation">Students choose this sitting and enter their full roll number.</span></div>':''}${renderSeating(p)}`;
  setBenchColumns();
  $('#plan-detail a[href^="/print?"]').href=pageUrl(`/print?plan=${p.id}`);
  $('#plan-detail a[href="/student"]')?.setAttribute('href',pageUrl('/student'));
  renderOverview();syncControls();
}
function dialog(name,data={}) {
  const form=$(`#${name}-form`);form.reset();
  // Hidden input .value also changes its default value: reset() alone retains an edited ID.
  form.elements.namedItem('id').value='';
  form.querySelector('.form-message').classList.add('hidden');
  for(const [key,value]of Object.entries(data)){const control=form.elements.namedItem(key);if(control && control.type!=='checkbox')control.value=value??'';}
  if(name==='room')roomEditor.open(data);
  if(name==='student'){form.elements.addToSession.checked=!!selected&&(!data.id||roster.has(data.id));form.elements.addToSession.disabled=!selected;}
  $(`#${name}-dialog`).showModal();
}
function coordinates(value){return value.split(',').map(v=>v.trim()).filter(Boolean);}
function csvCell(value){let s=String(value??'');if(/^[=+@-]/.test(s))s="'"+s;return '"'+s.replaceAll('"','""')+'"';}
function exportPlan(){if(!activePlan)throw new Error('Select a plan.');const p=activePlan,students=new Map(p.input.students.map(s=>[s.id,s])),rooms=new Map(p.input.rooms.map(r=>[r.id,r]));
  const lines=[['session','version','status','roll_number','name','year','branch','section','room','row','bench','seat'],...p.assignments.map(a=>{const s=students.get(a.studentId);return[p.input.sessionName,p.version_no,p.status,s.roll,s.name,s.year,s.branch,s.section,rooms.get(a.roomId).code,a.row,a.bench,a.seat];})];
  const url=URL.createObjectURL(new Blob(['\uFEFF'+lines.map(row=>row.map(csvCell).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download=`seating-session-${p.session_id}-v${p.version_no}.csv`;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);notice('CSV exported. When opening in a spreadsheet, import roll_number as text to preserve leading zeros.');}

document.addEventListener('click',event=>{
  const target=event.target.closest('button,a');if(!target)return;
  if(target.dataset.demoScene!==undefined){view(selectDemoScene(Number(target.dataset.demoScene)));syncControls();$('#demo-tour').scrollIntoView({block:'start'});return;}
  if(target.dataset.view){view(target.dataset.view);syncControls();return;}if(target.dataset.goto){const sameView=document.body.dataset.view===target.dataset.goto;view(target.dataset.goto);if(sameView)document.querySelector(`#view-${target.dataset.goto} .section-heading`)?.scrollIntoView({block:'start'});const openPlan=target.dataset.openPlan;if(openPlan)run(()=>showPlan(openPlan));else syncControls();return;}if(target.hasAttribute('data-close')){target.closest('dialog').close();return;}
  if(target.dataset.step!==undefined){const step=Number(target.dataset.step);if(step===0){if(!current)dialog('session',{date:new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kolkata'}).format(new Date()),start:'09:00',end:'12:00'});else{view('overview');$('.session-bar').scrollIntoView({block:'start'});}}else{view(step===1?'students':step===2?'rooms':'plans');if(step>=3&&!current?.capacity.students)notice('First add and save the appearing students. The guide above shows the next step.');}syncControls();return;}
  if(target.dataset.continue){view(target.dataset.continue);syncControls();return;}
  if(target.dataset.sessionBench){const [room,row,bench]=target.dataset.sessionBench.split(':');const input=document.querySelector(`[data-exclusions="${room}"]`);const extra=new Set(coordinates(input.value));const position=`${row}:${bench}`;extra.has(position)?extra.delete(position):extra.add(position);input.value=[...extra].join(',');target.classList.toggle('unavailable',extra.has(position));target.setAttribute('aria-pressed',String(extra.has(position)));target.setAttribute('aria-label',`${state.rooms.find(r=>r.id===Number(room)).code}, ${benchLabel(position)}, ${extra.has(position)?'unavailable this sitting':'usable'}`);roomsDirty=true;updateRoomUsable(room);syncControls();return;}
  if(target.dataset.plan){run(()=>showPlan(target.dataset.plan));return;}
  if(target.dataset.editStudent){const s=state.students.find(s=>s.id===Number(target.dataset.editStudent));dialog('student',s);return;}
  if(target.dataset.editRoom){const r=state.rooms.find(r=>r.id===Number(target.dataset.editRoom));dialog('room',{...r,benchesPerRow:r.benches_per_row});return;}
  if(target.dataset.deleteStudent){run(async()=>{if(!await confirmAction('Remove this student from the master? Live roster memberships must be removed first. Historical snapshots are preserved.','Delete student','Delete this student?'))return;await api(`admin/students/${target.dataset.deleteStudent}`,'DELETE',{});await refresh();notice('Student deleted.');});return;}
  if(target.dataset.deleteRoom){run(async()=>{if(!await confirmAction('Remove this saved room? Live room selections must be removed first. Current publications are protected.','Delete room','Delete this room?'))return;await api(`admin/rooms/${target.dataset.deleteRoom}`,'DELETE',{});await refresh();notice('Room deleted.');});return;}
  const command=target.dataset.command;if(!command)return;
  if(command==='new-session')return dialog('session',{date:new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kolkata'}).format(new Date()),start:'09:00',end:'12:00'});
  if(command==='new-student')return dialog('student');if(command==='new-room')return dialog('room');
  if(command==='show-import'){$('#import-panel').classList.remove('hidden');$('#import-panel').scrollIntoView({behavior:'smooth'});return;}
  if(command==='roster-all'){roster=new Set(state.students.map(s=>s.id));rosterDirty=true;renderStudents();syncControls();return;}if(command==='roster-none'){roster.clear();rosterDirty=true;renderStudents();syncControls();return;}
  run(async()=>{
    if(command==='refresh'){if((rosterDirty||roomsDirty)&&!await confirmAction('Refreshing will discard unsaved roster and room selections.','Refresh workspace','Discard unsaved changes?'))return;await refresh();notice('Data refreshed.');}
    if(command==='edit-session'){requireSession();dialog('session',{id:selected,name:current.input.sessionName,date:current.input.date,start:current.input.start.slice(0,5),end:current.input.end.slice(0,5)});}
    if(command==='save-roster'){requireSession();await api(`admin/sessions/${selected}/roster`,'POST',{studentIds:[...roster]});await refresh();notice('Session roster saved. Affected drafts require regeneration.');}
    if(command==='save-rooms'){requireSession();const rooms=[...document.querySelectorAll('[data-room]:checked')].map(el=>({roomId:Number(el.dataset.room),excluded:coordinates(document.querySelector(`[data-exclusions="${el.dataset.room}"]`).value)}));await api(`admin/sessions/${selected}/rooms`,'POST',{rooms});await refresh();notice('Room selections and exclusions saved.');}
    if(command==='demo'){if(!await confirmAction('Add 40 fictional students and two room layouts to this empty workspace? Nothing is published automatically.','Load demo','Try the complete workflow.'))return;const result=await api('admin/demo','POST',{});selected=String(result.sessionId);await refresh();notice(result.message);}
    if(command==='generate'){requireSession();if(rosterDirty||roomsDirty)throw new Error('Save the roster and room selections before generating.');const result=await api(`admin/sessions/${selected}/generate`,'POST',{});planId=result.id;await refresh();view('plans');notice('Draft generated and independently validated. Review before publishing.');}
    if(command==='publish'){if(rosterDirty||roomsDirty)throw new Error('Save the pending roster and room choices, then regenerate before publishing.');if(!activePlan||activePlan.status!=='DRAFT')throw new Error('Select a draft first.');if(!await confirmAction(`Version ${activePlan.version_no} will replace the current publication and become visible to student lookup. Make sure you have reviewed every room.`, 'Publish version', 'Make this plan official?'))return;await api(`admin/plans/${planId}/publish`,'POST',{});await refresh();notice('Plan published atomically. Students can now look up their assignments.');}
    if(command==='discard'){if(!planId)throw new Error('Select a draft first.');if(!await confirmAction('This draft will no longer be publishable. Its record remains in history.','Discard draft','Discard this version?'))return;await api(`admin/plans/${planId}/discard`,'POST',{});await refresh();notice('Draft discarded.');}
    if(command==='withdraw'){requireSession();if(!await confirmAction('Student lookup will stop returning this publication. Working room selections remain reserved.','Withdraw publication','Take this plan offline?'))return;await api(`admin/sessions/${selected}/withdraw`,'POST',{});await refresh();notice('Publication withdrawn. Historical records are preserved.');}
    if(command==='export')exportPlan();
    if(command==='preview-import'){const result=await api('admin/import/preview','POST',{csv:$('#csv-text').value});previewValid=result.valid;$('#import-results').innerHTML=`<p class="${result.valid?'import-ok':'import-error'}">${result.valid?'All records valid. Ready to import.':'Correct the errors below and preview again. Nothing has been imported.'}</p><table><thead><tr><th>Record</th><th>Roll</th><th>Name</th><th>Result</th></tr></thead><tbody>${result.rows.map(r=>`<tr><td>${r.record}</td><td>${e(r.student.roll)}</td><td>${e(r.student.name)}</td><td class="${r.errors.length?'import-error':'import-ok'}">${e(r.errors.join(' ')||'Valid')}</td></tr>`).join('')}</tbody></table>`;}
    if(command==='commit-import'){requireSession();if(!previewValid)throw new Error('Validate the CSV preview first.');const result=await api('admin/import/commit','POST',{sessionId:selected,csv:$('#csv-text').value});previewValid=false;$('#import-results').textContent=`Imported ${result.imported} record${result.imported===1?'':'s'} successfully. Choose or edit a CSV and preview again for another import.`;await refresh();notice(`${result.imported} student${result.imported===1?'':'s'} imported into the roster. All records committed together.`);}
  });
});
$('#session-select').addEventListener('change',event=>{const next=event.target.value;run(async()=>{if((rosterDirty||roomsDirty)&&!await confirmAction('Switching sessions will discard unsaved roster and room selections.','Switch session','Leave unsaved changes?')){$('#session-select').value=selected;return;}selected=next;planId=null;await refresh();});});
$('#student-search').addEventListener('input',renderStudents);
document.addEventListener('change',event=>{if(event.target.hasAttribute('data-room')||event.target.hasAttribute('data-exclusions')){roomsDirty=true;const card=event.target.closest('.room-card');card?.classList.toggle('selected-room',event.target.checked);if(card)card.querySelector('.room-card-note').textContent=event.target.checked?'Click a usable bench below to make it unavailable for this sitting only.':'Check Use this room to include its benches in this exam.';syncControls();}if(event.target.dataset.roster){rosterDirty=true;const id=Number(event.target.dataset.roster);event.target.checked?roster.add(id):roster.delete(id);$('#roster-count').textContent=`${roster.size} selected · save roster to apply`;syncControls();}});
$('#csv-text').addEventListener('input',()=>{previewValid=false;$('#commit-import').disabled=true;$('#import-results').textContent='Content changed. Preview again before importing.';});
$('#csv-file').addEventListener('change',event=>run(async()=>{const file=event.target.files[0];if(!file)return;if(file.size>2_000_000)throw new Error('Choose a CSV smaller than 2 MB.');$('#csv-text').value=await file.text();previewValid=false;$('#import-results').textContent='File loaded. Validate the preview before importing.';}));
for(const name of ['session','student','room'])$(`#${name}-form`).addEventListener('submit',event=>{event.preventDefault();run(async()=>{
  const form=event.target,data=Object.fromEntries(new FormData(form)),id=data.id;delete data.id;form.querySelector('.form-message').classList.add('hidden');
  if(name==='session'){const result=await api(`admin/sessions${id?'/'+id:''}`,id?'PUT':'POST',data);selected=String(result.id);planId=null;}
  if(name==='student'){const add=form.elements.addToSession.checked;delete data.addToSession;const result=await api(`admin/students${id?'/'+id:''}`,id?'PUT':'POST',data);if(selected){const membership=new Set(current.input.students.map(s=>s.id));const was=membership.has(result.id);if(add)membership.add(result.id);else membership.delete(result.id);if(was!==add)await api(`admin/sessions/${selected}/roster`,'POST',{studentIds:[...membership]});}}
  if(name==='room'){Object.assign(data,roomEditor.value());delete data.layoutMode;await api(`admin/rooms${id?'/'+id:''}`,id?'PUT':'POST',data);}
  $(`#${name}-dialog`).close();await refresh();if(name==='session'&&!id)view('students');notice(`${name[0].toUpperCase()+name.slice(1)} saved.`);
});});
$('.notice-close').addEventListener('click',()=>$('#notice').classList.add('hidden'));
run(refresh);
