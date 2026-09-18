/**
 * Production Export Safety Utilities
 * Protects against CSV / Spreadsheet formula injection (CWE-1236)
 * and sanitizes export filenames.
 */

const FORMULA_PREFIXES = ['=', '+', '-', '@', '\t', '\r'];

/**
 * Sanitizes a single cell value for CSV export.
 * If a text value begins with formula characters (=, +, -, @, \t, \r),
 * it is prepended with a single quote (') to force spreadsheet applications
 * to treat it as plain text.
 */
export function sanitizeCsvCell(value: unknown): string {
  if (value == null) return '';
  let str = String(value);

  // Strip or neutralize formula execution trigger
  if (typeof value === 'string' && str.length > 0) {
    const firstChar = str.charAt(0);
    if (FORMULA_PREFIXES.includes(firstChar)) {
      str = `'${str}`;
    }
  }

  // Escape quotes
  const escaped = str.replace(/"/g, '""');

  // Wrap in quotes if it contains commas, quotes, or newlines
  if (escaped.includes(',') || escaped.includes('"') || escaped.includes('\n') || escaped.includes('\r')) {
    return `"${escaped}"`;
  }

  return escaped;
}

/**
 * Sanitizes a cell value for Excel / SheetJS export.
 * Prevents formula execution when opening .xlsx files.
 */
export function sanitizeSpreadsheetCell(value: unknown): unknown {
  if (typeof value === 'string' && value.length > 0) {
    const firstChar = value.charAt(0);
    if (FORMULA_PREFIXES.includes(firstChar)) {
      return `'${value}`;
    }
  }
  return value;
}

/**
 * Sanitizes an entire record object for spreadsheet exports.
 */
export function sanitizeSpreadsheetObject<T extends Record<string, any>>(row: T): T {
  const sanitized: Record<string, any> = {};
  for (const [key, val] of Object.entries(row)) {
    sanitized[key] = sanitizeSpreadsheetCell(val);
  }
  return sanitized as T;
}

/**
 * Sanitizes download filenames to prevent directory traversal or invalid characters.
 */
export function sanitizeFilename(filename: string, fallback: string = 'export.csv'): string {
  if (!filename || typeof filename !== 'string') return fallback;
  
  // Remove path traversal and dangerous characters
  const cleaned = filename
    .replace(/[/\\?%*:|"<>]/g, '_')
    .replace(/\.\.+/g, '_')
    .trim();

  return cleaned.length > 0 ? cleaned : fallback;
}
