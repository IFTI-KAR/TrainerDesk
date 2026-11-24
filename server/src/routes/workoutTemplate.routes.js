const express = require('express');
const controller = require('../controllers/workoutTemplate.controller');
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');
const {
  listTemplatesSchema,
  templateIdParamSchema,
  createTemplateSchema,
  updateTemplateSchema,
  assignTemplateSchema,
} = require('../validators/workout.validator');

const router = express.Router();

router.use(protect);

router.get('/', validate(listTemplatesSchema), controller.listTemplates);
router.get('/:id', validate(templateIdParamSchema), controller.getTemplate);
router.post('/', validate(createTemplateSchema), controller.createTemplate);
router.patch('/:id', validate(updateTemplateSchema), controller.updateTemplate);
router.delete('/:id', validate(templateIdParamSchema), controller.deleteTemplate);
router.post('/:id/assign', validate(assignTemplateSchema), controller.assignTemplate);

module.exports = router;
