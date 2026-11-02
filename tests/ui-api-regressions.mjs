// Isolated synthetic records only. No browser automation or production-data deletion.
import assert from 'node:assert/strict';
import fs from 'node:fs';
const base=process.env.UI_TEST_BASE||'http://127.0.0.1:3001';
let checks=0;
async function api(path,method='GET',body,expected=200){
  const res=await fetch(base+'/api/'+path,{method,headers:{'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(20000)});
  const value=await res.json();assert.equal(res.status,expected,JSON.stringify(value));checks++;return value;
}
const suffix=Date.now().toString().slice(-9);
const student=await api('admin/students','POST',{roll:'REG'+suffix,name:'Disposable API regression fixture',year:2,branch:'CSE',section:'A'});
await api('admin/students/'+student.id,'PUT',{roll:'REG'+suffix,name:'Edited API regression fixture',year:3,branch:'CSE',section:'B'});
await api('admin/students/'+student.id,'DELETE',{});
await api('admin/students/'+student.id,'DELETE',{},404);
const room=await api('admin/rooms','POST',{code:'REG-'+suffix,rows:2,benchesPerRow:2,excluded:['1:1']});
await api('admin/rooms/'+room.id,'PUT',{code:'REG-'+suffix,rows:3,benchesPerRow:2,excluded:['2:2']});
await api('admin/rooms/'+room.id,'DELETE',{});
await api('admin/rooms/'+room.id,'DELETE',{},404);
await api('admin/sessions','POST',{name:'Invalid time fixture',date:'2026-11-20',start:'12:00',end:'09:00'},400);
await api('admin/rooms','POST',{code:'BAD-'+suffix,rows:2,benchesPerRow:2,excluded:['9:9']},400);
await api('public/sessions/999999/assignment?roll=0001','GET',undefined,404);
await api('public/sessions/1/assignment?roll=BAD%20ROLL','GET',undefined,400);
const crossSite=await fetch(base+'/api/admin/demo',{method:'POST',headers:{'Content-Type':'application/json',Origin:'https://unrelated.example'},body:'{}'});assert.equal(crossSite.status,403);checks++;
fs.mkdirSync('output/ui-redesign',{recursive:true});
fs.writeFileSync('output/ui-redesign/api-results.json',JSON.stringify({status:'PASS',checks,executedAt:new Date().toISOString(),scope:'Temporary synthetic master records in isolated UI verification database; browser workflow recorded separately.'},null,2));
console.log(`PASS ${checks} isolated API checks: student/room create-update-delete, invalid session times/exclusions, lookup errors and cross-site rejection.`);
