const Client = require('../models/Client');
const Session = require('../models/Session');
const { Reminder } = require('../models/Reminder');
const AppError = require('../utils/AppError');
const { addDays, formatDateStr, getWeekRangeMonSun } = require('../utils/dateUtils');
const { ensureSessionsForDateRange } = require('./schedule.service');
const { round1 } = require('./metrics.service');

function escapeCsvCell(value) {
  if (value === null || value === undefined) return '';
  let str = String(value);
  if (/^[=+\-@\t\r]/.test(str) && !/^-\d+(\.\d+)?$/.test(str)) {
    str = `'${str}`;
  }
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function buildCsv(headers, rows) {
  const lines = [headers.map(escapeCsvCell).join(',')];
  for (const row of rows) {
    lines.push(row.map(escapeCsvCell).join(','));
  }
  return `${lines.join('\n')}\n`;
}

function formatReminder(doc) {
  const obj = typeof doc.toJSON === 'function' ? doc.toJSON() : { ...doc };
  const clientPopulated =
    obj.clientId && typeof obj.clientId === 'object' && obj.clientId.name ? obj.clientId : null;
  return {
    id: obj.id || obj._id?.toString(),
    trainerId: obj.trainerId?.toString?.() || obj.trainerId,
    clientId: clientPopulated
      ? clientPopulated._id?.toString?.() || clientPopulated.id
      : obj.clientId?.toString?.() || null,
    client: clientPopulated
      ? {
          id: clientPopulated._id?.toString?.() || clientPopulated.id,
          name: clientPopulated.name,
          photoUrl: clientPopulated.photoUrl || '',
        }
      : null,
    title: obj.title,
    dueAt: obj.dueAt || null,
    type: obj.type || 'follow_up',
    notes: obj.notes || '',
    isDone: Boolean(obj.isDone),
    completedAt: obj.completedAt || null,
    createdAt: obj.createdAt,
    updatedAt: obj.updatedAt,
  };
}

async function getDashboardStats(trainerId, referenceDateStr) {
  const todayStr = referenceDateStr || formatDateStr(new Date());
  const { startDate: weekStart, endDate: weekEnd } = getWeekRangeMonSun(todayStr);

  await ensureSessionsForDateRange({
    trainerId,
    startDate: weekStart,
    endDate: weekEnd,
  });

  const windowStart = addDays(todayStr, -29);
  const now = new Date();
  const in14Days = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

  const [
    clients,
    weekSessions,
    missedRecentSessions,
    openRemindersCount,
    overdueRemindersCount,
  ] = await Promise.all([
    Client.find({ trainerId })
      .select('name photoUrl status goal membershipEnd')
      .lean(),
    Session.find({
      trainerId,
      date: { $gte: weekStart, $lte: weekEnd },
      status: { $ne: 'cancelled' },
    })
      .select('date status clientId')
      .lean(),
    Session.find({
      trainerId,
      date: { $gte: windowStart, $lte: todayStr },
      status: 'missed',
    })
      .select('clientId date')
      .lean(),
    Reminder.countDocuments({ trainerId, isDone: false }),
    Reminder.countDocuments({ trainerId, isDone: false, dueAt: { $ne: null, $lt: now } }),
  ]);

  const clientMap = new Map();
  let activeClientsCount = 0;
  const expiringClients = [];

  for (const client of clients) {
    const id = client._id.toString();
    clientMap.set(id, client);
    if (client.status === 'active') {
      activeClientsCount += 1;
      if (client.membershipEnd) {
        const end = new Date(client.membershipEnd);
        if (end >= now && end <= in14Days) {
          const daysRemaining = Math.max(
            0,
            Math.ceil((end.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))
          );
          expiringClients.push({
            id,
            name: client.name,
            membershipEnd: client.membershipEnd,
            daysRemaining,
          });
        }
      }
    }
  }

  let weekTotal = 0;
  let weekCompleted = 0;
  let weekScheduled = 0;
  let weekInProgress = 0;
  let weekMissed = 0;
  let todayTotal = 0;
  let todayCompleted = 0;
  let todayRemaining = 0;

  for (const s of weekSessions) {
    weekTotal += 1;
    if (s.status === 'completed') weekCompleted += 1;
    else if (s.status === 'scheduled') weekScheduled += 1;
    else if (s.status === 'in_progress') weekInProgress += 1;
    else if (s.status === 'missed') weekMissed += 1;

    if (s.date === todayStr) {
      todayTotal += 1;
      if (s.status === 'completed') todayCompleted += 1;
      else if (s.status === 'scheduled' || s.status === 'in_progress') todayRemaining += 1;
    }
  }

  const weekRated = weekCompleted + weekMissed;
  const weekAdherencePct = weekRated > 0 ? round1((weekCompleted / weekRated) * 100) : 0;

  const missedByClient = new Map();
  for (const m of missedRecentSessions) {
    const cid = m.clientId.toString();
    const client = clientMap.get(cid);
    if (!client || client.status !== 'active') continue;
    const prev = missedByClient.get(cid) || {
      clientId: cid,
      name: client.name,
      photoUrl: client.photoUrl || '',
      missedCount: 0,
      lastMissedDate: '',
    };
    prev.missedCount += 1;
    if (!prev.lastMissedDate || m.date > prev.lastMissedDate) {
      prev.lastMissedDate = m.date;
    }
    missedByClient.set(cid, prev);
  }

  const missedTwoPlusClients = Array.from(missedByClient.values())
    .filter((entry) => entry.missedCount >= 2)
    .sort((a, b) => b.missedCount - a.missedCount || a.name.localeCompare(b.name));

  expiringClients.sort((a, b) => a.daysRemaining - b.daysRemaining);

  return {
    date: todayStr,
    weekRange: { startDate: weekStart, endDate: weekEnd },
    totalClientsCount: clients.length,
    activeClientsCount,
    expiringMembershipsCount: expiringClients.length,
    expiringClients,
    todaySummary: {
      total: todayTotal,
      completed: todayCompleted,
      remaining: todayRemaining,
    },
    sessionsThisWeek: {
      total: weekTotal,
      completed: weekCompleted,
      scheduled: weekScheduled,
      inProgress: weekInProgress,
      missed: weekMissed,
      adherencePct: weekAdherencePct,
    },
    missedTwoPlusClients,
    openRemindersCount,
    overdueRemindersCount,
  };
}

async function getAttendanceReport(trainerId, { startDate, endDate, clientId } = {}) {
  const end = endDate || formatDateStr(new Date());
  const start = startDate || addDays(end, -29);
  if (start > end) {
    throw new AppError(400, 'startDate cannot be after endDate', 'INVALID_DATE_RANGE');
  }

  const clientQuery = { trainerId };
  if (clientId) clientQuery._id = clientId;

  const sessionQuery = {
    trainerId,
    date: { $gte: start, $lte: end },
  };
  if (clientId) sessionQuery.clientId = clientId;

  const [clients, sessions] = await Promise.all([
    Client.find(clientQuery).select('name photoUrl goal status').lean(),
    Session.find(sessionQuery)
      .select('clientId date status totalVolume')
      .sort({ date: 1 })
      .lean(),
  ]);

  const byClient = new Map();
  for (const c of clients) {
    byClient.set(c._id.toString(), {
      clientId: c._id.toString(),
      name: c.name,
      photoUrl: c.photoUrl || '',
      goal: c.goal,
      status: c.status,
      totalSessions: 0,
      completed: 0,
      missed: 0,
      cancelled: 0,
      scheduled: 0,
      inProgress: 0,
      attendanceRatePct: 0,
      totalVolumeKg: 0,
      lastSessionDate: null,
    });
  }

  const byDate = new Map();
  const summary = {
    totalSessions: 0,
    completed: 0,
    missed: 0,
    cancelled: 0,
    scheduled: 0,
    inProgress: 0,
    attendanceRatePct: 0,
    totalVolumeKg: 0,
  };

  for (const s of sessions) {
    summary.totalSessions += 1;
    const vol = Number(s.totalVolume) || 0;
    if (s.status === 'completed') {
      summary.completed += 1;
      summary.totalVolumeKg += vol;
    } else if (s.status === 'missed') {
      summary.missed += 1;
    } else if (s.status === 'cancelled') {
      summary.cancelled += 1;
    } else if (s.status === 'in_progress') {
      summary.inProgress += 1;
    } else {
      summary.scheduled += 1;
    }

    const dEntry = byDate.get(s.date) || {
      date: s.date,
      completed: 0,
      missed: 0,
      scheduled: 0,
    };
    if (s.status === 'completed') dEntry.completed += 1;
    else if (s.status === 'missed') dEntry.missed += 1;
    else if (s.status !== 'cancelled') dEntry.scheduled += 1;
    byDate.set(s.date, dEntry);

    const cid = s.clientId.toString();
    const cEntry = byClient.get(cid);
    if (cEntry) {
      cEntry.totalSessions += 1;
      if (s.status === 'completed') {
        cEntry.completed += 1;
        cEntry.totalVolumeKg += vol;
        if (!cEntry.lastSessionDate || s.date > cEntry.lastSessionDate) {
          cEntry.lastSessionDate = s.date;
        }
      } else if (s.status === 'missed') {
        cEntry.missed += 1;
      } else if (s.status === 'cancelled') {
        cEntry.cancelled += 1;
      } else if (s.status === 'in_progress') {
        cEntry.inProgress += 1;
      } else {
        cEntry.scheduled += 1;
      }
    }
  }

  const overallRated = summary.completed + summary.missed;
  summary.attendanceRatePct =
    overallRated > 0 ? round1((summary.completed / overallRated) * 100) : 0;
  summary.totalVolumeKg = round1(summary.totalVolumeKg);

  const clientRows = Array.from(byClient.values())
    .map((row) => {
      const rated = row.completed + row.missed;
      return {
        ...row,
        attendanceRatePct: rated > 0 ? round1((row.completed / rated) * 100) : 0,
        totalVolumeKg: round1(row.totalVolumeKg),
      };
    })
    .sort((a, b) => b.missed - a.missed || b.completed - a.completed || a.name.localeCompare(b.name));

  const daily = Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date));

  return {
    range: { startDate: start, endDate: end },
    summary,
    clients: clientRows,
    daily,
  };
}

