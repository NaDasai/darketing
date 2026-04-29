import { extract } from '@extractus/article-extractor';
import { env } from '../config/env';
import { logger } from '../lib/logger';

// Strip HTML to plain text. Mirrors the helper in rss.service so the two paths
// produce comparable rawContent shape (text, not HTML).
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

/**
 * Fetch an article URL and extract the body as plain text. Returns null on
 * any failure (network, paywall, anti-bot, parse error) — caller should fall
 * through to dropping the item rather than treating null as a hard error.
 */
export async function scrapeArticle(url: string): Promise<string | null> {
  // article-extractor doesn't expose a timeout option, so race the call
  // against AbortController via a manual setTimeout. Free-tier sites can
  // hang for a long time on TLS handshakes against our IP.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), env.SCRAPER_TIMEOUT_MS);

  try {
    const article = await extract(url, undefined, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (compatible; EagleEyesScraper/0.1; +https://github.com/)',
      },
      signal: controller.signal,
    });

    if (!article || !article.content) return null;
    const text = stripHtml(article.content);
    if (!text) return null;
    return text;
  } catch (err) {
    logger.debug(
      { url, err: err instanceof Error ? err.message : String(err) },
      'scraper: extraction failed',
    );
    return null;
  } finally {
    clearTimeout(timer);
  }
}
