import type { AuthResponse, LookupResponse } from '@/api/client';
import { normalizePhoneNumber } from '@/utils/phone';
import { FIXTURE_SCHOOL_ID, FIXTURE_SCHOOL_NAME } from './schoolFixtures';

const FIXTURE_OTP_CODE = '000000';
const FIXTURE_TEACHER_ID = '33333333-3333-3333-3333-333333333333';
const FIXTURE_PARENT_ID = '44444444-4444-4444-4444-444444444444';

type AuthFixture = {
  lookup: LookupResponse;
  auth: AuthResponse;
  otpCode: string;
};

const TEACHER_FIXTURE_PHONE = normalizePhoneNumber('05442698494');
const PARENT_FIXTURE_PHONE = normalizePhoneNumber('05337102007');

const AUTH_FIXTURES: Record<string, AuthFixture> = {
  [TEACHER_FIXTURE_PHONE]: {
    lookup: {
      schoolName: FIXTURE_SCHOOL_NAME,
      maskedIdentifier: TEACHER_FIXTURE_PHONE,
    },
    auth: {
      accessToken: 'fixture-access-token-teacher',
      refreshToken: 'fixture-refresh-token-teacher',
      role: 'Teacher',
      userId: FIXTURE_TEACHER_ID,
      fullName: 'Elif Toksoy',
      schoolId: FIXTURE_SCHOOL_ID,
      email: 'elif.toksoy@notio.test',
      phone: TEACHER_FIXTURE_PHONE,
    },
    otpCode: FIXTURE_OTP_CODE,
  },
  [PARENT_FIXTURE_PHONE]: {
    lookup: {
      schoolName: FIXTURE_SCHOOL_NAME,
      maskedIdentifier: PARENT_FIXTURE_PHONE,
    },
    auth: {
      accessToken: 'fixture-access-token-parent',
      refreshToken: 'fixture-refresh-token-parent',
      role: 'Parent',
      userId: FIXTURE_PARENT_ID,
      fullName: 'Sezer Darendeli',
      schoolId: FIXTURE_SCHOOL_ID,
      email: 'sezer.darendeli@notio.test',
      phone: PARENT_FIXTURE_PHONE,
    },
    otpCode: FIXTURE_OTP_CODE,
  },
};

export function getAuthFixtureByPhone(phoneNumber: string): AuthFixture | null {
  return AUTH_FIXTURES[normalizePhoneNumber(phoneNumber)] ?? null;
}

export function isFixtureOtpValid(phoneNumber: string, code: string): boolean {
  const fixture = getAuthFixtureByPhone(phoneNumber);
  return fixture?.otpCode === code.trim();
}

export function getFixtureOtpCode(phoneNumber: string): string | null {
  return getAuthFixtureByPhone(phoneNumber)?.otpCode ?? null;
}
