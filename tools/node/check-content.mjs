import { spawn } from 'node:child_process';

function run(command, args) {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      stdio: 'inherit',
      shell: false
    });

    child.on('close', (code) => {
      resolve(code ?? 1);
    });
  });
}

const code = await run(process.execPath, ['tools/node/copy-lint.js']);
process.exit(code);

