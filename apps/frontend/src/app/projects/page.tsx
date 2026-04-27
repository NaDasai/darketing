'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowRight,
  Calendar,
  CheckCircle2,
  CircleDot,
  Filter,
  FolderKanban,
  Plus,
  Rss,
  Send,
  Sparkles,
  Target,
} from 'lucide-react';
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

  const list = projects.data ?? [];
  const activeCount = list.filter((p) => p.isActive).length;
  const sourcesCount = list.reduce(
    (sum, p) => sum + (p.sourcesCount ?? 0),
    0,
  );
  const projectCount = list.length;
  const lastRunAt = list
    .map((p) => p.lastRunAt)
    .filter((d): d is string => !!d)
    .sort()
    .at(-1);

  return (
    <>
      <HeroBackdrop />
      <main className="relative mx-auto w-full max-w-6xl px-6 pb-16 pt-12">
        <Hero
          onCreate={() => setModalOpen(true)}
          activeCount={activeCount}
          totalCount={projectCount}
          lastRunAt={lastRunAt}
          loading={projects.isPending}
        />

        {list.length > 0 ? (
          <StatsRow
            projects={projectCount}
            active={activeCount}
            sources={sourcesCount}
            lastRunAt={lastRunAt}
          />
        ) : null}

        {projects.isPending ? <GridSkeleton /> : null}

        {projects.isError ? (
          <ErrorState onRetry={() => projects.refetch()} />
        ) : null}

        {projects.data && list.length === 0 ? (
          <EmptyState onCreate={() => setModalOpen(true)} />
        ) : null}

        {list.length > 0 ? (
          <section>
            <div className="mb-4 flex items-baseline justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-zinc-400">
                Projects
              </h2>
              <span className="text-xs text-zinc-500 tabular-nums">
                {list.length} total
              </span>
            </div>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
              {list.map((p) => (
                <ProjectCard key={p.id} project={p} />
              ))}
            </div>
          </section>
        ) : null}

        {list.length > 0 ? <HowItWorksFooter /> : null}

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
      className="pointer-events-none absolute inset-x-0 top-0 -z-0 h-[520px] overflow-hidden"
    >
      <div className="absolute left-1/2 top-[-160px] h-[460px] w-[920px] -translate-x-1/2 rounded-full bg-accent-600/15 blur-[110px]" />
      <div className="absolute right-[-120px] top-[60px] h-[300px] w-[420px] rounded-full bg-fuchsia-700/10 blur-[110px]" />
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
          maskImage:
            'radial-gradient(ellipse at center top, black 30%, transparent 70%)',
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-zinc-950/0 via-zinc-950/40 to-zinc-950" />
    </div>
  );
}

function Hero({
  onCreate,
  activeCount,
  totalCount,
  lastRunAt,
  loading,
}: {
  onCreate: () => void;
  activeCount: number;
  totalCount: number;
  lastRunAt: string | undefined;
  loading: boolean;
}) {
  return (
    <section className="relative mb-12 flex flex-col gap-7 md:flex-row md:items-end md:justify-between">
      <div className="max-w-2xl">
        <LiveChip
          loading={loading}
          activeCount={activeCount}
          totalCount={totalCount}
          lastRunAt={lastRunAt}
        />
        <h1 className="mt-5 text-4xl font-semibold tracking-tight text-zinc-50 md:text-[42px] md:leading-[1.1]">
          Read 200 articles a day.
          <br />
          <span className="bg-gradient-to-r from-accent-300 via-accent-400 to-fuchsia-400 bg-clip-text text-transparent">
            Ship 5 ready-to-post drafts.
          </span>
        </h1>
        <p className="mt-4 max-w-lg text-[15px] leading-relaxed text-zinc-400">
          Darketing aggregates RSS sources for each project, scores items for
          relevance, and rewrites the top picks as original X and LinkedIn
          posts — for you to approve, edit, or reject in seconds.
        </p>
      </div>
      <div className="flex shrink-0 flex-col items-start gap-2 md:items-end">
        <Button size="lg" onClick={onCreate} className="gap-2">
          <Plus className="h-4 w-4" />
          New project
        </Button>
        <span className="text-xs text-zinc-500">Takes about 60 seconds</span>
      </div>
    </section>
  );
}

