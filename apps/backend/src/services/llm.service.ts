import axios, { AxiosError, type AxiosInstance } from 'axios';
import { z } from 'zod';
import {
  ASSET_CLASS_VALUES,
  CONFIDENCE_VALUES,
  DIRECTION_VALUES,
  PLATFORM_VALUES,
  type Platform,
  type Tone,
} from '@darketing/shared';
import { env } from '../config/env';
import { logger } from '../lib/logger';
import { RateLimiter } from '../utils/rateLimiter';
import {
  editPostPrompt,
  generateMarketSignalsPrompt,
  generatePostsPrompt,
  generateTrendsPrompt,
  summarizePrompt,
  type ChatMessages,
  type EditPostPromptInput,
  type MarketSignalItemForPrompt,
  type TrendItemForPrompt,
} from './prompts';

export interface GeneratePostsInput {
  title: string;
  summary: string;
  sourceUrl: string;
  tone: Tone;
  targetAudience: string;
  domain: string;
  platforms: readonly Platform[];
}

const GeneratePostsOutputSchema = z.object({
  posts: z
    .array(
      z.object({
        platform: z.enum(PLATFORM_VALUES),
        content: z.string().min(1).max(10000),
      }),
    )
    .min(1),
});

export type GeneratePostsOutput = z.infer<typeof GeneratePostsOutputSchema>;

const OpenRouterResponseSchema = z.object({
  id: z.string().optional(),
  model: z.string().optional(),
  choices: z
    .array(
      z.object({
        message: z.object({
          role: z.string().optional(),
          content: z.string(),
        }),
        finish_reason: z.string().optional(),
      }),
    )
    .min(1),
  usage: z
    .object({
      prompt_tokens: z.number().optional(),
      completion_tokens: z.number().optional(),
      total_tokens: z.number().optional(),
    })
    .optional(),
});

type OpenRouterMessage = { role: 'system' | 'user' | 'assistant'; content: string };

let cachedClient: AxiosInstance | null = null;
// Fractional per-sec (e.g. 0.3 for OpenRouter's 20/min free tier) is expressed
// as "1 call per scaled interval" since RateLimiter's maxInInterval is integer.
function limiterArgs(perSec: number): [number, number] {
  if (perSec >= 1) return [Math.floor(perSec), 1000];
  return [1, Math.ceil(1000 / perSec)];
}
const limiter = new RateLimiter(...limiterArgs(env.LLM_RATE_LIMIT_PER_SEC));

function getClient(): AxiosInstance {
  if (!env.OPENROUTER_API_KEY) {
    throw new Error(
      'OPENROUTER_API_KEY is not set. Add it to apps/backend/.env before calling the LLM.',
    );
  }
  if (cachedClient) return cachedClient;

  cachedClient = axios.create({
    baseURL: env.OPENROUTER_BASE_URL,
    timeout: 60_000,
    headers: {
      Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      // OpenRouter attribution headers — required for free-tier rate limits
      // and for showing up in their dashboard.
      'HTTP-Referer': env.OPENROUTER_APP_URL,
      'X-Title': env.OPENROUTER_APP_NAME,
    },
  });
  return cachedClient;
}

function messagesFrom(chat: ChatMessages): OpenRouterMessage[] {
  return [
    { role: 'system', content: chat.system },
    { role: 'user', content: chat.user },
  ];
}

async function chatCompletion(
  messages: OpenRouterMessage[],
  opts: { jsonMode: boolean; temperature?: number },
): Promise<string> {
  return limiter.run(async () => {
    const client = getClient();
    try {
      const { data } = await client.post('/chat/completions', {
        model: env.OPENROUTER_MODEL,
        messages,
        temperature: opts.temperature ?? 0.7,
        ...(opts.jsonMode ? { response_format: { type: 'json_object' } } : {}),
      });

      const parsed = OpenRouterResponseSchema.safeParse(data);
      if (!parsed.success) {
        logger.error(
          { errors: parsed.error.flatten(), raw: data },
          'OpenRouter response failed schema validation',
        );
        throw new Error('OpenRouter returned an unexpected response shape');
      }

      const { choices, usage, model } = parsed.data;
      logger.debug({ model, usage }, 'OpenRouter usage');

      const content = choices[0].message.content.trim();
      if (!content) throw new Error('OpenRouter returned empty content');
      return content;
    } catch (err) {
      if (err instanceof AxiosError) {
        logger.error(
          {
            status: err.response?.status,
            data: err.response?.data,
            message: err.message,
          },
          'OpenRouter request failed',
        );
      }
      throw err;
    }
  });
}

