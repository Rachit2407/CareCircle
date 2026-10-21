import { z } from 'zod';
import dotenv from 'dotenv';
import path from 'path';

// Load .env file
dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4000),
  API_PREFIX: z.string().default('/api/v1'),

  CORS_ORIGIN: z.string().default('*'),
  JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 characters long'),
  JWT_EXPIRES_IN: z.string().default('1h'),
  JWT_REFRESH_SECRET: z.string().min(16, 'JWT_REFRESH_SECRET must be at least 16 characters long'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),

  STORAGE_BUCKET_NAME: z.string().default('carecircle-health-records'),
  STORAGE_SIGNING_SECRET: z.string().default('carecircle-storage-signing-secret-default-key'),
  STORAGE_BASE_URL: z.string().default('https://storage.carecircle.internal'),
  STORAGE_SIGNED_URL_EXPIRY_SECONDS: z.coerce.number().default(900),

  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(60000),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().default(100),
  ALERT_RATE_LIMIT_MAX: z.coerce.number().default(5),

  SARVAM_API_KEY: z.string().default('mock-sarvam-key'),
  SARVAM_API_BASE_URL: z.string().default('https://api.sarvam.ai'),
  REMINDER_WORKER_INTERVAL_MS: z.coerce.number().default(30000),
  REMINDER_MAX_ATTEMPTS: z.coerce.number().default(3),

  INTERNAL_SERVICE_TOKEN: z.string().default('carecircle_internal_secret_token'),
  AI_ENGINE_URL: z.string().default('http://localhost:8001'),

  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),
  AUDIT_LOG_ENABLED: z.preprocess((val) => val === 'true' || val === true, z.boolean()).default(true),
});

const parseEnv = () => {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error('Invalid environment configuration:');
    console.error(JSON.stringify(result.error.format(), null, 2));
    throw new Error('Invalid environment configuration');
  }
  return result.data;
};

export const env = parseEnv();
export type Env = z.infer<typeof envSchema>;
