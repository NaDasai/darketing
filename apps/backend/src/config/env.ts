import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  HOST: z.string().default('0.0.0.0'),
  LOG_LEVEL: z
    .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
    .default('info'),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),

  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),
  REDIS_URL: z.string().min(1, 'REDIS_URL is required'),

  // OPENROUTER_API_KEY is optional at process boot so that `pnpm seed`
  // and similar scripts can run without it. The LLM service enforces
  // its presence at call time.
  OPENROUTER_API_KEY: z.string().optional().default(''),
  OPENROUTER_MODEL: z.string().default('meta-llama/llama-3.3-70b-instruct:free'),
  OPENROUTER_BASE_URL: z.string().url().default('https://openrouter.ai/api/v1'),
  OPENROUTER_APP_NAME: z.string().default('Darketing'),
  OPENROUTER_APP_URL: z.string().default('http://localhost:3000'),

  CRON_SCHEDULE: z.string().default('0 6 * * *'),
  DEFAULT_TOP_N: z.coerce.number().int().positive().default(5),
  // Fractional values allowed so sub-1/s throttling works against OpenRouter's
  // free tier (~20 req/min shared across :free models). 0.3 ≈ 18 req/min.
  LLM_RATE_LIMIT_PER_SEC: z.coerce.number().positive().default(0.3),
  RSS_FETCH_TIMEOUT_MS: z.coerce.number().int().positive().default(10000),
  RSS_FETCH_RETRIES: z.coerce.number().int().nonnegative().default(2),
  // Article scraping fallback used when an RSS item is title-only.
  SCRAPER_TIMEOUT_MS: z.coerce.number().int().positive().default(15000),
  SCRAPER_CONCURRENCY: z.coerce.number().int().positive().default(4),
  WORKER_CONCURRENCY: z.coerce.number().int().positive().default(2),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  // eslint-disable-next-line no-console
  console.error(
    'Invalid environment:',
    JSON.stringify(parsed.error.flatten().fieldErrors, null, 2),
  );
  process.exit(1);
}

export const env = parsed.data;
export type Env = typeof env;
