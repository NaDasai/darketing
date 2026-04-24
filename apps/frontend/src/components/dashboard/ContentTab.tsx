'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { contentApi, sourcesApi, type SourceDto } from '@/lib/api';
import { Badge, Card, CardContent, Select, Skeleton } from '@/components/ui';
import { formatDate, formatRelative } from '@/lib/utils';

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

  const filteredContent = useMemo(() => {
    if (!content.data) return undefined;
    const windowMs = DURATION_OPTIONS.find((o) => o.value === duration)?.ms;
    if (windowMs == null) return content.data;
    const cutoff = Date.now() - windowMs;
    return content.data.filter((item) => {
      const ts = new Date(item.publishedAt ?? item.createdAt).getTime();
      return Number.isFinite(ts) && ts >= cutoff;
    });
  }, [content.data, duration]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-end gap-2">
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
              ? 'No content matches the selected duration filter.'
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
