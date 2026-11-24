const express = require('express');
const controller = require('../controllers/progress.controller');
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');
const {
  listMeasurementsSchema,
  measurementIdParamSchema,
  createMeasurementSchema,
  updateMeasurementSchema,
} = require('../validators/progress.validator');

const router = express.Router();

router.use(protect);

router.get('/', validate(listMeasurementsSchema), controller.listMeasurements);
router.post('/', validate(createMeasurementSchema), controller.createMeasurement);
router.patch('/:id', validate(updateMeasurementSchema), controller.updateMeasurement);
router.delete('/:id', validate(measurementIdParamSchema), controller.deleteMeasurement);

module.exports = router;
