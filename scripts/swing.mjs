import { spawn } from 'node:child_process';
import { javaTool, classpath, root } from './paths.mjs';
spawn(javaTool('java'),['-cp',classpath,'planner.SwingCoordinator'],{cwd:root,stdio:'inherit',windowsHide:true});
