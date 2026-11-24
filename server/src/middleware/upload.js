const multer = require('multer');
const AppError = require('../utils/AppError');

const ALLOWED_IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;

const storage = multer.memoryStorage();

function imageFileFilter(_req, file, cb) {
  if (!ALLOWED_IMAGE_MIME_TYPES.includes(file.mimetype)) {
    return cb(
      new AppError(400, 'Only JPEG, PNG, WebP, and GIF images are allowed', 'INVALID_FILE_TYPE')
    );
  }
  return cb(null, true);
}

const upload = multer({
  storage,
  limits: {
    fileSize: MAX_IMAGE_SIZE_BYTES,
  },
  fileFilter: imageFileFilter,
});

function uploadSingleImage(fieldName = 'image') {
  return upload.single(fieldName);
}

module.exports = {
  ALLOWED_IMAGE_MIME_TYPES,
  MAX_IMAGE_SIZE_BYTES,
  uploadSingleImage,
};
