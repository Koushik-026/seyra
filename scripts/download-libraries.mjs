import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
const artifacts={
  'h2-2.4.240.jar':'com/h2database/h2/2.4.240/h2-2.4.240.jar',
  'jackson-annotations-2.18.3.jar':'com/fasterxml/jackson/core/jackson-annotations/2.18.3/jackson-annotations-2.18.3.jar',
  'jackson-core-2.18.3.jar':'com/fasterxml/jackson/core/jackson-core/2.18.3/jackson-core-2.18.3.jar',
  'jackson-databind-2.18.3.jar':'com/fasterxml/jackson/core/jackson-databind/2.18.3/jackson-databind-2.18.3.jar'
};
const lock=JSON.parse(await fs.readFile(new URL('../dependencies.lock.json',import.meta.url),'utf8'));
await fs.mkdir('lib',{recursive:true});
for(const library of lock.libraries){
  const response=await fetch('https://repo.maven.apache.org/maven2/'+artifacts[library.file]);
  if(!response.ok)throw Error(`Dependency download failed: ${library.file} (${response.status})`);
  const bytes=Buffer.from(await response.arrayBuffer());
  if(createHash('sha256').update(bytes).digest('hex')!==library.sha256)throw Error('Checksum mismatch: '+library.file);
  await fs.writeFile('lib/'+library.file,bytes);
  console.log('Verified '+library.file);
}
