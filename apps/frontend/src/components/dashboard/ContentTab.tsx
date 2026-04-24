'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { contentApi, sourcesApi, type SourceDto } from '@/lib/api';
import { Badge, Card, CardContent, Select, Skeleton } from '@/components/ui';
import { cn, formatDate, formatRelative } from '@/lib/utils';

type DurationFilter = 'ALL' | '1H' | '24H' | '7D' | '30D';

const DURATION_OPTIONS: { value: DurationFilter; label: string; ms: number | null }[] = [
  { value: 'ALL', label: 'Any time', ms: null },
  { value: '1H', label: 'Last hour', ms: 60 * 60 * 1000 },
  { value: '24H', label: 'Last 24 hours', ms: 24 * 60 * 60 * 1000 },
  { value: '7D', label: 'Last 7 days', ms: 7 * 24 * 60 * 60 * 1000 },
  { value: '30D', label: 'Last 30 days', ms: 30 * 24 * 60 * 60 * 1000 },
];

export function ContentTab({ projectId }: { projectId: string }) {
  const [duration, setDuration] = useState<DurationFilter>('ALL');
  // Empty set means "all sources" — keeps the no-sources-loaded-yet case sane.
  const [selectedSourceIds, setSelectedSourceIds] = useState<Set<string>>(
    new Set(),
  );

  const content = useQuery({
    queryKey: ['content', projectId],
    queryFn: ({ signal }) =>
      contentApi.list(projectId, { limit: 50 }, signal),
  });

  const sources = useQuery({
    queryKey: ['sources', projectId],
    queryFn: ({ signal }) => sourcesApi.list(projectId, signal),
  });

  const sourceById = new Map<string, SourceDto>(
    sources.data?.map((s) => [s.id, s]) ?? [],
  );

  function toggleSource(id: string) {
    setSelectedSourceIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function clearSources() {
    setSelectedSourceIds(new Set());
  }

  const filteredContent = useMemo(() => {
    if (!content.data) return undefined;
    const windowMs = DURATION_OPTIONS.find((o) => o.value === duration)?.ms;
    const cutoff = windowMs == null ? null : Date.now() - windowMs;
    const sourceFilterActive = selectedSourceIds.size > 0;
    return content.data.filter((item) => {
      if (sourceFilterActive && !selectedSourceIds.has(item.sourceId)) {
        return false;
      }
      if (cutoff != null) {
        const ts = new Date(item.publishedAt ?? item.createdAt).getTime();
        if (!Number.isFinite(ts) || ts < cutoff) return false;
      }
      return true;
    });
  }, [content.data, duration, selectedSourceIds]);

  const sourceFilterActive = selectedSourceIds.size > 0;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        {sources.data && sources.data.length > 0 ? (
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
            <span className="text-xs text-zinc-400">Sources:</span>
            <button
              type="button"
              onClick={clearSources}
              className={cn(
                'rounded-full border px-3 py-1 text-xs transition-colors',
                !sourceFilterActive
                  ? 'border-accent-500 bg-accent-900/40 text-accent-200'
                  : 'border-zinc-700 bg-zinc-900 text-zinc-400 hover:bg-zinc-800',
              )}
            >
              All
            </button>
            {sources.data.map((s) => {
              const active = selectedSourceIds.has(s.id);
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => toggleSource(s.id)}
                  title={s.rssUrl}
                  className={cn(
                    'rounded-full border px-3 py-1 text-xs transition-colors',
                    active
                      ? 'border-accent-500 bg-accent-900/40 text-accent-200'
                      : 'border-zinc-700 bg-zinc-900 text-zinc-300 hover:bg-zinc-800',
                  )}
                >
                  {hostnameOf(s.rssUrl)}
                </button>
              );
            })}
          </div>
        ) : (
          <div />
        )}
        <div className="flex shrink-0 items-center gap-2">
          <label htmlFor="content-duration" className="text-xs text-zinc-400">
            Posted within
          </label>
          <Select
            id="content-duration"
            value={duration}
            onChange={(e) => setDuration(e.target.value as DurationFilter)}
            className="h-9 w-44"
          >
            {DURATION_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {content.isPending
        ? Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))
        : null}

      {!content.isPending &&
      filteredContent &&
      filteredContent.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-10 text-center text-sm text-zinc-400">
            {content.data && content.data.length > 0
              ? 'No content matches the current filters.'
              : 'No content yet. The worker will populate this tab after the next run.'}
          </CardContent>
        </Card>
      ) : null}

      {filteredContent?.map((item) => {
        const source = sourceById.get(item.sourceId);
        return (
          <Card key={item.id}>
            <CardContent className="flex flex-col gap-2">
              <div className="flex items-start justify-between gap-3">
                <a
                  href={item.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium text-zinc-100 hover:text-accent-300"
                >
                  {item.title}
                </a>
                <div className="flex shrink-0 items-center gap-2">
                  {item.selected ? (
                    <Badge tone="accent">Selected</Badge>
                  ) : null}
                  {typeof item.score === 'number' ? (
                    <Badge tone={scoreTone(item.score)}>
                      {item.score.toFixed(2)}
                    </Badge>
                  ) : (
                    <Badge>unscored</Badge>
                  )}
                </div>
              </div>
              {item.summary ? (
                <p className="text-sm text-zinc-400">{item.summary}</p>
              ) : null}
              <div className="flex items-center justify-between gap-3 border-t border-zinc-800 pt-2">
                <span
                  className="text-xs text-zinc-500"
                  title={formatDate(item.publishedAt ?? item.createdAt)}
                >
                  {item.publishedAt ? 'Posted' : 'Added'}{' '}
                  {formatRelative(item.publishedAt ?? item.createdAt)}
                </span>
                {source ? (
                  <a
                    href={source.rssUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="truncate text-xs text-zinc-500 hover:text-accent-300"
                    title={source.rssUrl}
                  >
                    {hostnameOf(source.rssUrl)}
                  </a>
                ) : (
                  <span className="text-xs text-zinc-600">unknown source</span>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

function scoreTone(score: number): 'success' | 'warning' | 'neutral' {
  if (score >= 0.7) return 'success';
  if (score >= 0.4) return 'warning';
  return 'neutral';
}
