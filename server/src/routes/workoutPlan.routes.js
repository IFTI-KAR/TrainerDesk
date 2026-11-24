const express = require('express');
const controller = require('../controllers/workoutPlan.controller');
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');
const {
  listPlansSchema,
  planIdParamSchema,
  duplicateDayParamSchema,
  createPlanSchema,
  updatePlanSchema,
  duplicatePlanSchema,
  saveAsTemplateSchema,
} = require('../validators/workout.validator');

const router = express.Router();

router.use(protect);

router.get('/', validate(listPlansSchema), controller.listPlans);
router.get('/:id', validate(planIdParamSchema), controller.getPlan);
router.post('/', validate(createPlanSchema), controller.createPlan);
router.patch('/:id', validate(updatePlanSchema), controller.updatePlan);
router.delete('/:id', validate(planIdParamSchema), controller.deletePlan);
router.post(
  '/:id/duplicate-day/:dayId',
  validate(duplicateDayParamSchema),
  controller.duplicateDay
);
router.post('/:id/duplicate', validate(duplicatePlanSchema), controller.duplicatePlan);
router.post('/:id/save-as-template', validate(saveAsTemplateSchema), controller.saveAsTemplate);

module.exports = router;