function LiveChip({
  loading,
  activeCount,
  totalCount,
  lastRunAt,
}: {
  loading: boolean;
  activeCount: number;
  totalCount: number;
  lastRunAt: string | undefined;
}) {
  if (loading) {
    return (
      <span className="inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900/60 px-3 py-1.5 text-xs text-zinc-400">
        <span className="h-1.5 w-1.5 rounded-full bg-zinc-600" />
        Loading…
      </span>
    );
  }

  if (totalCount === 0) {
    return (
      <span className="inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900/60 px-3 py-1.5 text-xs text-zinc-400">
        <Sparkles className="h-3.5 w-3.5 text-accent-300" />
        Welcome to Darketing
      </span>
    );
  }

  const isHealthy = activeCount > 0;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs',
        isHealthy
          ? 'border-emerald-700/50 bg-emerald-950/40 text-emerald-200'
          : 'border-zinc-800 bg-zinc-900/60 text-zinc-300',
      )}
    >
      <span className="relative flex h-2 w-2">
        {isHealthy ? (
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
        ) : null}
        <span
          className={cn(
            'relative inline-flex h-2 w-2 rounded-full',
            isHealthy ? 'bg-emerald-400' : 'bg-zinc-500',
          )}
        />
      </span>
      <span>
        {activeCount} of {totalCount} project{totalCount === 1 ? '' : 's'} running
      </span>
      {lastRunAt ? (
        <>
          <span className="text-zinc-600">·</span>
          <span className="text-zinc-400">
            last run {formatRelative(lastRunAt)}
          </span>
        </>
      ) : null}
    </span>
  );
}

function StatsRow({
  projects,
  active,
  sources,
  lastRunAt,
}: {
  projects: number;
  active: number;
  sources: number;
  lastRunAt: string | undefined;
}) {
  return (
    <div className="mb-12 grid grid-cols-2 gap-3 md:grid-cols-4">
      <Stat
        icon={<FolderKanban className="h-4 w-4" />}
        label="Projects"
        value={projects}
      />
      <Stat
        icon={<CircleDot className="h-4 w-4" />}
        label="Active"
        value={active}
        accent
      />
      <Stat
        icon={<Rss className="h-4 w-4" />}
        label="Sources"
        value={sources}
      />
      <Stat
        icon={<Calendar className="h-4 w-4" />}
        label="Last run"
        value={lastRunAt ? formatRelative(lastRunAt) : '—'}
        compact
      />
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
  accent,
  compact,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  accent?: boolean;
  compact?: boolean;
}) {
  return (
    <div className="group flex flex-col gap-2 rounded-xl border border-zinc-800 bg-zinc-900/50 px-5 py-4 backdrop-blur transition-colors hover:border-zinc-700">
      <div className="flex items-center gap-2 text-zinc-500">
        <span className={accent ? 'text-accent-400' : 'text-zinc-500'}>
          {icon}
        </span>
        <span className="text-[10px] font-semibold uppercase tracking-[0.16em]">
          {label}
        </span>
      </div>
      <span
        className={cn(
          'font-semibold tracking-tight tabular-nums',
          compact ? 'text-base text-zinc-200' : 'text-3xl',
          accent && !compact ? 'text-accent-300' : '',
          !accent && !compact ? 'text-zinc-100' : '',
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
      className="group relative flex h-full flex-col overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/40 transition-all duration-200 hover:-translate-y-0.5 hover:border-accent-700/70 hover:bg-zinc-900/70 hover:shadow-xl hover:shadow-accent-900/20"
    >
      <div
        className={cn(
          'h-1 w-full bg-gradient-to-r',
          p.isActive
            ? 'from-accent-500 via-accent-400 to-fuchsia-500'
            : 'from-zinc-700 via-zinc-600 to-zinc-700',
        )}
      />
      <div className="flex h-full flex-col gap-5 p-5">
        <div className="flex items-start gap-3">
          <div
            className={cn(
              'flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-base font-semibold ring-1',
              p.isActive
                ? 'bg-gradient-to-br from-accent-700/70 to-accent-900/70 text-accent-100 ring-accent-600/40'
                : 'bg-zinc-800 text-zinc-400 ring-zinc-700',
            )}
          >
            {firstChar}
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <div className="flex items-center gap-2">
              <h3 className="truncate text-base font-semibold text-zinc-100 group-hover:text-white">
                {p.name}
              </h3>
              <StatusDot active={p.isActive} />
            </div>
            <p className="line-clamp-2 text-sm text-zinc-400">
              {p.description?.trim() || (
                <span className="text-zinc-600">No description</span>
              )}
            </p>
          </div>
          <ArrowRight className="h-4 w-4 shrink-0 text-zinc-600 opacity-0 transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-accent-300 group-hover:opacity-100" />
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <Badge tone="accent">{p.tone.toLowerCase()}</Badge>
          <Badge>{p.domain}</Badge>
        </div>

        <div className="mt-auto grid grid-cols-3 gap-3 border-t border-zinc-800 pt-4">
          <MiniStat
            icon={<Rss className="h-3 w-3" />}
            label="Sources"
            value={p.sourcesCount ?? 0}
          />
          <MiniStat
            icon={<Target className="h-3 w-3" />}
            label="Top picks"
            value={p.topNPerRun}
          />
          <MiniStat
            icon={<Calendar className="h-3 w-3" />}
            label="Last run"
            value={p.lastRunAt ? formatRelative(p.lastRunAt) : '—'}
          />
        </div>
      </div>
    </Link>
  );
}

function StatusDot({ active }: { active: boolean }) {
  if (active) {
    return (
      <span
        title="Active"
        className="inline-flex h-2 w-2 shrink-0 rounded-full bg-emerald-400 ring-2 ring-emerald-400/20"
      />
    );
  }
  return (
    <span
      title="Paused"
      className="inline-flex h-2 w-2 shrink-0 rounded-full bg-zinc-600 ring-2 ring-zinc-700"
    />
  );
}

function MiniStat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <span className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-zinc-500">
        <span className="text-zinc-600">{icon}</span>
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
        <Skeleton key={i} className="h-64 w-full rounded-xl" />
      ))}
    </div>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center gap-7 py-20 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-accent-700/60 to-fuchsia-900/40 ring-1 ring-accent-600/40">
          <Sparkles className="h-7 w-7 text-accent-200" />
        </div>
        <div className="max-w-md">
          <h2 className="text-xl font-semibold text-zinc-100">
            Curate signal from noise
          </h2>
          <p className="mt-2.5 text-sm leading-relaxed text-zinc-400">
            A project bundles RSS sources, a target audience, and a tone into
            one curation pipeline. Run it on a schedule, get a short list of
            ready-to-publish posts every morning.
          </p>
        </div>
        <Button size="lg" onClick={onCreate} className="gap-2">
          <Plus className="h-4 w-4" />
          Create your first project
        </Button>
        <div className="mt-2 grid w-full max-w-2xl grid-cols-3 gap-4 border-t border-zinc-800 pt-7">
          <HowItWorksStep
            num={1}
            icon={<Rss className="h-4 w-4" />}
            title="Aggregate"
            text="Pull headlines from any RSS feed."
          />
          <HowItWorksStep
            num={2}
            icon={<Filter className="h-4 w-4" />}
            title="Curate"
            text="Score by relevance to your audience."
          />
          <HowItWorksStep
            num={3}
            icon={<Send className="h-4 w-4" />}
            title="Approve"
            text="Edit and ship in one click."
          />
        </div>
      </CardContent>
    </Card>
  );
}

