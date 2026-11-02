import fs from 'node:fs/promises';
import path from 'node:path';
import {root} from './paths.mjs';
const target=path.join(root,'tmp','render-source-20261102');
await fs.mkdir(target,{recursive:true});
const entries=['backend','web','database','tests','samples','docs','README.md','package.json','dependencies.lock.json','Dockerfile','.dockerignore','.gitignore','Start Planner.cmd'];
for(const name of entries)await fs.cp(path.join(root,name),path.join(target,name),{recursive:true});
await fs.mkdir(path.join(target,'scripts'),{recursive:true});
for(const name of await fs.readdir(path.join(root,'scripts'))) {
  if (/\.(?:mjs|py|ps1)$/.test(name)) await fs.copyFile(path.join(root,'scripts',name),path.join(target,'scripts',name));
}
console.log('Deployment source prepared: '+target);
console.log('Application source, anonymous documentation, tests and build configuration copied. No database, credentials, local tools or submission outputs.');
