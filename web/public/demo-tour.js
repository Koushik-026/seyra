import {demoMode} from '/context.js';
const scenes=[
  ['overview','1 · The sitting','Start with one exam sitting','This practice workspace includes a published example: 40 fictional students, one sitting and two reusable room layouts. Student lookup is ready immediately. Open each stage below to see what the coordinator does.'],
  ['students','2 · The roster','Choose who is appearing','The 40 checked students are the saved roster: 30 in Year 2 AI-ML and 10 in Year 2 CSE. Try a selection change, then Save roster to confirm it.'],
  ['rooms','3 · The rooms','Choose usable bench positions','ROOM-30 is selected. The roster needs 30 benches because its largest year/branch group has 30 students. Try ROOM-24 alone to see the shortage, then restore ROOM-30 and save.'],
  ['plans','4 · The draft','Generate, then inspect','Choose Generate new draft below. With the original roster and ROOM-30, expect 10 compatible pairs and 20 students sitting alone. Review the room map; the draft stays private.'],
  ['plans','5 · Publication','Make the reviewed version current','Choose Publish this version after reviewing the draft, then confirm. This publishes only inside the practice workspace. Your normal exams are separate.'],
  ['student','6 · Student view','Find a seat as a student','Open the practice student portal: the starter example is already published. Try 0001 for seat A or 0031 for seat B. The room map highlights that student’s exact seat.']
];
let scene=0;
export function mountDemoTour(){
  if(!demoMode)return;
  const panel=document.createElement('section');panel.id='demo-tour';panel.className='demo-tour';panel.setAttribute('aria-label','Guided practice simulation');
  panel.innerHTML=`<div class="demo-tour-top"><span class="sandbox-badge">PRACTICE WORKSPACE</span><a href="/">Return to your workspace ↗</a></div><h2>Try the whole journey.</h2><p class="demo-isolation">Fictional records are loaded in a separate SQL database. Changes here never alter your normal exams. This shared practice starts fresh with a published example when the server restarts.</p><nav class="demo-scenes" aria-label="Simulation stages">${scenes.map((s,i)=>`<button type="button" data-demo-scene="${i}">${s[1]}</button>`).join('')}</nav><div class="demo-scene"><div><p class="eyebrow" id="demo-scene-position"></p><h3 id="demo-scene-title"></h3><p id="demo-scene-description"></p></div><a id="demo-student-link" class="button small" href="/student?demo=1" target="_blank" rel="noopener">Try student lookup ↗</a></div>`;
  document.querySelector('.session-bar').before(panel);
}
export function selectDemoScene(index){scene=index;return scenes[index][0]==='student'?'plans':scenes[index][0];}
export function renderDemoTour(current){
  if(!demoMode)return;
  const s=scenes[scene];document.querySelector('#demo-scene-position').textContent=`SIMULATION · STAGE ${scene+1} OF 6`;
  document.querySelector('#demo-scene-title').textContent=s[2];document.querySelector('#demo-scene-description').textContent=s[3];
  document.querySelectorAll('[data-demo-scene]').forEach((b,i)=>{b.classList.toggle('active',i===scene);if(i===scene)b.setAttribute('aria-current','step');else b.removeAttribute('aria-current');});
  const link=document.querySelector('#demo-student-link');link.classList.toggle('hidden',scene!==5||!current?.session.current_plan_id);
  if(scene===5&&!current?.session.current_plan_id)document.querySelector('#demo-scene-description').textContent='Generate and publish a practice draft first (stages 4–5). The student portal shows only the current published version. Then look up fictional roll 0001.';
}
