// Deterministic relevance scoring for fetched content items.
// Pure functions, no I/O — safe to test with inline fixtures.
//
// score = 0.4 * recency + 0.4 * keyword + 0.2 * length
// All three factors are clamped to [0, 1], so the weighted sum is too.

export const SCORING_WEIGHTS = {
  recency: 0.4,
  keyword: 0.4,
  length: 0.2,
} as const;

// 7-day half-life: a 7-day-old article scores 0.5 on recency, 14-day 0.25.
export const RECENCY_HALF_LIFE_DAYS = 7;
// Content length above this cap no longer improves the length signal.
export const LENGTH_NORMALIZATION_CHARS = 1500;

export interface ScoreInput {
  title: string;
  summary: string | null;
  rawContent: string;
  publishedAt: Date | null;
}

export interface ScoreContext {
  domain: string;
  targetAudience: string;
  now?: Date;
}

function tokenize(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length >= 3);
}

export function recencyScore(publishedAt: Date | null, now: Date): number {
  if (!publishedAt) return 0.25; // neutral-ish prior for undated items
  const ageMs = now.getTime() - publishedAt.getTime();
  if (ageMs <= 0) return 1;
  const ageDays = ageMs / (1000 * 60 * 60 * 24);
  const decay = Math.exp((-Math.LN2 * ageDays) / RECENCY_HALF_LIFE_DAYS);
  return Math.max(0, Math.min(1, decay));
}

export function keywordScore(text: string, keywords: readonly string[]): number {
  const tokens = new Set(tokenize(text));
  const target = Array.from(new Set(keywords.flatMap(tokenize)));
  if (target.length === 0 || tokens.size === 0) return 0;
  const hits = target.filter((k) => tokens.has(k)).length;
  return hits / target.length;
}

export function lengthScore(contentLength: number): number {
  if (contentLength <= 0) return 0;
  return Math.min(1, contentLength / LENGTH_NORMALIZATION_CHARS);
}

export function score(item: ScoreInput, ctx: ScoreContext): number {
  const now = ctx.now ?? new Date();
  const text = [item.title, item.summary ?? '', item.rawContent].join(' ');
  const keywords = [ctx.domain, ctx.targetAudience];

  const r = recencyScore(item.publishedAt, now);
  const k = keywordScore(text, keywords);
  const l = lengthScore(item.rawContent.length);

  const total =
    SCORING_WEIGHTS.recency * r +
    SCORING_WEIGHTS.keyword * k +
    SCORING_WEIGHTS.length * l;

  return Math.round(total * 10_000) / 10_000;
}
