const express = require('express');
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');
const reportController = require('../controllers/report.controller');
const {
  listRemindersQuerySchema,
  reminderIdParamSchema,
  createReminderSchema,
  updateReminderSchema,
} = require('../validators/report.validator');

const router = express.Router();

router.use(protect);

router.get('/', validate(listRemindersQuerySchema), reportController.listReminders);
router.post('/', validate(createReminderSchema), reportController.createReminder);
router.patch('/:id', validate(updateReminderSchema), reportController.updateReminder);
router.delete('/:id', validate(reminderIdParamSchema), reportController.deleteReminder);

module.exports = router;
