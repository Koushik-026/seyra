import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { randomBytes } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { javaTool, classpath, root } from '../scripts/paths.mjs';
import { createWebServer } from '../web/server.mjs';

// Optional test dependency. Production has no npm package dependencies.
const runtime=process.env.PLAYWRIGHT_MODULE_PATH || path.join(process.env.USERPROFILE||'', '.cache','codex-runtimes','codex-primary-runtime','dependencies','node','package.json');
const playwright=createRequire(runtime)('playwright');
const directory=path.join(root,'tmp','e2e-'+Date.now()),output=path.join(root,'output','tests');fs.mkdirSync(output,{recursive:true});
const javaPort=Number(process.env.TEST_JAVA_PORT||8182),token=randomBytes(32).toString('hex');
const child=spawn(javaTool('java'),['-cp',classpath,'planner.Server'],{cwd:root,env:{...process.env,JAVA_PORT:String(javaPort),PLANNER_DATA_DIR:directory,PLANNER_INTERNAL_TOKEN:token,PLANNER_TEST_MODE:'1'},windowsHide:true});
let logs='',browser,web,assertions=0;child.stdout.on('data',b=>logs+=b);child.stderr.on('data',b=>logs+=b);
const checked=(value,message)=>{assert.ok(value,message);assertions++;console.log('PASS '+message);};
try {
  let ready=false;for(let i=0;i<100;i++){
    try{if((await fetch(`http://127.0.0.1:${javaPort}/api/health`,{headers:{'X-Planner-Internal':token}})).ok){ready=true;break;}}catch{}
    if(child.exitCode!==null)throw new Error(logs);await new Promise(r=>setTimeout(r,200));
  }
  assert.ok(ready,'Java backend ready');web=createWebServer({javaPort,token});await new Promise(r=>web.listen(0,'127.0.0.1',r));
  const base=`http://127.0.0.1:${web.address().port}`;
  const chrome=process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe';
  browser=await playwright.chromium.launch({headless:true,...(fs.existsSync(chrome)?{executablePath:chrome}:{})});
  const page=await browser.newPage({viewport:{width:1440,height:1050}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('dialog',dialog=>dialog.accept());
  await page.goto(base+'/demo');await page.locator('#stats').filter({hasText:'40'}).waitFor();
  checked((await page.title()).includes('Seyra'),'branded practice coordinator renders');
  checked((await page.locator('#stats').innerText()).includes('40'),'demo roster reaches the rendered UI');
  await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:path.join(output,'01-overview.png'),fullPage:true});
  const portal=await browser.newPage({viewport:{width:1100,height:850}});portal.on('pageerror',e=>errors.push(e.message));
  await portal.goto(base+'/student?demo=1');await portal.locator('#lookup-session:not([disabled])').waitFor();
  checked(await portal.locator('#lookup-submit').isEnabled(),'published starter example is ready immediately');
  await page.getByRole('button',{name:'04 Plans & publication',exact:true}).click();await page.getByRole('button',{name:'Generate new draft',exact:true}).click();
  await page.getByText('Draft generated and independently validated.',{exact:false}).waitFor();
  checked((await page.locator('#plan-detail').innerText()).includes('40 students assigned once'),'browser generation displays independently validated Java/SQL draft');
  const draftResponse=await fetch(base+'/api/demo/public/sessions');checked((await draftResponse.json()).length===1,'replacement draft preserves the one current published sitting');
  await page.getByRole('button',{name:'Publish this version',exact:true}).click();await page.getByRole('button',{name:'Publish version',exact:true}).click();await page.getByText('Plan published atomically.',{exact:false}).waitFor();
  const session=await page.locator('#session-select').inputValue();
  await portal.reload();await portal.locator('#lookup-session:not([disabled])').waitFor();await portal.locator('#lookup-session').selectOption(session);await portal.locator('#lookup-roll').fill('0001');await portal.locator('#lookup-submit').click();await portal.getByText('Assignment found.',{exact:true}).waitFor();
  checked((await portal.locator('#lookup-result').innerText()).includes('ROOM-30'),'current published assignment returns through Node → Java → SQL → browser');
  await portal.screenshot({path:path.join(output,'03-student-assignment.png'),fullPage:true});
  await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:path.join(output,'02-published-plan.png'),fullPage:true});
  const plan=await page.locator('.plan-option.selected').getAttribute('data-plan');
  const preview=await browser.newPage();preview.on('pageerror',e=>errors.push(e.message));await preview.goto(base+`/print?plan=${plan}&demo=1`);await preview.getByText('PUBLISHED',{exact:true}).waitFor();
  checked(await preview.locator('.seat').count()===60,'print preview renders all 60 physical positions from the snapshot');await preview.screenshot({path:path.join(output,'04-print-preview.png'),fullPage:true});
  await preview.close();
  await portal.locator('#lookup-roll').fill('9999');await portal.locator('#lookup-submit').click();await portal.getByText('No current published assignment was found',{exact:false}).waitFor();checked((await portal.locator('#lookup-result').innerText()).includes('No assignment to show'),'unknown roll produces a useful no-result state');
  await page.getByRole('button',{name:'03 Rooms & benches'}).click();
  const state=await (await fetch(base+'/api/demo/admin/state')).json();const room24=state.rooms.find(r=>r.code==='ROOM-24'),room30=state.rooms.find(r=>r.code==='ROOM-30');
  await page.locator(`[data-room="${room30.id}"]`).uncheck();await page.locator(`[data-room="${room24.id}"]`).check();await page.getByRole('button',{name:'Save room selection & exclusions',exact:true}).click();await page.getByText('Room selections and exclusions saved.',{exact:true}).waitFor();
  await page.getByRole('button',{name:'04 Plans & publication'}).click();
  checked((await page.locator('#workflow-title').innerText()).includes('6 more usable benches')&&await page.getByRole('button',{name:'Generate new draft',exact:true}).isDisabled(),'30+10 roster with 24 benches explains six-bench shortage and blocks generation');
  const still=await (await fetch(base+`/api/demo/public/sessions/${session}/assignment?roll=0001`)).json();checked(still.plan_id===Number(plan),'failed generation preserves the previous publication');
  await page.getByRole('button',{name:'02 Students & roster'}).click();await page.getByRole('button',{name:'Import CSV',exact:true}).click();
  await page.locator('#csv-text').fill('roll_number,name,year,branch,section\n0099,New Student,2,CSE,A\n0001,Duplicate Student,2,CSE,A');await page.getByRole('button',{name:'Validate preview',exact:true}).click();await page.getByText('Roll already exists in student master;',{exact:false}).waitFor();checked(await page.locator('#commit-import').isDisabled(),'invalid CSV preview blocks commit');
  await page.locator('#csv-text').fill('roll_number,name,year,branch,section\n0099,"New, Student",2,CSE,A');await page.getByRole('button',{name:'Validate preview',exact:true}).click();await page.getByText('All records valid. Ready to import.',{exact:true}).waitFor();await page.getByRole('button',{name:'Import into this session',exact:true}).click();await page.getByText('1 student imported into the roster.',{exact:false}).waitFor();
  checked((await (await fetch(base+'/api/demo/admin/state')).json()).students.length===41,'valid quoted CSV commits through the full web/backend/database flow');
  const crossSite=await fetch(base+'/api/demo/admin/demo',{method:'POST',headers:{Origin:'https://unrelated.example','Content-Type':'application/json'},body:'{}'});checked(crossSite.status===403,'cross-site coordinator mutation rejected');
  checked((await fetch(`http://127.0.0.1:${javaPort}/api/admin/state`)).status===403,'direct Java request without internal token rejected');
  await page.setViewportSize({width:390,height:844});await page.getByRole('button',{name:'01 Overview'}).click();checked(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),'coordinator layout fits a narrow screen');await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:path.join(output,'05-mobile-coordinator.png'),fullPage:true});
  await portal.setViewportSize({width:390,height:844});checked(await portal.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),'student layout fits a narrow screen');
  checked(errors.length===0,'no uncaught browser JavaScript errors');
  fs.writeFileSync(path.join(output,'browser-results.json'),JSON.stringify({status:'PASS',assertions,browserErrors:errors,executedAt:new Date().toISOString(),screenshots:['01-overview.png','02-published-plan.png','03-student-assignment.png','04-print-preview.png','05-mobile-coordinator.png']},null,2));
  console.log(`ALL BROWSER/API CHECKS PASSED: ${assertions} assertions.`);
} finally {fs.writeFileSync(path.join(output,'browser-server.log'),logs);await browser?.close();if(web)await new Promise(r=>web.close(r));child.kill();}
