import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { build } from './build.mjs';
import { root, javaTool, classpath } from './paths.mjs';
build();
const run=spawnSync(javaTool('java'),['-cp',classpath,'planner.DbLab'],{cwd:root,encoding:'utf8',windowsHide:true});
fs.mkdirSync(path.join(root,'output','tests'),{recursive:true});fs.writeFileSync(path.join(root,'output','tests','dbms-lab-results.txt'),`${new Date().toISOString()}\n${run.stdout||''}\n${run.stderr||''}`);
process.stdout.write(run.stdout||'');process.stderr.write(run.stderr||'');if(run.status!==0)process.exit(run.status||1);