async function exportClientsCsv(trainerId, { status, goal } = {}) {
  const filter = { trainerId };
  if (status) filter.status = status;
  if (goal) filter.goal = goal;

  const clients = await Client.find(filter).sort({ name: 1 }).lean();
  const headers = [
    'Name',
    'Status',
    'Goal',
    'Phone',
    'Email',
    'Gender',
    'Height (cm)',
    'Starting Weight (kg)',
    'Target Weight (kg)',
    'Membership Start',
    'Membership End',
    'Created At',
  ];

  const rows = clients.map((c) => [
    c.name,
    c.status,
    c.goal,
    c.phone || '',
    c.email || '',
    c.gender || '',
    c.heightCm ?? '',
    c.startingWeightKg ?? '',
    c.targetWeightKg ?? '',
    c.membershipStart ? new Date(c.membershipStart).toISOString().slice(0, 10) : '',
    c.membershipEnd ? new Date(c.membershipEnd).toISOString().slice(0, 10) : '',
    c.createdAt ? new Date(c.createdAt).toISOString().slice(0, 10) : '',
  ]);

  return buildCsv(headers, rows);
}

async function exportSessionsCsv(trainerId, { startDate, endDate, clientId, status } = {}) {
  const filter = { trainerId };
  if (startDate || endDate) {
    filter.date = {};
    if (startDate) filter.date.$gte = startDate;
    if (endDate) filter.date.$lte = endDate;
  }
  if (clientId) filter.clientId = clientId;
  if (status) filter.status = status;

  const sessions = await Session.find(filter)
    .populate('clientId', 'name')
    .sort({ date: -1, time: -1 })
    .lean();

  const headers = [
    'Date',
    'Time',
    'Duration (min)',
    'Client',
    'Workout Day',
    'Status',
    'Total Volume',
    'PR Count',
    'Missed Reason',
    'Session Notes',
  ];

  const rows = sessions.map((s) => [
    s.date,
    s.time,
    s.durationMin ?? 60,
    s.clientId?.name || 'Client',
    s.workoutSnapshot?.dayName || '',
    s.status,
    s.totalVolume ?? 0,
    s.prCount ?? 0,
    s.missedReason || '',
    s.sessionNotes || '',
  ]);

  return buildCsv(headers, rows);
}

