const path = require('path');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const env = require('./config/env');
const sanitize = require('./middleware/sanitize');
const { apiLimiter } = require('./middleware/rateLimiter');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');
const v1Routes = require('./routes');

const app = express();

app.set('trust proxy', 1);

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

const allowedOrigins = [
  ...env.clientUrl.split(','),
  process.env.URL || '',
  process.env.DEPLOY_PRIME_URL || '',
  process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '',
  process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : '',
]
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error(`Origin ${origin} not allowed by CORS`));
    },
    credentials: true,
  })
);

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));
app.use(cookieParser());

if (!env.isTest) {
  app.use(morgan(env.isProd ? 'combined' : 'dev'));
}

app.use(sanitize);
app.use('/api', apiLimiter);

app.use('/uploads', express.static(path.resolve(__dirname, '../uploads')));

app.use('/api/v1', v1Routes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
