'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { projectsApi } from '@/lib/api';
import { NewProjectModal } from '@/components/projects/NewProjectModal';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Skeleton,
} from '@/components/ui';
import { formatRelative } from '@/lib/utils';

export default function ProjectsPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const projects = useQuery({
    queryKey: ['projects'],
    queryFn: ({ signal }) => projectsApi.list(signal),
  });

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-10">
      <header className="mb-8 flex items-end justify-between gap-6">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-100">Projects</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Multi-domain content curation pipelines.
          </p>
        </div>
        <Button onClick={() => setModalOpen(true)}>+ New project</Button>
      </header>

      {projects.isPending ? <GridSkeleton /> : null}

      {projects.isError ? (
        <ErrorState onRetry={() => projects.refetch()} />
      ) : null}

      {projects.data && projects.data.length === 0 ? (
        <EmptyState onCreate={() => setModalOpen(true)} />
      ) : null}

      {projects.data && projects.data.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projects.data.map((p) => (
            <Link key={p.id} href={`/projects/${p.id}`} className="group">
              <Card className="h-full transition-colors group-hover:border-accent-700">
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="truncate">{p.name}</CardTitle>
                    {p.isActive ? (
                      <Badge tone="success">Active</Badge>
                    ) : (
                      <Badge tone="neutral">Paused</Badge>
                    )}
                  </div>
                  {p.description ? (
                    <CardDescription className="line-clamp-2">
                      {p.description}
                    </CardDescription>
                  ) : null}
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                  <div className="flex flex-wrap gap-2">
                    <Badge tone="accent">{p.tone}</Badge>
                    <Badge>{p.domain}</Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs text-zinc-400">
                    <Stat label="Sources" value={p.sourcesCount ?? 0} />
                    <Stat label="Top N" value={p.topNPerRun} />
                    <Stat
                      label="Last run"
                      value={p.lastRunAt ? formatRelative(p.lastRunAt) : '—'}
                    />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : null}

      <NewProjectModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </main>
  );
}

function Stat({
  label,
  value,
}: {
  label: string;
  value: number | string;
}) {
  return (
    <div className="flex flex-col">
      <span className="text-[10px] uppercase tracking-wide text-zinc-500">
        {label}
      </span>
      <span className="text-zinc-200">{value}</span>
    </div>
  );
}

function GridSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="h-48 w-full" />
      ))}
    </div>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
        <h2 className="text-lg font-semibold text-zinc-100">
          No projects yet
        </h2>
        <p className="max-w-md text-sm text-zinc-400">
          Create your first project to start aggregating RSS feeds and
          generating post suggestions.
        </p>
        <Button onClick={onCreate}>+ New project</Button>
      </CardContent>
    </Card>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  const apiUrl =
    process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
        <h2 className="text-base font-semibold text-zinc-100">
          Couldn&apos;t load projects
        </h2>
        <p className="text-sm text-zinc-400">
          Check the backend is running on {apiUrl}.
        </p>
        <Button variant="secondary" onClick={onRetry}>
          Try again
        </Button>
      </CardContent>
    </Card>
  );
}
