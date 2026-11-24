const request = require('supertest');
const app = require('../../app');
const { connectDB, disconnectDB } = require('../../config/db');
const Trainer = require('../../models/Trainer');

describe('Auth API (/api/v1/auth)', () => {
  beforeAll(async () => {
    await connectDB();
  });

  beforeEach(async () => {
    await Trainer.deleteMany({});
  });

  afterAll(async () => {
    await Trainer.deleteMany({});
    await disconnectDB();
  });

  const sampleTrainer = {
    name: 'Alex Mercer',
    email: 'alex@trainerdesk.dev',
    password: 'StrongPassword123',
    gymName: 'Iron Craft Studio',
  };

  test('POST /register creates trainer, sets httpOnly cookies, and omits passwordHash', async () => {
    const res = await request(app).post('/api/v1/auth/register').send(sampleTrainer);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.trainer.email).toBe(sampleTrainer.email);
    expect(res.body.data.trainer.passwordHash).toBeUndefined();
    expect(res.body.data.trainer.gymName).toBe('Iron Craft Studio');

    const cookies = res.headers['set-cookie'];
    expect(Array.isArray(cookies)).toBe(true);
    const accessCookie = cookies.find((c) => c.startsWith('td_access_token='));
    const refreshCookie = cookies.find((c) => c.startsWith('td_refresh_token='));
    expect(accessCookie).toBeDefined();
    expect(accessCookie).toContain('HttpOnly');
    expect(refreshCookie).toBeDefined();
    expect(refreshCookie).toContain('HttpOnly');
  });

  test('POST /register rejects duplicate email with 409', async () => {
    await request(app).post('/api/v1/auth/register').send(sampleTrainer);
    const res = await request(app).post('/api/v1/auth/register').send(sampleTrainer);

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('CONFLICT');
  });

  test('POST /register rejects invalid payload with 400 and validation details', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({
      name: 'A',
      email: 'not-an-email',
      password: '123',
    });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details.length).toBeGreaterThanOrEqual(3);
  });

  test('POST /login authenticates valid trainer and rejects wrong password', async () => {
    await request(app).post('/api/v1/auth/register').send(sampleTrainer);

    const badRes = await request(app).post('/api/v1/auth/login').send({
      email: sampleTrainer.email,
      password: 'WrongPassword',
    });
    expect(badRes.status).toBe(401);

    const goodRes = await request(app).post('/api/v1/auth/login').send({
      email: sampleTrainer.email,
      password: sampleTrainer.password,
    });
    expect(goodRes.status).toBe(200);
    expect(goodRes.body.data.trainer.email).toBe(sampleTrainer.email);
    expect(goodRes.headers['set-cookie'].some((c) => c.startsWith('td_access_token='))).toBe(true);
  });

  test('GET /me returns authenticated trainer and 401 when unauthenticated', async () => {
    const unauthRes = await request(app).get('/api/v1/auth/me');
    expect(unauthRes.status).toBe(401);

    const agent = request.agent(app);
    await agent.post('/api/v1/auth/register').send(sampleTrainer);

    const meRes = await agent.get('/api/v1/auth/me');
    expect(meRes.status).toBe(200);
    expect(meRes.body.data.trainer.email).toBe(sampleTrainer.email);
  });

  test('PATCH /me updates profile and merges preferences without wiping existing ones', async () => {
    const agent = request.agent(app);
    await agent.post('/api/v1/auth/register').send(sampleTrainer);

    const firstPatch = await agent.patch('/api/v1/auth/me').send({
      preferences: { weightUnit: 'lb' },
    });
    expect(firstPatch.status).toBe(200);
    expect(firstPatch.body.data.trainer.preferences.weightUnit).toBe('lb');
    expect(firstPatch.body.data.trainer.preferences.defaultSessionDuration).toBe(60);

    const secondPatch = await agent.patch('/api/v1/auth/me').send({
      gymName: 'Apex Barbell',
      preferences: { theme: 'dark' },
    });
    expect(secondPatch.status).toBe(200);
    expect(secondPatch.body.data.trainer.gymName).toBe('Apex Barbell');
    expect(secondPatch.body.data.trainer.preferences.weightUnit).toBe('lb');
    expect(secondPatch.body.data.trainer.preferences.theme).toBe('dark');
  });

  test('POST /refresh rotates refresh token and rejects reuse of old token', async () => {
    const registerRes = await request(app).post('/api/v1/auth/register').send(sampleTrainer);
    const oldRefreshCookie = registerRes.headers['set-cookie'].find((c) =>
      c.startsWith('td_refresh_token=')
    );

    const refreshRes = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Cookie', oldRefreshCookie);
    expect(refreshRes.status).toBe(200);
    const newRefreshCookie = refreshRes.headers['set-cookie'].find((c) =>
      c.startsWith('td_refresh_token=')
    );
    expect(newRefreshCookie).toBeDefined();
    expect(newRefreshCookie).not.toBe(oldRefreshCookie);

    const reuseRes = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Cookie', oldRefreshCookie);
    expect(reuseRes.status).toBe(401);
  });

  test('PATCH /password verifies current password, updates hash, and invalidates old password', async () => {
    const agent = request.agent(app);
    await agent.post('/api/v1/auth/register').send(sampleTrainer);

    const badChange = await agent.patch('/api/v1/auth/password').send({
      currentPassword: 'WrongPassword',
      newPassword: 'NewStrongPassword456',
    });
    expect(badChange.status).toBe(401);

    const goodChange = await agent.patch('/api/v1/auth/password').send({
      currentPassword: sampleTrainer.password,
      newPassword: 'NewStrongPassword456',
    });
    expect(goodChange.status).toBe(200);

    const oldLogin = await request(app).post('/api/v1/auth/login').send({
      email: sampleTrainer.email,
      password: sampleTrainer.password,
    });
    expect(oldLogin.status).toBe(401);

    const newLogin = await request(app).post('/api/v1/auth/login').send({
      email: sampleTrainer.email,
      password: 'NewStrongPassword456',
    });
    expect(newLogin.status).toBe(200);
  });

  test('POST /logout revokes refresh token and clears cookies', async () => {
    const agent = request.agent(app);
    await agent.post('/api/v1/auth/register').send(sampleTrainer);

    const logoutRes = await agent.post('/api/v1/auth/logout');
    expect(logoutRes.status).toBe(200);

    const meRes = await agent.get('/api/v1/auth/me');
    expect(meRes.status).toBe(401);
  });

  test('Multi-trainer isolation: Trainer A and Trainer B resolve only their own profiles', async () => {
    const agentA = request.agent(app);
    const agentB = request.agent(app);

    await agentA.post('/api/v1/auth/register').send(sampleTrainer);
    await agentB.post('/api/v1/auth/register').send({
      name: 'Maya Lin',
      email: 'maya@trainerdesk.dev',
      password: 'MayaPassword123',
    });

    const meA = await agentA.get('/api/v1/auth/me');
    const meB = await agentB.get('/api/v1/auth/me');

    expect(meA.body.data.trainer.email).toBe('alex@trainerdesk.dev');
    expect(meB.body.data.trainer.email).toBe('maya@trainerdesk.dev');
    expect(meA.body.data.trainer.id).not.toBe(meB.body.data.trainer.id);
  });
});
