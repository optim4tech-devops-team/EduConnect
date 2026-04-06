// ─── notio Brand Color System ─────────────────────────────────────────────────
// Source: notio Brand Guidelines v1.0 · 2026

// ── Birincil Renk — Turkuaz Skalası ──────────────────────────────────────────
export const TEAL_900 = '#0a2e26';
export const TEAL_800 = '#0d3d31';
export const TEAL_700 = '#0F6E56';   // Birincil — buton, link, aktif öğe
export const TEAL_600 = '#1D9E75';
export const TEAL_500 = '#2DBF8A';
export const TEAL_400 = '#5DCAA5';
export const TEAL_300 = '#9FE1CB';
export const TEAL_200 = '#C8F0E4';
export const TEAL_100 = '#E1F5EE';
export const TEAL_50  = '#F4FBF9';

// ── Vurgu Rengi — Kehribar ────────────────────────────────────────────────────
export const AMBER_600 = '#854F0B';
export const AMBER_400 = '#EF9F27';  // Bildirim, yeni içerik
export const AMBER_100 = '#FAEEDA';

// ── Nötr Skala — Slate ───────────────────────────────────────────────────────
export const SLATE_900 = '#0F172A';
export const SLATE_700 = '#334155';
export const SLATE_500 = '#64748B';
export const SLATE_300 = '#CBD5E1';
export const SLATE_100 = '#F1F5F9';
export const SLATE_50  = '#F8FAFC';

// ── Semantik Renkler ──────────────────────────────────────────────────────────
export const PRIMARY    = TEAL_700;   // '#0F6E56'
export const SECONDARY  = TEAL_500;   // '#2DBF8A'
export const ACCENT     = AMBER_400;  // '#EF9F27'
export const INFO       = TEAL_600;   // '#1D9E75'
export const SUCCESS    = '#22C55E';  // Teslim, onay, tamam
export const WARNING    = '#F97316';  // Devamsızlık, gecikme
export const ERROR      = '#EF4444';
export const DANGER     = '#EF4444';

// ── Yüzey ve Arka Plan ────────────────────────────────────────────────────────
export const BACKGROUND = SLATE_50;   // '#F8FAFC'
export const WHITE      = '#FFFFFF';
export const LIGHT_GRAY = SLATE_100;  // '#F1F5F9'
export const BORDER     = SLATE_300;  // '#CBD5E1'

// ── Metin ─────────────────────────────────────────────────────────────────────
export const TEXT       = SLATE_900;  // '#0F172A'
export const TEXT_MUTED = SLATE_500;  // '#64748B'

// ── Açık Varyantlar ───────────────────────────────────────────────────────────
export const PRIMARY_LIGHT = TEAL_300;   // '#9FE1CB' — badge bg, chip
export const ACCENT_LIGHT  = AMBER_100;  // '#FAEEDA' — açık kehribar
export const INFO_LIGHT    = TEAL_100;   // '#E1F5EE' — çok açık yeşil

// ── Özel: Parent rolü ─────────────────────────────────────────────────────────
export const PARENT_MINT = TEAL_500;  // '#2DBF8A'

// ── Gradient (Login ekranı) ───────────────────────────────────────────────────
export const GRADIENT_START = TEAL_900;  // '#0a2e26'
export const GRADIENT_END   = TEAL_700;  // '#0F6E56'

const Colors = {
  // Scale
  TEAL_900, TEAL_800, TEAL_700, TEAL_600, TEAL_500,
  TEAL_400, TEAL_300, TEAL_200, TEAL_100, TEAL_50,
  AMBER_600, AMBER_400, AMBER_100,
  SLATE_900, SLATE_700, SLATE_500, SLATE_300, SLATE_100, SLATE_50,

  // Semantic
  PRIMARY, SECONDARY, ACCENT, INFO,
  SUCCESS, WARNING, ERROR, DANGER,
  PARENT_MINT,

  // Surface
  BACKGROUND, WHITE, LIGHT_GRAY, BORDER,

  // Text
  TEXT, TEXT_MUTED,

  // Light variants
  PRIMARY_LIGHT, ACCENT_LIGHT, INFO_LIGHT,

  // Gradient
  GRADIENT_START, GRADIENT_END,
};

export default Colors;
