export function normalizePhoneNumber(value: string): string {
  let digits = value.replace(/\D/g, '');

  if (digits.startsWith('0090')) {
    digits = digits.slice(4);
  } else if (digits.startsWith('90') && digits.length === 12) {
    digits = digits.slice(2);
  }

  if (digits.length === 10) {
    return `0${digits}`;
  }

  return digits;
}

export function isValidTurkishPhoneNumber(value: string): boolean {
  return /^0\d{10}$/.test(normalizePhoneNumber(value));
}
