'use client';

import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError, sourcesApi, type DiscoveredFeed } from '@/lib/api';
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
  const [candidates, setCandidates] = useState<DiscoveredFeed[] | null>(null);
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
      setCandidates(null);
      toast('Source added', 'success');
    },
    onError: (err: unknown) => {
      const msg =
        err instanceof ApiError ? err.message : 'Failed to add source';
      toast(msg, 'error');
    },
  });

  const discover = useMutation({
    mutationFn: () => sourcesApi.discover({ url: rssUrl }),
    onSuccess: (data) => {
      if (data.feeds.length === 0) {
        setCandidates(null);
        toast('No feeds found on this page', 'info');
        return;
      }
      if (data.feeds.length === 1) {
        setRssUrl(data.feeds[0].url);
        setCandidates(null);
        toast('Found 1 feed — click Add to save', 'success');
        return;
      }
      setCandidates(data.feeds);
      toast(`Found ${data.feeds.length} feeds — pick one`, 'success');
    },
    onError: (err: unknown) => {
      const msg =
        err instanceof ApiError ? err.message : 'Feed discovery failed';
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

  function pickCandidate(feed: DiscoveredFeed) {
    setRssUrl(feed.url);
    setCandidates(null);
  }

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={submit} className="flex gap-2">
        <Input
          type="url"
          value={rssUrl}
          onChange={(e) => {
            setRssUrl(e.target.value);
            if (candidates) setCandidates(null);
          }}
          placeholder="https://example.com  or  https://example.com/feed.xml"
          required
        />
        <Button
          type="button"
          variant="secondary"
          onClick={() => discover.mutate()}
          isLoading={discover.isPending}
          disabled={!rssUrl.trim() || add.isPending}
        >
          Discover feeds
        </Button>
        <Button
          type="submit"
          isLoading={add.isPending}
          disabled={discover.isPending}
        >
          Add
        </Button>
      </form>

      {candidates && candidates.length > 0 ? (
        <Card>
          <CardContent className="flex flex-col gap-2">
            <span className="text-xs uppercase tracking-wide text-zinc-500">
              Choose a feed
            </span>
            <ul className="flex flex-col divide-y divide-zinc-800">
              {candidates.map((feed) => (
                <li
                  key={feed.url}
                  className="flex items-center gap-3 py-2"
                >
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-sm text-zinc-100">
                      {feed.title ?? feed.url}
                    </span>
                    {feed.title ? (
                      <span className="truncate text-xs text-zinc-500">
                        {feed.url}
                      </span>
                    ) : null}
                  </div>
                  <Badge tone={feed.type === 'atom' ? 'accent' : 'neutral'}>
                    {feed.type.toUpperCase()}
                  </Badge>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => pickCandidate(feed)}
                  >
                    Use
                  </Button>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

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
            No sources yet. Paste a site or feed URL above. If it's a regular
            site URL, click <span className="text-zinc-200">Discover feeds</span>
            {' '}to find its RSS link automatically.
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
