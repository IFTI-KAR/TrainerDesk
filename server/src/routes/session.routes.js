const express = require('express');
const controller = require('../controllers/schedule.controller');
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');
const {
  listSessionsSchema,
  weekSummarySchema,
  sessionIdParamSchema,
  createOneOffSessionSchema,
  rescheduleSessionSchema,
  cancelSessionSchema,
  updateSessionStatusSchema,
  logSessionSchema,
  completeSessionSchema,
} = require('../validators/schedule.validator');

const router = express.Router();

router.use(protect);

router.get('/', validate(listSessionsSchema), controller.listSessions);
router.get('/week-summary', validate(weekSummarySchema), controller.getWeekSummary);
router.post('/one-off', validate(createOneOffSessionSchema), controller.createOneOffSession);
router.get('/:id', validate(sessionIdParamSchema), controller.getSession);
router.get('/:id/live', validate(sessionIdParamSchema), controller.getLiveSession);
router.patch('/:id/log', validate(logSessionSchema), controller.logSession);
router.post('/:id/complete', validate(completeSessionSchema), controller.completeSession);
router.patch('/:id/status', validate(updateSessionStatusSchema), controller.updateSessionStatus);
router.patch('/:id/reschedule', validate(rescheduleSessionSchema), controller.rescheduleSession);
router.post('/:id/cancel', validate(cancelSessionSchema), controller.cancelSession);

module.exports = router;
