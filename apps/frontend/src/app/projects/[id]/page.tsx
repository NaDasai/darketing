'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError, projectsApi } from '@/lib/api';
import {
  Badge,
  Button,
  Skeleton,
  Tab,
  TabList,
  TabPanel,
  Tabs,
  useToast,
} from '@/components/ui';
import { PostsTab } from '@/components/dashboard/PostsTab';
import { SourcesTab } from '@/components/dashboard/SourcesTab';
import { ContentTab } from '@/components/dashboard/ContentTab';
import { SettingsTab } from '@/components/dashboard/SettingsTab';
import {
  RunPipelineTracker,
  type RunTerminalResult,
} from '@/components/dashboard/RunPipelineTracker';
import { formatRelative } from '@/lib/utils';

type TabKey = 'posts' | 'sources' | 'content' | 'settings';

export default function ProjectDashboardPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const projectId = params?.id ?? '';
  const [active, setActive] = useState<TabKey>('posts');
  const [runJobId, setRunJobId] = useState<string | null>(null);
  const runningToastIdRef = useRef<number | null>(null);
  const qc = useQueryClient();
  const { toast, dismiss } = useToast();

  const project = useQuery({
    queryKey: ['project', projectId],
    queryFn: ({ signal }) => projectsApi.get(projectId, signal),
    enabled: !!projectId,
  });

  const run = useMutation({
    mutationFn: () => projectsApi.run(projectId),
    onSuccess: (res) => {
      setRunJobId(res.jobId);
      runningToastIdRef.current = toast(
        'Pipeline run in progress…',
        'info',
        { sticky: true },
      );
    },
    onError: (err: unknown) => {
      const msg =
        err instanceof ApiError ? err.message : 'Failed to run pipeline';
      toast(msg, 'error');
    },
  });

  const handleRunTerminal = (result: RunTerminalResult) => {
    if (runningToastIdRef.current != null) {
      dismiss(runningToastIdRef.current);
      runningToastIdRef.current = null;
    }
    if (result.state === 'completed') {
      const p = result.progress;
      toast(
        `Pipeline run complete — ${p?.newItems ?? 0} new, ${p?.selected ?? 0} selected, ${p?.postsCreated ?? 0} posts`,
        'success',
      );
    } else {
      toast(
        `Pipeline run failed: ${result.failedReason ?? 'Unknown error'}`,
        'error',
      );
    }
    setRunJobId(null);
  };

  const remove = useMutation({
    mutationFn: () => projectsApi.remove(projectId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['projects'] });
      toast('Project deleted', 'info');
      router.push('/projects');
    },
    onError: (err: unknown) => {
      const msg = err instanceof ApiError ? err.message : 'Delete failed';
      toast(msg, 'error');
    },
  });

  if (project.isPending) {
    return (
      <main className="mx-auto w-full max-w-6xl px-6 py-10">
        <Skeleton className="mb-4 h-10 w-64" />
        <Skeleton className="mb-8 h-5 w-96" />
        <Skeleton className="h-72 w-full" />
      </main>
    );
  }

  if (project.isError || !project.data) {
    return (
      <main className="mx-auto w-full max-w-6xl px-6 py-10 text-center text-zinc-400">
        <p>Could not load this project.</p>
        <Link
          className="mt-3 inline-block text-accent-300 hover:underline"
          href="/projects"
        >
          ← Back to projects
        </Link>
      </main>
    );
  }

  const p = project.data;

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-10">
      <nav className="mb-4 text-sm">
        <Link
          href="/projects"
          className="text-zinc-400 hover:text-zinc-100"
        >
          ← Projects
        </Link>
      </nav>

      <header className="mb-6 flex flex-col gap-3 border-b border-zinc-800 pb-5 md:flex-row md:items-end md:justify-between">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-zinc-100">{p.name}</h1>
            {p.isActive ? (
              <Badge tone="success">Active</Badge>
            ) : (
              <Badge>Paused</Badge>
            )}
          </div>
          {p.description ? (
            <p className="max-w-2xl text-sm text-zinc-400">{p.description}</p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <Badge tone="accent">{p.tone}</Badge>
            <Badge>{p.domain}</Badge>
            <Badge>Top {p.topNPerRun}/run</Badge>
            <Badge>{p.sourcesCount ?? 0} sources</Badge>
            <Badge>{p.contentCount ?? 0} items</Badge>
            <Badge>
              Last run{' '}
              {p.lastRunAt ? formatRelative(p.lastRunAt) : 'never'}
            </Badge>
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button
            variant="secondary"
            onClick={() => {
              if (
                window.confirm(
                  `Delete "${p.name}"? This also removes its sources, content, and posts.`,
                )
              ) {
                remove.mutate();
              }
            }}
            isLoading={remove.isPending}
          >
            Delete
          </Button>
          <Button
            onClick={() => run.mutate()}
            isLoading={run.isPending || !!runJobId}
            disabled={!p.isActive || !!runJobId}
          >
            {runJobId ? 'Running…' : 'Run pipeline now'}
          </Button>
        </div>
      </header>

      <Tabs value={active} onValueChange={(v) => setActive(v as TabKey)}>
        <TabList>
          <Tab value="posts">Posts</Tab>
          <Tab value="sources">Sources</Tab>
          <Tab value="content">Content</Tab>
          <Tab value="settings">Settings</Tab>
        </TabList>

        <TabPanel value="posts">
          <PostsTab projectId={projectId} />
        </TabPanel>
        <TabPanel value="sources">
          <SourcesTab projectId={projectId} />
        </TabPanel>
        <TabPanel value="content">
          <ContentTab projectId={projectId} />
        </TabPanel>
        <TabPanel value="settings">
          <SettingsTab project={p} />
        </TabPanel>
      </Tabs>

      <RunPipelineTracker
        jobId={runJobId}
        projectId={projectId}
        onTerminal={handleRunTerminal}
      />
    </main>
  );
}
