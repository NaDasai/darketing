import { createHash } from 'node:crypto';

// Common tracking parameters to strip from URLs before hashing. Kept narrow on
// purpose — this is dedup, not tracker scrubbing. If a prefix matches, the
// whole query key is dropped.
const TRACKING_PARAM_PREFIXES = ['utm_', 'mc_', 'icid_', 'ref_'] as const;
const TRACKING_PARAM_EXACT = new Set([
  'fbclid',
  'gclid',
  'gbraid',
  'wbraid',
  'msclkid',
  'yclid',
  'igshid',
  'ref',
  'ref_src',
  'ref_url',
  'source',
]);

function stripTrackingParams(search: URLSearchParams): URLSearchParams {
  const out = new URLSearchParams();
  const entries = [...search.entries()].sort(([a], [b]) => a.localeCompare(b));
  for (const [key, value] of entries) {
    const lowered = key.toLowerCase();
    if (TRACKING_PARAM_EXACT.has(lowered)) continue;
    if (TRACKING_PARAM_PREFIXES.some((p) => lowered.startsWith(p))) continue;
    out.append(key, value);
  }
  return out;
}

export function normalizeUrl(url: string): string {
  const parsed = new URL(url.trim());
  parsed.hash = '';
  parsed.hostname = parsed.hostname.toLowerCase();
  parsed.protocol = parsed.protocol.toLowerCase();

  const cleanedSearch = stripTrackingParams(parsed.searchParams);
  const serialized = cleanedSearch.toString();
  parsed.search = serialized ? `?${serialized}` : '';

  let pathname = parsed.pathname || '/';
  if (pathname.length > 1 && pathname.endsWith('/')) {
    pathname = pathname.replace(/\/+$/, '');
  }
  parsed.pathname = pathname;

  // URL.toString() keeps the protocol's default port implicit, which is what
  // we want for dedup: https://x.com/p and https://x.com:443/p hash the same.
  return parsed.toString();
}

export function urlHash(url: string): string {
  const normalized = normalizeUrl(url);
  return createHash('sha256').update(normalized).digest('hex');
}

// Title-similarity dedup is listed in spec §13 as a bonus. The user opted out
// of section-13 features, so this is an intentional no-op — wired into the
// pipeline via function call so we can drop in Jaro-Winkler later without
// touching the worker.
export function isDuplicateTitle(
  _title: string,
  _recentTitles: readonly string[],
): boolean {
  return false;
}
