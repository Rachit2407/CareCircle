import { z } from 'zod';
import dotenv from 'dotenv';

// Load .env file
dotenv.config();

export const KNOWN_PLACEHOLDER_SECRETS = [
  'carecircle-storage-signing-secret-default-key',
  'carecircle_internal_secret_token',
  'your_jwt_secret_here',
  'your_secret_here',
  'changeme',
  'secret',
  'default',
  'placeholder',
];

export const validateProductionBootGuard = (data: {
  NODE_ENV: string;
  JWT_SECRET: string;
  JWT_REFRESH_SECRET: string;
  STORAGE_SIGNING_SECRET: string;
  CORS_ORIGIN: string;
}) => {
  if (data.NODE_ENV !== 'production') {
    return;
  }

  const checkSecret = (name: string, val: string) => {
    if (!val || val.length < 32) {
      throw new Error(`Production boot guard: ${name} must be at least 32 characters long in production`);
    }
    const lower = val.toLowerCase();
    if (KNOWN_PLACEHOLDER_SECRETS.some((p) => lower.includes(p.toLowerCase()))) {
      throw new Error(`Production boot guard: ${name} contains a known insecure placeholder in production`);
    }
  };

  checkSecret('JWT_SECRET', data.JWT_SECRET);
  checkSecret('JWT_REFRESH_SECRET', data.JWT_REFRESH_SECRET);
  checkSecret('STORAGE_SIGNING_SECRET', data.STORAGE_SIGNING_SECRET);

  const origins = data.CORS_ORIGIN.split(',').map((o) => o.trim());
  if (origins.includes('*')) {
    throw new Error(`Production boot guard: CORS_ORIGIN cannot be wildcard '*' in production`);
  }
};

const envSchema = z
  .object({
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

    AUTH_RATE_LIMIT_MAX: z.coerce.number().default(200),
    AUTH_RATE_LIMIT_ENABLED: z.preprocess((val) => {
      if (val === 'true' || val === true) return true;
      if (val === 'false' || val === false) return false;
      return undefined;
    }, z.boolean().optional()),

    SARVAM_API_KEY: z.string().default('mock-sarvam-key'),
    SARVAM_API_BASE_URL: z.string().default('https://api.sarvam.ai'),
    REMINDER_WORKER_INTERVAL_MS: z.coerce.number().default(30000),
    REMINDER_MAX_ATTEMPTS: z.coerce.number().default(3),

    AI_ENABLED: z.preprocess((val) => val === 'true' || val === true, z.boolean()).default(false),
    INTERNAL_SERVICE_TOKEN: z.string().optional(),
    AI_ENGINE_URL: z.string().default('http://localhost:8001'),

    RETURN_TOKENS_IN_BODY: z.preprocess((val) => {
      if (val === 'false' || val === false) return false;
      return true;
    }, z.boolean()).default(true),

    LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),
    AUDIT_LOG_ENABLED: z.preprocess((val) => val === 'true' || val === true, z.boolean()).default(true),
  })
  .refine(
    (data) => {
      if (data.AI_ENABLED) {
        if (!data.INTERNAL_SERVICE_TOKEN || data.INTERNAL_SERVICE_TOKEN.length < 32) {
          return false;
        }
      }
      return true;
    },
    {
      message: 'INTERNAL_SERVICE_TOKEN must be at least 32 characters long when AI_ENABLED is true',
      path: ['INTERNAL_SERVICE_TOKEN'],
    }
  );

const parseEnv = () => {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error('Invalid environment configuration:');
    console.error(JSON.stringify(result.error.format(), null, 2));
    throw new Error('Invalid environment configuration');
  }

  // Validate production boot guard
  validateProductionBootGuard(result.data);

  return result.data;
};

export const env = parseEnv();
export type Env = z.infer<typeof envSchema>;
