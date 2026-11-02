import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { build } from './build.mjs';
import { javaTool, classpath, root } from './paths.mjs';
import { createWebServer } from '../web/server.mjs';

if (!process.argv.includes('--no-build')) build();
const javaPort = Number(process.env.JAVA_PORT || 8081), webPort = Number(process.env.PORT || 3000);
const webHost = process.env.PLANNER_PUBLIC_DEMO === '1' ? '0.0.0.0' : '127.0.0.1';
const token = randomBytes(32).toString('hex');
const child = spawn(javaTool('java'), ['-cp', classpath, 'planner.Server'], {
  cwd: root, env: { ...process.env, JAVA_PORT: String(javaPort), PLANNER_INTERNAL_TOKEN: token }, stdio: 'inherit', windowsHide: true
});
let web;
function stop() { web?.close(); child.kill(); }
process.on('SIGINT', () => { stop(); process.exit(0); });
process.on('SIGTERM', () => { stop(); process.exit(0); });
child.on('exit', code => { if (code) console.error(`Java backend exited (${code}).`); web?.close(); process.exitCode = code || 0; });
child.on('error', e => { console.error(e.message); process.exitCode = 1; });
let ready = false;
for (let attempt = 0; attempt < 80; attempt++) {
  if (child.exitCode !== null) break;
  try {
    const response = await fetch(`http://127.0.0.1:${javaPort}/api/health`, { headers: { 'X-Planner-Internal': token }, signal: AbortSignal.timeout(1000) });
    if (response.ok) { ready = true; break; }
  } catch { /* Wait for Java's real readiness response, not a fixed startup delay. */ }
  await new Promise(resolve => setTimeout(resolve, 250));
}
if (!ready) { stop(); console.error('Backend did not become ready. Check the Java log above.'); process.exitCode = 1; }
else {
  web = createWebServer({ javaPort, token });
  web.on('error', error => { console.error(error.message); stop(); process.exitCode = 1; });
  web.listen(webPort, webHost, () => {
    console.log(`Coordinator: http://127.0.0.1:${webPort}`);
    console.log(`Student lookup: http://127.0.0.1:${webPort}/student`);
    console.log('Local synthetic-data prototype. Press Ctrl+C to stop.');
  });
}
