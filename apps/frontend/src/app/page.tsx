import Link from 'next/link';
import { Button } from '@/components/ui/Button';

export default function HomePage() {
  return (
    <main className="relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-[-12rem] -z-10 mx-auto h-[44rem] w-[80rem] max-w-[120%] bg-[radial-gradient(ellipse_at_center,_rgba(99,102,241,0.22),_rgba(36,0,255,0.08)_40%,_transparent_70%)] blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(to_bottom,transparent,rgba(9,9,11,0.6)),radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.04)_1px,transparent_0)] [background-size:auto,32px_32px]"
      />

      {/* Hero */}
      <section className="mx-auto flex w-full max-w-5xl flex-col items-center px-6 pb-20 pt-24 text-center sm:pt-32">
        <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900/60 px-3 py-1 text-xs font-medium text-zinc-300">
          <span className="h-1.5 w-1.5 rounded-full bg-accent-400" />
          Content curation, on autopilot
        </span>

        <h1 className="text-balance text-4xl font-semibold tracking-tight text-zinc-50 sm:text-6xl">
          See what matters.{' '}
          <span className="bg-gradient-to-r from-accent-400 to-indigo-300 bg-clip-text text-transparent">
            Post what works.
          </span>
        </h1>

        <p className="mt-6 max-w-xl text-pretty text-base text-zinc-400 sm:text-lg">
          Eagle Eyes scans your feeds. Picks the best stories. Drafts your next
          post. You approve. You publish.
        </p>

        <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row">
          <Link href="/projects">
            <Button size="lg" className="px-6">
              Launch app
              <svg
                className="h-4 w-4"
                viewBox="0 0 20 20"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M4 10h12m0 0-4-4m4 4-4 4"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </Button>
          </Link>
          <Link
            href="#how-it-works"
            className="text-sm text-zinc-400 transition-colors hover:text-zinc-200"
          >
            See how it works →
          </Link>
        </div>

        <div className="mt-12 flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-xs text-zinc-500">
          <Stat label="Sources / project" value="∞" />
          <Stat label="Platforms" value="X · LinkedIn" />
          <Stat label="Cost" value="Free model default" />
        </div>
      </section>

      {/* How it works */}
      <section
        id="how-it-works"
        className="mx-auto w-full max-w-5xl px-6 pb-20"
      >
        <div className="mb-10 text-center">
          <h2 className="text-2xl font-semibold tracking-tight text-zinc-100 sm:text-3xl">
            Four steps. One workflow.
          </h2>
          <p className="mt-2 text-sm text-zinc-400">
            From RSS to ready-to-post. No spreadsheets. No tabs.
          </p>
        </div>

        <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((s, i) => (
            <li
              key={s.title}
              className="group relative rounded-xl border border-zinc-800 bg-zinc-900/40 p-5 transition-colors hover:border-zinc-700"
            >
              <div className="mb-3 flex items-center justify-between">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-500/10 text-accent-400">
                  {s.icon}
                </span>
                <span className="font-mono text-xs text-zinc-600">
                  0{i + 1}
                </span>
              </div>
              <h3 className="text-sm font-semibold text-zinc-100">{s.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-zinc-400">
                {s.body}
              </p>
            </li>
          ))}
        </ol>
      </section>

      {/* Feature highlights */}
      <section className="mx-auto w-full max-w-5xl px-6 pb-24">
        <div className="grid gap-4 md:grid-cols-3">
          {highlights.map((h) => (
            <div
              key={h.title}
              className="rounded-xl border border-zinc-800 bg-gradient-to-b from-zinc-900/60 to-zinc-900/20 p-5"
            >
              <h3 className="text-sm font-semibold text-zinc-100">{h.title}</h3>
              <p className="mt-1.5 text-sm text-zinc-400">{h.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="mx-auto w-full max-w-3xl px-6 pb-28">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-8 text-center sm:p-12">
          <h2 className="text-2xl font-semibold tracking-tight text-zinc-100 sm:text-3xl">
            Ready to ship better posts?
          </h2>
          <p className="mt-2 text-sm text-zinc-400">
            Spin up a project. Add a feed. Let Eagle Eyes do the rest.
          </p>
          <div className="mt-6 flex justify-center">
            <Link href="/projects">
              <Button size="lg" className="px-6">
                Launch app
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="font-medium text-zinc-300">{value}</span>
      <span className="text-zinc-600">·</span>
      <span>{label}</span>
    </div>
  );
}

const steps = [
  {
    title: 'Aggregate',
    body: 'Drop in any RSS feed. We pull every new item.',
    icon: (
      <svg
        className="h-5 w-5"
        viewBox="0 0 20 20"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M4 11a5 5 0 0 1 5 5M4 5a11 11 0 0 1 11 11M5 16a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    title: 'Score',
    body: 'Recency, keyword fit, depth. One number per item.',
    icon: (
      <svg
        className="h-5 w-5"
        viewBox="0 0 20 20"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M3 17V9m6 8V4m6 13v-6"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    title: 'Generate',
    body: 'Top picks become X and LinkedIn drafts.',
    icon: (
      <svg
        className="h-5 w-5"
        viewBox="0 0 20 20"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M4 4h12v5l-3-3-4 4-3-3-2 2V4Zm0 12h12"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    title: 'Approve',
    body: 'Edit. Approve. Copy. You stay in control.',
    icon: (
      <svg
        className="h-5 w-5"
        viewBox="0 0 20 20"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="m5 10 3 3 7-7"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
];

const highlights = [
  {
    title: 'Multi-domain',
    body: 'Run one project per niche. Tune tone and audience.',
  },
  {
    title: 'Platform-aware',
    body: 'X stays punchy. LinkedIn goes long. No copy-paste hacks.',
  },
  {
    title: 'You own the publish',
    body: 'Nothing posts itself. Copy. Paste. Ship on your terms.',
  },
];
