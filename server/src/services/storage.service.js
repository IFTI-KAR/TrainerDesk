const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { cloudinary, isCloudinaryEnabled } = require('../config/cloudinary');
const AppError = require('../utils/AppError');

const MIME_TO_EXT = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
};

const UPLOADS_ROOT = path.resolve(__dirname, '../../uploads');

function sanitizeFolder(folder = 'general') {
  return String(folder)
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '') || 'general';
}

async function uploadToCloudinary(buffer, folder) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: `trainerdesk/${folder}`,
        resource_type: 'image',
      },
      (error, result) => {
        if (error) return reject(error);
        return resolve({
          url: result.secure_url,
          publicId: result.public_id,
        });
      }
    );
    stream.end(buffer);
  });
}

async function uploadImage(file, { folder = 'general' } = {}) {
  if (!file || !file.buffer) {
    throw new AppError(400, 'Image file is missing', 'UPLOAD_ERROR');
  }

  const safeFolder = sanitizeFolder(folder);

  if (isCloudinaryEnabled) {
    return uploadToCloudinary(file.buffer, safeFolder);
  }

  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.NETLIFY) {
    return {
      url: `data:${file.mimetype};base64,${file.buffer.toString('base64')}`,
      publicId: '',
    };
  }

  const ext = MIME_TO_EXT[file.mimetype] || '.jpg';
  const filename = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`;
  const targetDir = path.join(UPLOADS_ROOT, safeFolder);
  await fs.promises.mkdir(targetDir, { recursive: true });
  const targetPath = path.join(targetDir, filename);
  await fs.promises.writeFile(targetPath, file.buffer);

  return {
    url: `/uploads/${safeFolder}/${filename}`,
    publicId: `local:${safeFolder}/${filename}`,
  };
}

async function deleteImage(publicId) {
  if (!publicId || typeof publicId !== 'string') return;

  if (publicId.startsWith('local:')) {
    const relativePath = publicId.slice('local:'.length);
    const resolvedPath = path.resolve(UPLOADS_ROOT, relativePath);
    if (!resolvedPath.startsWith(UPLOADS_ROOT + path.sep)) {
      return;
    }
    try {
      await fs.promises.unlink(resolvedPath);
    } catch (err) {
      if (err.code !== 'ENOENT') {
        throw err;
      }
    }
    return;
  }

  if (isCloudinaryEnabled) {
    await cloudinary.uploader.destroy(publicId);
  }
}

module.exports = {
  UPLOADS_ROOT,
  uploadImage,
  deleteImage,
};
