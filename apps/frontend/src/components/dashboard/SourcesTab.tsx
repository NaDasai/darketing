'use client';

import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError, sourcesApi } from '@/lib/api';
import {
  Badge,
  Button,
  Card,
  CardContent,
  Input,
  Skeleton,
  useToast,
} from '@/components/ui';
import { formatRelative } from '@/lib/utils';

export function SourcesTab({ projectId }: { projectId: string }) {
  const [rssUrl, setRssUrl] = useState('');
  const qc = useQueryClient();
  const { toast } = useToast();

  const sources = useQuery({
    queryKey: ['sources', projectId],
    queryFn: ({ signal }) => sourcesApi.list(projectId, signal),
  });

  const add = useMutation({
    mutationFn: () => sourcesApi.create(projectId, { rssUrl }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sources', projectId] });
      qc.invalidateQueries({ queryKey: ['project', projectId] });
      setRssUrl('');
      toast('Source added', 'success');
    },
    onError: (err: unknown) => {
      const msg =
        err instanceof ApiError ? err.message : 'Failed to add source';
      toast(msg, 'error');
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => sourcesApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sources', projectId] });
      qc.invalidateQueries({ queryKey: ['project', projectId] });
      toast('Source removed', 'info');
    },
    onError: (err: unknown) => {
      const msg =
        err instanceof ApiError ? err.message : 'Failed to remove source';
      toast(msg, 'error');
    },
  });

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!rssUrl.trim()) return;
    add.mutate();
  }

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={submit} className="flex gap-2">
        <Input
          type="url"
          value={rssUrl}
          onChange={(e) => setRssUrl(e.target.value)}
          placeholder="https://example.com/feed.xml"
          required
        />
        <Button type="submit" isLoading={add.isPending}>
          Add
        </Button>
      </form>

      {sources.isPending ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : null}

      {!sources.isPending &&
      sources.data &&
      sources.data.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center text-sm text-zinc-400">
            No sources yet. Add an RSS feed URL above.
          </CardContent>
        </Card>
      ) : null}

      {sources.data && sources.data.length > 0 ? (
        <ul className="flex flex-col divide-y divide-zinc-800 overflow-hidden rounded-lg border border-zinc-800">
          {sources.data.map((s) => (
            <li
              key={s.id}
              className="flex items-center gap-3 bg-zinc-900/40 px-4 py-3"
            >
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-sm text-zinc-100">
                  {s.rssUrl}
                </span>
                <span className="text-xs text-zinc-500">
                  Last fetched {formatRelative(s.lastFetchedAt)}
                </span>
              </div>
              {s.isActive ? (
                <Badge tone="success">Active</Badge>
              ) : (
                <Badge>Paused</Badge>
              )}
              <Button
                size="sm"
                variant="danger"
                onClick={() => remove.mutate(s.id)}
                isLoading={remove.isPending && remove.variables === s.id}
              >
                Remove
              </Button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
