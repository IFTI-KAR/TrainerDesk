const express = require('express');
const controller = require('../controllers/diet.controller');
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');
const {
  listDietTemplatesSchema,
  dietIdParamSchema,
  createDietTemplateSchema,
  updateDietTemplateSchema,
  assignDietTemplateSchema,
} = require('../validators/diet.validator');

const router = express.Router();

router.use(protect);

router.get('/', validate(listDietTemplatesSchema), controller.listDietTemplates);
router.get('/:id', validate(dietIdParamSchema), controller.getDietTemplate);
router.post('/', validate(createDietTemplateSchema), controller.createDietTemplate);
router.patch('/:id', validate(updateDietTemplateSchema), controller.updateDietTemplate);
router.delete('/:id', validate(dietIdParamSchema), controller.deleteDietTemplate);
router.post('/:id/assign', validate(assignDietTemplateSchema), controller.assignDietTemplate);

module.exports = router;