function HowItWorksStep({
  num,
  icon,
  title,
  text,
}: {
  num: number;
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <div className="relative flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900 text-accent-300">
        {icon}
        <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-accent-500 text-[9px] font-bold text-zinc-950">
          {num}
        </span>
      </div>
      <span className="text-xs font-semibold text-zinc-200">{title}</span>
      <span className="text-[11px] text-zinc-500">{text}</span>
    </div>
  );
}

function HowItWorksFooter() {
  return (
    <section className="mt-16 grid grid-cols-1 gap-4 rounded-2xl border border-zinc-800/70 bg-zinc-900/30 p-6 md:grid-cols-3 md:p-8">
      <FooterStep
        icon={<Rss className="h-5 w-5" />}
        title="Aggregate"
        text="Connect RSS feeds across every domain you publish in. The pipeline ingests on a schedule you control."
      />
      <FooterStep
        icon={<Filter className="h-5 w-5" />}
        title="Curate"
        text="Each item is summarized and scored for relevance, recency, and length. Top picks are flagged automatically."
      />
      <FooterStep
        icon={<CheckCircle2 className="h-5 w-5" />}
        title="Approve"
        text="Drafts are ready in the Posts tab — edit, approve, or reject each one before publishing on X or LinkedIn."
      />
    </section>
  );
}

function FooterStep({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-900 text-accent-300 ring-1 ring-zinc-800">
        {icon}
      </div>
      <h3 className="text-sm font-semibold text-zinc-100">{title}</h3>
      <p className="text-[13px] leading-relaxed text-zinc-400">{text}</p>
    </div>
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
