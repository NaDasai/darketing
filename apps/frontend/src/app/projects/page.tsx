'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import type { ProjectDto } from '@darketing/shared';
import { projectsApi } from '@/lib/api';
import { NewProjectModal } from '@/components/projects/NewProjectModal';
import {
  Badge,
  Button,
  Card,
  CardContent,
  Skeleton,
} from '@/components/ui';
import { cn, formatRelative } from '@/lib/utils';

export default function ProjectsPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const projects = useQuery({
    queryKey: ['projects'],
    queryFn: ({ signal }) => projectsApi.list(signal),
  });

  const activeCount =
    projects.data?.filter((p) => p.isActive).length ?? 0;
  const sourcesCount =
    projects.data?.reduce((sum, p) => sum + (p.sourcesCount ?? 0), 0) ?? 0;
  const projectCount = projects.data?.length ?? 0;

  return (
    <>
      <HeroBackdrop />
      <main className="relative mx-auto w-full max-w-6xl px-6 py-12">
        <Hero onCreate={() => setModalOpen(true)} />

        {projects.data && projects.data.length > 0 ? (
          <StatsRow
            projects={projectCount}
            active={activeCount}
            sources={sourcesCount}
          />
        ) : null}

        {projects.isPending ? <GridSkeleton /> : null}

        {projects.isError ? (
          <ErrorState onRetry={() => projects.refetch()} />
        ) : null}

        {projects.data && projects.data.length === 0 ? (
          <EmptyState onCreate={() => setModalOpen(true)} />
        ) : null}

        {projects.data && projects.data.length > 0 ? (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {projects.data.map((p) => (
              <ProjectCard key={p.id} project={p} />
            ))}
          </div>
        ) : null}

        <NewProjectModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
        />
      </main>
    </>
  );
}

function HeroBackdrop() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 top-0 -z-0 h-[420px] overflow-hidden"
    >
      <div className="absolute left-1/2 top-[-120px] h-[420px] w-[820px] -translate-x-1/2 rounded-full bg-accent-600/15 blur-3xl" />
      <div className="absolute inset-0 bg-gradient-to-b from-zinc-950/0 via-zinc-950/40 to-zinc-950" />
    </div>
  );
}

function Hero({ onCreate }: { onCreate: () => void }) {
  return (
    <section className="relative mb-10 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
      <div className="max-w-2xl">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-accent-400">
          Dashboard
        </p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-zinc-50">
          Your projects
        </h1>
        <p className="mt-3 max-w-lg text-sm leading-relaxed text-zinc-400">
          Aggregate RSS feeds, score them for relevance, and turn the best
          items into approved-ready X and LinkedIn posts.
        </p>
      </div>
      <Button size="lg" onClick={onCreate} className="self-start md:self-end">
        + New project
      </Button>
    </section>
  );
}

function StatsRow({
  projects,
  active,
  sources,
}: {
  projects: number;
  active: number;
  sources: number;
}) {
  return (
    <div className="mb-10 grid grid-cols-3 divide-x divide-zinc-800 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/50 backdrop-blur">
      <Stat label="Projects" value={projects} />
      <Stat label="Active" value={active} accent />
      <Stat label="Sources" value={sources} />
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: number | string;
  accent?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1 px-6 py-5">
      <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-zinc-500">
        {label}
      </span>
      <span
        className={cn(
          'text-2xl font-semibold tracking-tight tabular-nums',
          accent ? 'text-accent-300' : 'text-zinc-100',
        )}
      >
        {value}
      </span>
    </div>
  );
}

function ProjectCard({ project: p }: { project: ProjectDto }) {
  const firstChar = p.name.charAt(0).toUpperCase();
  return (
    <Link
      href={`/projects/${p.id}`}
      className="group relative block overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/40 transition-all duration-200 hover:-translate-y-0.5 hover:border-accent-700/70 hover:bg-zinc-900/70 hover:shadow-xl hover:shadow-accent-900/20"
    >
      <div
        className={cn(
          'h-1 w-full bg-gradient-to-r',
          p.isActive
            ? 'from-accent-500 via-accent-400 to-accent-500'
            : 'from-zinc-700 via-zinc-600 to-zinc-700',
        )}
      />
      <div className="flex h-full flex-col gap-5 p-5">
        <div className="flex items-start gap-3">
          <div
            className={cn(
              'flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-base font-semibold',
              p.isActive
                ? 'bg-gradient-to-br from-accent-700/70 to-accent-900/70 text-accent-100 ring-1 ring-accent-600/40'
                : 'bg-zinc-800 text-zinc-400 ring-1 ring-zinc-700',
            )}
          >
            {firstChar}
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <div className="flex items-center gap-2">
              <h3 className="truncate text-base font-semibold text-zinc-100">
                {p.name}
              </h3>
              {p.isActive ? null : <Badge>Paused</Badge>}
            </div>
            <p className="line-clamp-2 text-sm text-zinc-400">
              {p.description?.trim() || (
                <span className="text-zinc-600">No description</span>
              )}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <Badge tone="accent">{p.tone.toLowerCase()}</Badge>
          <Badge>{p.domain}</Badge>
        </div>

        <div className="mt-auto grid grid-cols-3 gap-3 border-t border-zinc-800 pt-4">
          <MiniStat label="Sources" value={p.sourcesCount ?? 0} />
          <MiniStat label="Top N" value={p.topNPerRun} />
          <MiniStat
            label="Last run"
            value={p.lastRunAt ? formatRelative(p.lastRunAt) : '—'}
          />
        </div>
      </div>
    </Link>
  );
}

function MiniStat({
  label,
  value,
}: {
  label: string;
  value: number | string;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">
        {label}
      </span>
      <span className="truncate text-sm text-zinc-200 tabular-nums">
        {value}
      </span>
    </div>
  );
}

function GridSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="h-64 w-full" />
      ))}
    </div>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center gap-5 py-24 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-accent-700/60 to-accent-900/60 ring-1 ring-accent-600/40">
          <svg
            width="26"
            height="26"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="text-accent-200"
            aria-hidden="true"
          >
            <path d="M12 5v14M5 12h14" strokeLinecap="round" />
          </svg>
        </div>
        <div className="max-w-md">
          <h2 className="text-lg font-semibold text-zinc-100">
            Create your first project
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-zinc-400">
            A project bundles RSS sources, a target audience, and a tone
            into one curation pipeline. Takes under a minute to set up.
          </p>
        </div>
        <Button size="lg" onClick={onCreate}>
          + New project
        </Button>
      </CardContent>
    </Card>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  const apiUrl =
    process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
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
