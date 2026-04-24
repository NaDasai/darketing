'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { POST_STATUS_VALUES, type PostStatus } from '@darketing/shared';
import { postsApi } from '@/lib/api';
import { useUiStore, type PlatformFilter } from '@/store/ui';
import {
  Badge,
  Card,
  CardContent,
  Skeleton,
  Tab,
  TabList,
  Tabs,
} from '@/components/ui';
import { formatRelative } from '@/lib/utils';

export function PostsTab({ projectId }: { projectId: string }) {
  const status = useUiStore((s) => s.statusFilter);
  const platform = useUiStore((s) => s.platformFilter);
  const setStatus = useUiStore((s) => s.setStatusFilter);
  const setPlatform = useUiStore((s) => s.setPlatformFilter);

  const posts = useQuery({
    queryKey: ['posts', { projectId, status, platform }],
    queryFn: ({ signal }) =>
      postsApi.list(
        {
          projectId,
          status,
          platform: platform === 'ALL' ? undefined : platform,
          limit: 50,
        },
        signal,
      ),
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs
          value={status}
          onValueChange={(v) => setStatus(v as PostStatus)}
        >
          <TabList>
            {POST_STATUS_VALUES.map((s) => (
              <Tab key={s} value={s}>
                {s.charAt(0) + s.slice(1).toLowerCase()}
              </Tab>
            ))}
          </TabList>
        </Tabs>
        <Tabs
          value={platform}
          onValueChange={(v) => setPlatform(v as PlatformFilter)}
        >
          <TabList>
            <Tab value="ALL">All</Tab>
            <Tab value="TWITTER">X</Tab>
            <Tab value="LINKEDIN">LinkedIn</Tab>
          </TabList>
        </Tabs>
      </div>

      {posts.isPending ? (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-36 w-full" />
          ))}
        </div>
      ) : null}

      {!posts.isPending &&
      posts.data &&
      posts.data.items.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-10 text-center text-sm text-zinc-400">
            No posts yet for this filter. Try another status, or run the
            pipeline to generate suggestions.
          </CardContent>
        </Card>
      ) : null}

      {posts.data && posts.data.items.length > 0 ? (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {posts.data.items.map((post) => (
            <Link
              key={post.id}
              href={`/posts/${post.id}`}
              className="group"
            >
              <Card className="h-full transition-colors group-hover:border-accent-700">
                <CardContent className="flex flex-col gap-3">
                  <div className="flex items-center gap-2">
                    <Badge
                      tone={
                        post.platform === 'TWITTER' ? 'accent' : 'neutral'
                      }
                    >
                      {post.platform === 'TWITTER' ? 'X' : 'LinkedIn'}
                    </Badge>
                    <Badge tone={statusTone(post.status)}>
                      {post.status}
                    </Badge>
                    <span className="ml-auto text-xs text-zinc-500">
                      {formatRelative(post.createdAt)}
                    </span>
                  </div>
                  <p className="line-clamp-4 whitespace-pre-wrap text-sm text-zinc-200">
                    {post.editedContent ?? post.content}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function statusTone(
  status: PostStatus,
): 'success' | 'warning' | 'danger' | 'neutral' {
  if (status === 'APPROVED') return 'success';
  if (status === 'REJECTED') return 'danger';
  if (status === 'SUGGESTED') return 'warning';
  return 'neutral';
}
