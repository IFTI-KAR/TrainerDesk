const path = require('path');
const dotenv = require('dotenv');
const { z } = require('zod');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(5001),
  MONGO_URI: z.string().min(1).default('mongodb://127.0.0.1:27017/trainerdesk'),
  MONGO_TEST_URI: z.string().min(1).default('mongodb://127.0.0.1:27017/trainerdesk_test'),
  CLIENT_URL: z.string().min(1).default('http://localhost:5173'),
  JWT_ACCESS_SECRET: z.string().min(16, 'JWT_ACCESS_SECRET must be at least 16 characters'),
  JWT_REFRESH_SECRET: z.string().min(16, 'JWT_REFRESH_SECRET must be at least 16 characters'),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  COOKIE_SAME_SITE: z.enum(['lax', 'strict', 'none']).default('lax'),
  CLOUDINARY_CLOUD_NAME: z.string().optional().default(''),
  CLOUDINARY_API_KEY: z.string().optional().default(''),
  CLOUDINARY_API_SECRET: z.string().optional().default(''),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment configuration:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

const raw = parsed.data;
const cloudinaryEnabled = Boolean(
  raw.CLOUDINARY_CLOUD_NAME && raw.CLOUDINARY_API_KEY && raw.CLOUDINARY_API_SECRET
);

module.exports = {
  nodeEnv: raw.NODE_ENV,
  isProd: raw.NODE_ENV === 'production',
  isTest: raw.NODE_ENV === 'test',
  port: raw.PORT,
  mongoUri: raw.MONGO_URI,
  mongoTestUri: raw.MONGO_TEST_URI,
  clientUrl: raw.CLIENT_URL,
  cookieSameSite: raw.COOKIE_SAME_SITE,
  jwt: {
    accessSecret: raw.JWT_ACCESS_SECRET,
    refreshSecret: raw.JWT_REFRESH_SECRET,
    accessExpiresIn: raw.JWT_ACCESS_EXPIRES_IN,
    refreshExpiresIn: raw.JWT_REFRESH_EXPIRES_IN,
  },
  cloudinary: {
    cloudName: raw.CLOUDINARY_CLOUD_NAME,
    apiKey: raw.CLOUDINARY_API_KEY,
    apiSecret: raw.CLOUDINARY_API_SECRET,
    enabled: cloudinaryEnabled,
  },
};
