import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd();
test('all HTML scripts/styles and local links point to real files',()=>{
  for(const name of ['index.html','student.html','print.html','help.html']){
    const source=fs.readFileSync(path.join(root,'web','public',name),'utf8');
    for(const [,url]of source.matchAll(/(?:src|href)="(\/[^"?]*)/g)){
      if(['/','/demo','/student','/print'].includes(url))continue;
      assert.ok(fs.existsSync(path.join(root,'web','public',url.slice(1))),`${name}: ${url}`);
    }
  }
});
test('browser JavaScript modules parse',async()=>{
  const {spawnSync}=await import('node:child_process');
  for(const file of ['app.js','student.js','print.js','seating.js','motion.js','layout.js','workflow.js','room-editor.js','context.js','demo-tour.js','student-map.js']){
    const result=spawnSync(process.execPath,['--check',path.join(root,'web','public',file)],{encoding:'utf8',windowsHide:true});
    assert.equal(result.status,0,result.stderr);
  }
});
test('student map highlights the exact seat, preserves uneven geometry and escapes labels',async()=>{
  const {renderStudentMap}=await import('../web/public/student-map.js');
  const assignment={room_code:'<Room>',row_no:2,bench_no:1,seat_label:'B',roomLayout:[{row:1,bench:1,usable:false},{row:1,bench:2,usable:true},{row:2,bench:1,usable:true}]};
  const html=renderStudentMap(assignment);
  assert.equal((html.match(/aria-current="location"/g)||[]).length,1);
  assert.ok(html.includes('aria-label="Seat B, your seat"'));
  assert.ok(html.includes('&lt;Room&gt;'));
  assert.ok(!html.includes('<Room>'));
  assert.equal((html.match(/class="student-map-bench /g)||[]).length,3);
  assert.ok(html.includes('Row 1, Bench 1, unavailable'));
});
test('the guide recommends saved inputs in order and never skips an unsaved step',async()=>{
  const {guideState}=await import('../web/public/workflow.js');
  const make=({students=0,rooms=[],shortage=0,plans=[]}={})=>({input:{rooms},capacity:{students,shortage,requiredBenches:30,usableBenches:24},plans});
  assert.equal(guideState(null).next.command,'new-session');
  assert.equal(guideState(make()).next.goto,'students');
  assert.equal(guideState(make({students:40}),{rosterDirty:true}).next.command,'save-roster');
  assert.equal(guideState(make({students:40})).next.goto,'rooms');
  assert.equal(guideState(make({students:40,rooms:[{}]}),{roomsDirty:true}).next.command,'save-rooms');
  assert.equal(guideState(make({students:40,rooms:[{}],shortage:6})).next.goto,'rooms');
  assert.equal(guideState(make({students:40,rooms:[{}]})).next.command,'generate');
  const current=make({students:40,rooms:[{}],plans:[{id:8,status:'DRAFT',stale:false}]});
  assert.equal(guideState(current,{view:'plans',activePlanId:2}).next.planId,8);
  assert.equal(guideState(current,{view:'plans',activePlanId:8}).next.command,'publish');
  const published=make({students:40,rooms:[{}],plans:[{id:9,status:'PUBLISHED',stale:false}]});
  assert.equal(guideState(published).next.planId,9);
  assert.equal(guideState({...published,plans:[{id:8,version_no:1,status:'DRAFT',stale:false},{id:9,version_no:2,status:'PUBLISHED',stale:false}]}).next.planId,9);
  assert.equal(guideState({...published,plans:[{id:9,status:'PUBLISHED',stale:true}]}).next.command,'generate');
});
test('shared room geometry supports uneven rows and clear location labels',async()=>{
  const {roomRows,roomBenchCount,benchLabel}=await import('../web/public/layout.js');
  assert.deepEqual(roomRows({rows:3,benchesPerRow:6}),[6,6,6]);
  assert.deepEqual(roomRows({rows:3,benches_per_row:6}),[6,6,6]);
  assert.equal(roomBenchCount({rows:3,rowBenchCounts:[7,5,6]}),18);
  assert.equal(benchLabel('3:4'),'Row 3, Bench 4');
});
test('the offline theme imports resolve and reduced-motion support is included',()=>{
  const styles=fs.readFileSync(path.join(root,'web','public','styles.css'),'utf8');
  for(const [,file]of styles.matchAll(/@import url\('\/(.*?)'\)/g))assert.ok(fs.existsSync(path.join(root,'web','public',file)),file);
  const responsive=fs.readFileSync(path.join(root,'web','public','theme-responsive.css'),'utf8');
  assert.ok(responsive.includes('prefers-reduced-motion:reduce'));
  const markup=fs.readFileSync(path.join(root,'web','public','index.html'),'utf8');
  assert.ok(markup.includes('aria-describedby="session-hint"'));
  assert.ok(markup.includes('confirmation-dialog'));
});
test('hosted demo uses HTTPS origins, preserves demo links and blocks normal workspace access',async()=>{
  const http=await import('node:http');const {createWebServer}=await import('../web/server.mjs');
  const backend=http.createServer((req,res)=>{res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify({path:req.url}));});
  let web;
  try{
    await new Promise(resolve=>backend.listen(0,'127.0.0.1',resolve));
    web=createWebServer({javaPort:backend.address().port,token:'test-token',publicDemo:true});
    await new Promise(resolve=>web.listen(0,'127.0.0.1',resolve));const base=`http://127.0.0.1:${web.address().port}`;
    const home=await fetch(base,{redirect:'manual'});assert.equal(home.status,302);assert.equal(home.headers.get('Location'),'/demo');
    const student=await fetch(base+'/student',{redirect:'manual'});assert.equal(student.headers.get('Location'),'/student?demo=1');
    const print=await fetch(base+'/print?plan=7',{redirect:'manual'});assert.equal(print.headers.get('Location'),'/print?plan=7&demo=1');
    assert.equal((await fetch(base+'/api/admin/state')).status,403);
    const https=await fetch(base+'/api/demo/admin/state',{headers:{Origin:base.replace('http:','https:')}});assert.equal(https.status,200);assert.equal((await https.json()).path,'/api/demo/admin/state');
    assert.equal((await fetch(base+'/api/demo/admin/state',{headers:{Origin:'https://unrelated.example'}})).status,403);
    assert.equal((await fetch(base+'/api/health')).status,200);
  }finally{if(web){web.closeAllConnections();await new Promise(resolve=>web.close(resolve));}backend.closeAllConnections();await new Promise(resolve=>backend.close(resolve));}
});
