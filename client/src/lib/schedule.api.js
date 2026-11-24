import api from './api';

export function formatLocalDateStr(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getTodayDateStr() {
  return formatLocalDateStr(new Date());
}

export function parseDateStrUtc(dateStr) {
  const [y, m, d] = String(dateStr).split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function addDaysStr(dateStr, deltaDays) {
  const dt = parseDateStrUtc(dateStr);
  dt.setUTCDate(dt.getUTCDate() + deltaDays);
  const y = dt.getUTCFullYear();
  const m = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const d = String(dt.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function formatLongDate(dateStr) {
  const dt = parseDateStrUtc(dateStr);
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(dt);
}

export function formatShortWeekdayDate(dateStr) {
  const dt = parseDateStrUtc(dateStr);
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(dt);
}

export function formatTime12h(hhmm = '08:00') {
  const [hStr, mStr] = String(hhmm).split(':');
  const h = Number(hStr);
  const m = Number(mStr);
  if (Number.isNaN(h) || Number.isNaN(m)) return hhmm;
  const suffix = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, '0')} ${suffix}`;
}

export function getMonthGridDates(year, monthIndex) {
  const firstOfMonth = new Date(Date.UTC(year, monthIndex, 1));
  const lastOfMonth = new Date(Date.UTC(year, monthIndex + 1, 0));
  const firstDow = firstOfMonth.getUTCDay();
  const offsetToMon = firstDow === 0 ? -6 : 1 - firstDow;

  const gridStart = new Date(firstOfMonth);
  gridStart.setUTCDate(firstOfMonth.getUTCDate() + offsetToMon);

  const totalDaysInMonth = lastOfMonth.getUTCDate();
  const leadingEmpty = Math.abs(offsetToMon);
  const totalCells = leadingEmpty + totalDaysInMonth > 35 ? 42 : 35;

  const cells = [];
  for (let i = 0; i < totalCells; i += 1) {
    const cellDate = new Date(gridStart);
    cellDate.setUTCDate(gridStart.getUTCDate() + i);
    const y = cellDate.getUTCFullYear();
    const m = String(cellDate.getUTCMonth() + 1).padStart(2, '0');
    const d = String(cellDate.getUTCDate()).padStart(2, '0');
    cells.push({
      date: `${y}-${m}-${d}`,
      dayNumber: cellDate.getUTCDate(),
      inCurrentMonth: cellDate.getUTCMonth() === monthIndex,
    });
  }
  return cells;
}

export const SESSION_STATUS_META = {
  scheduled: { label: 'Scheduled', tone: 'neutral', borderClass: 'border-l-ink-muted/40' },
  in_progress: { label: 'In progress', tone: 'accent', borderClass: 'border-l-accent' },
  completed: { label: 'Completed', tone: 'success', borderClass: 'border-l-success' },
  missed: { label: 'Missed', tone: 'danger', borderClass: 'border-l-danger' },
  cancelled: { label: 'Cancelled', tone: 'neutral', borderClass: 'border-l-line' },
};

export async function fetchScheduleRules(params = {}) {
  const res = await api.get('/schedule-rules', { params });
  return res.data.data.rules;
}

export async function createScheduleRule(payload) {
  const res = await api.post('/schedule-rules', payload);
  return res.data.data.rule;
}

export async function updateScheduleRule({ id, payload }) {
  const res = await api.patch(`/schedule-rules/${id}`, payload);
  return res.data.data.rule;
}

export async function deleteScheduleRule(id) {
  const res = await api.delete(`/schedule-rules/${id}`);
  return res.data;
}

export async function fetchSessions(params = {}) {
  const cleaned = Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== '' && v !== undefined && v !== null)
  );
  const res = await api.get('/sessions', { params: cleaned });
  return res.data.data;
}

export async function fetchWeekSummary(date) {
  const res = await api.get('/sessions/week-summary', { params: date ? { date } : {} });
  return res.data.data;
}

export async function fetchSessionById(id) {
  const res = await api.get(`/sessions/${id}`);
  return res.data.data.session;
}

export async function fetchLiveSession(id) {
  const res = await api.get(`/sessions/${id}/live`);
  return res.data.data;
}

export async function logSessionProgress({ id, payload }) {
  const res = await api.patch(`/sessions/${id}/log`, payload);
  return res.data.data;
}

export async function completeSession({ id, payload = {} }) {
  const res = await api.post(`/sessions/${id}/complete`, payload);
  return res.data.data;
}

export async function createOneOffSession(payload) {
  const res = await api.post('/sessions/one-off', payload);
  return res.data.data.session;
}

export async function rescheduleSession({ id, payload }) {
  const res = await api.patch(`/sessions/${id}/reschedule`, payload);
  return res.data.data.session;
}

export async function cancelSession({ id, reason = '' }) {
  const res = await api.post(`/sessions/${id}/cancel`, { reason });
  return res.data.data.session;
}

export async function updateSessionStatus({ id, status, missedReason }) {
  const res = await api.patch(`/sessions/${id}/status`, { status, missedReason });
  return res.data.data.session;
}
