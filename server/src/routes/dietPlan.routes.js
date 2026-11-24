const express = require('express');
const controller = require('../controllers/diet.controller');
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');
const {
  listDietPlansSchema,
  dietIdParamSchema,
  shareTokenParamSchema,
  createDietPlanSchema,
  updateDietPlanSchema,
  duplicateDietPlanSchema,
  saveDietAsTemplateSchema,
} = require('../validators/diet.validator');

const router = express.Router();

// Public read-only share endpoint for clients (WhatsApp / printable link)
router.get('/shared/:shareToken', validate(shareTokenParamSchema), controller.getSharedDietPlan);

router.use(protect);

router.get('/', validate(listDietPlansSchema), controller.listDietPlans);
router.get('/:id', validate(dietIdParamSchema), controller.getDietPlan);
router.post('/', validate(createDietPlanSchema), controller.createDietPlan);
router.patch('/:id', validate(updateDietPlanSchema), controller.updateDietPlan);
router.delete('/:id', validate(dietIdParamSchema), controller.deleteDietPlan);
router.post('/:id/duplicate', validate(duplicateDietPlanSchema), controller.duplicateDietPlan);
router.post('/:id/save-as-template', validate(saveDietAsTemplateSchema), controller.saveAsTemplate);

module.exports = router;
