import { spawn } from 'node:child_process';

export async function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: options.env ?? process.env,
      stdio: options.stdio ?? 'inherit',
      shell: false,
    });

    child.on('error', reject);
    child.on('exit', (code, signal) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(
        new Error(
          `${command} ${args.join(' ')} failed with code ${code ?? 'null'}${signal ? ` (signal: ${signal})` : ''}`,
        ),
      );
    });
  });
}

export function startBackground(command, args, options = {}) {
  return spawn(command, args, {
    cwd: options.cwd,
    env: options.env ?? process.env,
    stdio: options.stdio ?? 'inherit',
    shell: false,
  });
}

export async function stopBackground(child) {
  if (!child || child.killed) return;

  await new Promise((resolve) => {
    const finalize = () => resolve();
    child.once('exit', finalize);
    child.kill('SIGINT');
    setTimeout(() => {
      if (!child.killed) child.kill('SIGKILL');
      resolve();
    }, 5_000);
  });
}
