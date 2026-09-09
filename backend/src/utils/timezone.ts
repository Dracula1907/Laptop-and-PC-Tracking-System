/**
 * Canonical Application Timezone: Asia/Kolkata (IST, UTC+05:30)
 */
export const CANONICAL_TIMEZONE = 'Asia/Kolkata';

/**
 * Combines a date string/Date (e.g. '2026-09-09') and a time string (e.g. '10:30 AM', '11:15', '14:30')
 * into a canonical UTC Date object representing that exact moment in Asia/Kolkata.
 */
export function combineDateTimeIST(dateInput: string | Date, timeStr?: string | null): Date {
  if (!dateInput) return new Date();

  // If already a full ISO string with time AND no separate timeStr, return parsed Date
  if (typeof dateInput === 'string' && dateInput.includes('T') && !timeStr) {
    return new Date(dateInput);
  }
  if (dateInput instanceof Date && !timeStr) {
    return dateInput;
  }

  const datePart = typeof dateInput === 'string'
    ? dateInput.slice(0, 10)
    : dateInput.toISOString().slice(0, 10);

  let hours = 0;
  let minutes = 0;
  let seconds = 0;

  if (timeStr && typeof timeStr === 'string' && timeStr.trim().length > 0) {
    const cleanTime = timeStr.trim();
    // Matches '10:30 AM', '11:15 PM', '14:30', '10:30:00'
    const match = cleanTime.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?$/i);
    if (match) {
      let h = parseInt(match[1], 10);
      const m = parseInt(match[2], 10);
      const s = match[3] ? parseInt(match[3], 10) : 0;
      const meridiem = match[4]?.toUpperCase();

      if (meridiem === 'PM' && h < 12) h += 12;
      if (meridiem === 'AM' && h === 12) h = 0;

      hours = h;
      minutes = m;
      seconds = s;
    }
  } else {
    // If no time string provided, capture current time in Asia/Kolkata
    const nowParts = new Intl.DateTimeFormat('en-GB', {
      timeZone: CANONICAL_TIMEZONE,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).formatToParts(new Date());

    hours = parseInt(nowParts.find((p) => p.type === 'hour')?.value || '0', 10);
    minutes = parseInt(nowParts.find((p) => p.type === 'minute')?.value || '0', 10);
    seconds = parseInt(nowParts.find((p) => p.type === 'second')?.value || '0', 10);
  }

  const pad = (n: number) => String(n).padStart(2, '0');
  const isoInIST = `${datePart}T${pad(hours)}:${pad(minutes)}:${pad(seconds)}+05:30`;
  return new Date(isoInIST);
}
