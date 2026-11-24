const fs = require('fs');
const path = require('path');
const request = require('supertest');
const app = require('../../app');
const { connectDB, disconnectDB } = require('../../config/db');
const Trainer = require('../../models/Trainer');
const Client = require('../../models/Client');
const { UPLOADS_ROOT } = require('../../services/storage.service');

const TINY_PNG_BUFFER = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64'
);

describe('Clients API (/api/v1/clients)', () => {
  let agentA;
  let agentB;

  beforeAll(async () => {
    await connectDB();
  });

  beforeEach(async () => {
    await Trainer.deleteMany({});
    await Client.deleteMany({});

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
  });

  afterAll(async () => {
    await Trainer.deleteMany({});
    await Client.deleteMany({});
    await disconnectDB();
  });

  test('POST / creates client with photo upload, calculates BMI & age, and DELETE cleans up file', async () => {
    const res = await agentA
      .post('/api/v1/clients')
      .field('name', 'Rohan Sharma')
      .field('phone', '+91 98765 43210')
      .field('email', 'rohan@example.com')
      .field('gender', 'male')
      .field('dateOfBirth', '1995-05-15')
      .field('heightCm', '175')
      .field('startingWeightKg', '82')
      .field('targetWeightKg', '74')
      .field('goal', 'fat_loss')
      .field('injuries', JSON.stringify(['Left knee ACL rehab']))
      .field('preferredTrainingDays', JSON.stringify([1, 3, 5]))
      .field(
        'emergencyContact',
        JSON.stringify({ name: 'Priya Sharma', phone: '+91 98765 00001', relation: 'Spouse' })
      )
      .attach('photo', TINY_PNG_BUFFER, { filename: 'rohan.png', contentType: 'image/png' });

    expect(res.status).toBe(201);
    const created = res.body.data.client;
    expect(created.name).toBe('Rohan Sharma');
    expect(created.photoUrl).toMatch(/^\/uploads\/clients\/.+\.png$/);
    expect(created.startingBmi).toBe(26.8);
    expect(created.age).toBeGreaterThanOrEqual(25);
    expect(created.injuries).toEqual(['Left knee ACL rehab']);
    expect(created.preferredTrainingDays).toEqual([1, 3, 5]);
    expect(created.emergencyContact.name).toBe('Priya Sharma');

    const localFilePath = path.join(UPLOADS_ROOT, created.photoUrl.replace(/^\/uploads\//, ''));
    expect(fs.existsSync(localFilePath)).toBe(true);

    const delRes = await agentA.delete(`/api/v1/clients/${created.id}`);
    expect(delRes.status).toBe(200);
    expect(fs.existsSync(localFilePath)).toBe(false);
  });

  test('GET / filters by search, goal, status, trainingDay, and GET /stats returns counts', async () => {
    const soonDate = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    await agentA.post('/api/v1/clients').send({
      name: 'Anita Desai',
      email: 'anita@example.com',
      goal: 'muscle_gain',
      status: 'active',
      preferredTrainingDays: [1, 4],
      membershipEnd: soonDate,
    });

    await agentA.post('/api/v1/clients').send({
      name: 'Vikram Patel',
      phone: '555-0199',
      goal: 'strength',
      status: 'inactive',
      preferredTrainingDays: [2, 6],
    });

    const statsRes = await agentA.get('/api/v1/clients/stats');
    expect(statsRes.status).toBe(200);
    expect(statsRes.body.data.stats).toEqual({
      total: 2,
      active: 1,
      inactive: 1,
      expiringSoon: 1,
    });

    const searchRes = await agentA.get('/api/v1/clients?search=anita');
    expect(searchRes.body.data.clients).toHaveLength(1);

    const goalRes = await agentA.get('/api/v1/clients?goal=strength');
    expect(goalRes.body.data.clients).toHaveLength(1);
    expect(goalRes.body.data.clients[0].name).toBe('Vikram Patel');

    const activeRes = await agentA.get('/api/v1/clients?status=active');
    expect(activeRes.body.data.clients).toHaveLength(1);

    const dayRes = await agentA.get('/api/v1/clients?trainingDay=4');
    expect(dayRes.body.data.clients).toHaveLength(1);
    expect(dayRes.body.data.clients[0].name).toBe('Anita Desai');
  });

  test('PATCH /:id updates profile and POST/DELETE /:id/notes manages dated notes', async () => {
    const createRes = await agentA.post('/api/v1/clients').send({
      name: 'Neha Verma',
      goal: 'endurance',
    });
    const clientId = createRes.body.data.client.id;

    const patchRes = await agentA.patch(`/api/v1/clients/${clientId}`).send({
      status: 'inactive',
      notes: 'Travel schedule for 2 weeks',
    });
    expect(patchRes.status).toBe(200);
    expect(patchRes.body.data.client.status).toBe('inactive');
    expect(patchRes.body.data.client.notes).toBe('Travel schedule for 2 weeks');

    const noteRes = await agentA.post(`/api/v1/clients/${clientId}/notes`).send({
      text: 'Completed 5km tempo run without knee discomfort.',
    });
    expect(noteRes.status).toBe(201);
    expect(noteRes.body.data.client.noteEntries).toHaveLength(1);
    const noteId = noteRes.body.data.client.noteEntries[0].id;

    const delNoteRes = await agentA.delete(`/api/v1/clients/${clientId}/notes/${noteId}`);
    expect(delNoteRes.status).toBe(200);
    expect(delNoteRes.body.data.client.noteEntries).toHaveLength(0);
  });

  test('Multi-trainer isolation: Coach B cannot access or mutate Coach A clients', async () => {
    const createRes = await agentA.post('/api/v1/clients').send({
      name: 'Confidential Client',
      goal: 'fat_loss',
    });
    const clientId = createRes.body.data.client.id;

    const listB = await agentB.get('/api/v1/clients');
    expect(listB.body.data.clients).toHaveLength(0);

    expect((await agentB.get(`/api/v1/clients/${clientId}`)).status).toBe(404);
    expect(
      (await agentB.patch(`/api/v1/clients/${clientId}`).send({ name: 'Hijacked' })).status
    ).toBe(404);
    expect(
      (await agentB.post(`/api/v1/clients/${clientId}/notes`).send({ text: 'Intrusion' })).status
    ).toBe(404);
    expect((await agentB.delete(`/api/v1/clients/${clientId}`)).status).toBe(404);
  });
});
