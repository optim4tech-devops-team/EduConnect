import type { StudentDto, StudentGender } from '@/api/client';

const META_PREFIX = '[notio-meta]';

interface StudentMeta {
  gender?: StudentGender;
}

function parseMeta(notes?: string) {
  if (!notes?.startsWith(META_PREFIX)) {
    return { meta: {} as StudentMeta, cleanNotes: notes };
  }

  const [metaLine, ...rest] = notes.split('\n');
  const rawMeta = metaLine.replace(META_PREFIX, '').trim();

  try {
    return {
      meta: JSON.parse(rawMeta) as StudentMeta,
      cleanNotes: rest.join('\n').trim() || undefined,
    };
  } catch {
    return { meta: {} as StudentMeta, cleanNotes: notes };
  }
}

export function composeStudentNotes(notes?: string, meta?: StudentMeta) {
  const trimmedNotes = notes?.trim();
  if (!meta?.gender || meta.gender === 'unknown') {
    return trimmedNotes || undefined;
  }

  const metaLine = `${META_PREFIX} ${JSON.stringify(meta)}`;
  return trimmedNotes ? `${metaLine}\n${trimmedNotes}` : metaLine;
}

export function getStudentGender(student?: Pick<StudentDto, 'gender' | 'notes'> | null): StudentGender {
  if (!student) return 'unknown';
  if (student.gender) return student.gender;
  const parsed = parseMeta(student.notes);
  return parsed.meta.gender ?? 'unknown';
}

export function getStudentNotes(student?: Pick<StudentDto, 'notes'> | null) {
  return parseMeta(student?.notes).cleanNotes;
}

export function getStudentAge(birthDate?: string) {
  if (!birthDate) return null;
  const dob = new Date(birthDate);
  if (Number.isNaN(dob.getTime())) return null;

  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const monthDiff = now.getMonth() - dob.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < dob.getDate())) {
    age -= 1;
  }

  return age >= 0 ? age : null;
}

export function getStudentAgeLabel(birthDate?: string) {
  const age = getStudentAge(birthDate);
  return age === null ? null : `${age} yaş`;
}

export function getStudentGenderLabel(gender: StudentGender) {
  switch (gender) {
    case 'female':
      return 'Kız öğrenci';
    case 'male':
      return 'Erkek öğrenci';
    default:
      return 'Öğrenci';
  }
}

export function getStudentTone(gender: StudentGender) {
  if (gender === 'female') {
    return {
      surface: '#FFF4EE',
      border: '#F9D8C7',
      start: '#FDE7D8',
      end: '#FFF7F1',
      accent: '#F59E0B',
      text: '#9A3412',
    };
  }

  if (gender === 'male') {
    return {
      surface: '#EEF6FF',
      border: '#CFE6FF',
      start: '#DCEEFF',
      end: '#F4F9FF',
      accent: '#3B82F6',
      text: '#1D4ED8',
    };
  }

  return {
    surface: '#F2FBF8',
    border: '#CFEADF',
    start: '#E7F6F0',
    end: '#F7FCFA',
    accent: '#0F6E56',
    text: '#0F6E56',
  };
}
