import Parser from 'rss-parser';
import pLimit from 'p-limit';
import { env } from '../config/env';
import { logger } from '../lib/logger';
import { scrapeArticle } from './scraper.service';

export interface NormalizedItem {
  title: string;
  sourceUrl: string;
  rawContent: string;
  publishedAt: Date | null;
}

// Minimum content length after HTML-stripping. Many publisher feeds (e.g.
// WordPress sites that only put a 1-line excerpt in <description>) sit in the
// 100–150 char range. 100 keeps near-empty items out without dropping the
// majority of headline-style feeds.
export const MIN_CONTENT_CHARS = 100;

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

// First pass: derive what we can from the feed entry alone. Items missing
// title/link are unrecoverable; items missing content are returned with
// rawContent='' so the caller can decide whether to scrape.
function normalizeFromFeed(item: FeedItem): NormalizedItem | null {
  const title = item.title?.trim();
  const link = item.link?.trim();
  if (!title || !link) return null;

  return {
    title,
    sourceUrl: link,
    rawContent: pickContent(item),
    publishedAt: parsePublishedAt(item),
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((res) => setTimeout(res, ms));
}

async function backfillThinItems(
  items: NormalizedItem[],
  feedUrl: string,
): Promise<NormalizedItem[]> {
  const thin = items.filter((it) => it.rawContent.length < MIN_CONTENT_CHARS);
  if (thin.length === 0) return items;

  const limit = pLimit(env.SCRAPER_CONCURRENCY);
  let scraped = 0;
  let scrapedKept = 0;

  await Promise.all(
    thin.map((item) =>
      limit(async () => {
        const text = await scrapeArticle(item.sourceUrl);
        scraped += 1;
        if (text && text.length >= MIN_CONTENT_CHARS) {
          item.rawContent = text;
          scrapedKept += 1;
        }
      }),
    ),
  );

  logger.debug(
    { feedUrl, thinCount: thin.length, scraped, scrapedKept },
    'RSS feed: scraping fallback ran',
  );

  return items;
}

export async function fetchFeed(url: string): Promise<NormalizedItem[]> {
  const maxAttempts = env.RSS_FETCH_RETRIES + 1;
  let lastErr: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const feed = await parser.parseURL(url);
      // Two-stage filter: keep anything with title+link first, then either
      // accept the feed-supplied content or attempt scraping for thin items.
      const candidates = (feed.items ?? [])
        .map(normalizeFromFeed)
        .filter((i): i is NormalizedItem => i !== null);

      const enriched = await backfillThinItems(candidates, url);

      const items = enriched.filter(
        (i) => i.rawContent.length >= MIN_CONTENT_CHARS,
      );

      logger.debug(
        {
          url,
          total: feed.items?.length ?? 0,
          candidates: candidates.length,
          kept: items.length,
          attempt,
        },
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
