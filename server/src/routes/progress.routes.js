const express = require('express');
const controller = require('../controllers/progress.controller');
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { clientProgressParamSchema } = require('../validators/progress.validator');

const router = express.Router();

router.use(protect);

router.get('/:clientId', validate(clientProgressParamSchema), controller.getClientProgress);

module.exports = router;
