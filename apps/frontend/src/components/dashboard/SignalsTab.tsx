'use client';

import { useQuery } from '@tanstack/react-query';
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  HelpCircle,
  Info,
  TrendingUp,
} from 'lucide-react';
import type { MarketReportDto } from '@darketing/shared';
import { marketSignalsApi } from '@/lib/api';
import { Badge, Card, CardContent, Skeleton } from '@/components/ui';
import { cn, formatDate, formatRelative } from '@/lib/utils';

type Signal = MarketReportDto['signals'][number];

const ASSET_CLASS_LABEL: Record<Signal['assetClass'], string> = {
  crypto: 'Crypto',
  stock: 'Stock',
  commodity: 'Commodity',
  currency: 'Currency',
  index: 'Index',
  other: 'Other',
};

const CONFIDENCE_LABEL: Record<Signal['confidence'], string> = {
  low: 'Low confidence',
  medium: 'Medium confidence',
  high: 'High confidence',
};

export function SignalsTab({ projectId }: { projectId: string }) {
  const reports = useQuery({
    queryKey: ['market-signals', projectId],
    queryFn: ({ signal }) =>
      marketSignalsApi.list(projectId, { limit: 20 }, signal),
  });

  if (reports.isPending) {
    return (
      <div className="flex flex-col gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-40 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (!reports.data || reports.data.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center gap-4 py-14 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-900 ring-1 ring-zinc-800">
            <TrendingUp className="h-5 w-5 text-accent-300" />
          </div>
          <div className="max-w-md">
            <h3 className="text-base font-semibold text-zinc-100">
              No market signals yet
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-zinc-400">
              After the next pipeline run, the AI will read the new articles
              and surface any directional signals it finds on specific
              assets — crypto, stocks, commodities, currencies, or indices.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <Disclaimer />
      {reports.data.map((report) => (
        <ReportCard key={report.id} report={report} />
      ))}
    </div>
  );
}

function Disclaimer() {
  return (
    <div className="flex items-start gap-2.5 rounded-lg border border-amber-900/40 bg-amber-950/20 px-3.5 py-2.5 text-xs text-amber-200/90">
      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      <span>
        AI-generated forecasts based on the articles only. Not financial
        advice. Always verify with primary sources before acting.
      </span>
    </div>
  );
}

function ReportCard({ report }: { report: MarketReportDto }) {
  const itemById = new Map(
    report.items.map((it) => [it.contentItemId, it]),
  );

  return (
    <Card>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-zinc-800 pb-3">
          <div className="flex items-baseline gap-2">
            <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-zinc-300">
              Market signals
            </h3>
            <Badge tone="accent">
              {report.signals.length} signal
              {report.signals.length === 1 ? '' : 's'}
            </Badge>
          </div>
          <span
            className="text-xs text-zinc-500"
            title={formatDate(report.generatedAt)}
          >
            Generated {formatRelative(report.generatedAt)}
          </span>
        </div>

        <ul className="flex flex-col gap-3">
          {report.signals.map((signal, i) => (
            <SignalRow
              key={i}
              signal={signal}
              itemById={itemById}
            />
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function SignalRow({
  signal,
  itemById,
}: {
  signal: Signal;
  itemById: Map<string, MarketReportDto['items'][number]>;
}) {
  const supporting = signal.supportingContentItemIds
    .map((id) => itemById.get(id))
    .filter((it): it is MarketReportDto['items'][number] => !!it);

  return (
    <li className="flex flex-col gap-2 rounded-lg border border-zinc-800 bg-zinc-950/40 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <DirectionBadge direction={signal.direction} />
        <span className="text-sm font-semibold text-zinc-100">
          {signal.asset}
        </span>
        <span className="text-xs text-zinc-500">·</span>
        <span className="text-xs text-zinc-400">
          {ASSET_CLASS_LABEL[signal.assetClass]}
        </span>
        {signal.horizon ? (
          <>
            <span className="text-xs text-zinc-500">·</span>
            <span className="text-xs text-zinc-400">{signal.horizon}</span>
          </>
        ) : null}
        <ConfidencePill confidence={signal.confidence} />
      </div>
      <p className="text-sm leading-relaxed text-zinc-300">
        {signal.rationale}
      </p>
      {supporting.length > 0 ? (
        <details className="mt-1 text-xs">
          <summary className="cursor-pointer select-none text-zinc-500 hover:text-zinc-300">
            Supporting articles ({supporting.length})
          </summary>
          <ul className="mt-1.5 flex flex-col gap-1 pl-3">
            {supporting.map((it) => (
              <li
                key={it.contentItemId}
                className="flex items-baseline gap-2"
              >
                <span className="text-zinc-700" aria-hidden>
                  ◦
                </span>
                <a
                  href={it.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="min-w-0 flex-1 truncate text-zinc-400 hover:text-accent-300"
                  title={it.title}
                >
                  {it.title}
                </a>
                <span className="shrink-0 text-zinc-600">
                  {hostnameOf(it.sourceUrl)}
                </span>
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </li>
  );
}

function DirectionBadge({ direction }: { direction: Signal['direction'] }) {
  if (direction === 'up') {
    return (
      <span className="inline-flex items-center gap-1 rounded-md border border-emerald-700/60 bg-emerald-950/40 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-emerald-300">
        <ArrowUpRight className="h-3.5 w-3.5" />
        Up
      </span>
    );
  }
  if (direction === 'down') {
    return (
      <span className="inline-flex items-center gap-1 rounded-md border border-red-700/60 bg-red-950/40 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-red-300">
        <ArrowDownRight className="h-3.5 w-3.5" />
        Down
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-md border border-zinc-700 bg-zinc-900 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-zinc-300">
      <HelpCircle className="h-3.5 w-3.5" />
      Mixed
    </span>
  );
}

function ConfidencePill({ confidence }: { confidence: Signal['confidence'] }) {
  return (
    <span
      className={cn(
        'ml-auto inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider',
        confidence === 'high' &&
          'border-accent-700/60 bg-accent-950/40 text-accent-200',
        confidence === 'medium' &&
          'border-amber-800/60 bg-amber-950/30 text-amber-200',
        confidence === 'low' && 'border-zinc-700 bg-zinc-900 text-zinc-400',
      )}
      title={CONFIDENCE_LABEL[confidence]}
    >
      <Info className="h-3 w-3" />
      {confidence}
    </span>
  );
}

function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}
