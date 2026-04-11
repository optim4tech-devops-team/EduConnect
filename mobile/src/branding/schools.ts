import type { ImageSourcePropType } from 'react-native';
import { FIXTURE_SCHOOL_ID, FIXTURE_SCHOOL_NAME } from '@/mocks/schoolFixtures';

export interface SchoolBranding {
  schoolId?: string;
  name: string;
  logo?: ImageSourcePropType;
}

const SCHOOL_BRANDINGS: Record<string, SchoolBranding> = {
  [FIXTURE_SCHOOL_ID]: {
    schoolId: FIXTURE_SCHOOL_ID,
    name: FIXTURE_SCHOOL_NAME,
    logo: require('../../assets/schools-kucuk-siralar.png'),
  },
};

export function getSchoolBranding(
  schoolId?: string | null,
  schoolName?: string | null,
): SchoolBranding {
  if (schoolId && SCHOOL_BRANDINGS[schoolId]) {
    return SCHOOL_BRANDINGS[schoolId];
  }

  return {
    schoolId: schoolId ?? undefined,
    name: schoolName?.trim() || 'Notio Okulu',
  };
}
