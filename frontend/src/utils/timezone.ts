/**
 * Canonical Application Timezone: Asia/Kolkata (IST, UTC+05:30)
 */
export const CANONICAL_TIMEZONE = 'Asia/Kolkata';

/**
 * Formats a Date object or ISO string in Asia/Kolkata timezone
 * Matches the application's established en-GB format with time
 */
export function formatDateTimeIST(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return '—';
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(d.getTime())) return '—';

  return d.toLocaleString('en-GB', { timeZone: CANONICAL_TIMEZONE });
}

/**
 * Returns the current date in Asia/Kolkata as YYYY-MM-DD (for HTML <input type="date">)
 */
export function getCurrentISTDate(): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: CANONICAL_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());

  const year = parts.find((p) => p.type === 'year')?.value;
  const month = parts.find((p) => p.type === 'month')?.value;
  const day = parts.find((p) => p.type === 'day')?.value;
  return `${year}-${month}-${day}`;
}

/**
 * Returns the current time in Asia/Kolkata as 'hh:mm A' (e.g. '10:30 AM')
 */
export function getCurrentISTTime(): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: CANONICAL_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(new Date());
}
