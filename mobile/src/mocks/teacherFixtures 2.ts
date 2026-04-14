import type { ClassDto, PostDto, StudentDto, UserDto } from '@/api/client';
import { normalizePhoneNumber } from '@/utils/phone';
import { FIXTURE_CHILD_AVATAR, FIXTURE_PARENT_PHOTOS } from './parentFixtures';
import { FIXTURE_SCHOOL_ID } from './schoolFixtures';

const FIXTURE_TEACHER_PHONE = normalizePhoneNumber('05442698494');
const FIXTURE_TEACHER_EMAIL = 'elif.toksoy@notio.test';

export const FIXTURE_TEACHER_CLASS: ClassDto = {
  id: '55555555-5555-5555-5555-555555555555',
  name: 'Harfler Dünyası',
  teacherId: '33333333-3333-3333-3333-333333333333',
  teacherName: 'Elif Toksoy',
  studentCount: 6,
  schoolId: FIXTURE_SCHOOL_ID,
};

export const FIXTURE_TEACHER_STUDENTS: StudentDto[] = [
  {
    id: '66666666-6666-6666-6666-666666666666',
    name: 'Rana Darendeli',
    avatarUrl: FIXTURE_CHILD_AVATAR,
    classId: FIXTURE_TEACHER_CLASS.id,
    className: FIXTURE_TEACHER_CLASS.name,
    parentName: 'Sezer Darendeli',
    parentId: '44444444-4444-4444-4444-444444444444',
    badgeCount: 3,
    birthDate: '2020-09-01',
    gender: 'female',
  },
  {
    id: 'fixture-student-2',
    name: 'Lina Kaya',
    classId: FIXTURE_TEACHER_CLASS.id,
    className: FIXTURE_TEACHER_CLASS.name,
    parentName: 'Burcu Kaya',
    parentId: 'fixture-parent-2',
    badgeCount: 1,
    gender: 'female',
  },
  {
    id: 'fixture-student-3',
    name: 'Mert Can',
    classId: FIXTURE_TEACHER_CLASS.id,
    className: FIXTURE_TEACHER_CLASS.name,
    parentName: 'Okan Can',
    parentId: 'fixture-parent-3',
    badgeCount: 2,
    gender: 'male',
  },
  {
    id: 'fixture-student-4',
    name: 'Zeynep Nur',
    classId: FIXTURE_TEACHER_CLASS.id,
    className: FIXTURE_TEACHER_CLASS.name,
    parentName: 'Ceren Nur',
    parentId: 'fixture-parent-4',
    badgeCount: 0,
    gender: 'female',
  },
  {
    id: 'fixture-student-5',
    name: 'Atlas Demir',
    classId: FIXTURE_TEACHER_CLASS.id,
    className: FIXTURE_TEACHER_CLASS.name,
    parentName: 'Seda Demir',
    parentId: 'fixture-parent-5',
    badgeCount: 4,
    gender: 'male',
  },
  {
    id: 'fixture-student-6',
    name: 'Mina Acar',
    classId: FIXTURE_TEACHER_CLASS.id,
    className: FIXTURE_TEACHER_CLASS.name,
    parentName: 'Emre Acar',
    parentId: 'fixture-parent-6',
    badgeCount: 2,
    gender: 'female',
  },
];

export const FIXTURE_TEACHER_POSTS: PostDto[] = FIXTURE_PARENT_PHOTOS.map((photo, index) => ({
  ...photo,
  id: `teacher-${photo.id}`,
  authorId: FIXTURE_TEACHER_CLASS.teacherId,
  authorName: FIXTURE_TEACHER_CLASS.teacherName,
  classId: FIXTURE_TEACHER_CLASS.id,
  className: FIXTURE_TEACHER_CLASS.name,
  caption:
    index === 0
      ? 'Harfler Dünyası sınıfından günün en güzel anları.'
      : photo.caption,
  tags: [
    {
      id: `tag-rana-${index + 1}`,
      studentId: '66666666-6666-6666-6666-666666666666',
      studentName: 'Rana Darendeli',
      confidence: 0.96,
      isConfirmed: true,
    },
  ],
}));

export function isFixtureTeacherUser(user?: UserDto | null): boolean {
  if (!user || user.role !== 'Teacher') return false;
  const normalizedPhone = user.phone ? normalizePhoneNumber(user.phone) : null;
  return normalizedPhone === FIXTURE_TEACHER_PHONE || user.email === FIXTURE_TEACHER_EMAIL;
}
