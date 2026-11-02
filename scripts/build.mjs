import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { root, javaTool } from './paths.mjs';
export function build(includeTests = false) {
  const files = [];
  function walk(dir) { for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, item.name); if (item.isDirectory()) walk(file); else if (file.endsWith('.java')) files.push(file);
  } }
  walk(path.join(root, 'backend', 'src', 'main', 'java'));
  if (includeTests) walk(path.join(root, 'backend', 'src', 'test', 'java'));
  const output = path.join(root, 'build', 'classes'); fs.mkdirSync(output, { recursive: true });
  const result = spawnSync(javaTool('javac'), ['--release', '21', '-encoding', 'UTF-8', '-cp', path.join(root, 'lib', '*'), '-d', output, ...files], { cwd: root, stdio: 'inherit', windowsHide: true });
  if (result.error) throw new Error(`Java 21 is required. Run scripts/setup.ps1 first. ${result.error.message}`);
  if (result.status !== 0) throw new Error('Java compilation failed.');
  console.log(`Compiled ${files.length} Java source files.`);
}
if (process.argv[1] && path.resolve(process.argv[1]) === path.join(root, 'scripts', 'build.mjs')) build(process.argv.includes('--tests'));
