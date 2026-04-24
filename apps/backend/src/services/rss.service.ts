import Parser from 'rss-parser';
import { env } from '../config/env';
import { logger } from '../lib/logger';

export interface NormalizedItem {
  title: string;
  sourceUrl: string;
  rawContent: string;
  publishedAt: Date | null;
}

// Minimum content length after HTML-stripping. Feeds with bare titles or
// 1-line teasers aren't worth summarizing or scoring.
export const MIN_CONTENT_CHARS = 200;

type FeedItem = {
  title?: string;
  link?: string;
  content?: string;
  contentSnippet?: string;
  'content:encoded'?: string;
  summary?: string;
  isoDate?: string;
  pubDate?: string;
};

const parser: Parser<unknown, FeedItem> = new Parser<unknown, FeedItem>({
  timeout: env.RSS_FETCH_TIMEOUT_MS,
  headers: {
    // Some feeds 403 the default node-fetch UA.
    'User-Agent': 'DarketingRSSBot/0.1 (+https://github.com/)',
  },
  customFields: {
    item: ['content:encoded', 'summary'],
  },
});

function stripHtml(html: string): string {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<\/(p|div|li|h[1-6]|br)>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function pickContent(item: FeedItem): string {
  const candidate =
    item['content:encoded'] ?? item.content ?? item.summary ?? item.contentSnippet ?? '';
  return stripHtml(candidate);
}

function parsePublishedAt(item: FeedItem): Date | null {
  const iso = item.isoDate ?? item.pubDate;
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

function normalize(item: FeedItem): NormalizedItem | null {
  const title = item.title?.trim();
  const link = item.link?.trim();
  if (!title || !link) return null;

  const rawContent = pickContent(item);
  if (rawContent.length < MIN_CONTENT_CHARS) return null;

  return {
    title,
    sourceUrl: link,
    rawContent,
    publishedAt: parsePublishedAt(item),
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((res) => setTimeout(res, ms));
}

export async function fetchFeed(url: string): Promise<NormalizedItem[]> {
  const maxAttempts = env.RSS_FETCH_RETRIES + 1;
  let lastErr: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const feed = await parser.parseURL(url);
      const items = (feed.items ?? [])
        .map(normalize)
        .filter((i): i is NormalizedItem => i !== null);

      logger.debug(
        { url, total: feed.items?.length ?? 0, kept: items.length, attempt },
        'RSS feed fetched',
      );
      return items;
    } catch (err) {
      lastErr = err;
      const isLast = attempt === maxAttempts;
      logger.warn(
        {
          url,
          attempt,
          maxAttempts,
          err: err instanceof Error ? err.message : String(err),
        },
        isLast ? 'RSS fetch failed (giving up)' : 'RSS fetch failed (retrying)',
      );
      if (!isLast) {
        await sleep(250 * 2 ** (attempt - 1));
      }
    }
  }

  throw lastErr instanceof Error
    ? lastErr
    : new Error(`RSS fetch failed for ${url}`);
}
