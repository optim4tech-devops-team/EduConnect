import fs from 'node:fs/promises';
import path from 'node:path';
import pg from 'pg';
import { config, ensureWorkingDirs, fixtureIds, tmpDir } from './lib/config.mjs';

const { Client } = pg;

function buildFixtures() {
  return {
    school: {
      id: fixtureIds.schoolId,
      name: 'Küçük Sıralar Ana Okulları',
      address: 'Küçük Sıralar Kampüsü, Lefkoşa',
      phone: '03920000000',
      logoUrl: null,
    },
    admin: {
      id: fixtureIds.adminId,
      fullName: 'Notio Platform Admin',
      email: 'platform-admin@notio.test',
      phone: config.phones.admin,
      role: 0,
    },
    teacher: {
      id: fixtureIds.teacherId,
      fullName: 'Elif Toksoy',
      email: 'elif.toksoy@notio.test',
      phone: config.phones.teacher,
      role: 1,
    },
    parent: {
      id: fixtureIds.parentId,
      fullName: 'Sezer Darendeli',
      email: 'sezer.darendeli@notio.test',
      phone: config.phones.parent,
      role: 2,
    },
    classRoom: {
      id: fixtureIds.classId,
      name: 'Papatyalar',
      teacherId: fixtureIds.teacherId,
      academicYear: '2025-2026',
    },
    student: {
      id: fixtureIds.studentId,
      fullName: 'Rana',
      classId: fixtureIds.classId,
      birthDate: '2020-09-01',
      notes: 'Seeded by QA suite for Notio regression checks',
    },
  };
}

async function upsertSchool(client, school) {
  await client.query(
    `
      INSERT INTO "Schools" ("Id", "Name", "Address", "Phone", "LogoUrl", "CreatedAt")
      VALUES ($1, $2, $3, $4, $5, NOW())
      ON CONFLICT ("Id") DO UPDATE
      SET
        "Name" = EXCLUDED."Name",
        "Address" = EXCLUDED."Address",
        "Phone" = EXCLUDED."Phone",
        "LogoUrl" = EXCLUDED."LogoUrl"
    `,
    [school.id, school.name, school.address, school.phone, school.logoUrl],
  );
}

async function upsertUser(client, user, schoolId) {
  await client.query(
    `
      INSERT INTO "Users" (
        "Id", "FullName", "Email", "Phone", "PasswordHash", "Role", "SchoolId",
        "AvatarUrl", "FcmToken", "RefreshToken", "RefreshTokenExpiry", "IsActive", "CreatedAt"
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, NULL, NULL, NULL, NULL, TRUE, NOW())
      ON CONFLICT ("Id") DO UPDATE
      SET
        "FullName" = EXCLUDED."FullName",
        "Email" = EXCLUDED."Email",
        "Phone" = EXCLUDED."Phone",
        "PasswordHash" = EXCLUDED."PasswordHash",
        "Role" = EXCLUDED."Role",
        "SchoolId" = EXCLUDED."SchoolId",
        "IsActive" = TRUE
    `,
    [
      user.id,
      user.fullName,
      user.email,
      user.phone,
      '$2a$11$OTPOnlyFixtureHashPlaceholder1234567890123456789012345',
      user.role,
      schoolId,
    ],
  );
}

async function upsertClass(client, classRoom, schoolId) {
  await client.query(
    `
      INSERT INTO "Classes" ("Id", "Name", "SchoolId", "TeacherId", "AcademicYear", "CreatedAt")
      VALUES ($1, $2, $3, $4, $5, NOW())
      ON CONFLICT ("Id") DO UPDATE
      SET
        "Name" = EXCLUDED."Name",
        "SchoolId" = EXCLUDED."SchoolId",
        "TeacherId" = EXCLUDED."TeacherId",
        "AcademicYear" = EXCLUDED."AcademicYear"
    `,
    [classRoom.id, classRoom.name, schoolId, classRoom.teacherId, classRoom.academicYear],
  );
}

async function upsertStudent(client, student) {
  await client.query(
    `
      INSERT INTO "Students" ("Id", "FullName", "BirthDate", "ClassId", "AvatarUrl", "Notes", "IsActive", "CreatedAt")
      VALUES ($1, $2, $3::date, $4, NULL, $5, TRUE, NOW())
      ON CONFLICT ("Id") DO UPDATE
      SET
        "FullName" = EXCLUDED."FullName",
        "BirthDate" = EXCLUDED."BirthDate",
        "ClassId" = EXCLUDED."ClassId",
        "Notes" = EXCLUDED."Notes",
        "IsActive" = TRUE
    `,
    [student.id, student.fullName, student.birthDate, student.classId, student.notes],
  );
}

async function upsertStudentParent(client, studentId, parentId) {
  await client.query(
    `
      INSERT INTO "StudentParents" ("StudentId", "ParentId")
      VALUES ($1, $2)
      ON CONFLICT ("StudentId", "ParentId") DO NOTHING
    `,
    [studentId, parentId],
  );
}

async function clearFixtureOtps(client, phones) {
  await client.query(
    `DELETE FROM "OtpCodes" WHERE "Identifier" = ANY($1::text[])`,
    [phones],
  );
}

export async function seedFixtures() {
  await ensureWorkingDirs();

  const fixtures = buildFixtures();
  const client = new Client({ connectionString: config.databaseUrl });

  await client.connect();

  try {
    await client.query('BEGIN');
    await upsertSchool(client, fixtures.school);
    await upsertUser(client, fixtures.admin, fixtures.school.id);
    await upsertUser(client, fixtures.teacher, fixtures.school.id);
    await upsertUser(client, fixtures.parent, fixtures.school.id);
    await upsertClass(client, fixtures.classRoom, fixtures.school.id);
    await upsertStudent(client, fixtures.student);
    await upsertStudentParent(client, fixtures.student.id, fixtures.parent.id);
    await clearFixtureOtps(client, [
      fixtures.admin.phone,
      fixtures.teacher.phone,
      fixtures.parent.phone,
    ]);
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    await client.end();
  }

  const outputPath = path.join(tmpDir, 'fixtures.json');
  await fs.writeFile(outputPath, JSON.stringify(fixtures, null, 2));
  return fixtures;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  seedFixtures()
    .then((fixtures) => {
      console.log(`Seeded QA fixtures for school ${fixtures.school.id}`);
    })
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
