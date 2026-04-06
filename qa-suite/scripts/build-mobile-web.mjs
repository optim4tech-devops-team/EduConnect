import fs from 'node:fs/promises';
import { config, ensureWorkingDirs, mobileBuildDir, mobileRoot } from './lib/config.mjs';
import { runCommand } from './lib/process.mjs';

export async function buildMobileWeb() {
  await ensureWorkingDirs();
  await fs.rm(mobileBuildDir, { recursive: true, force: true });

  await runCommand(
    'npm',
    ['run', 'build:web', '--', '--output-dir', mobileBuildDir],
    {
      cwd: mobileRoot,
      env: {
        ...process.env,
        EXPO_PUBLIC_API_URL: config.apiBaseUrl,
      },
    },
  );
}

if (import.meta.url === `file://${process.argv[1]}`) {
  buildMobileWeb().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
