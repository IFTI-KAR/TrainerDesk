const fs = require('fs');
const path = require('path');
const request = require('supertest');
const app = require('../../app');
const { connectDB, disconnectDB } = require('../../config/db');
const Trainer = require('../../models/Trainer');
const Exercise = require('../../models/Exercise');
const { UPLOADS_ROOT } = require('../../services/storage.service');

// Minimal valid 1x1 PNG buffer
const TINY_PNG_BUFFER = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64'
);

describe('Exercises API (/api/v1/exercises)', () => {
  let agentA;
  let agentB;
  let trainerAId;

  beforeAll(async () => {
    await connectDB();
  });

  beforeEach(async () => {
    await Trainer.deleteMany({});
    await Exercise.deleteMany({});

    agentA = request.agent(app);
    agentB = request.agent(app);

    const resA = await agentA.post('/api/v1/auth/register').send({
      name: 'Trainer A',
      email: 'trainera@trainerdesk.dev',
      password: 'Password123',
    });
    trainerAId = resA.body.data.trainer.id;

    await agentB.post('/api/v1/auth/register').send({
      name: 'Trainer B',
      email: 'trainerb@trainerdesk.dev',
      password: 'Password123',
    });

    await Exercise.create([
      {
        isGlobal: true,
        trainerId: null,
        sourceId: 'global_barbell_bench',
        name: 'Barbell Bench Press',
        imageUrl: 'https://example.com/bench.jpg',
        primaryMuscle: 'chest',
        equipment: 'barbell',
        category: 'strength',
        difficulty: 'intermediate',
        instructions: ['Lie on bench', 'Press bar up'],
      },
      {
        isGlobal: true,
        trainerId: null,
        sourceId: 'global_treadmill_run',
        name: 'Treadmill Run',
        imageUrl: 'https://example.com/treadmill.jpg',
        primaryMuscle: 'cardio',
        equipment: 'machine',
        category: 'cardio',
        difficulty: 'beginner',
        instructions: ['Step onto treadmill', 'Jog steadily'],
      },
    ]);
  });

  afterAll(async () => {
    await Trainer.deleteMany({});
    await Exercise.deleteMany({});
    await disconnectDB();
  });

  test('GET /meta returns supported enum lists', async () => {
    const res = await agentA.get('/api/v1/exercises/meta');
    expect(res.status).toBe(200);
    expect(res.body.data.muscles).toContain('chest');
    expect(res.body.data.equipment).toContain('barbell');
    expect(res.body.data.categories).toEqual(['strength', 'cardio', 'mobility', 'stretching']);
  });

  test('GET / lists global + own exercises and supports search/muscle/category/customOnly filters', async () => {
    await Exercise.create({
      trainerId: trainerAId,
      isGlobal: false,
      name: 'Trainer A Landmine Press',
      imageUrl: 'https://example.com/landmine.jpg',
      primaryMuscle: 'shoulders',
      equipment: 'barbell',
      category: 'strength',
    });

    const allRes = await agentA.get('/api/v1/exercises');
    expect(allRes.status).toBe(200);
    expect(allRes.body.data.exercises).toHaveLength(3);

    const chestRes = await agentA.get('/api/v1/exercises?muscle=chest');
    expect(chestRes.body.data.exercises).toHaveLength(1);
    expect(chestRes.body.data.exercises[0].name).toBe('Barbell Bench Press');

    const cardioRes = await agentA.get('/api/v1/exercises?category=cardio');
    expect(cardioRes.body.data.exercises).toHaveLength(1);
    expect(cardioRes.body.data.exercises[0].name).toBe('Treadmill Run');

    const searchRes = await agentA.get('/api/v1/exercises?search=landmine');
    expect(searchRes.body.data.exercises).toHaveLength(1);

    const customRes = await agentA.get('/api/v1/exercises?customOnly=true');
    expect(customRes.body.data.exercises).toHaveLength(1);
    expect(customRes.body.data.exercises[0].isCustom).toBe(true);
  });

  test('POST / uploads image to local /uploads fallback, validates MIME, and DELETE cleans up file', async () => {
    const createRes = await agentA
      .post('/api/v1/exercises')
      .field('name', 'Cable Chest Fly Custom')
      .field('primaryMuscle', 'chest')
      .field('equipment', 'cable')
      .field('category', 'strength')
      .field('difficulty', 'beginner')
      .field('instructions', JSON.stringify(['Grab handles', 'Bring hands together']))
      .attach('image', TINY_PNG_BUFFER, { filename: 'fly.png', contentType: 'image/png' });

    expect(createRes.status).toBe(201);
    const created = createRes.body.data.exercise;
    expect(created.imageUrl).toMatch(/^\/uploads\/exercises\/.+\.png$/);
    expect(created.isCustom).toBe(true);
    expect(created.instructions).toEqual(['Grab handles', 'Bring hands together']);

    const localFilePath = path.join(
      UPLOADS_ROOT,
      created.imageUrl.replace(/^\/uploads\//, '')
    );
    expect(fs.existsSync(localFilePath)).toBe(true);

    // Delete cleans up local image file
    const delRes = await agentA.delete(`/api/v1/exercises/${created.id}`);
    expect(delRes.status).toBe(200);
    expect(fs.existsSync(localFilePath)).toBe(false);
  });

  test('POST / rejects invalid MIME types and missing image', async () => {
    const badMime = await agentA
      .post('/api/v1/exercises')
      .field('name', 'Invalid Upload')
      .field('primaryMuscle', 'chest')
      .attach('image', Buffer.from('hello'), { filename: 'notes.txt', contentType: 'text/plain' });

    expect(badMime.status).toBe(400);
    expect(badMime.body.error.code).toBe('INVALID_FILE_TYPE');

    const missingImg = await agentA.post('/api/v1/exercises').send({
      name: 'No Image Exercise',
      primaryMuscle: 'chest',
      equipment: 'barbell',
    });

    expect(missingImg.status).toBe(400);
    expect(missingImg.body.error.code).toBe('VALIDATION_ERROR');
  });

  test('Multi-trainer isolation and global exercise protection', async () => {
    const customRes = await agentA.post('/api/v1/exercises').send({
      name: 'Trainer A Secret Curl',
      primaryMuscle: 'biceps',
      equipment: 'dumbbell',
      imageUrl: 'https://example.com/curl.jpg',
    });
    const customId = customRes.body.data.exercise.id;

    // Trainer B cannot see, get, update, or delete Trainer A's custom exercise
    const listB = await agentB.get('/api/v1/exercises');
    expect(listB.body.data.exercises.some((e) => e.id === customId)).toBe(false);

    expect((await agentB.get(`/api/v1/exercises/${customId}`)).status).toBe(404);
    expect(
      (await agentB.patch(`/api/v1/exercises/${customId}`).send({ name: 'Hijacked' })).status
    ).toBe(404);
    expect((await agentB.delete(`/api/v1/exercises/${customId}`)).status).toBe(404);

    // Neither trainer can update or delete a global exercise
    const globalEx = await Exercise.findOne({ isGlobal: true });
    expect(
      (await agentA.patch(`/api/v1/exercises/${globalEx._id}`).send({ name: 'Edited Global' }))
        .status
    ).toBe(404);
    expect((await agentA.delete(`/api/v1/exercises/${globalEx._id}`)).status).toBe(404);
  });

  test('PATCH /:id updates custom exercise and POST /:id/favorite toggles favorites filter', async () => {
    const customRes = await agentA.post('/api/v1/exercises').send({
      name: 'Custom Squat',
      primaryMuscle: 'quadriceps',
      equipment: 'barbell',
      imageUrl: 'https://example.com/squat.jpg',
    });
    const customId = customRes.body.data.exercise.id;

    const patchRes = await agentA.patch(`/api/v1/exercises/${customId}`).send({
      name: 'Custom Pause Squat',
      tips: ['Hold 2 seconds at bottom'],
    });
    expect(patchRes.status).toBe(200);
    expect(patchRes.body.data.exercise.name).toBe('Custom Pause Squat');
    expect(patchRes.body.data.exercise.tips).toEqual(['Hold 2 seconds at bottom']);

    // Favorite toggle on global exercise
    const globalEx = await Exercise.findOne({ isGlobal: true });
    const favOn = await agentA.post(`/api/v1/exercises/${globalEx._id}/favorite`);
    expect(favOn.status).toBe(200);
    expect(favOn.body.data.isFavorite).toBe(true);

    const favList = await agentA.get('/api/v1/exercises?favoritesOnly=true');
    expect(favList.body.data.exercises).toHaveLength(1);
    expect(favList.body.data.exercises[0].id).toBe(globalEx._id.toString());

    const favOff = await agentA.post(`/api/v1/exercises/${globalEx._id}/favorite`);
    expect(favOff.body.data.isFavorite).toBe(false);
  });
});
