import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export function javaTool(name) {
  const executable = process.platform === 'win32' ? `${name}.exe` : name;
  const bundled = path.join(root, 'tools', 'jdk');
  if (fs.existsSync(bundled)) {
    for (const directory of fs.readdirSync(bundled)) {
      const candidate = path.join(bundled, directory, 'bin', executable);
      if (fs.existsSync(candidate)) return candidate;
    }
  }
  if (process.env.JAVA_HOME) return path.join(process.env.JAVA_HOME, 'bin', executable);
  return name;
}
export const classpath = [path.join(root, 'build', 'classes'), path.join(root, 'lib', '*')].join(path.delimiter);