// Free models occasionally wrap JSON in ```json fences or emit leading prose
// despite response_format. Strip both before handing to JSON.parse.
function extractJsonBlock(raw: string): string {
  let s = raw.trim();
  if (s.startsWith('```')) {
    s = s.replace(/^```(?:json)?\s*/i, '').replace(/```$/, '').trim();
  }
  const firstBrace = s.indexOf('{');
  const lastBrace = s.lastIndexOf('}');
  if (firstBrace > 0 && lastBrace > firstBrace) {
    s = s.slice(firstBrace, lastBrace + 1);
  }
  return s;
}

async function generatePostsOnce(
  input: GeneratePostsInput,
  strict: boolean,
): Promise<GeneratePostsOutput> {
  const base = generatePostsPrompt(input);
  const system = strict
    ? `${base.system}\n\nSTRICT MODE: your previous response was not valid JSON. Return ONLY the JSON object, nothing else, no fences.`
    : base.system;

  const raw = await chatCompletion(messagesFrom({ system, user: base.user }), {
    jsonMode: true,
    temperature: strict ? 0.2 : 0.7,
  });

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(extractJsonBlock(raw));
  } catch (err) {
    logger.warn({ raw }, 'LLM generatePosts: JSON.parse failed');
    throw new Error('LLM returned non-JSON content');
  }

  const validated = GeneratePostsOutputSchema.safeParse(parsedJson);
  if (!validated.success) {
    logger.warn(
      { errors: validated.error.flatten(), raw },
      'LLM generatePosts: schema validation failed',
    );
    throw new Error('LLM JSON did not match expected schema');
  }

  const requestedSet = new Set(input.platforms);
  const filtered = validated.data.posts.filter((p) => requestedSet.has(p.platform));
  if (filtered.length === 0) {
    throw new Error('LLM returned no posts for any requested platform');
  }

  return { posts: filtered };
}

export async function generatePosts(
  input: GeneratePostsInput,
): Promise<GeneratePostsOutput> {
  if (input.platforms.length === 0) {
    throw new Error('generatePosts: at least one platform is required');
  }
  try {
    return await generatePostsOnce(input, false);
  } catch (err) {
    logger.warn({ err: (err as Error).message }, 'generatePosts: retrying in strict mode');
    return generatePostsOnce(input, true);
  }
}

export interface GenerateTrendReportInput {
  domain: string;
  targetAudience: string;
  items: readonly TrendItemForPrompt[];
}

const TrendReportSchema = z.object({
  headline: z.string().min(1).max(500),
  themes: z
    .array(
      z.object({
        title: z.string().min(1).max(200),
        description: z.string().min(1).max(2000),
      }),
    )
    .min(1)
    .max(10),
});

export type TrendReportOutput = z.infer<typeof TrendReportSchema>;

async function generateTrendReportOnce(
  input: GenerateTrendReportInput,
  strict: boolean,
): Promise<TrendReportOutput> {
  const base = generateTrendsPrompt(input);
  const system = strict
    ? `${base.system}\n\nSTRICT MODE: your previous response was not valid JSON. Return ONLY the JSON object, nothing else, no fences.`
    : base.system;

  const raw = await chatCompletion(messagesFrom({ system, user: base.user }), {
    jsonMode: true,
    temperature: strict ? 0.2 : 0.5,
  });

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(extractJsonBlock(raw));
  } catch {
    logger.warn({ raw }, 'LLM generateTrendReport: JSON.parse failed');
    throw new Error('LLM returned non-JSON content');
  }

  const validated = TrendReportSchema.safeParse(parsedJson);
  if (!validated.success) {
    logger.warn(
      { errors: validated.error.flatten(), raw },
      'LLM generateTrendReport: schema validation failed',
    );
    throw new Error('LLM JSON did not match expected schema');
  }
  return validated.data;
}

