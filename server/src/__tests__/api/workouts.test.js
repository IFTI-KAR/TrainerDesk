const request = require('supertest');
const app = require('../../app');
const { connectDB, disconnectDB } = require('../../config/db');
const Trainer = require('../../models/Trainer');
const Client = require('../../models/Client');
const Exercise = require('../../models/Exercise');
const WorkoutPlan = require('../../models/WorkoutPlan');
const WorkoutTemplate = require('../../models/WorkoutTemplate');
const { seedWorkoutTemplates } = require('../../seeds/seedWorkoutTemplates');

describe('Workout Plans & Templates API (/api/v1/workout-plans, /api/v1/workout-templates)', () => {
  let agentA;
  let agentB;
  let clientA1;
  let clientA2;
  let clientB1;
  let benchEx;
  let plankEx;

  beforeAll(async () => {
    await connectDB();
  });

  beforeEach(async () => {
    await Promise.all([
      Trainer.deleteMany({}),
      Client.deleteMany({}),
      Exercise.deleteMany({}),
      WorkoutPlan.deleteMany({}),
      WorkoutTemplate.deleteMany({}),
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

    clientA1 = (
      await agentA.post('/api/v1/clients').send({ name: 'Client A1', goal: 'muscle_gain' })
    ).body.data.client;
    clientA2 = (
      await agentA.post('/api/v1/clients').send({ name: 'Client A2', goal: 'fat_loss' })
    ).body.data.client;
    clientB1 = (
      await agentB.post('/api/v1/clients').send({ name: 'Client B1', goal: 'strength' })
    ).body.data.client;

    [benchEx, plankEx] = await Exercise.create([
      {
        isGlobal: true,
        sourceId: 'test_bench_press',
        name: 'Barbell Bench Press',
        imageUrl: 'https://example.com/bench.jpg',
        primaryMuscle: 'chest',
        equipment: 'barbell',
        category: 'strength',
      },
      {
        isGlobal: true,
        sourceId: 'test_plank',
        name: 'Plank',
        imageUrl: 'https://example.com/plank.jpg',
        primaryMuscle: 'abdominals',
        equipment: 'bodyweight',
        category: 'strength',
      },
    ]);
  });

  afterAll(async () => {
    await Promise.all([
      Trainer.deleteMany({}),
      Client.deleteMany({}),
      Exercise.deleteMany({}),
      WorkoutPlan.deleteMany({}),
      WorkoutTemplate.deleteMany({}),
    ]);
    await disconnectDB();
  });

  test('Creates workout plan with supersets & timed exercises, increments version while preserving day IDs', async () => {
    const createRes = await agentA.post('/api/v1/workout-plans').send({
      clientId: clientA1.id,
      name: 'Upper / Lower Split',
      workoutDays: [
        {
          name: 'Day A - Upper Push',
          focus: 'Chest & Core',
          exercises: [
            {
              exerciseId: benchEx._id.toString(),
              supersetGroup: 'A',
              trackingType: 'reps_weight',
              tempo: '3-1-1-0',
              sets: [
                { setNumber: 1, targetReps: '12', targetWeight: 40, weightUnit: 'kg', restSec: 90 },
                { setNumber: 2, targetReps: '10', targetWeight: 45, weightUnit: 'kg', restSec: 90 },
              ],
            },
            {
              exerciseId: plankEx._id.toString(),
              supersetGroup: 'A',
              trackingType: 'duration',
              sets: [{ setNumber: 1, targetReps: '', targetDurationSec: 45, restSec: 60 }],
            },
          ],
        },
      ],
    });

    expect(createRes.status).toBe(201);
    const plan = createRes.body.data.plan;
    expect(plan.version).toBe(1);
    expect(plan.isActive).toBe(true);
    expect(plan.workoutDays[0].exercises[0].exerciseName).toBe('Barbell Bench Press');
    expect(plan.workoutDays[0].exercises[0].supersetGroup).toBe('A');
    expect(plan.workoutDays[0].exercises[1].sets[0].targetDurationSec).toBe(45);

    const clientCheck = await agentA.get(`/api/v1/clients/${clientA1.id}`);
    expect(clientCheck.body.data.client.activeWorkoutPlanId).toBe(plan.id);

    const originalDayId = plan.workoutDays[0].id;

    // Update plan: must increment version and preserve existing workoutDay ID
    const updateRes = await agentA.patch(`/api/v1/workout-plans/${plan.id}`).send({
      name: 'Upper / Lower Split v2',
      workoutDays: [
        {
          id: originalDayId,
          name: 'Day A - Push Heavy',
          focus: 'Chest',
          exercises: plan.workoutDays[0].exercises,
        },
      ],
    });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.data.plan.version).toBe(2);
    expect(updateRes.body.data.plan.workoutDays[0].id).toBe(originalDayId);
    expect(updateRes.body.data.plan.workoutDays[0].name).toBe('Day A - Push Heavy');
  });

  test('Duplicates a workout day and copies a plan to another client', async () => {
    const createRes = await agentA.post('/api/v1/workout-plans').send({
      clientId: clientA1.id,
      name: 'Push Pull Legs',
      workoutDays: [
        {
          name: 'Push',
          exercises: [
            {
              exerciseId: benchEx._id.toString(),
              sets: [{ targetReps: '10', targetWeight: 50, restSec: 90 }],
            },
          ],
        },
      ],
    });
    const plan = createRes.body.data.plan;
    const dayId = plan.workoutDays[0].id;

    const dupDayRes = await agentA.post(`/api/v1/workout-plans/${plan.id}/duplicate-day/${dayId}`);
    expect(dupDayRes.status).toBe(200);
    expect(dupDayRes.body.data.plan.workoutDays).toHaveLength(2);
    expect(dupDayRes.body.data.plan.workoutDays[1].name).toBe('Push (Copy)');
    expect(dupDayRes.body.data.plan.workoutDays[1].id).not.toBe(dayId);
    expect(dupDayRes.body.data.plan.version).toBe(2);

    const copyPlanRes = await agentA.post(`/api/v1/workout-plans/${plan.id}/duplicate`).send({
      targetClientId: clientA2.id,
      name: 'Client A2 Push Pull',
    });
    expect(copyPlanRes.status).toBe(201);
    const copied = copyPlanRes.body.data.plan;
    expect(copied.clientId).toBe(clientA2.id);
    expect(copied.version).toBe(1);
    expect(copied.workoutDays).toHaveLength(2);
    expect(copied.workoutDays[0].id).not.toBe(dayId);
  });

  test('Saves plan as WorkoutTemplate and assigns template to another client', async () => {
    const planRes = await agentA.post('/api/v1/workout-plans').send({
      clientId: clientA1.id,
      name: 'Hypertrophy Starter',
      workoutDays: [
        {
          name: 'Full Body A',
          exercises: [
            {
              exerciseId: benchEx._id.toString(),
              sets: [{ targetReps: '8-10', targetWeight: 30, restSec: 60 }],
            },
          ],
        },
      ],
    });
    const planId = planRes.body.data.plan.id;

    const saveTplRes = await agentA
      .post(`/api/v1/workout-plans/${planId}/save-as-template`)
      .send({ name: '3-Day Hypertrophy Template', goal: 'muscle_gain' });
    expect(saveTplRes.status).toBe(201);
    const tpl = saveTplRes.body.data.template;
    expect(tpl.name).toBe('3-Day Hypertrophy Template');
    expect(tpl.workoutDays).toHaveLength(1);

    const assignRes = await agentA.post(`/api/v1/workout-templates/${tpl.id}/assign`).send({
      clientId: clientA2.id,
      name: 'Assigned Hypertrophy',
    });
    expect(assignRes.status).toBe(201);
    expect(assignRes.body.data.plan.clientId).toBe(clientA2.id);
    expect(assignRes.body.data.plan.name).toBe('Assigned Hypertrophy');
  });

  test('Multi-trainer isolation across workout plans and templates', async () => {
    const planA = (
      await agentA.post('/api/v1/workout-plans').send({
        clientId: clientA1.id,
        name: 'Coach A Private Plan',
        workoutDays: [],
      })
    ).body.data.plan;

    const tplA = (
      await agentA.post('/api/v1/workout-templates').send({
        name: 'Coach A Private Template',
        workoutDays: [],
      })
    ).body.data.template;

    expect((await agentB.get(`/api/v1/workout-plans/${planA.id}`)).status).toBe(404);
    expect(
      (await agentB.patch(`/api/v1/workout-plans/${planA.id}`).send({ name: 'Hack' })).status
    ).toBe(404);
    expect((await agentB.delete(`/api/v1/workout-plans/${planA.id}`)).status).toBe(404);

    expect((await agentB.get(`/api/v1/workout-templates/${tplA.id}`)).status).toBe(404);
    expect(
      (
        await agentB
          .post(`/api/v1/workout-templates/${tplA.id}/assign`)
          .send({ clientId: clientB1.id })
      ).status
    ).toBe(404);
  });

  test('Built-in global templates seed idempotently, appear for all trainers, assign cleanly, and block direct edit/delete', async () => {
    const first = await seedWorkoutTemplates();
    const second = await seedWorkoutTemplates();
    expect(first.totalGlobalInDb).toBe(2);
    expect(second.totalGlobalInDb).toBe(2);
    expect(second.upserted).toBe(0);

    const listResA = await agentA.get('/api/v1/workout-templates');
    expect(listResA.status).toBe(200);
    const globals = listResA.body.data.templates.filter((t) => t.isGlobal);
    expect(globals).toHaveLength(2);

    const listResB = await agentB.get('/api/v1/workout-templates');
    expect(listResB.status).toBe(200);
    expect(listResB.body.data.templates.filter((t) => t.isGlobal)).toHaveLength(2);

    const targetTpl = globals[0];
    const patchRes = await agentA
      .patch(`/api/v1/workout-templates/${targetTpl.id}`)
      .send({ name: 'Attempt Edit' });
    expect(patchRes.status).toBe(403);

    const delRes = await agentB.delete(`/api/v1/workout-templates/${targetTpl.id}`);
    expect(delRes.status).toBe(403);

    const assignRes = await agentB.post(`/api/v1/workout-templates/${targetTpl.id}/assign`).send({
      clientId: clientB1.id,
    });
    expect(assignRes.status).toBe(201);
    expect(assignRes.body.data.plan.clientId).toBe(clientB1.id);
    expect(assignRes.body.data.plan.workoutDays.length).toBeGreaterThanOrEqual(4);
  });
});
