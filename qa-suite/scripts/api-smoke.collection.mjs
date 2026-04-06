function script(exec) {
  return {
    listen: 'test',
    script: {
      type: 'text/javascript',
      exec,
    },
  };
}

function jsonRequest({ name, method, path, body, tokenVar, tests }) {
  const headers = [{ key: 'Accept', value: 'application/json' }];

  if (body !== undefined) {
    headers.push({ key: 'Content-Type', value: 'application/json' });
  }

  if (tokenVar) {
    headers.push({
      key: 'Authorization',
      value: `Bearer {{${tokenVar}}}`,
    });
  }

  return {
    name,
    event: tests?.length ? [script(tests)] : [],
    request: {
      method,
      header: headers,
      url: `{{baseUrl}}${path}`,
      ...(body !== undefined
        ? {
            body: {
              mode: 'raw',
              raw: JSON.stringify(body),
              options: { raw: { language: 'json' } },
            },
          }
        : {}),
    },
    response: [],
  };
}

export function buildApiSmokeCollection() {
  return {
    info: {
      name: 'Notio QA API Smoke',
      schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
    },
    item: [
      jsonRequest({
        name: 'Auth - Lookup Admin Phone',
        method: 'POST',
        path: '/auth/lookup',
        body: { identifier: '{{adminPhone}}' },
        tests: [
          'pm.test("lookup returns 200", function () { pm.response.to.have.status(200); });',
          'const data = pm.response.json();',
          'pm.expect(data).to.have.property("schoolName");',
          'pm.expect(data).to.have.property("maskedIdentifier");',
        ],
      }),
      jsonRequest({
        name: 'Auth - Verify Admin OTP',
        method: 'POST',
        path: '/auth/verify-otp',
        body: { identifier: '{{adminPhone}}', code: '{{adminOtp}}' },
        tests: [
          'pm.test("verify admin otp returns 200", function () { pm.response.to.have.status(200); });',
          'const data = pm.response.json();',
          'pm.environment.set("adminAccessToken", data.accessToken);',
          'pm.environment.set("adminRefreshToken", data.refreshToken);',
          'pm.environment.set("adminSchoolId", data.schoolId);',
          'pm.expect(data.role).to.eql("Admin");',
        ],
      }),
      jsonRequest({
        name: 'Admin - Me',
        method: 'GET',
        path: '/auth/me',
        tokenVar: 'adminAccessToken',
        tests: [
          'pm.test("admin me returns 200", function () { pm.response.to.have.status(200); });',
          'const data = pm.response.json();',
          'pm.expect(data.role).to.eql("Admin");',
          'pm.expect(data.phone).to.eql(pm.environment.get("adminPhone"));',
        ],
      }),
      jsonRequest({
        name: 'Admin - Get My School',
        method: 'GET',
        path: '/schools/my',
        tokenVar: 'adminAccessToken',
        tests: [
          'pm.test("get my school returns 200", function () { pm.response.to.have.status(200); });',
          'const data = pm.response.json();',
          'pm.expect(data.id).to.eql(pm.environment.get("seedSchoolId"));',
        ],
      }),
      jsonRequest({
        name: 'Admin - Update My School',
        method: 'PUT',
        path: '/schools/my',
        tokenVar: 'adminAccessToken',
        body: {
          name: 'Küçük Sıralar Ana Okulları {{runId}}',
          phone: '03920000001',
          address: 'Küçük Sıralar Kampüsü, Lefkoşa {{runId}}',
        },
        tests: [
          'pm.test("update my school returns 200", function () { pm.response.to.have.status(200); });',
          'const data = pm.response.json();',
          'pm.expect(data.name).to.include("Küçük Sıralar Ana Okulları");',
        ],
      }),
      jsonRequest({
        name: 'Admin - List Classes',
        method: 'GET',
        path: '/classes',
        tokenVar: 'adminAccessToken',
        tests: [
          'pm.test("list classes returns 200", function () { pm.response.to.have.status(200); });',
          'const data = pm.response.json();',
          'pm.expect(Array.isArray(data)).to.eql(true);',
          'pm.expect(data.some((item) => item.id === pm.environment.get("seedClassId"))).to.eql(true);',
        ],
      }),
      jsonRequest({
        name: 'Admin - Create Class',
        method: 'POST',
        path: '/classes',
        tokenVar: 'adminAccessToken',
        body: {
          name: 'QA Smoke Class {{runId}}',
          teacherId: '{{seedTeacherId}}',
          academicYear: '2025-2026',
        },
        tests: [
          'pm.test("create class returns 201", function () { pm.response.to.have.status(201); });',
          'const data = pm.response.json();',
          'pm.environment.set("createdClassId", data.id);',
          'pm.expect(data).to.have.property("id");',
        ],
      }),
      jsonRequest({
        name: 'Admin - Get Created Class',
        method: 'GET',
        path: '/classes/{{createdClassId}}',
        tokenVar: 'adminAccessToken',
        tests: [
          'pm.test("get created class returns 200", function () { pm.response.to.have.status(200); });',
          'const data = pm.response.json();',
          'pm.expect(data.id).to.eql(pm.environment.get("createdClassId"));',
        ],
      }),
      jsonRequest({
        name: 'Admin - List Students',
        method: 'GET',
        path: '/students',
        tokenVar: 'adminAccessToken',
        tests: [
          'pm.test("list students returns 200", function () { pm.response.to.have.status(200); });',
          'const data = pm.response.json();',
          'pm.expect(Array.isArray(data)).to.eql(true);',
          'pm.expect(data.some((item) => item.id === pm.environment.get("seedStudentId"))).to.eql(true);',
        ],
      }),
      jsonRequest({
        name: 'Admin - Create Student',
        method: 'POST',
        path: '/students',
        tokenVar: 'adminAccessToken',
        body: {
          fullName: 'QA Smoke Student {{runId}}',
          classId: '{{seedClassId}}',
          birthDate: '2020-09-01',
          notes: 'Created by QA suite',
        },
        tests: [
          'pm.test("create student returns 201", function () { pm.response.to.have.status(201); });',
          'const data = pm.response.json();',
          'pm.environment.set("createdStudentId", data.id);',
          'pm.expect(data).to.have.property("id");',
        ],
      }),
      jsonRequest({
        name: 'Admin - Assign Parent To Created Student',
        method: 'POST',
        path: '/students/{{createdStudentId}}/assign-parent',
        tokenVar: 'adminAccessToken',
        body: { parentId: '{{seedParentId}}' },
        tests: [
          'pm.test("assign parent returns 204", function () { pm.response.to.have.status(204); });',
        ],
      }),
      jsonRequest({
        name: 'Admin - Create Announcement',
        method: 'POST',
        path: '/announcements',
        tokenVar: 'adminAccessToken',
        body: {
          title: 'QA Announcement {{runId}}',
          content: 'Regression smoke announcement',
          classId: null,
          target: 'all',
        },
        tests: [
          'pm.test("create announcement returns 201", function () { pm.response.to.have.status(201); });',
          'pm.expect(pm.response.json()).to.have.property("id");',
        ],
      }),
      jsonRequest({
        name: 'Auth - Verify Teacher OTP',
        method: 'POST',
        path: '/auth/verify-otp',
        body: { identifier: '{{teacherPhone}}', code: '{{teacherOtp}}' },
        tests: [
          'pm.test("verify teacher otp returns 200", function () { pm.response.to.have.status(200); });',
          'const data = pm.response.json();',
          'pm.environment.set("teacherAccessToken", data.accessToken);',
          'pm.expect(data.role).to.eql("Teacher");',
        ],
      }),
      jsonRequest({
        name: 'Teacher - List Classes',
        method: 'GET',
        path: '/classes',
        tokenVar: 'teacherAccessToken',
        tests: [
          'pm.test("teacher list classes returns 200", function () { pm.response.to.have.status(200); });',
          'const data = pm.response.json();',
          'pm.expect(Array.isArray(data)).to.eql(true);',
          'pm.expect(data.some((item) => item.id === pm.environment.get("seedClassId"))).to.eql(true);',
        ],
      }),
      jsonRequest({
        name: 'Teacher - Create Assignment',
        method: 'POST',
        path: '/assignments',
        tokenVar: 'teacherAccessToken',
        body: {
          classId: '{{seedClassId}}',
          title: 'QA Homework {{runId}}',
          description: 'Created by QA smoke',
          dueDate: '2026-12-31T09:00:00Z',
          attachmentUrl: null,
        },
        tests: [
          'pm.test("create assignment returns 201", function () { pm.response.to.have.status(201); });',
          'const data = pm.response.json();',
          'pm.environment.set("createdAssignmentId", data.id);',
        ],
      }),
      jsonRequest({
        name: 'Teacher - List Assignments',
        method: 'GET',
        path: '/assignments',
        tokenVar: 'teacherAccessToken',
        tests: [
          'pm.test("teacher list assignments returns 200", function () { pm.response.to.have.status(200); });',
          'const data = pm.response.json();',
          'pm.expect(Array.isArray(data)).to.eql(true);',
          'pm.expect(data.some((item) => item.id === pm.environment.get("createdAssignmentId"))).to.eql(true);',
        ],
      }),
      jsonRequest({
        name: 'Teacher - Create Badge',
        method: 'POST',
        path: '/badges',
        tokenVar: 'teacherAccessToken',
        body: {
          name: 'QA Badge {{runId}}',
          description: 'Created by QA smoke',
          iconUrl: null,
        },
        tests: [
          'pm.test("create badge returns 201", function () { pm.response.to.have.status(201); });',
          'const data = pm.response.json();',
          'pm.environment.set("createdBadgeId", data.id);',
        ],
      }),
      jsonRequest({
        name: 'Teacher - Award Badge',
        method: 'POST',
        path: '/badges/award',
        tokenVar: 'teacherAccessToken',
        body: {
          studentId: '{{seedStudentId}}',
          badgeId: '{{createdBadgeId}}',
          note: 'Regression award',
        },
        tests: [
          'pm.test("award badge returns 201", function () { pm.response.to.have.status(201); });',
        ],
      }),
      jsonRequest({
        name: 'Teacher - Save Attendance',
        method: 'POST',
        path: '/attendance/bulk',
        tokenVar: 'teacherAccessToken',
        body: {
          classId: '{{seedClassId}}',
          date: '2026-04-06',
          entries: [
            {
              studentId: '{{seedStudentId}}',
              status: 0,
              note: 'QA smoke',
            },
          ],
        },
        tests: [
          'pm.test("save attendance returns 200", function () { pm.response.to.have.status(200); });',
          'pm.expect(pm.response.json().count).to.eql(1);',
        ],
      }),
      jsonRequest({
        name: 'Teacher - Get Attendance',
        method: 'GET',
        path: '/attendance?classId={{seedClassId}}&date=2026-04-06',
        tokenVar: 'teacherAccessToken',
        tests: [
          'pm.test("get attendance returns 200", function () { pm.response.to.have.status(200); });',
          'const data = pm.response.json();',
          'pm.expect(Array.isArray(data)).to.eql(true);',
          'pm.expect(data.some((item) => item.studentId === pm.environment.get("seedStudentId"))).to.eql(true);',
        ],
      }),
      jsonRequest({
        name: 'Auth - Verify Parent OTP',
        method: 'POST',
        path: '/auth/verify-otp',
        body: { identifier: '{{parentPhone}}', code: '{{parentOtp}}' },
        tests: [
          'pm.test("verify parent otp returns 200", function () { pm.response.to.have.status(200); });',
          'const data = pm.response.json();',
          'pm.environment.set("parentAccessToken", data.accessToken);',
          'pm.expect(data.role).to.eql("Parent");',
        ],
      }),
      jsonRequest({
        name: 'Parent - List Assignments',
        method: 'GET',
        path: '/assignments',
        tokenVar: 'parentAccessToken',
        tests: [
          'pm.test("parent list assignments returns 200", function () { pm.response.to.have.status(200); });',
          'const data = pm.response.json();',
          'pm.expect(Array.isArray(data)).to.eql(true);',
          'pm.expect(data.some((item) => item.id === pm.environment.get("createdAssignmentId"))).to.eql(true);',
        ],
      }),
      jsonRequest({
        name: 'Parent - Submit Assignment',
        method: 'POST',
        path: '/assignments/{{createdAssignmentId}}/submit',
        tokenVar: 'parentAccessToken',
        body: {
          studentId: '{{seedStudentId}}',
          fileUrl: null,
          note: 'QA submission',
        },
        tests: [
          'pm.test("submit assignment returns 201", function () { pm.response.to.have.status(201); });',
          'const data = pm.response.json();',
          'pm.environment.set("createdSubmissionId", data.submissionId);',
        ],
      }),
      jsonRequest({
        name: 'Teacher - Grade Submission',
        method: 'PUT',
        path: '/assignments/{{createdAssignmentId}}/submissions/{{createdSubmissionId}}/grade',
        tokenVar: 'teacherAccessToken',
        body: {
          grade: '5',
          feedback: 'Looks good',
        },
        tests: [
          'pm.test("grade submission returns 200", function () { pm.response.to.have.status(200); });',
        ],
      }),
      jsonRequest({
        name: 'Parent - Get Student Attendance',
        method: 'GET',
        path: '/attendance/student/{{seedStudentId}}',
        tokenVar: 'parentAccessToken',
        tests: [
          'pm.test("parent attendance returns 200", function () { pm.response.to.have.status(200); });',
          'pm.expect(Array.isArray(pm.response.json())).to.eql(true);',
        ],
      }),
      jsonRequest({
        name: 'Parent - Get Student Badges',
        method: 'GET',
        path: '/badges/student/{{seedStudentId}}',
        tokenVar: 'parentAccessToken',
        tests: [
          'pm.test("parent badges returns 200", function () { pm.response.to.have.status(200); });',
          'const data = pm.response.json();',
          'pm.expect(Array.isArray(data)).to.eql(true);',
          'pm.expect(data.length).to.be.greaterThan(0);',
        ],
      }),
      jsonRequest({
        name: 'Parent - Get Announcements',
        method: 'GET',
        path: '/announcements',
        tokenVar: 'parentAccessToken',
        tests: [
          'pm.test("parent announcements returns 200", function () { pm.response.to.have.status(200); });',
          'pm.expect(Array.isArray(pm.response.json())).to.eql(true);',
        ],
      }),
    ],
  };
}