async function listReminders(trainerId, { status = 'open', clientId } = {}) {
  const filter = { trainerId };
  if (status === 'open') filter.isDone = false;
  else if (status === 'done') filter.isDone = true;
  if (clientId) filter.clientId = clientId;

  const docs = await Reminder.find(filter)
    .populate('clientId', 'name photoUrl')
    .sort({ isDone: 1, dueAt: 1, createdAt: -1 });

  return docs.map(formatReminder);
}

async function createReminder(trainerId, payload) {
  if (payload.clientId) {
    const exists = await Client.exists({ _id: payload.clientId, trainerId });
    if (!exists) {
      throw new AppError(404, 'Client not found', 'CLIENT_NOT_FOUND');
    }
  }

  const created = await Reminder.create({
    trainerId,
    clientId: payload.clientId || null,
    title: payload.title,
    dueAt: payload.dueAt ?? null,
    type: payload.type || 'follow_up',
    notes: payload.notes || '',
  });

  const populated = await Reminder.findById(created._id).populate('clientId', 'name photoUrl');
  return formatReminder(populated);
}

async function updateReminder(trainerId, reminderId, payload) {
  const reminder = await Reminder.findOne({ _id: reminderId, trainerId });
  if (!reminder) {
    throw new AppError(404, 'Reminder not found', 'REMINDER_NOT_FOUND');
  }

  if (payload.clientId !== undefined) {
    if (payload.clientId) {
      const exists = await Client.exists({ _id: payload.clientId, trainerId });
      if (!exists) {
        throw new AppError(404, 'Client not found', 'CLIENT_NOT_FOUND');
      }
      reminder.clientId = payload.clientId;
    } else {
      reminder.clientId = null;
    }
  }

  if (payload.title !== undefined) reminder.title = payload.title;
  if (payload.dueAt !== undefined) reminder.dueAt = payload.dueAt;
  if (payload.type !== undefined) reminder.type = payload.type;
  if (payload.notes !== undefined) reminder.notes = payload.notes;
  if (payload.isDone !== undefined) {
    reminder.isDone = payload.isDone;
    reminder.completedAt = payload.isDone ? new Date() : null;
  }

  await reminder.save();
  const populated = await Reminder.findById(reminder._id).populate('clientId', 'name photoUrl');
  return formatReminder(populated);
}

async function deleteReminder(trainerId, reminderId) {
  const deleted = await Reminder.findOneAndDelete({ _id: reminderId, trainerId });
  if (!deleted) {
    throw new AppError(404, 'Reminder not found', 'REMINDER_NOT_FOUND');
  }
  return { id: deleted._id.toString() };
}

module.exports = {
  getDashboardStats,
  getAttendanceReport,
  exportClientsCsv,
  exportSessionsCsv,
  listReminders,
  createReminder,
  updateReminder,
  deleteReminder,
};
