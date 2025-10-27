import { z } from 'zod';

const envSchema = z.object({
  PORT: z.coerce.number().default(3333),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('production'),
  DATABASE_URL: z.string().url().default('postgres://'),

  CLOUFARE_ACCOUNT_ID: z.string(),
  CLOUDFARE_ACCESS_KEY_ID: z.string(),
  CLOUDFARE_SECRET_KEY_ID: z.string(),
  CLOUDFARE_BUCKET: z.string(),
  CLOUDFARE_URL_BUCKET: z.string(),
});

export const env = envSchema.parse(process.env);