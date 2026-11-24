import api from './api';

export async function fetchDashboardStats(date) {
  const { data } = await api.get('/reports/dashboard-stats', {
    params: date ? { date } : undefined,
  });
  return data.data.stats;
}

export async function fetchAttendanceReport(params = {}) {
  const { data } = await api.get('/reports/attendance', { params });
  return data.data.report;
}

export async function fetchReminders(params = {}) {
  const { data } = await api.get('/reminders', { params });
  return data.data.reminders;
}

export async function createReminder(payload) {
  const { data } = await api.post('/reminders', payload);
  return data.data.reminder;
}

export async function updateReminder({ id, ...payload }) {
  const { data } = await api.patch(`/reminders/${id}`, payload);
  return data.data.reminder;
}

export async function deleteReminder(id) {
  const { data } = await api.delete(`/reminders/${id}`);
  return data.data;
}

export async function downloadCsvReport(type, params = {}) {
  const endpoint =
    type === 'clients' ? '/reports/export/clients.csv' : '/reports/export/sessions.csv';
  const response = await api.get(endpoint, {
    params,
    responseType: 'blob',
  });
  const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute(
    'download',
    type === 'clients' ? 'trainerdesk-clients.csv' : 'trainerdesk-sessions.csv'
  );
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
