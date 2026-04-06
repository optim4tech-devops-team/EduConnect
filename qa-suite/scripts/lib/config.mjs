import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const currentDir = path.dirname(fileURLToPath(import.meta.url));

export const qaRoot = path.resolve(currentDir, '../..');
export const repoRoot = path.resolve(qaRoot, '..');
export const mobileRoot = path.join(repoRoot, 'mobile');
export const reportsDir = path.join(qaRoot, 'reports');
export const tmpDir = path.join(qaRoot, '.tmp');
export const mobileBuildDir = path.join(tmpDir, 'mobile-web');

export const config = {
  apiBaseUrl: process.env.QA_API_BASE_URL || 'http://127.0.0.1:5000/api',
  apiWaitUrl: process.env.QA_API_WAIT_URL || 'http://127.0.0.1:5000/swagger/index.html',
  databaseUrl:
    process.env.QA_DATABASE_URL ||
    'postgresql://edulink_user:edulink_pass_change_me@127.0.0.1:5432/edulink_qa',
  mobileWebUrl: process.env.QA_MOBILE_WEB_URL || 'http://127.0.0.1:4173',
  mobileWebPort: process.env.QA_MOBILE_WEB_PORT || '4173',
  keepServices: process.env.QA_KEEP_SERVICES === '1',
  runId:
    process.env.QA_RUN_ID ||
    new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14),
  phones: {
    admin: process.env.QA_ADMIN_PHONE || '05330000001',
    teacher: process.env.QA_TEACHER_PHONE || '05330000002',
    parent: process.env.QA_PARENT_PHONE || '05337102007',
  },
};

export const fixtureIds = {
  schoolId: '11111111-1111-1111-1111-111111111111',
  adminId: '22222222-2222-2222-2222-222222222222',
  teacherId: '33333333-3333-3333-3333-333333333333',
  parentId: '44444444-4444-4444-4444-444444444444',
  classId: '55555555-5555-5555-5555-555555555555',
  studentId: '66666666-6666-6666-6666-666666666666',
};

export async function ensureWorkingDirs() {
  await fs.mkdir(reportsDir, { recursive: true });
  await fs.mkdir(tmpDir, { recursive: true });
}
