const request = require('supertest');
const app = require('../../app');
const { connectDB, disconnectDB } = require('../../config/db');
const Trainer = require('../../models/Trainer');
const Client = require('../../models/Client');
const Exercise = require('../../models/Exercise');
const WorkoutPlan = require('../../models/WorkoutPlan');
const ScheduleRule = require('../../models/ScheduleRule');
const Session = require('../../models/Session');

describe('Scheduling & Sessions API (/api/v1/schedule-rules, /api/v1/sessions)', () => {
  let agentA;
  let agentB;
  let clientA;
  let benchEx;
  let planA;
  let dayId;

  // 2026-11-23 is Monday (1), 2026-11-25 is Wednesday (3), 2026-11-30 is next Monday (1)
  const MON_1 = '2026-11-23';
  const WED_1 = '2026-11-25';
  const MON_2 = '2026-11-30';

  beforeAll(async () => {
    await connectDB();
  });

  beforeEach(async () => {
    await Promise.all([
      Trainer.deleteMany({}),
      Client.deleteMany({}),
      Exercise.deleteMany({}),
      WorkoutPlan.deleteMany({}),
      ScheduleRule.deleteMany({}),
      Session.deleteMany({}),
    ]);

    agentA = request.agent(app);
    agentB = request.agent(app);

    await agentA.post('/api/v1/auth/register').send({
      name: 'Coach A',
      email: 'coacha@trainerdesk.dev',
      password: 'Password123',
    });

    await agentB.post('/api/v1/auth/register').send({
      name: 'Coach B',
      email: 'coachb@trainerdesk.dev',
      password: 'Password123',
    });

    clientA = (
      await agentA.post('/api/v1/clients').send({ name: 'Rohan Sharma', goal: 'muscle_gain' })
    ).body.data.client;

    benchEx = await Exercise.create({
      isGlobal: true,
      sourceId: 'sched_bench',
      name: 'Barbell Bench Press',
      imageUrl: 'https://example.com/bench.jpg',
      primaryMuscle: 'chest',
      equipment: 'barbell',
      category: 'strength',
    });

    planA = (
      await agentA.post('/api/v1/workout-plans').send({
        clientId: clientA.id,
        name: 'Strength Split',
        workoutDays: [
          {
            name: 'Day A - Chest',
            focus: 'Chest & Triceps',
            exercises: [
              {
                exerciseId: benchEx._id.toString(),
                sets: [{ targetReps: '10', targetWeight: 60, restSec: 90 }],
              },
            ],
          },
        ],
      })
    ).body.data.plan;

    dayId = planA.workoutDays[0].id;
  });

  afterAll(async () => {
    await Promise.all([
      Trainer.deleteMany({}),
      Client.deleteMany({}),
      Exercise.deleteMany({}),
      WorkoutPlan.deleteMany({}),
      ScheduleRule.deleteMany({}),
      Session.deleteMany({}),
    ]);
    await disconnectDB();
  });

  test('Generates recurring sessions idempotently and populates week summary', async () => {
    const ruleRes = await agentA.post('/api/v1/schedule-rules').send({
      clientId: clientA.id,
      daysOfWeek: [1, 3], // Mon & Wed
      time: '07:30',
      durationMin: 60,
      workoutPlanId: planA.id,
      workoutDayId: dayId,
      startDate: MON_1,
    });
    expect(ruleRes.status).toBe(201);
    expect(ruleRes.body.data.rule.workoutDayName).toBe('Day A - Chest');

    const firstFetch = await agentA.get(`/api/v1/sessions?date=${MON_1}`);
    expect(firstFetch.status).toBe(200);
    expect(firstFetch.body.data.sessions).toHaveLength(1);
    const session = firstFetch.body.data.sessions[0];
    expect(session.client.name).toBe('Rohan Sharma');
    expect(session.workoutSnapshot.dayName).toBe('Day A - Chest');
    expect(session.workoutSnapshot.exercises[0].targetSets[0].targetWeight).toBe(60);

    // Second fetch must be idempotent
    const secondFetch = await agentA.get(`/api/v1/sessions?date=${MON_1}`);
    expect(secondFetch.body.data.sessions).toHaveLength(1);
    expect(secondFetch.body.data.sessions[0].id).toBe(session.id);

    const weekRes = await agentA.get(`/api/v1/sessions/week-summary?date=${MON_1}`);
    expect(weekRes.status).toBe(200);
    const mondayBucket = weekRes.body.data.days.find((d) => d.date === MON_1);
    const tuesdayBucket = weekRes.body.data.days.find((d) => d.date === '2026-11-24');
    const wedBucket = weekRes.body.data.days.find((d) => d.date === WED_1);
    expect(mondayBucket.total).toBe(1);
    expect(tuesdayBucket.total).toBe(0);
    expect(wedBucket.total).toBe(1);
  });

  test('Supports one-off sessions sorted by time, single-date cancel, and single-date reschedule', async () => {
    await agentA.post('/api/v1/schedule-rules').send({
      clientId: clientA.id,
      daysOfWeek: [1],
      time: '09:00',
      workoutPlanId: planA.id,
      workoutDayId: dayId,
      startDate: MON_1,
    });

    await agentA.post('/api/v1/sessions/one-off').send({
      clientId: clientA.id,
      date: MON_1,
      time: '06:30',
      workoutPlanId: planA.id,
      workoutDayId: dayId,
    });

    const dayRes = await agentA.get(`/api/v1/sessions?date=${MON_1}`);
    expect(dayRes.body.data.sessions).toHaveLength(2);
    expect(dayRes.body.data.sessions[0].time).toBe('06:30');
    expect(dayRes.body.data.sessions[1].time).toBe('09:00');

    const recurringSessionId = dayRes.body.data.sessions[1].id;

    // Reschedule only MON_1 recurring occurrence to Tuesday
    const reschedRes = await agentA
      .patch(`/api/v1/sessions/${recurringSessionId}/reschedule`)
      .send({ date: '2026-11-24', time: '17:00', reason: 'Client travel' });
    expect(reschedRes.status).toBe(200);
    expect(reschedRes.body.data.session.date).toBe('2026-11-24');
    expect(reschedRes.body.data.session.isOneOff).toBe(true);

    // MON_1 should now only have the 06:30 one-off session
    const monAfter = await agentA.get(`/api/v1/sessions?date=${MON_1}`);
    expect(monAfter.body.data.sessions).toHaveLength(1);

    // Next Monday MON_2 should still generate at 09:00
    const nextMon = await agentA.get(`/api/v1/sessions?date=${MON_2}`);
    expect(nextMon.body.data.sessions).toHaveLength(1);
    expect(nextMon.body.data.sessions[0].time).toBe('09:00');

    // Cancel MON_2 occurrence without removing rule
    const cancelRes = await agentA
      .post(`/api/v1/sessions/${nextMon.body.data.sessions[0].id}/cancel`)
      .send({ reason: 'Holiday' });
    expect(cancelRes.status).toBe(200);
    expect(cancelRes.body.data.session.status).toBe('cancelled');

    const mon2AfterCancel = await agentA.get(`/api/v1/sessions?date=${MON_2}`);
    expect(mon2AfterCancel.body.data.sessions).toHaveLength(0);
  });

  test('Preserves snapshot of completed session when WorkoutPlan is later edited', async () => {
    await agentA.post('/api/v1/schedule-rules').send({
      clientId: clientA.id,
      daysOfWeek: [1],
      time: '08:00',
      workoutPlanId: planA.id,
      workoutDayId: dayId,
      startDate: MON_1,
    });

    const mon1 = await agentA.get(`/api/v1/sessions?date=${MON_1}`);
    const completedSessionId = mon1.body.data.sessions[0].id;

    // Mark MON_1 completed
    await agentA.patch(`/api/v1/sessions/${completedSessionId}/status`).send({
      status: 'completed',
    });

    // Generate future MON_2 while still scheduled
    await agentA.get(`/api/v1/sessions?date=${MON_2}`);

    // Update WorkoutPlan weight from 60 -> 80
    await agentA.patch(`/api/v1/workout-plans/${planA.id}`).send({
      workoutDays: [
        {
          id: dayId,
          name: 'Day A - Chest',
          exercises: [
            {
              exerciseId: benchEx._id.toString(),
              sets: [{ targetReps: '10', targetWeight: 80, restSec: 90 }],
            },
          ],
        },
      ],
    });

    // Completed session snapshot MUST remain 60
    const completedCheck = await agentA.get(`/api/v1/sessions/${completedSessionId}`);
    expect(completedCheck.body.data.session.workoutSnapshot.exercises[0].targetSets[0].targetWeight).toBe(60);

    // Future scheduled session reflects updated weight 80
    const mon2Check = await agentA.get(`/api/v1/sessions?date=${MON_2}`);
    expect(mon2Check.body.data.sessions[0].workoutSnapshot.exercises[0].targetSets[0].targetWeight).toBe(80);
  });

  test('Multi-trainer isolation across schedule rules and sessions', async () => {
    const ruleA = (
      await agentA.post('/api/v1/schedule-rules').send({
        clientId: clientA.id,
        daysOfWeek: [1],
        time: '08:00',
        startDate: MON_1,
      })
    ).body.data.rule;

    const monA = await agentA.get(`/api/v1/sessions?date=${MON_1}`);
    const sessAId = monA.body.data.sessions[0].id;

    expect((await agentB.get(`/api/v1/sessions?date=${MON_1}`)).body.data.sessions).toHaveLength(0);
    expect((await agentB.get(`/api/v1/sessions/${sessAId}`)).status).toBe(404);
    expect((await agentB.delete(`/api/v1/schedule-rules/${ruleA.id}`)).status).toBe(404);
  });
});
