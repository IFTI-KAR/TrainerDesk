const request = require('supertest');
const app = require('../../app');
const { connectDB, disconnectDB } = require('../../config/db');
const Trainer = require('../../models/Trainer');
const Client = require('../../models/Client');
const ScheduleRule = require('../../models/ScheduleRule');
const Session = require('../../models/Session');
const { Reminder } = require('../../models/Reminder');
const { addDays, formatDateStr } = require('../../utils/dateUtils');

describe('Reports, CSV Exports & Reminders API (/api/v1/reports, /api/v1/reminders)', () => {
  let agentA;
  let agentB;
  let clientA1;
  let clientA2;
  let clientB1;

  beforeAll(async () => {
    await connectDB();
  });

  beforeEach(async () => {
    await Promise.all([
      Trainer.deleteMany({}),
      Client.deleteMany({}),
      ScheduleRule.deleteMany({}),
      Session.deleteMany({}),
      Reminder.deleteMany({}),
    ]);

    agentA = request.agent(app);
    agentB = request.agent(app);

    await agentA.post('/api/v1/auth/register').send({
      name: 'Coach A',
      email: 'coacha@trainerdesk.dev',
      password: 'Password123',
      gymName: 'Iron Craft',
    });

    await agentB.post('/api/v1/auth/register').send({
      name: 'Coach B',
      email: 'coachb@trainerdesk.dev',
      password: 'Password123',
    });

    const soonEnd = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString();

    clientA1 = (
      await agentA.post('/api/v1/clients').send({
        name: 'Rohan Sharma',
        goal: 'muscle_gain',
        startingWeightKg: 72,
        targetWeightKg: 78,
        membershipEnd: soonEnd,
      })
    ).body.data.client;

    clientA2 = (
      await agentA.post('/api/v1/clients').send({
        name: '=SUM(1+1) Evil',
        goal: 'fat_loss',
      })
    ).body.data.client;

    clientB1 = (
      await agentB.post('/api/v1/clients').send({
        name: 'Trainer B Client',
        goal: 'strength',
      })
    ).body.data.client;
  });

  afterAll(async () => {
    await disconnectDB();
  });

  it('computes dashboard-stats with missed 2+ alerts, expiring memberships, and reminder counts', async () => {
    const todayStr = formatDateStr(new Date());
    const d1 = addDays(todayStr, -2);
    const d2 = addDays(todayStr, -1);

    const s1 = (
      await agentA.post('/api/v1/sessions/one-off').send({
        clientId: clientA1.id,
        date: d1,
        time: '08:00',
        durationMin: 60,
      })
    ).body.data.session;

    const s2 = (
      await agentA.post('/api/v1/sessions/one-off').send({
        clientId: clientA1.id,
        date: d2,
        time: '08:00',
        durationMin: 60,
      })
    ).body.data.session;

    await agentA.patch(`/api/v1/sessions/${s1.id}/status`).send({ status: 'missed' });
    await agentA.patch(`/api/v1/sessions/${s2.id}/status`).send({ status: 'missed' });

    const s3 = (
      await agentA.post('/api/v1/sessions/one-off').send({
        clientId: clientA2.id,
        date: todayStr,
        time: '10:00',
        durationMin: 45,
      })
    ).body.data.session;

    await agentA.patch(`/api/v1/sessions/${s3.id}/status`).send({ status: 'completed' });

    await agentA.post('/api/v1/reminders').send({
      title: 'Follow up with Rohan',
      clientId: clientA1.id,
      type: 'follow_up',
    });

    const statsRes = await agentA.get(`/api/v1/reports/dashboard-stats?date=${todayStr}`);
    expect(statsRes.status).toBe(200);
    const { stats } = statsRes.body.data;

    expect(stats.activeClientsCount).toBe(2);
    expect(stats.expiringMembershipsCount).toBe(1);
    expect(stats.expiringClients[0].id).toBe(clientA1.id);
    expect(stats.missedTwoPlusClients).toHaveLength(1);
    expect(stats.missedTwoPlusClients[0].clientId).toBe(clientA1.id);
    expect(stats.missedTwoPlusClients[0].missedCount).toBe(2);
    expect(stats.todaySummary.completed).toBe(1);
    expect(stats.openRemindersCount).toBe(1);

    // Trainer B isolation check
    const statsB = await agentB.get(`/api/v1/reports/dashboard-stats?date=${todayStr}`);
    expect(statsB.status).toBe(200);
    expect(statsB.body.data.stats.activeClientsCount).toBe(1);
    expect(statsB.body.data.stats.missedTwoPlusClients).toHaveLength(0);
    expect(statsB.body.data.stats.openRemindersCount).toBe(0);
  });

  it('returns per-client attendance report and exports neutralized CSV files', async () => {
    const todayStr = formatDateStr(new Date());
    const startStr = addDays(todayStr, -10);

    const s1 = (
      await agentA.post('/api/v1/sessions/one-off').send({
        clientId: clientA1.id,
        date: todayStr,
        time: '09:00',
      })
    ).body.data.session;

    await agentA.patch(`/api/v1/sessions/${s1.id}/status`).send({ status: 'completed' });

    const repRes = await agentA.get(
      `/api/v1/reports/attendance?startDate=${startStr}&endDate=${todayStr}`
    );
    expect(repRes.status).toBe(200);
    const { report } = repRes.body.data;
    expect(report.summary.completed).toBe(1);
    expect(report.summary.attendanceRatePct).toBe(100);
    expect(report.clients.some((c) => c.clientId === clientA1.id)).toBe(true);
    expect(report.clients.some((c) => c.clientId === clientB1.id)).toBe(false);

    const clientsCsv = await agentA.get('/api/v1/reports/export/clients.csv');
    expect(clientsCsv.status).toBe(200);
    expect(clientsCsv.headers['content-type']).toMatch(/text\/csv/);
    expect(clientsCsv.text).toContain('Rohan Sharma');
    expect(clientsCsv.text).toContain("'=SUM(1+1) Evil");
    expect(clientsCsv.text).not.toContain('Trainer B Client');

    const sessionsCsv = await agentA.get(
      `/api/v1/reports/export/sessions.csv?startDate=${startStr}&endDate=${todayStr}`
    );
    expect(sessionsCsv.status).toBe(200);
    expect(sessionsCsv.headers['content-type']).toMatch(/text\/csv/);
    expect(sessionsCsv.text).toContain('Rohan Sharma');
    expect(sessionsCsv.text).toContain('completed');
  });

  it('supports Reminders CRUD with trainer isolation and done toggling', async () => {
    const createRes = await agentA.post('/api/v1/reminders').send({
      title: 'Check knee recovery',
      clientId: clientA1.id,
      type: 'measurement',
      notes: 'Ask before squats',
    });
    expect(createRes.status).toBe(201);
    const remId = createRes.body.data.reminder.id;

    // Cannot create reminder referencing another trainer's client
    const badClientRes = await agentA.post('/api/v1/reminders').send({
      title: 'Cross tenant',
      clientId: clientB1.id,
    });
    expect(badClientRes.status).toBe(404);

    // Trainer B cannot update or delete Trainer A reminder
    const patchByB = await agentB.patch(`/api/v1/reminders/${remId}`).send({ isDone: true });
    expect(patchByB.status).toBe(404);
    const deleteByB = await agentB.delete(`/api/v1/reminders/${remId}`);
    expect(deleteByB.status).toBe(404);

    // Trainer A marks done
    const doneRes = await agentA.patch(`/api/v1/reminders/${remId}`).send({ isDone: true });
    expect(doneRes.status).toBe(200);
    expect(doneRes.body.data.reminder.isDone).toBe(true);
    expect(doneRes.body.data.reminder.completedAt).toBeTruthy();

    const listDone = await agentA.get('/api/v1/reminders?status=done');
    expect(listDone.status).toBe(200);
    expect(listDone.body.data.reminders).toHaveLength(1);

    const delRes = await agentA.delete(`/api/v1/reminders/${remId}`);
    expect(delRes.status).toBe(200);
  });
});
