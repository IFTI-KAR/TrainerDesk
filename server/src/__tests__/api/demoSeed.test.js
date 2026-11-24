const request = require('supertest');
const app = require('../../app');
const { connectDB, disconnectDB } = require('../../config/db');
const Trainer = require('../../models/Trainer');
const Exercise = require('../../models/Exercise');
const Food = require('../../models/Food');
const Client = require('../../models/Client');
const WorkoutPlan = require('../../models/WorkoutPlan');
const WorkoutTemplate = require('../../models/WorkoutTemplate');
const ScheduleRule = require('../../models/ScheduleRule');
const Session = require('../../models/Session');
const Measurement = require('../../models/Measurement');
const DietPlan = require('../../models/DietPlan');
const DietTemplate = require('../../models/DietTemplate');
const { Reminder } = require('../../models/Reminder');
const { DEMO_CREDENTIALS, seedDemoAccount } = require('../../seeds/seedDemo');
const { formatDateStr } = require('../../utils/dateUtils');

describe('Demo Seed Script (seedDemoAccount)', () => {
  beforeAll(async () => {
    await connectDB();
  });

  beforeEach(async () => {
    await Promise.all([
      Trainer.deleteMany({}),
      Exercise.deleteMany({}),
      Food.deleteMany({}),
      Client.deleteMany({}),
      WorkoutPlan.deleteMany({}),
      WorkoutTemplate.deleteMany({}),
      ScheduleRule.deleteMany({}),
      Session.deleteMany({}),
      Measurement.deleteMany({}),
      DietPlan.deleteMany({}),
      DietTemplate.deleteMany({}),
      Reminder.deleteMany({}),
    ]);

    await Exercise.create([
      {
        isGlobal: true,
        sourceId: 'demo-bench',
        name: 'Barbell Bench Press - Medium Grip',
        imageUrl: 'https://example.com/bench.jpg',
        primaryMuscle: 'chest',
        equipment: 'barbell',
        category: 'strength',
        difficulty: 'intermediate',
      },
      {
        isGlobal: true,
        sourceId: 'demo-squat',
        name: 'Barbell Squat',
        imageUrl: 'https://example.com/squat.jpg',
        primaryMuscle: 'quadriceps',
        equipment: 'barbell',
        category: 'strength',
        difficulty: 'intermediate',
      },
      {
        isGlobal: true,
        sourceId: 'demo-plank',
        name: 'Plank',
        imageUrl: 'https://example.com/plank.jpg',
        primaryMuscle: 'abdominals',
        equipment: 'bodyweight',
        category: 'mobility',
        difficulty: 'beginner',
      },
    ]);

    await Food.create([
      {
        isGlobal: true,
        name: 'Rolled Oats',
        category: 'grains_breads',
        servings: [
          {
            measure: 'cup',
            baseQuantity: 1,
            label: '1 cup (80g)',
            gramsEquivalent: 80,
            calories: 304,
            protein: 10.6,
            carbs: 54.4,
            fat: 5.5,
            fiber: 8.5,
          },
        ],
      },
      {
        isGlobal: true,
        name: 'Chicken Breast',
        category: 'protein',
        servings: [
          {
            measure: 'g',
            baseQuantity: 100,
            label: '100g cooked',
            gramsEquivalent: 100,
            calories: 165,
            protein: 31,
            carbs: 0,
            fat: 3.6,
            fiber: 0,
          },
        ],
      },
    ]);
  });

  afterAll(async () => {
    await disconnectDB();
  });

  it('seeds idempotently and powers login, Today sessions, dashboard-stats, and progress charts', async () => {
    const first = await seedDemoAccount({ ensureBaseSeeds: false });
    const second = await seedDemoAccount({ ensureBaseSeeds: false });

    expect(first.clients).toBe(5);
    expect(second.clients).toBe(5);

    const demoTrainers = await Trainer.find({ email: DEMO_CREDENTIALS.email });
    expect(demoTrainers).toHaveLength(1);
    const totalDemoClients = await Client.countDocuments({ trainerId: demoTrainers[0]._id });
    expect(totalDemoClients).toBe(5);

    const agent = request.agent(app);
    const loginRes = await agent.post('/api/v1/auth/login').send(DEMO_CREDENTIALS);
    expect(loginRes.status).toBe(200);
    expect(loginRes.body.data.trainer.email).toBe(DEMO_CREDENTIALS.email);

    const todayStr = formatDateStr(new Date());
    const sessionsRes = await agent.get(`/api/v1/sessions?date=${todayStr}`);
    expect(sessionsRes.status).toBe(200);
    expect(sessionsRes.body.data.sessions).toHaveLength(4);
    expect(sessionsRes.body.data.summary.completed).toBe(1);
    expect(sessionsRes.body.data.summary.remaining).toBe(3);

    const statsRes = await agent.get(`/api/v1/reports/dashboard-stats?date=${todayStr}`);
    expect(statsRes.status).toBe(200);
    const { stats } = statsRes.body.data;
    expect(stats.activeClientsCount).toBe(5);
    expect(stats.expiringMembershipsCount).toBeGreaterThanOrEqual(1);
    expect(stats.missedTwoPlusClients.length).toBeGreaterThanOrEqual(1);
    expect(stats.openRemindersCount).toBe(2);

    const rohan = await Client.findOne({ trainerId: demoTrainers[0]._id, name: 'Rohan Sharma' });
    const progressRes = await agent.get(`/api/v1/progress/${rohan._id.toString()}`);
    expect(progressRes.status).toBe(200);
    expect(progressRes.body.data.measurements.length).toBe(5);
    expect(progressRes.body.data.analytics.strengthProgression.length).toBeGreaterThanOrEqual(1);
  });
});
