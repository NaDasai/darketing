'use client';

import { useQuery } from '@tanstack/react-query';
import { contentApi, sourcesApi, type SourceDto } from '@/lib/api';
import { Badge, Card, CardContent, Skeleton } from '@/components/ui';
import { formatRelative } from '@/lib/utils';

export function ContentTab({ projectId }: { projectId: string }) {
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

  return (
    <div className="flex flex-col gap-3">
      {content.isPending
        ? Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))
        : null}

      {!content.isPending &&
      content.data &&
      content.data.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-10 text-center text-sm text-zinc-400">
            No content yet. The worker will populate this tab after the next
            run.
          </CardContent>
        </Card>
      ) : null}

      {content.data?.map((item) => {
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
                <span className="text-xs text-zinc-500">
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
