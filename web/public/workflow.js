export const workflowSteps = [
  ['Session','Name, date and time'],['Students','Choose who is appearing'],['Rooms','Choose usable benches'],['Review draft','Generate and inspect'],['Publish','Print and enable lookup']
];
export function guideState(current,{rosterDirty=false,roomsDirty=false,view='overview',activePlanId=null}={}) {
  const input=current?.input,c=current?.capacity;
  const published=current?.plans.find(p=>p.status==='PUBLISHED');
  const draft=current?.plans.find(p=>p.status==='DRAFT'&&!p.stale&&(!published||p.version_no>published.version_no));
  const done=[!!current,!!c?.students&&!rosterDirty,!!input?.rooms.length&&!roomsDirty,!!draft||!!published&&!published.stale,!!published&&!published.stale];
  let next;
  if(!current)next={step:0,command:'new-session',label:'1. Create an exam session',title:'First, tell us which exam sitting.',description:'Enter a session name, date, start time and end time. Saving it creates an empty sitting; it does not add students or reserve rooms.'};
  else if(rosterDirty)next={step:1,command:'save-roster',label:'Save the appearing roster',title:'Your roster changes are not saved yet.',description:'Only checked students will be included in this sitting. Save those choices before continuing to rooms.'};
  else if(!c.students)next={step:1,goto:'students',label:'2. Add appearing students',title:'Now choose who is taking this exam.',description:'Add students manually or import a CSV. Checked students belong to this sitting. Save the roster, then continue to room selection.'};
  else if(roomsDirty)next={step:2,command:'save-rooms',label:'Save rooms for this exam',title:'Your room choices are not saved yet.',description:'Save the selected rooms and temporary unavailable benches. This reserves those rooms for the sitting.'};
  else if(!input.rooms.length)next={step:2,goto:'rooms',label:'3. Choose exam rooms',title:'Choose the spaces you can use.',description:'Create reusable room layouts, check Use this room for the sitting, mark any temporarily unavailable benches, then save the selection.'};
  else if(c.shortage)next={step:2,goto:'rooms',label:'Add usable benches',title:`You need ${c.shortage} more usable bench${c.shortage===1?'':'es'}.`,description:`The roster needs ${c.requiredBenches} benches under the sharing rule, but only ${c.usableBenches} are available. Select another room or correct availability before generating.`};
  else if(draft){const reviewing=view==='plans'&&Number(activePlanId)===Number(draft.id);next={step:reviewing?4:3,...(reviewing?{command:'publish'}:{goto:'plans',planId:draft.id}),label:reviewing?'5. Publish the reviewed draft':'4. Review your draft',title:'A private draft is ready for your review.',description:'Check each room, bench and student assignment. Drafts are hidden from students. Publish explicitly only after the arrangement looks right.'};}
  else if(published&&!published.stale)next={step:4,goto:'plans',planId:published.id,label:'Print or share the published plan',title:'Published. Students can find their seats.',description:'Open the published version to print/export it, or use Student portal to look up an assignment. A new draft is needed only when you want a replacement.'};
  else next={step:3,command:'generate',label:published?'4. Generate a replacement draft':'4. Generate a draft',title:published?'Inputs changed. Prepare a replacement.':'Your saved inputs are ready.',description:published?'The current published plan remains visible with its original assignments. Generate and review a new draft before replacing it.':'Generation assigns every roster student to a usable bench and independently checks the result. It saves a private draft; it does not publish automatically.'};
  return {done,next,published,draft};
}
