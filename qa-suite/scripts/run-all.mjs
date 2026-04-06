import { config, qaRoot } from './lib/config.mjs';
import { runCommand } from './lib/process.mjs';

export async function runAll() {
  await runCommand('npm', ['run', 'services:up'], { cwd: qaRoot });

  try {
    await runCommand('node', ['./scripts/run-api-smoke.mjs'], { cwd: qaRoot });
    await runCommand('node', ['./scripts/run-mobile-smoke.mjs'], { cwd: qaRoot });
  } finally {
    if (!config.keepServices) {
      await runCommand('npm', ['run', 'services:down'], { cwd: qaRoot }).catch(() => {});
    }
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runAll().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
