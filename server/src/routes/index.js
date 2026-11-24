const path = require('path');
const fs = require('fs');
const express = require('express');
const mongoose = require('mongoose');
const swaggerUi = require('swagger-ui-express');
const authRoutes = require('./auth.routes');
const exerciseRoutes = require('./exercise.routes');
const clientRoutes = require('./client.routes');
const workoutPlanRoutes = require('./workoutPlan.routes');
const workoutTemplateRoutes = require('./workoutTemplate.routes');
const scheduleRuleRoutes = require('./scheduleRule.routes');
const sessionRoutes = require('./session.routes');
const measurementRoutes = require('./measurement.routes');
const progressPhotoRoutes = require('./progressPhoto.routes');
const progressRoutes = require('./progress.routes');
const foodRoutes = require('./food.routes');
const dietPlanRoutes = require('./dietPlan.routes');
const dietTemplateRoutes = require('./dietTemplate.routes');
const reportRoutes = require('./report.routes');
const reminderRoutes = require('./reminder.routes');

const router = express.Router();

const DB_STATES = {
  0: 'disconnected',
  1: 'connected',
  2: 'connecting',
  3: 'disconnecting',
};

function loadOpenApiSpec() {
  const specPath = path.resolve(__dirname, '../../../docs/openapi.json');
  try {
    return JSON.parse(fs.readFileSync(specPath, 'utf8'));
  } catch (_err) {
    return { openapi: '3.0.3', info: { title: 'TrainerDesk API', version: '1.0.0' }, paths: {} };
  }
}

router.get('/health', (_req, res) => {
  res.status(200).json({
    success: true,
    data: {
      status: 'ok',
      service: 'TrainerDesk API',
      timestamp: new Date().toISOString(),
      dbState: DB_STATES[mongoose.connection.readyState] || 'unknown',
    },
  });
});

router.get('/docs.json', (_req, res) => {
  res.status(200).json(loadOpenApiSpec());
});

router.use('/docs', swaggerUi.serve, (req, res, next) => {
  swaggerUi.setup(loadOpenApiSpec())(req, res, next);
});

router.use('/auth', authRoutes);
router.use('/exercises', exerciseRoutes);
router.use('/clients', clientRoutes);
router.use('/workout-plans', workoutPlanRoutes);
router.use('/workout-templates', workoutTemplateRoutes);
router.use('/schedule-rules', scheduleRuleRoutes);
router.use('/sessions', sessionRoutes);
router.use('/measurements', measurementRoutes);
router.use('/progress-photos', progressPhotoRoutes);
router.use('/progress', progressRoutes);
router.use('/foods', foodRoutes);
router.use('/diet-plans', dietPlanRoutes);
router.use('/diet-templates', dietTemplateRoutes);
router.use('/reports', reportRoutes);
router.use('/reminders', reminderRoutes);

module.exports = router;
