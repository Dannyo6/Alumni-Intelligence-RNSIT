/**
 * Production Defensive Formatting Utilities
 * Null-safe and resilient against undefined, null, NaN, and invalid date formats.
 */

/**
 * Formats a date string safely into locale date format.
 * Gracefully returns fallback on null, undefined, or invalid dates.
 */
export function formatDateSafe(value: unknown, fallback: string = '—'): string {
  if (!value || typeof value !== 'string') return fallback;
  const d = new Date(value);
  if (isNaN(d.getTime())) return fallback;
  return d.toLocaleDateString();
}

/**
 * Formats a timestamp string safely into locale date & time format.
 * Gracefully returns fallback on null, undefined, or invalid timestamps.
 */
export function formatDateTimeSafe(value: unknown, fallback: string = '—'): string {
  if (!value || typeof value !== 'string') return fallback;
  const d = new Date(value);
  if (isNaN(d.getTime())) return fallback;
  return d.toLocaleString();
}

/**
 * Formats a number safely with thousands separators.
 * Gracefully handles null, undefined, and NaN.
 */
export function formatNumberSafe(value: unknown, fallback: string = '0'): string {
  if (value == null) return fallback;
  const num = Number(value);
  if (isNaN(num)) return fallback;
  return num.toLocaleString();
}
