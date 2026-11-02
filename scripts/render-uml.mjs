import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {root,javaTool} from './paths.mjs';
const directory=path.join(root,'docs','diagrams');
const jar=path.join(root,'tools','documentation','plantuml-1.2026.9.jar');
const files=fs.readdirSync(directory).filter(f=>f.endsWith('.puml')).map(f=>path.join(directory,f));
for(const options of [['-tsvg'],['-tpng','-Sdpi=220']]){
  const result=spawnSync(javaTool('java'),['-Djava.awt.headless=true','-jar',jar,'-failfast2',...options,...files],{cwd:root,encoding:'utf8',windowsHide:true});
  if(result.status!==0){process.stderr.write(result.stderr||result.stdout);process.exit(result.status||1);}
}
for(const file of files){
  const svg=file.replace(/\.puml$/,'.svg');
  const source=fs.readFileSync(svg,'utf8');if(/Syntax Error|Error line|No diagram found/.test(source))throw Error('Invalid UML: '+file);
  console.log(path.basename(svg));
}
