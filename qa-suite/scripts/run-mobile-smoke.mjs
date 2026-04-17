import waitOn from 'wait-on';
import { buildMobileWeb } from './build-mobile-web.mjs';
import { config, qaRoot, mobileBuildDir } from './lib/config.mjs';
import { runCommand, startBackground, stopBackground } from './lib/process.mjs';

export async function runMobileSmoke() {
  await buildMobileWeb();

  const server = startBackground(
    'node',
    ['./scripts/serve-mobile-web.mjs', mobileBuildDir, config.mobileWebPort],
    { cwd: qaRoot },
  );

  try {
    await waitOn({
      resources: [config.mobileWebUrl],
      timeout: 120_000,
      interval: 1_000,
    });

    await runCommand('npx', ['playwright', 'test'], {
      cwd: qaRoot,
      env: {
        ...process.env,
        QA_MOBILE_WEB_URL: config.mobileWebUrl,
      },
    });
  } finally {
    await stopBackground(server);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runMobileSmoke().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
