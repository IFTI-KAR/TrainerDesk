const express = require('express');
const controller = require('../controllers/schedule.controller');
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');
const {
  listScheduleRulesSchema,
  ruleIdParamSchema,
  createScheduleRuleSchema,
  updateScheduleRuleSchema,
} = require('../validators/schedule.validator');

const router = express.Router();

router.use(protect);

router.get('/', validate(listScheduleRulesSchema), controller.listScheduleRules);
router.post('/', validate(createScheduleRuleSchema), controller.createScheduleRule);
router.patch('/:id', validate(updateScheduleRuleSchema), controller.updateScheduleRule);
router.delete('/:id', validate(ruleIdParamSchema), controller.deleteScheduleRule);

module.exports = router;
