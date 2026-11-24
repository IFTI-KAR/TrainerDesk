/**
 * Timezone-safe YYYY-MM-DD date utilities using UTC calendar math.
 */

function formatDateStr(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseDateStr(dateStr) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
  if (!match) {
    throw new Error(`Invalid YYYY-MM-DD date string: ${dateStr}`);
  }
  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  return new Date(Date.UTC(year, month, day));
}

function formatUTCDateStr(utcDate) {
  const year = utcDate.getUTCFullYear();
  const month = String(utcDate.getUTCMonth() + 1).padStart(2, '0');
  const day = String(utcDate.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addDays(dateStr, days) {
  const dt = parseDateStr(dateStr);
  dt.setUTCDate(dt.getUTCDate() + days);
  return formatUTCDateStr(dt);
}

/**
 * Returns 0 = Sunday ... 6 = Saturday for a YYYY-MM-DD string.
 */
function getDayOfWeek(dateStr) {
  return parseDateStr(dateStr).getUTCDay();
}

/**
 * Returns { startDate, endDate, dates[] } for the Monday-Sunday week containing dateStr.
 */
function getWeekRangeMonSun(dateStr) {
  const dt = parseDateStr(dateStr);
  const dow = dt.getUTCDay();
  const offsetToMonday = dow === 0 ? -6 : 1 - dow;
  const mondayStr = addDays(dateStr, offsetToMonday);
  const dates = Array.from({ length: 7 }, (_, i) => addDays(mondayStr, i));
  return {
    startDate: dates[0],
    endDate: dates[6],
    dates,
  };
}

module.exports = {
  formatDateStr,
  parseDateStr,
  formatUTCDateStr,
  addDays,
  getDayOfWeek,
  getWeekRangeMonSun,
};
