// Test fixture helper — maps known test phone numbers to OTP codes
// so testers don't need to wait for a real SMS.

const FIXTURE_MAP: Record<string, string> = {
  '+905551234567': '123456',
  '+905559876543': '123456',
};

export function getFixtureOtpCode(phoneNumber: string): string | null {
  return FIXTURE_MAP[phoneNumber] ?? null;
}
