/**
 * Date/Time Utility — Indian Standard Time (IST)
 * 
 * The backend stores all timestamps in UTC using datetime.utcnow(),
 * but returns them as naive ISO strings (no 'Z' or '+00:00' suffix).
 * JavaScript's new Date() treats naive strings as LOCAL time, not UTC.
 * 
 * These helpers append 'Z' to force UTC interpretation before converting to IST.
 */

function ensureUTC(dateStr) {
  if (!dateStr) return null;
  const s = String(dateStr).trim();
  // Already has timezone info — leave it alone
  if (s.endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(s)) return s;
  // Append 'Z' so JS treats it as UTC
  return s + 'Z';
}

/**
 * Full date + time in IST.
 * Example: "4/8/2026, 12:10:43 pm"
 */
export function formatIST(dateStr) {
  const utc = ensureUTC(dateStr);
  if (!utc) return 'N/A';
  const d = new Date(utc);
  if (isNaN(d.getTime())) return 'N/A';
  return d.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
}

/**
 * Date-only in IST.
 * Example: "4/8/2026"
 */
export function formatISTDate(dateStr) {
  const utc = ensureUTC(dateStr);
  if (!utc) return 'N/A';
  const d = new Date(utc);
  if (isNaN(d.getTime())) return 'N/A';
  return d.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' });
}

/**
 * Time-only in IST (hour:minute).
 * Example: "12:10 pm"
 */
export function formatISTTime(dateStr) {
  const utc = ensureUTC(dateStr);
  if (!utc) return 'N/A';
  const d = new Date(utc);
  if (isNaN(d.getTime())) return 'N/A';
  return d.toLocaleTimeString('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
  });
}
