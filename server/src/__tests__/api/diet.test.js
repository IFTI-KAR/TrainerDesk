const request = require('supertest');
const app = require('../../app');
const { connectDB, disconnectDB } = require('../../config/db');
const Trainer = require('../../models/Trainer');
const Client = require('../../models/Client');
const Food = require('../../models/Food');
const DietPlan = require('../../models/DietPlan');
const DietTemplate = require('../../models/DietTemplate');

describe('Foods & Diet Plans API (/api/v1/foods, /api/v1/diet-plans, /api/v1/diet-templates)', () => {
  let agentA;
  let agentB;
  let clientA1;
  let clientA2;
  let clientB1;
  let rotiFood;
  let chickenFood;

  beforeAll(async () => {
    await connectDB();
  });

  beforeEach(async () => {
    await Promise.all([
      Trainer.deleteMany({}),
      Client.deleteMany({}),
      Food.deleteMany({}),
      DietPlan.deleteMany({}),
      DietTemplate.deleteMany({}),
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

    clientA1 = (
      await agentA.post('/api/v1/clients').send({ name: 'Rohan Sharma', goal: 'muscle_gain' })
    ).body.data.client;
    clientA2 = (
      await agentA.post('/api/v1/clients').send({ name: 'Anita Desai', goal: 'fat_loss' })
    ).body.data.client;
    clientB1 = (
      await agentB.post('/api/v1/clients').send({ name: 'Client B', goal: 'strength' })
    ).body.data.client;

    [rotiFood, chickenFood] = await Food.create([
      {
        isGlobal: true,
        slug: 'test-roti',
        name: 'Whole Wheat Roti',
        category: 'grains_breads',
        servings: [
          {
            measure: 'piece',
            baseQuantity: 1,
            label: '1 medium roti (35g)',
            gramsEquivalent: 35,
            calories: 104,
            protein: 3.4,
            carbs: 19.6,
            fat: 1.3,
            fiber: 2.5,
          },
        ],
      },
      {
        isGlobal: true,
        slug: 'test-chicken-breast',
        name: 'Chicken Breast',
        category: 'protein',
        servings: [
          {
            measure: 'g',
            baseQuantity: 100,
            label: '100 g',
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
    await Promise.all([
      Trainer.deleteMany({}),
      Client.deleteMany({}),
      Food.deleteMany({}),
      DietPlan.deleteMany({}),
      DietTemplate.deleteMany({}),
    ]);
    await disconnectDB();
  });

  test('Manages custom foods while protecting global foods', async () => {
    const createRes = await agentA.post('/api/v1/foods').send({
      name: 'Homemade Protein Ladoo',
      category: 'snacks',
      servings: [
        {
          measure: 'piece',
          baseQuantity: 1,
          label: '1 ladoo (30g)',
          gramsEquivalent: 30,
          calories: 140,
          protein: 8,
          carbs: 14,
          fat: 6,
          fiber: 2,
        },
      ],
    });
    expect(createRes.status).toBe(201);
    const customId = createRes.body.data.food.id;

    // Search works
    const searchRes = await agentA.get('/api/v1/foods?search=ladoo');
    expect(searchRes.body.data.foods).toHaveLength(1);

    // Global food cannot be deleted or edited
    expect((await agentA.delete(`/api/v1/foods/${rotiFood._id}`)).status).toBe(404);
    // Trainer B cannot see or delete Trainer A custom food
    expect((await agentB.delete(`/api/v1/foods/${customId}`)).status).toBe(404);

    expect((await agentA.delete(`/api/v1/foods/${customId}`)).status).toBe(200);
  });

  test('Creates measured DietPlan, computes macros, copies/templates, and serves public share link', async () => {
    const createRes = await agentA.post('/api/v1/diet-plans').send({
      clientId: clientA1.id,
      name: 'Lean Muscle Training Day',
      dayType: 'training',
      targets: { calories: 2200, protein: 160, carbs: 240, fat: 65, fiber: 30, waterLiters: 3.5 },
      meals: [
        {
          name: 'Lunch',
          time: '13:30',
          items: [
            { foodId: rotiFood._id.toString(), quantity: 2, measure: 'piece' },
            { foodId: chickenFood._id.toString(), quantity: 150, measure: 'g' },
          ],
        },
      ],
      supplements: [{ name: 'Creatine Monohydrate', dosage: '5g', timing: 'Post-workout' }],
    });

    expect(createRes.status).toBe(201);
    const plan = createRes.body.data.plan;
    expect(plan.dailyTotals).toEqual({
      calories: 456,
      protein: 53.3,
      carbs: 39.2,
      fat: 8,
      fiber: 5,
    });
    expect(plan.shareToken).toBeTruthy();

    // Public share link works without cookies
    const shareRes = await request(app).get(`/api/v1/diet-plans/shared/${plan.shareToken}`);
    expect(shareRes.status).toBe(200);
    expect(shareRes.body.data.plan.clientName).toBe('Rohan');
    expect(shareRes.body.data.plan.gymName).toBe('Iron Craft');
    expect(shareRes.body.data.plan.meals[0].items).toHaveLength(2);

    // Duplicate to Client A2
    const dupRes = await agentA.post(`/api/v1/diet-plans/${plan.id}/duplicate`).send({
      targetClientId: clientA2.id,
      name: 'Anita Lunch Plan',
    });
    expect(dupRes.status).toBe(201);
    expect(dupRes.body.data.plan.clientId).toBe(clientA2.id);

    // Save as template and assign
    const tplRes = await agentA
      .post(`/api/v1/diet-plans/${plan.id}/save-as-template`)
      .send({ name: 'High Protein Indian Split', goal: 'muscle_gain' });
    expect(tplRes.status).toBe(201);
    const tplId = tplRes.body.data.template.id;

    const assignRes = await agentA.post(`/api/v1/diet-templates/${tplId}/assign`).send({
      clientId: clientA2.id,
      dayType: 'rest',
    });
    expect(assignRes.status).toBe(201);
    expect(assignRes.body.data.plan.dayType).toBe('rest');

    // Multi-trainer isolation
    expect((await agentB.get(`/api/v1/diet-plans/${plan.id}`)).status).toBe(404);
    expect(
      (
        await agentB
          .post(`/api/v1/diet-templates/${tplId}/assign`)
          .send({ clientId: clientB1.id })
      ).status
    ).toBe(404);
  });
});
