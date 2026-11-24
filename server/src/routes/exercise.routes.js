const express = require('express');
const exerciseController = require('../controllers/exercise.controller');
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { uploadSingleImage } = require('../middleware/upload');
const {
  exerciseIdParamSchema,
  listExercisesSchema,
  createExerciseSchema,
  updateExerciseSchema,
} = require('../validators/exercise.validator');

const router = express.Router();

router.use(protect);

router.get('/meta', exerciseController.getExerciseMeta);
router.get('/', validate(listExercisesSchema), exerciseController.listExercises);
router.get('/:id', validate(exerciseIdParamSchema), exerciseController.getExercise);
router.post(
  '/',
  uploadSingleImage('image'),
  validate(createExerciseSchema),
  exerciseController.createExercise
);
router.patch(
  '/:id',
  uploadSingleImage('image'),
  validate(updateExerciseSchema),
  exerciseController.updateExercise
);
router.delete('/:id', validate(exerciseIdParamSchema), exerciseController.deleteExercise);
router.post('/:id/favorite', validate(exerciseIdParamSchema), exerciseController.toggleFavorite);

module.exports = router;
