const request = require('supertest');
const app = require('../../app');
const { connectDB, disconnectDB } = require('../../config/db');
const Trainer = require('../../models/Trainer');
const Client = require('../../models/Client');
const Exercise = require('../../models/Exercise');
const WorkoutPlan = require('../../models/WorkoutPlan');
const Session = require('../../models/Session');

describe('Live Session API (/api/v1/sessions/:id/live, /log, /complete)', () => {
  let agentA;
  let agentB;
  let clientA;
  let benchEx;
  let planA;
  let dayId;

  beforeAll(async () => {
    await connectDB();
  });

  beforeEach(async () => {
    await Promise.all([
      Trainer.deleteMany({}),
      Client.deleteMany({}),
      Exercise.deleteMany({}),
      WorkoutPlan.deleteMany({}),
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
      await agentA.post('/api/v1/clients').send({ name: 'Rohan Sharma', goal: 'strength' })
    ).body.data.client;

    benchEx = await Exercise.create({
      isGlobal: true,
      sourceId: 'live_bench',
      name: 'Barbell Bench Press',
      imageUrl: 'https://example.com/bench.jpg',
      primaryMuscle: 'chest',
      equipment: 'barbell',
      category: 'strength',
    });

    planA = (
      await agentA.post('/api/v1/workout-plans').send({
        clientId: clientA.id,
        name: 'Strength Plan',
        workoutDays: [
          {
            name: 'Day A - Push',
            exercises: [
              {
                exerciseId: benchEx._id.toString(),
                sets: [
                  { setNumber: 1, targetReps: '10', targetWeight: 60, restSec: 90 },
                  { setNumber: 2, targetReps: '10', targetWeight: 60, restSec: 90 },
                ],
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
      Session.deleteMany({}),
    ]);
    await disconnectDB();
  });

  test('Logs sets, exposes previous session "Last time" reference, detects PRs, and completes session', async () => {
    const exId = benchEx._id.toString();

    // Create and complete Session 1 (baseline)
    const s1Res = await agentA.post('/api/v1/sessions/one-off').send({
      clientId: clientA.id,
      date: '2026-11-18',
      time: '08:00',
      workoutPlanId: planA.id,
      workoutDayId: dayId,
    });
    const s1Id = s1Res.body.data.session.id;

    const complete1 = await agentA.post(`/api/v1/sessions/${s1Id}/complete`).send({
      loggedExercises: [
        {
          exerciseId: exId,
          exerciseName: 'Barbell Bench Press',
          notes: 'Smooth tempo',
          sets: [
            { setNumber: 1, reps: 10, weight: 60, weightUnit: 'kg', completed: true },
            { setNumber: 2, reps: 10, weight: 60, weightUnit: 'kg', completed: true },
          ],
        },
      ],
      sessionNotes: 'Great baseline',
    });
    expect(complete1.status).toBe(200);
    expect(complete1.body.data.session.status).toBe('completed');
    expect(complete1.body.data.summary.totalVolume).toBe(1200);
    expect(complete1.body.data.summary.prCount).toBe(0);

    // Create Session 2 and open /live
    const s2Res = await agentA.post('/api/v1/sessions/one-off').send({
      clientId: clientA.id,
      date: '2026-11-23',
      time: '08:00',
      workoutPlanId: planA.id,
      workoutDayId: dayId,
    });
    const s2Id = s2Res.body.data.session.id;

    const liveRes = await agentA.get(`/api/v1/sessions/${s2Id}/live`);
    expect(liveRes.status).toBe(200);
    expect(liveRes.body.data.previousByExercise[exId]).toBeDefined();
    expect(liveRes.body.data.previousByExercise[exId].date).toBe('2026-11-18');
    expect(liveRes.body.data.previousByExercise[exId].sets[0].weight).toBe(60);
    expect(liveRes.body.data.historicalBestByExercise[exId].maxWeightKg).toBe(60);

    // Log Session 2 with a new PR (65kg x 10)
    const logRes = await agentA.patch(`/api/v1/sessions/${s2Id}/log`).send({
      loggedExercises: [
        {
          exerciseId: exId,
          exerciseName: 'Barbell Bench Press',
          notes: 'Felt strong',
          sets: [
            { setNumber: 1, reps: 10, weight: 60, weightUnit: 'kg', completed: true },
            { setNumber: 2, reps: 10, weight: 65, weightUnit: 'kg', completed: true },
          ],
        },
      ],
      sessionNotes: 'Hit new bench PR',
      clientSyncId: 'sync-1',
    });
    expect(logRes.status).toBe(200);
    expect(logRes.body.data.session.status).toBe('in_progress');
    expect(logRes.body.data.session.prCount).toBe(1);
    expect(logRes.body.data.prHighlights).toHaveLength(1);
    expect(logRes.body.data.prHighlights[0].weight).toBe(65);

    const complete2 = await agentA.post(`/api/v1/sessions/${s2Id}/complete`).send({});
    expect(complete2.status).toBe(200);
    expect(complete2.body.data.session.status).toBe('completed');
    expect(complete2.body.data.summary.totalVolume).toBe(1250);
    expect(complete2.body.data.summary.prCount).toBe(1);
  });

  test('Multi-trainer isolation on live session endpoints', async () => {
    const sRes = await agentA.post('/api/v1/sessions/one-off').send({
      clientId: clientA.id,
      date: '2026-11-24',
      time: '09:00',
    });
    const sessionId = sRes.body.data.session.id;

    expect((await agentB.get(`/api/v1/sessions/${sessionId}/live`)).status).toBe(404);
    expect(
      (await agentB.patch(`/api/v1/sessions/${sessionId}/log`).send({ loggedExercises: [] })).status
    ).toBe(404);
    expect((await agentB.post(`/api/v1/sessions/${sessionId}/complete`).send({})).status).toBe(404);
  });
});
