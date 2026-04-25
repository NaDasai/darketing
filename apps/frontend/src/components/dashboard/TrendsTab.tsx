'use client';

import { useQuery } from '@tanstack/react-query';
import { trendsApi } from '@/lib/api';
import { Badge, Card, CardContent, Skeleton } from '@/components/ui';
import { formatDate, formatRelative } from '@/lib/utils';

export function TrendsTab({ projectId }: { projectId: string }) {
  const trends = useQuery({
    queryKey: ['trends', projectId],
    queryFn: ({ signal }) => trendsApi.list(projectId, { limit: 20 }, signal),
  });

  if (trends.isPending) {
    return (
      <div className="flex flex-col gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
    );
  }

  if (!trends.data || trends.data.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-10 text-center text-sm text-zinc-400">
          No trend reports yet. After the next pipeline run, the AI will
          analyze the new items and post a short report here.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {trends.data.map((report) => (
        <Card key={report.id}>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex flex-col gap-1">
                <h3 className="text-base font-medium text-zinc-100">
                  {report.headline}
                </h3>
                <span
                  className="text-xs text-zinc-500"
                  title={formatDate(report.generatedAt)}
                >
                  Generated {formatRelative(report.generatedAt)}
                </span>
              </div>
              <Badge tone="accent">
                {report.itemCount} item{report.itemCount === 1 ? '' : 's'}
              </Badge>
            </div>

            {report.themes.length > 0 ? (
              <ul className="flex flex-col gap-3 border-t border-zinc-800 pt-3">
                {report.themes.map((theme, i) => (
                  <li key={i} className="flex flex-col gap-1">
                    <span className="text-sm font-medium text-zinc-100">
                      {theme.title}
                    </span>
                    <p className="text-sm text-zinc-400">{theme.description}</p>
                  </li>
                ))}
              </ul>
            ) : null}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
