const express = require('express');
const controller = require('../controllers/progress.controller');
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { uploadSingleImage } = require('../middleware/upload');
const {
  listPhotosSchema,
  photoIdParamSchema,
  createPhotoSchema,
} = require('../validators/progress.validator');

const router = express.Router();

router.use(protect);

router.get('/', validate(listPhotosSchema), controller.listPhotos);
router.post('/', uploadSingleImage('photo'), validate(createPhotoSchema), controller.createPhoto);
router.delete('/:id', validate(photoIdParamSchema), controller.deletePhoto);

module.exports = router;
