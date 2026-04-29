import axios from 'axios';
import Parser from 'rss-parser';
import type { DiscoveredFeed } from '@eagle-eyes/shared';
import { logger } from '../lib/logger';

const HTTP_TIMEOUT_MS = 8000;
const USER_AGENT = 'EagleEyesRSSBot/0.1 (+https://github.com/)';

const COMMON_PATHS = [
  '/feed',
  '/feed/',
  '/rss',
  '/rss/',
  '/rss.xml',
  '/feed.xml',
  '/atom.xml',
  '/index.xml',
  '/feeds/posts/default',
];

const probeParser: Parser = new Parser({
  timeout: HTTP_TIMEOUT_MS,
  headers: { 'User-Agent': USER_AGENT },
});

async function tryParseAsFeed(url: string): Promise<DiscoveredFeed | null> {
  try {
    const feed = await probeParser.parseURL(url);
    return {
      url,
      title: feed.title?.trim() || null,
      type: 'rss',
    };
  } catch {
    return null;
  }
}

function matchAttr(attrs: string, name: string): string | null {
  const re = new RegExp(
    `\\b${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`,
    'i',
  );
  const m = re.exec(attrs);
  if (!m) return null;
  return m[2] ?? m[3] ?? m[4] ?? null;
}

function extractFeedLinks(html: string, baseUrl: string): DiscoveredFeed[] {
  const linkTagRe = /<link\b([^>]*)>/gi;
  const found: DiscoveredFeed[] = [];
  const seen = new Set<string>();
  let m: RegExpExecArray | null;
  while ((m = linkTagRe.exec(html)) !== null) {
    const attrs = m[1];
    const rel = matchAttr(attrs, 'rel');
    const type = matchAttr(attrs, 'type');
    const href = matchAttr(attrs, 'href');
    const title = matchAttr(attrs, 'title');
    if (!href || !rel || !type) continue;
    if (!/\balternate\b/i.test(rel)) continue;
    const t = type.toLowerCase();
    let feedType: DiscoveredFeed['type'] | null = null;
    if (t.includes('rss')) feedType = 'rss';
    else if (t.includes('atom')) feedType = 'atom';
    if (!feedType) continue;

    let resolved: string;
    try {
      resolved = new URL(href, baseUrl).toString();
    } catch {
      continue;
    }
    if (seen.has(resolved)) continue;
    seen.add(resolved);
    found.push({
      url: resolved,
      title: title?.trim() || null,
      type: feedType,
    });
  }
  return found;
}

async function fetchHtml(url: string): Promise<string | null> {
  try {
    const res = await axios.get<string>(url, {
      timeout: HTTP_TIMEOUT_MS,
      headers: {
        'User-Agent': USER_AGENT,
        Accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      responseType: 'text',
      transformResponse: [(data: unknown) => data as string],
      maxRedirects: 5,
      validateStatus: (s) => s >= 200 && s < 400,
    });
    return typeof res.data === 'string' ? res.data : String(res.data);
  } catch (err) {
    logger.warn(
      { url, err: err instanceof Error ? err.message : String(err) },
      'Feed discovery: HTML fetch failed',
    );
    return null;
  }
}

export async function discoverFeeds(siteUrl: string): Promise<DiscoveredFeed[]> {
  const parsed = new URL(siteUrl);

  // 1. The URL might already be a feed.
  const direct = await tryParseAsFeed(siteUrl);
  if (direct) return [direct];

  // 2. Look for <link rel="alternate" type="application/rss+xml"> in HTML.
  const html = await fetchHtml(siteUrl);
  if (html) {
    const fromHtml = extractFeedLinks(html, siteUrl);
    if (fromHtml.length > 0) return fromHtml;
  }

  // 3. Probe common feed paths in parallel.
  const probes = await Promise.all(
    COMMON_PATHS.map((path) => {
      let candidateUrl: string;
      try {
        candidateUrl = new URL(path, parsed.origin).toString();
      } catch {
        return Promise.resolve(null);
      }
      return tryParseAsFeed(candidateUrl);
    }),
  );

  const seen = new Set<string>();
  return probes.filter((f): f is DiscoveredFeed => {
    if (!f || seen.has(f.url)) return false;
    seen.add(f.url);
    return true;
  });
}
