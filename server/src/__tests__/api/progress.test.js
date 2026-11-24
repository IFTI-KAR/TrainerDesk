const fs = require('fs');
const path = require('path');
const request = require('supertest');
const app = require('../../app');
const { connectDB, disconnectDB } = require('../../config/db');
const Trainer = require('../../models/Trainer');
const Client = require('../../models/Client');
const Exercise = require('../../models/Exercise');
const Session = require('../../models/Session');
const Measurement = require('../../models/Measurement');
const ProgressPhoto = require('../../models/ProgressPhoto');
const { UPLOADS_ROOT } = require('../../services/storage.service');

const TINY_PNG_BUFFER = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64'
);

describe('Progress Tracking API (/api/v1/measurements, /api/v1/progress-photos, /api/v1/progress/:clientId)', () => {
  let agentA;
  let agentB;
  let clientA;
  let squatEx;

  beforeAll(async () => {
    await connectDB();
  });

  beforeEach(async () => {
    await Promise.all([
      Trainer.deleteMany({}),
      Client.deleteMany({}),
      Exercise.deleteMany({}),
      Session.deleteMany({}),
      Measurement.deleteMany({}),
      ProgressPhoto.deleteMany({}),
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
      await agentA.post('/api/v1/clients').send({
        name: 'Rohan Sharma',
        goal: 'fat_loss',
        heightCm: 175,
        startingWeightKg: 85,
        targetWeightKg: 75,
        targetWaistCm: 82,
      })
    ).body.data.client;

    squatEx = await Exercise.create({
      isGlobal: true,
      sourceId: 'prog_squat',
      name: 'Barbell Squat',
      imageUrl: 'https://example.com/squat.jpg',
      primaryMuscle: 'quadriceps',
      equipment: 'barbell',
      category: 'strength',
    });
  });

  afterAll(async () => {
    await Promise.all([
      Trainer.deleteMany({}),
      Client.deleteMany({}),
      Exercise.deleteMany({}),
      Session.deleteMany({}),
      Measurement.deleteMany({}),
      ProgressPhoto.deleteMany({}),
    ]);
    await disconnectDB();
  });

  test('Logs measurements with auto BMI, uploads/deletes progress photos, and computes analytics', async () => {
    // Log two measurements: 85kg -> 80kg (50% of 85->75 goal)
    const m1 = await agentA.post('/api/v1/measurements').send({
      clientId: clientA.id,
      date: '2026-11-01',
      weightKg: 85,
      waistCm: 92,
      bodyFatPct: 24,
    });
    expect(m1.status).toBe(201);
    expect(m1.body.data.measurement.bmi).toBe(27.8);

    const m2 = await agentA.post('/api/v1/measurements').send({
      clientId: clientA.id,
      date: '2026-11-20',
      weightKg: 80,
      waistCm: 87,
      bodyFatPct: 21,
    });
    expect(m2.status).toBe(201);
    expect(m2.body.data.measurement.bmi).toBe(26.1);

    // Upload progress photo
    const photoRes = await agentA
      .post('/api/v1/progress-photos')
      .field('clientId', clientA.id)
      .field('date', '2026-11-20')
      .field('pose', 'front')
      .field('weightKg', '80')
      .attach('photo', TINY_PNG_BUFFER, { filename: 'front.png', contentType: 'image/png' });

    expect(photoRes.status).toBe(201);
    const photo = photoRes.body.data.photo;
    expect(photo.imageUrl).toMatch(/^\/uploads\/progress-photos\/.+\.png$/);
    const localPhotoPath = path.join(UPLOADS_ROOT, photo.imageUrl.replace(/^\/uploads\//, ''));
    expect(fs.existsSync(localPhotoPath)).toBe(true);

    // Create 1 completed session + 1 missed session for strength & attendance analytics
    const s1 = (
      await agentA.post('/api/v1/sessions/one-off').send({
        clientId: clientA.id,
        date: '2026-11-18',
        time: '08:00',
      })
    ).body.data.session;

    await agentA.post(`/api/v1/sessions/${s1.id}/complete`).send({
      loggedExercises: [
        {
          exerciseId: squatEx._id.toString(),
          exerciseName: 'Barbell Squat',
          sets: [
            { setNumber: 1, reps: 10, weight: 100, weightUnit: 'kg', completed: true },
            { setNumber: 2, reps: 10, weight: 100, weightUnit: 'kg', completed: true },
          ],
        },
      ],
    });

    const s2 = (
      await agentA.post('/api/v1/sessions/one-off').send({
        clientId: clientA.id,
        date: '2026-11-19',
        time: '08:00',
      })
    ).body.data.session;
    await agentA
      .patch(`/api/v1/sessions/${s2.id}/status`)
      .send({ status: 'missed', missedReason: 'Travel' });

    const overviewRes = await agentA.get(`/api/v1/progress/${clientA.id}`);
    expect(overviewRes.status).toBe(200);
    const { measurements, photos, analytics } = overviewRes.body.data;
    expect(measurements).toHaveLength(2);
    expect(photos).toHaveLength(1);

    expect(analytics.goals.weight.progressPct).toBe(50);
    expect(analytics.goals.waist.progressPct).toBe(50);
    expect(analytics.attendance.completed).toBe(1);
    expect(analytics.attendance.missed).toBe(1);
    expect(analytics.attendance.attendanceRatePct).toBe(50);
    expect(analytics.consistencyHeatmap).toHaveLength(84);
    expect(analytics.strengthProgression).toHaveLength(1);
    expect(analytics.strengthProgression[0].latestMaxWeight).toBe(100);
    expect(analytics.strengthProgression[0].latestEst1RM).toBe(133.3);
    expect(analytics.strengthProgression[0].points[0].totalVolume).toBe(2000);

    // Delete photo cleans up local file
    const delPhoto = await agentA.delete(`/api/v1/progress-photos/${photo.id}`);
    expect(delPhoto.status).toBe(200);
    expect(fs.existsSync(localPhotoPath)).toBe(false);
  });

  test('Multi-trainer isolation on measurements, photos, and progress analytics', async () => {
    expect((await agentB.get(`/api/v1/progress/${clientA.id}`)).status).toBe(404);
    expect(
      (
        await agentB.post('/api/v1/measurements').send({
          clientId: clientA.id,
          date: '2026-11-20',
          weightKg: 80,
        })
      ).status
    ).toBe(404);
  });
});
