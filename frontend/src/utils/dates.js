/**
 * PATENT+ Centralized Deterministic Date & Countdown Utility
 *
 * Uses a fixed demo reference date ("2026-08-25") for 100% deterministic countdowns
 * across all page reloads and demo sessions.
 */

export const DEMO_REFERENCE_DATE = '2026-08-25';
const FIXED_BASE_TIMESTAMP = new Date(DEMO_REFERENCE_DATE).getTime();

/**
 * Calculates remaining days from the fixed demo reference date to the patent deadline.
 *
 * @param {string} deadlineStr - ISO/date string (e.g. "2026-09-12")
 * @param {string} [refDateStr=DEMO_REFERENCE_DATE] - Reference date string
 * @returns {number} Days remaining (integer)
 */
export function getDaysToRenewal(deadlineStr, refDateStr = DEMO_REFERENCE_DATE) {
  if (!deadlineStr) return 999;
  const dl = new Date(deadlineStr).getTime();
  const base = refDateStr === DEMO_REFERENCE_DATE ? FIXED_BASE_TIMESTAMP : new Date(refDateStr).getTime();
  return Math.ceil((dl - base) / (1000 * 60 * 60 * 24));
}

/**
 * Formats a date string for UI display (e.g. "SEP 12, 2026").
 *
 * @param {string} deadlineStr - Date string
 * @returns {string} Formatted uppercase string
 */
export function getFormattedDate(deadlineStr) {
  if (!deadlineStr) return 'N/A';
  try {
    const d = new Date(deadlineStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }).toUpperCase();
  } catch {
    return deadlineStr;
  }
}

/**
 * Determines whether a deadline is within the urgent window (<= 90 days).
 *
 * @param {string} deadlineStr - Date string
 * @returns {boolean} True if 0 < days <= 90
 */
export function isUrgentDeadline(deadlineStr) {
  const days = getDaysToRenewal(deadlineStr);
  return days > 0 && days <= 90;
}
