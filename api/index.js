const app = require('../server/src/app');
const { connectDB } = require('../server/src/config/db');

module.exports = async (req, res) => {
  const cleanPath = String(req.url || '')
    .split('?')[0]
    .replace(/\/+$/, '');
  const isHealth = cleanPath === '/api/v1/health';

  try {
    await connectDB();
  } catch (_err) {
    if (!isHealth) {
      return res.status(503).json({
        success: false,
        error: {
          code: 'DB_UNAVAILABLE',
          message:
            'Database connection unavailable. Please allow 0.0.0.0/0 in MongoDB Atlas Network Access.',
        },
      });
    }
  }

  return app(req, res);
};
