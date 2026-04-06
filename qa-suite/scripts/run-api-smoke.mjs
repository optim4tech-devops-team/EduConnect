import { createRequire } from 'node:module';
import fs from 'node:fs/promises';
import path from 'node:path';
import waitOn from 'wait-on';
import { buildApiSmokeCollection } from './api-smoke.collection.mjs';
import { config, ensureWorkingDirs, fixtureIds, reportsDir, tmpDir } from './lib/config.mjs';
import { getLatestOtp } from './get-latest-otp.mjs';
import { seedFixtures } from './seed-fixtures.mjs';

const require = createRequire(import.meta.url);
const newman = require('newman');

async function sendOtp(identifier) {
  const response = await fetch(`${config.apiBaseUrl}/auth/send-otp`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ identifier }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Failed to send OTP for ${identifier}: ${response.status} ${body}`);
  }
}

async function bootstrapOtp(identifier) {
  await sendOtp(identifier);

  for (let attempt = 0; attempt < 10; attempt += 1) {
    try {
      return await getLatestOtp(identifier);
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  throw new Error(`Timed out waiting for OTP for ${identifier}`);
}

function buildEnvironmentValues(fixtures, otps) {
  return [
    ['baseUrl', config.apiBaseUrl],
    ['runId', config.runId],
    ['adminPhone', fixtures.admin.phone],
    ['teacherPhone', fixtures.teacher.phone],
    ['parentPhone', fixtures.parent.phone],
    ['adminOtp', otps.adminOtp],
    ['teacherOtp', otps.teacherOtp],
    ['parentOtp', otps.parentOtp],
    ['seedSchoolId', fixtures.school.id],
    ['seedTeacherId', fixtures.teacher.id],
    ['seedParentId', fixtures.parent.id],
    ['seedClassId', fixtures.classRoom.id],
    ['seedStudentId', fixtures.student.id],
    ['fixtureSchoolId', fixtureIds.schoolId],
  ].map(([key, value]) => ({
    key,
    value,
    enabled: true,
  }));
}

function runNewman(collection, environment) {
  return new Promise((resolve, reject) => {
    newman.run(
      {
        collection,
        environment: { values: environment },
        reporters: ['cli', 'json', 'junit'],
        reporter: {
          json: {
            export: path.join(reportsDir, 'newman-report.json'),
          },
          junit: {
            export: path.join(reportsDir, 'newman-junit.xml'),
          },
        },
      },
      (error, summary) => {
        if (error) {
          reject(error);
          return;
        }

        resolve(summary);
      },
    );
  });
}

export async function runApiSmoke() {
  await ensureWorkingDirs();

  await waitOn({
    resources: [config.apiWaitUrl],
    timeout: 180_000,
    interval: 1_000,
  });

  const fixtures = await seedFixtures();
  const otps = {
    adminOtp: await bootstrapOtp(fixtures.admin.phone),
    teacherOtp: await bootstrapOtp(fixtures.teacher.phone),
    parentOtp: await bootstrapOtp(fixtures.parent.phone),
  };

  await fs.writeFile(
    path.join(tmpDir, 'otp-debug.json'),
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        fixtures,
        otps,
      },
      null,
      2,
    ),
  );

  const summary = await runNewman(
    buildApiSmokeCollection(),
    buildEnvironmentValues(fixtures, otps),
  );

  const failures = summary.run.failures ?? [];
  if (failures.length > 0) {
    const messages = failures.map((failure) => failure.error?.message || 'Unknown Newman failure');
    throw new Error(`API smoke failed:\n${messages.join('\n')}`);
  }

  console.log('API smoke completed successfully.');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runApiSmoke().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