export async function generateTrendReport(
  input: GenerateTrendReportInput,
): Promise<TrendReportOutput> {
  if (input.items.length === 0) {
    throw new Error('generateTrendReport: items is empty');
  }
  try {
    return await generateTrendReportOnce(input, false);
  } catch (err) {
    logger.warn(
      { err: (err as Error).message },
      'generateTrendReport: retrying in strict mode',
    );
    return generateTrendReportOnce(input, true);
  }
}

export interface GenerateMarketReportInput {
  domain: string;
  targetAudience: string;
  items: readonly MarketSignalItemForPrompt[];
}

const MarketReportSchema = z.object({
  signals: z
    .array(
      z.object({
        asset: z.string().min(1).max(160),
        assetClass: z.enum(ASSET_CLASS_VALUES),
        direction: z.enum(DIRECTION_VALUES),
        confidence: z.enum(CONFIDENCE_VALUES),
        horizon: z.string().max(80).optional(),
        rationale: z.string().min(1).max(2000),
        // 1-based indexes into the input items list, mapped to ObjectIds by
        // the worker after parsing.
        supportingItemIndexes: z.array(z.number().int().positive()).default([]),
      }),
    )
    .max(10),
});

export type MarketReportOutput = z.infer<typeof MarketReportSchema>;

async function generateMarketReportOnce(
  input: GenerateMarketReportInput,
  strict: boolean,
): Promise<MarketReportOutput> {
  const base = generateMarketSignalsPrompt(input);
  const system = strict
    ? `${base.system}\n\nSTRICT MODE: your previous response was not valid JSON. Return ONLY the JSON object, nothing else, no fences.`
    : base.system;

  const raw = await chatCompletion(messagesFrom({ system, user: base.user }), {
    jsonMode: true,
    temperature: strict ? 0.2 : 0.4,
  });

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(extractJsonBlock(raw));
  } catch {
    logger.warn({ raw }, 'LLM generateMarketReport: JSON.parse failed');
    throw new Error('LLM returned non-JSON content');
  }

  const validated = MarketReportSchema.safeParse(parsedJson);
  if (!validated.success) {
    logger.warn(
      { errors: validated.error.flatten(), raw },
      'LLM generateMarketReport: schema validation failed',
    );
    throw new Error('LLM JSON did not match expected schema');
  }
  return validated.data;
}

export async function generateMarketReport(
  input: GenerateMarketReportInput,
): Promise<MarketReportOutput> {
  if (input.items.length === 0) {
    throw new Error('generateMarketReport: items is empty');
  }
  try {
    return await generateMarketReportOnce(input, false);
  } catch (err) {
    logger.warn(
      { err: (err as Error).message },
      'generateMarketReport: retrying in strict mode',
    );
    return generateMarketReportOnce(input, true);
  }
}

export type EditPostInput = EditPostPromptInput;

export async function editPost(input: EditPostInput): Promise<string> {
  if (!input.currentContent.trim()) {
    throw new Error('editPost: currentContent is empty');
  }
  if (!input.instruction.trim()) {
    throw new Error('editPost: instruction is empty');
  }

  const chat = editPostPrompt(input);
  const out = await chatCompletion(messagesFrom(chat), {
    jsonMode: false,
    temperature: 0.6,
  });

  const cleaned = out
    .replace(/^```[a-z]*\s*/i, '')
    .replace(/```$/, '')
    .trim();
  if (!cleaned) throw new Error('editPost: LLM returned empty content');
  return cleaned;
}

export async function summarize(rawContent: string): Promise<string> {
  const trimmed = rawContent.trim();
  if (!trimmed) throw new Error('summarize: rawContent is empty');

  const chat = summarizePrompt(trimmed);
  const out = await chatCompletion(messagesFrom(chat), {
    jsonMode: false,
    temperature: 0.3,
  });

  const cleaned = out.replace(/^```[a-z]*\s*/i, '').replace(/```$/, '').trim();
  if (!cleaned) throw new Error('summarize: LLM returned empty content');
  return cleaned;
}
