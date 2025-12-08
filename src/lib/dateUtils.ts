/**
 * Parse a date string (yyyy-MM-dd) without timezone issues.
 * Creates a date at noon local time to avoid any timezone shifts.
 */
export function parseLocalDate(dateString: string): Date {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day, 12, 0, 0);
}

/**
 * Format a date to yyyy-MM-dd string in local timezone.
 */
export function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
