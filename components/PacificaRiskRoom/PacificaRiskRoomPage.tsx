"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  CandlestickChart,
  CircleAlert,
  ExternalLink,
  Github,
  LayoutGrid,
  Loader2,
  Radar,
  RefreshCcw,
  ShieldCheck,
  ShieldX,
  Waves,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  PacificaFundingCurve,
  PacificaOrder,
  PacificaPositionHistoryItem,
  PacificaRiskRoomResponse,
  PacificaRiskStatus,
  PacificaTradeHistoryItem,
} from "@/lib/pacificaRiskRoom";

const SOURCE_LABELS = {
  live: "Live",
  sample: "Sample",
  none: "Unavailable",
} as const;

const RISK_TONES: Record<
  PacificaRiskStatus,
  {
    badge: string;
    glow: string;
    icon: typeof ShieldCheck;
    line: string;
    number: string;
  }
> = {
  stable: {
    badge: "border-emerald-500/20 bg-emerald-500/10 text-emerald-300",
    glow: "shadow-[0_0_0_1px_rgba(16,185,129,0.12),0_16px_60px_rgba(16,185,129,0.16)]",
    icon: ShieldCheck,
    line: "bg-emerald-400",
    number: "text-emerald-300",
  },
  watch: {
    badge: "border-amber-500/20 bg-amber-500/10 text-amber-300",
    glow: "shadow-[0_0_0_1px_rgba(245,158,11,0.12),0_16px_60px_rgba(245,158,11,0.14)]",
    icon: AlertTriangle,
    line: "bg-amber-400",
    number: "text-amber-300",
  },
  critical: {
    badge: "border-rose-500/20 bg-rose-500/10 text-rose-300",
    glow: "shadow-[0_0_0_1px_rgba(244,63,94,0.12),0_16px_60px_rgba(244,63,94,0.14)]",
    icon: ShieldX,
    line: "bg-rose-400",
    number: "text-rose-300",
  },
};

const ACTION_LABELS = {
  wait: "Wait",
  probe: "Probe",
  reduce: "Reduce",
  hedge: "Hedge",
} as const;

const DEFAULT_SYMBOLS = "BTC, ETH, SOL, XRP, HYPE, PUMP";

const NAV_ITEMS = [
  { label: "Overview", href: "#overview", icon: LayoutGrid },
  { label: "Markets", href: "#markets", icon: CandlestickChart },
  { label: "Pressure", href: "#pressure", icon: Radar },
  { label: "Carry", href: "#carry", icon: Waves },
  { label: "Account", href: "#account", icon: Activity },
  { label: "Plan", href: "#plan", icon: CircleAlert },
] as const;

const compactUsdFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 1,
});

const compactNumberFormatter = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
});

function formatUsd(value: number, digits = 0) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: digits,
  }).format(value);
}

function formatCompactUsd(value: number) {
  return compactUsdFormatter.format(value);
}

function formatPct(value: number, digits = 2) {
  return `${value >= 0 ? "+" : ""}${value.toFixed(digits)}%`;
}

function formatFundingRate(value: number) {
  return `${value >= 0 ? "+" : ""}${(value * 100).toFixed(4)}%`;
}

function formatTime(timestamp: number | null) {
  if (!timestamp) {
    return "n/a";
  }

  return new Date(timestamp).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function StatusPill({
  children,
  tone = "default",
}: {
  children: ReactNode;
  tone?: "default" | "soft";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-3 py-1 font-mono text-[11px] uppercase tracking-[0.22em]",
        tone === "soft"
          ? "border-white/10 bg-white/[0.04] text-slate-300"
          : "border-[#1f304f] bg-[#0d1730] text-[#7dd3fc]",
      )}
    >
      {children}
    </span>
  );
}

function AppPanel({
  id,
  eyebrow,
  title,
  body,
  action,
  children,
}: {
  id?: string;
  eyebrow: string;
  title: string;
  body?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      className="rounded-[28px] border border-white/10 bg-[#0b1120] p-5 shadow-[0_24px_80px_rgba(3,8,20,0.38)] md:p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="font-mono text-[11px] uppercase tracking-[0.26em] text-slate-500">
            {eyebrow}
          </div>
          <h2 className="mt-2 text-[22px] font-semibold tracking-[-0.04em] text-white">
            {title}
          </h2>
          {body ? (
            <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-400">{body}</p>
          ) : null}
        </div>
        {action}
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function MetricCard({
  label,
  value,
  detail,
  accent = "cyan",
}: {
  label: string;
  value: string;
  detail: string;
  accent?: "cyan" | "emerald" | "amber" | "rose";
}) {
  const accentTone =
    accent === "emerald"
      ? "bg-emerald-400"
      : accent === "amber"
        ? "bg-amber-400"
        : accent === "rose"
          ? "bg-rose-400"
          : "bg-cyan-400";

  return (
    <article className="rounded-[22px] border border-white/10 bg-[#10182c] p-4">
      <div className="flex items-center gap-3">
        <div className={cn("h-2.5 w-2.5 rounded-full", accentTone)} />
        <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-slate-500">
          {label}
        </div>
      </div>
      <div className="mt-4 text-[30px] font-semibold leading-none tracking-[-0.05em] text-white">
        {value}
      </div>
      <div className="mt-2 text-sm leading-6 text-slate-400">{detail}</div>
    </article>
  );
}

function Sparkline({
  values,
  stroke,
}: {
  values: number[];
  stroke: string;
}) {
  if (values.length < 2) {
    return (
      <div className="flex h-24 items-center justify-center rounded-[20px] border border-white/10 bg-[#0a1020] font-mono text-[11px] uppercase tracking-[0.22em] text-slate-500">
        No history
      </div>
    );
  }

  const width = 280;
  const height = 96;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const points = values
    .map((value, index) => {
      const x = (index / Math.max(values.length - 1, 1)) * width;
      const y = height - ((value - min) / range) * height;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-24 w-full overflow-visible"
      preserveAspectRatio="none"
    >
      <polyline
        fill="none"
        stroke={stroke}
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
}

function SidebarNav() {
  return (
    <nav className="space-y-1.5">
      {NAV_ITEMS.map(({ label, href, icon: Icon }) => (
        <a
          key={label}
          href={href}
          className="group flex items-center justify-between rounded-[18px] border border-transparent px-3 py-3 text-sm text-slate-400 transition hover:border-white/10 hover:bg-white/[0.04] hover:text-white"
        >
          <span className="flex items-center gap-3">
            <Icon className="h-4 w-4" />
            {label}
          </span>
          <ArrowRight className="h-4 w-4 opacity-0 transition group-hover:opacity-100" />
        </a>
      ))}
    </nav>
  );
}

function FocusMarketCard({
  market,
  funding,
  safePlan,
}: {
  market: PacificaRiskRoomResponse["marketSnapshot"][number] | null;
  funding: PacificaFundingCurve | null;
  safePlan: PacificaRiskRoomResponse["riskSummary"]["safeOrderPlan"][number] | null;
}) {
  const values =
    funding?.points
      .slice()
      .reverse()
      .map((item) => item.nextFundingRate * 10000) || [];

  if (!market) {
    return (
      <div className="rounded-[22px] border border-white/10 bg-[#10182c] p-4 text-sm text-slate-400">
        Select a market from the watchlist to inspect funding, leverage limits, and
        the current safe plan.
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      <article className="rounded-[24px] border border-[#1f304f] bg-[#0d1730] p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-[#7dd3fc]/80">
              Focus market
            </div>
            <div className="mt-3 flex items-center gap-3">
              <div className="text-[34px] font-semibold leading-none tracking-[-0.05em] text-white">
                {market.symbol}
              </div>
              <StatusPill>{market.maxLeverage}x max leverage</StatusPill>
            </div>
          </div>
          <div
            className={cn(
              "rounded-full px-3 py-1 text-sm font-medium",
              market.change24hPct >= 0
                ? "bg-emerald-500/10 text-emerald-300"
                : "bg-rose-500/10 text-rose-300",
            )}
          >
            {formatPct(market.change24hPct)}
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="rounded-[18px] border border-white/10 bg-black/20 px-4 py-4">
            <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-500">
              Mark / Oracle / Mid
            </div>
            <div className="mt-2 text-lg font-semibold text-white">
              {market.mark >= 100 ? formatUsd(market.mark) : market.mark.toFixed(4)}
            </div>
            <div className="mt-2 text-sm text-slate-400">
              {market.oracle >= 100 ? market.oracle.toFixed(2) : market.oracle.toFixed(4)} /{" "}
              {market.mid >= 100 ? market.mid.toFixed(2) : market.mid.toFixed(4)}
            </div>
          </div>
          <div className="rounded-[18px] border border-white/10 bg-black/20 px-4 py-4">
            <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-500">
              Funding / Min order
            </div>
            <div className="mt-2 text-lg font-semibold text-white">
              {formatFundingRate(market.nextFundingRate)}
            </div>
            <div className="mt-2 text-sm text-slate-400">
              Min size {formatUsd(market.minOrderSizeUsd)} · Tick {market.tickSize}
            </div>
          </div>
          <div className="rounded-[18px] border border-white/10 bg-black/20 px-4 py-4">
            <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-500">
              Open interest
            </div>
            <div className="mt-2 text-lg font-semibold text-white">
              {compactNumberFormatter.format(market.openInterest)}
            </div>
            <div className="mt-2 text-sm text-slate-400">
              24h volume {formatCompactUsd(market.volume24h)}
            </div>
          </div>
          <div className="rounded-[18px] border border-white/10 bg-black/20 px-4 py-4">
            <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-500">
              Safe action
            </div>
            <div className="mt-2 text-lg font-semibold text-white">
              {safePlan ? ACTION_LABELS[safePlan.action] : "Review"}
            </div>
            <div className="mt-2 text-sm text-slate-400">
              {safePlan
                ? `${safePlan.leverageCap}x cap · ${formatUsd(safePlan.sizeCapUsd)} size`
                : "No symbol-specific plan available"}
            </div>
          </div>
        </div>
      </article>

      <article className="rounded-[24px] border border-white/10 bg-[#10182c] p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-slate-500">
              Funding curve
            </div>
            <div className="mt-2 text-base font-semibold text-white">
              {funding ? funding.symbol : market.symbol} carry context
            </div>
          </div>
          {funding ? (
            <StatusPill tone="soft">{funding.regime}</StatusPill>
          ) : null}
        </div>
        <div className="mt-4 rounded-[20px] border border-white/10 bg-[#0a1020] px-3 py-4">
          <Sparkline values={values} stroke="#38bdf8" />
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-[18px] border border-white/10 bg-[#0a1020] px-4 py-3">
            <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-500">
              Carry per $1k
            </div>
            <div className="mt-2 text-sm font-semibold text-white">
              {funding ? formatUsd(funding.hourlyCarryFor1kUsd, 2) : "n/a"}
            </div>
          </div>
          <div className="rounded-[18px] border border-white/10 bg-[#0a1020] px-4 py-3">
            <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-500">
              Impact spread
            </div>
            <div className="mt-2 text-sm font-semibold text-white">
              {funding ? `${funding.impactSpreadPct.toFixed(3)}%` : "n/a"}
            </div>
          </div>
        </div>
      </article>
    </div>
  );
}

function FundingCard({ curve }: { curve: PacificaFundingCurve }) {
  const values = curve.points
    .slice()
    .reverse()
    .map((item) => item.nextFundingRate * 10000);
  const tone =
    curve.regime === "longs-pay"
      ? "text-amber-300 border-amber-500/20 bg-amber-500/5"
      : curve.regime === "shorts-pay"
        ? "text-emerald-300 border-emerald-500/20 bg-emerald-500/5"
        : "text-cyan-300 border-cyan-500/20 bg-cyan-500/5";

  return (
    <article className="rounded-[22px] border border-white/10 bg-[#10182c] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-slate-500">
            {curve.symbol}
          </div>
          <div className="mt-2 text-[28px] font-semibold leading-none tracking-[-0.04em] text-white">
            {formatFundingRate(curve.nextFundingRate)}
          </div>
        </div>
        <div className={cn("rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em]", tone)}>
          {curve.regime}
        </div>
      </div>
      <div className="mt-3 text-sm text-slate-400">
        Carry on $1k notional: {formatUsd(curve.hourlyCarryFor1kUsd, 2)}
      </div>
      <div className="mt-4 rounded-[18px] border border-white/10 bg-[#0a1020] px-3 py-3">
        <Sparkline values={values} stroke="#22d3ee" />
      </div>
      <div className="mt-4 flex items-center justify-between text-sm text-slate-400">
        <span>Impact spread {curve.impactSpreadPct.toFixed(3)}%</span>
        <span>{curve.points.length} prints</span>
      </div>
    </article>
  );
}

function RiskSignalCard({
  signal,
}: {
  signal: PacificaRiskRoomResponse["riskSummary"]["signals"][number];
}) {
  return (
    <article className="rounded-[20px] border border-white/10 bg-[#10182c] p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-semibold text-white">{signal.title}</div>
        <div
          className={cn(
            "rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em]",
            RISK_TONES[signal.tone].badge,
          )}
        >
          {signal.tone}
        </div>
      </div>
      <div className="mt-3 text-[30px] font-semibold leading-none tracking-[-0.05em] text-white">
        {signal.value}
      </div>
      <div className="mt-2 text-sm leading-6 text-slate-400">{signal.detail}</div>
    </article>
  );
}

function SafeOrderCard({
  plan,
}: {
  plan: PacificaRiskRoomResponse["riskSummary"]["safeOrderPlan"][number];
}) {
  return (
    <article className="rounded-[22px] border border-white/10 bg-[#10182c] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-slate-500">
            {plan.symbol}
          </div>
          <div className="mt-2 text-[26px] font-semibold leading-none tracking-[-0.04em] text-white">
            {ACTION_LABELS[plan.action]}
          </div>
        </div>
        <StatusPill tone="soft">{plan.orderType}</StatusPill>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-[16px] border border-white/10 bg-[#0a1020] px-4 py-3">
          <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-500">
            Leverage cap
          </div>
          <div className="mt-2 text-lg font-semibold text-white">{plan.leverageCap}x</div>
        </div>
        <div className="rounded-[16px] border border-white/10 bg-[#0a1020] px-4 py-3">
          <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-500">
            Size cap
          </div>
          <div className="mt-2 text-lg font-semibold text-white">
            {formatUsd(plan.sizeCapUsd)}
          </div>
        </div>
      </div>
      <div className="mt-4 text-sm leading-6 text-slate-400">{plan.rationale}</div>
      <div className="mt-3 rounded-[16px] border border-white/10 bg-[#0a1020] px-4 py-3 text-sm leading-6 text-slate-300">
        {plan.invalidation}
      </div>
    </article>
  );
}

type ActivityItem =
  | {
      kind: "order";
      timestamp: number | null;
      title: string;
      detail: string;
      tone: string;
    }
  | {
      kind: "fill";
      timestamp: number | null;
      title: string;
      detail: string;
      tone: string;
    }
  | {
      kind: "close";
      timestamp: number | null;
      title: string;
      detail: string;
      tone: string;
    };

function buildOrderActivity(order: PacificaOrder): ActivityItem {
  return {
    kind: "order",
    timestamp: order.createdAt,
    title: `${order.symbol} ${order.orderType}`,
    detail: `${order.side} · Amount ${order.amount} · ${order.reduceOnly ? "Reduce-only" : "Increase"}`,
    tone: "bg-cyan-400",
  };
}

function buildTradeActivity(trade: PacificaTradeHistoryItem): ActivityItem {
  return {
    kind: "fill",
    timestamp: trade.createdAt,
    title: `${trade.symbol} ${trade.side}`,
    detail: `${trade.eventType} · ${trade.cause} · ${formatUsd(trade.notionalUsd, 2)}`,
    tone: "bg-emerald-400",
  };
}

function buildPositionCloseActivity(item: PacificaPositionHistoryItem): ActivityItem {
  return {
    kind: "close",
    timestamp: item.closedAt,
    title: `${item.symbol} ${item.side}`,
    detail: `Closed at ${item.exitPrice} · Realized ${formatUsd(item.realizedPnlUsd, 2)}`,
    tone: "bg-amber-400",
  };
}

export default function PacificaRiskRoomPage() {
  const searchParams = useSearchParams();
  const compactMode = searchParams.get("compact") === "1";
  const [accountInput, setAccountInput] = useState("");
  const [submittedAccount, setSubmittedAccount] = useState("");
  const [refreshNonce, setRefreshNonce] = useState(0);
  const [payload, setPayload] = useState<PacificaRiskRoomResponse | null>(null);
  const [focusSymbol, setFocusSymbol] = useState("");
  const focusSymbolRef = useRef("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    focusSymbolRef.current = focusSymbol;
  }, [focusSymbol]);

  useEffect(() => {
    let cancelled = false;

    const load = async (background = false) => {
      if (background) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError("");

      try {
        const params = new URLSearchParams({
          symbols: DEFAULT_SYMBOLS,
        });
        if (submittedAccount.trim()) {
          params.set("account", submittedAccount.trim());
        }

        const response = await fetch(`/api/pacifica-risk-room?${params.toString()}`, {
          cache: "no-store",
        });
        const nextPayload = (await response.json()) as PacificaRiskRoomResponse;

        if (!response.ok || !nextPayload.success) {
          throw new Error("Failed to load Pacifica Risk Room payload");
        }

        if (cancelled) {
          return;
        }

        setPayload(nextPayload);
        const activeFocusSymbol = focusSymbolRef.current;
        if (
          !activeFocusSymbol ||
          !nextPayload.marketSnapshot.some((item) => item.symbol === activeFocusSymbol)
        ) {
          setFocusSymbol(nextPayload.marketSnapshot[0]?.symbol || "");
        }
      } catch (loadError) {
        if (cancelled) {
          return;
        }

        setError(
          loadError instanceof Error
            ? loadError.message
            : "Failed to load Pacifica Risk Room payload",
        );
      } finally {
        if (!cancelled) {
          setIsLoading(false);
          setIsRefreshing(false);
        }
      }
    };

    load();
    const interval = window.setInterval(() => load(true), 20_000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [submittedAccount, refreshNonce]);

  const focusMarket =
    payload?.marketSnapshot.find((item) => item.symbol === focusSymbol) || null;
  const focusFunding =
    payload?.fundingCurves.find((item) => item.symbol === focusSymbol) || null;
  const focusPlan =
    payload?.riskSummary.safeOrderPlan.find((item) => item.symbol === focusSymbol) ||
    payload?.riskSummary.safeOrderPlan[0] ||
    null;
  const riskSummary = payload?.riskSummary || null;
  const riskTone = riskSummary ? RISK_TONES[riskSummary.status] : RISK_TONES.watch;
  const RiskIcon = riskTone.icon;
  const grossExposure = payload
    ? payload.account.positions.reduce((sum, item) => sum + item.notionalUsd, 0)
    : 0;
  const totalFundingPressure = payload
    ? payload.fundingCurves.reduce(
        (sum, item) => sum + Math.abs(item.nextFundingRate),
        0,
      )
    : 0;
  const portfolioSeries =
    payload?.account.portfolioHistory.map((item) => item.equityUsd) || [];
  const activityItems = payload
    ? [
        ...payload.account.openOrders.slice(0, 4).map(buildOrderActivity),
        ...payload.account.tradeHistory.slice(0, 4).map(buildTradeActivity),
        ...payload.account.positionHistory.slice(0, 4).map(buildPositionCloseActivity),
      ]
        .sort((left, right) => (right.timestamp || 0) - (left.timestamp || 0))
        .slice(0, 8)
    : [];

  return (
    <main className="min-h-screen bg-[#050816] text-slate-100">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.12),_transparent_22%),radial-gradient(circle_at_top_right,_rgba(14,165,233,0.08),_transparent_20%),linear-gradient(180deg,_#050816_0%,_#07101f_100%)]" />

      <div className="mx-auto max-w-[1680px] px-4 py-4 md:px-6">
        <div className="grid gap-4 xl:grid-cols-[260px_minmax(0,1fr)]">
          <aside className="rounded-[30px] border border-white/10 bg-[#0a0f1b] p-4 shadow-[0_28px_90px_rgba(3,8,20,0.42)]">
            <div className="flex items-center gap-3 rounded-[20px] border border-[#1f304f] bg-[#0d1730] px-4 py-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-400/10 text-cyan-300">
                <Radar className="h-5 w-5" />
              </div>
              <div>
                <div className="text-base font-semibold text-white">Pacifica Risk Room</div>
                <div className="text-sm text-slate-400">Perps risk console</div>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <StatusPill>Market {payload ? SOURCE_LABELS[payload.sourceStatus.market] : "..."}</StatusPill>
              <StatusPill tone="soft">
                Account {payload ? SOURCE_LABELS[payload.sourceStatus.account] : "..."}
              </StatusPill>
            </div>

            <div className="mt-5">
              <SidebarNav />
            </div>

            <div
              className={cn(
                "mt-5 rounded-[24px] border border-white/10 bg-[#10182c] p-4",
                riskTone.glow,
              )}
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-slate-500">
                    Risk verdict
                  </div>
                  <div className="mt-2 flex items-center gap-2 text-white">
                    <RiskIcon className="h-4 w-4" />
                    <span className="text-sm font-semibold uppercase tracking-[0.18em]">
                      {riskSummary?.status || "watch"}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setRefreshNonce((value) => value + 1)}
                  className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-slate-300 transition hover:bg-white/[0.08]"
                >
                  {isRefreshing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCcw className="h-4 w-4" />
                  )}
                  Refresh
                </button>
              </div>

              <div className="mt-4 flex items-end justify-between gap-3">
                <div>
                  <div className={cn("text-[42px] font-semibold leading-none tracking-[-0.06em]", riskTone.number)}>
                    {riskSummary ? riskSummary.score : "--"}
                  </div>
                  <div className="mt-1 font-mono text-[11px] uppercase tracking-[0.22em] text-slate-500">
                    score / 100
                  </div>
                </div>
                <div className="h-14 w-1 rounded-full bg-white/5">
                  <div
                    className={cn("w-full rounded-full", riskTone.line)}
                    style={{ height: `${Math.max(riskSummary?.score || 0, 14)}%` }}
                  />
                </div>
              </div>

              <div className="mt-4 rounded-[18px] border border-white/10 bg-[#0a1020] px-4 py-4 text-sm leading-6 text-slate-300">
                {riskSummary?.verdict || "Loading current Pacifica posture..."}
              </div>
            </div>

            <form
              className="mt-5 space-y-3"
              onSubmit={(event) => {
                event.preventDefault();
                setSubmittedAccount(accountInput.trim());
              }}
            >
              <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-slate-500">
                Review account
              </div>
              <input
                value={accountInput}
                onChange={(event) => setAccountInput(event.target.value)}
                placeholder="Pacifica account id"
                className="w-full rounded-[18px] border border-white/10 bg-[#10182c] px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-400/40"
              />
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                <button
                  type="submit"
                  className="rounded-[16px] bg-cyan-400 px-4 py-3 text-sm font-semibold text-[#06111d] transition hover:bg-cyan-300"
                >
                  Review account
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAccountInput("");
                    setSubmittedAccount("");
                  }}
                  className="rounded-[16px] border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-slate-200 transition hover:bg-white/[0.08]"
                >
                  Use sample mode
                </button>
              </div>
            </form>

            {!compactMode ? (
              <div className="mt-5 space-y-3">
                <Link
                  href="https://docs.pacifica.fi/api-documentation/api"
                  className="flex items-center justify-between rounded-[18px] border border-white/10 bg-[#10182c] px-4 py-3 text-sm text-slate-300 transition hover:bg-white/[0.05]"
                >
                  <span className="flex items-center gap-3">
                    <BookOpen className="h-4 w-4" />
                    Pacifica docs
                  </span>
                  <ExternalLink className="h-4 w-4" />
                </Link>
                <Link
                  href="https://github.com/richard7463/pacifica-risk-room"
                  className="flex items-center justify-between rounded-[18px] border border-white/10 bg-[#10182c] px-4 py-3 text-sm text-slate-300 transition hover:bg-white/[0.05]"
                >
                  <span className="flex items-center gap-3">
                    <Github className="h-4 w-4" />
                    Source repo
                  </span>
                  <ExternalLink className="h-4 w-4" />
                </Link>
              </div>
            ) : null}
          </aside>

          <div className="space-y-4">
            <section
              id="overview"
              className="rounded-[30px] border border-white/10 bg-[#0a0f1b] p-5 shadow-[0_28px_90px_rgba(3,8,20,0.42)] md:p-6"
            >
              <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                <div>
                  <div className="font-mono text-[11px] uppercase tracking-[0.26em] text-slate-500">
                    Pacifica-native risk workspace
                  </div>
                  <h1 className="mt-2 text-[32px] font-semibold tracking-[-0.05em] text-white md:text-[42px]">
                    Real-time risk workspace for Pacifica perpetuals.
                  </h1>
                  <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-400 md:text-base">
                    Pacifica Risk Room is structured like a trading workspace: watchlist,
                    focused market detail, pressure tape, carry board, account state, and
                    execution brief in one shell.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <StatusPill>Watchlist {payload?.watchlistSymbols.join(", ") || "Loading"}</StatusPill>
                  <StatusPill tone="soft">
                    Updated{" "}
                    {payload
                      ? new Date(payload.generatedAt).toLocaleTimeString("en-US", {
                          hour: "numeric",
                          minute: "2-digit",
                        })
                      : "..."}
                  </StatusPill>
                </div>
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                <MetricCard
                  label="Risk score"
                  value={riskSummary ? `${riskSummary.score}/100` : "--"}
                  detail={riskSummary?.summary || "Reading book posture..."}
                  accent={
                    riskSummary?.status === "critical"
                      ? "rose"
                      : riskSummary?.status === "stable"
                        ? "emerald"
                        : "amber"
                  }
                />
                <MetricCard
                  label="Gross exposure"
                  value={payload ? formatCompactUsd(grossExposure) : "--"}
                  detail={`Account ${payload ? SOURCE_LABELS[payload.sourceStatus.account] : "..."}`}
                />
                <MetricCard
                  label="Funding pressure"
                  value={payload ? formatFundingRate(totalFundingPressure) : "--"}
                  detail="Absolute next funding across the carry board."
                  accent="amber"
                />
                <MetricCard
                  label="Desk equity"
                  value={payload ? formatCompactUsd(payload.account.equityUsd) : "--"}
                  detail={`Available ${payload ? formatCompactUsd(payload.account.availableToSpendUsd) : "--"}`}
                  accent="emerald"
                />
                <MetricCard
                  label="Tracked markets"
                  value={payload ? String(payload.marketSnapshot.length) : "--"}
                  detail="Default watchlist seeded for Pacifica perps."
                />
              </div>

              {error ? (
                <div className="mt-4 rounded-[20px] border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                  {error}
                </div>
              ) : null}

              {payload?.notes.length && !compactMode ? (
                <div className="mt-4 grid gap-3 xl:grid-cols-2">
                  {payload.notes.map((note) => (
                    <div
                      key={note}
                      className="rounded-[18px] border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm leading-6 text-amber-100"
                    >
                      {note}
                    </div>
                  ))}
                </div>
              ) : null}
            </section>

            {isLoading && !payload ? (
              <div className="flex min-h-[320px] items-center justify-center rounded-[30px] border border-white/10 bg-[#0a0f1b]">
                <div className="flex items-center gap-3 text-slate-300">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Loading Pacifica Risk Room...
                </div>
              </div>
            ) : null}

            {payload ? (
              <>
                <div className="grid gap-4 2xl:grid-cols-[1.2fr,0.8fr]">
                  <AppPanel
                    id="markets"
                    eyebrow="Market board"
                    title="Watchlist monitor"
                    body="Dense row cards modeled after real trading workspaces: quick enough to scan, detailed enough to act."
                    action={<StatusPill tone="soft">Click a row to focus</StatusPill>}
                  >
                    <div className="grid gap-3">
                      {payload.marketSnapshot.map((market) => (
                        <button
                          key={market.symbol}
                          type="button"
                          onClick={() => setFocusSymbol(market.symbol)}
                          className={cn(
                            "w-full rounded-[22px] border p-4 text-left transition",
                            focusSymbol === market.symbol
                              ? "border-[#28527c] bg-[#0d1730] shadow-[0_18px_56px_rgba(13,23,48,0.36)]"
                              : "border-white/10 bg-[#10182c] hover:border-white/20 hover:bg-[#131c31]",
                          )}
                        >
                          <div className="grid gap-4 xl:grid-cols-[1.1fr_repeat(5,minmax(0,1fr))] xl:items-center">
                            <div>
                              <div className="flex items-center gap-3">
                                <div className="text-xl font-semibold text-white">
                                  {market.symbol}
                                </div>
                                <StatusPill tone="soft">
                                  Crowd {market.crowdedScore.toFixed(1)}
                                </StatusPill>
                              </div>
                              <div className="mt-2 text-sm text-slate-400">
                                {market.isolatedOnly
                                  ? "Isolated-only market"
                                  : `${market.maxLeverage}x leverage ceiling`}
                              </div>
                            </div>
                            <div>
                              <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-500">
                                Mark
                              </div>
                              <div className="mt-2 text-sm font-semibold text-white">
                                {market.mark >= 100
                                  ? formatUsd(market.mark)
                                  : market.mark.toFixed(4)}
                              </div>
                            </div>
                            <div>
                              <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-500">
                                24h
                              </div>
                              <div
                                className={cn(
                                  "mt-2 text-sm font-semibold",
                                  market.change24hPct >= 0
                                    ? "text-emerald-300"
                                    : "text-rose-300",
                                )}
                              >
                                {formatPct(market.change24hPct)}
                              </div>
                            </div>
                            <div>
                              <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-500">
                                Funding
                              </div>
                              <div className="mt-2 text-sm font-semibold text-white">
                                {formatFundingRate(market.nextFundingRate)}
                              </div>
                            </div>
                            <div>
                              <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-500">
                                OI
                              </div>
                              <div className="mt-2 text-sm font-semibold text-white">
                                {compactNumberFormatter.format(market.openInterest)}
                              </div>
                            </div>
                            <div>
                              <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-500">
                                Volume
                              </div>
                              <div className="mt-2 text-sm font-semibold text-white">
                                {formatCompactUsd(market.volume24h)}
                              </div>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </AppPanel>

                  <AppPanel
                    eyebrow="Focused workspace"
                    title={focusMarket ? `${focusMarket.symbol} detail` : "Market focus"}
                    body="Selected symbol, funding curve, and safe action are grouped together like a side workspace."
                  >
                    <FocusMarketCard
                      market={focusMarket}
                      funding={focusFunding}
                      safePlan={focusPlan}
                    />
                  </AppPanel>
                </div>

                <div className="grid gap-4 2xl:grid-cols-[0.82fr,1.18fr]">
                  <AppPanel
                    id="pressure"
                    eyebrow="Pressure tape"
                    title="Liquidations and outsized trade stress"
                    body="A compact event tape for prints that actually matter to leverage decisions."
                  >
                    <div className="grid gap-3">
                      {payload.liquidationRadar.map((item) => (
                        <article
                          key={`${item.symbol}-${item.createdAt}-${item.side}`}
                          className="rounded-[20px] border border-white/10 bg-[#10182c] p-4"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="flex items-start gap-3">
                              <div className={cn("mt-1 h-10 w-1 rounded-full", RISK_TONES[item.severity].line)} />
                              <div>
                                <div className="flex items-center gap-3">
                                  <div className="font-semibold text-white">{item.symbol}</div>
                                  <div
                                    className={cn(
                                      "rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em]",
                                      RISK_TONES[item.severity].badge,
                                    )}
                                  >
                                    {item.cause.replaceAll("_", " ")}
                                  </div>
                                </div>
                                <div className="mt-2 text-sm text-slate-400">
                                  {item.eventType} · {item.side}
                                </div>
                              </div>
                            </div>
                            <div className="text-sm text-slate-500">{formatTime(item.createdAt)}</div>
                          </div>
                          <div className="mt-4 grid gap-3 sm:grid-cols-3">
                            <div className="rounded-[16px] border border-white/10 bg-[#0a1020] px-4 py-3 text-sm text-slate-300">
                              Price {item.price >= 100 ? formatUsd(item.price) : item.price.toFixed(4)}
                            </div>
                            <div className="rounded-[16px] border border-white/10 bg-[#0a1020] px-4 py-3 text-sm text-slate-300">
                              Size {compactNumberFormatter.format(item.amount)}
                            </div>
                            <div className="rounded-[16px] border border-white/10 bg-[#0a1020] px-4 py-3 text-sm text-slate-300">
                              Notional {formatCompactUsd(item.notionalUsd)}
                            </div>
                          </div>
                        </article>
                      ))}
                    </div>
                  </AppPanel>

                  <AppPanel
                    id="carry"
                    eyebrow="Carry board"
                    title="Funding leaders"
                    body="Organized like a watch panel: market, regime, curve, and carry drag per $1k notional."
                  >
                    <div className="grid gap-3 xl:grid-cols-2">
                      {payload.fundingCurves.map((curve) => (
                        <FundingCard key={curve.symbol} curve={curve} />
                      ))}
                    </div>
                  </AppPanel>
                </div>

                <div className="grid gap-4 2xl:grid-cols-[1.12fr,0.88fr]">
                  <AppPanel
                    id="account"
                    eyebrow="Account review"
                    title="Live posture and position inventory"
                    body="This section behaves like a portfolio page with current exposure first, then activity."
                  >
                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                      <MetricCard
                        label="Equity"
                        value={formatUsd(payload.account.equityUsd)}
                        detail={`Available ${formatUsd(payload.account.availableToSpendUsd)}`}
                        accent="emerald"
                      />
                      <MetricCard
                        label="Margin used"
                        value={formatUsd(payload.account.marginUsedUsd)}
                        detail={`Mode ${SOURCE_LABELS[payload.account.mode]}`}
                        accent="amber"
                      />
                      <MetricCard
                        label="30d volume"
                        value={formatCompactUsd(payload.account.volume30dUsd)}
                        detail={`${payload.account.tradeCount30d} trades`}
                      />
                      <MetricCard
                        label="Net PnL"
                        value={formatUsd(
                          payload.account.realizedPnlUsd + payload.account.unrealizedPnlUsd,
                        )}
                        detail={`Realized ${formatUsd(payload.account.realizedPnlUsd, 2)}`}
                        accent="emerald"
                      />
                    </div>

                    <div className="mt-5 grid gap-3">
                      {payload.account.positions.map((position) => (
                        <article
                          key={`${position.symbol}-${position.side}`}
                          className="rounded-[20px] border border-white/10 bg-[#10182c] p-4"
                        >
                          <div className="grid gap-4 xl:grid-cols-[1fr_repeat(5,minmax(0,1fr))] xl:items-center">
                            <div>
                              <div className="text-lg font-semibold text-white">
                                {position.symbol}
                              </div>
                              <div className="mt-2 text-sm text-slate-400">
                                {position.side} · Entry{" "}
                                {position.entryPrice.toFixed(position.entryPrice >= 100 ? 2 : 4)}
                              </div>
                            </div>
                            <div>
                              <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-500">
                                Notional
                              </div>
                              <div className="mt-2 text-sm font-semibold text-white">
                                {formatCompactUsd(position.notionalUsd)}
                              </div>
                            </div>
                            <div>
                              <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-500">
                                UPNL
                              </div>
                              <div
                                className={cn(
                                  "mt-2 text-sm font-semibold",
                                  position.unrealizedPnlUsd >= 0
                                    ? "text-emerald-300"
                                    : "text-rose-300",
                                )}
                              >
                                {formatUsd(position.unrealizedPnlUsd, 2)}
                              </div>
                            </div>
                            <div>
                              <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-500">
                                Margin
                              </div>
                              <div className="mt-2 text-sm font-semibold text-white">
                                {formatUsd(position.marginUsedUsd, 2)}
                              </div>
                            </div>
                            <div>
                              <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-500">
                                Liq buffer
                              </div>
                              <div className="mt-2 text-sm font-semibold text-white">
                                {position.liquidationDistancePct === null
                                  ? "n/a"
                                  : `${position.liquidationDistancePct.toFixed(2)}%`}
                              </div>
                            </div>
                            <div>
                              <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-500">
                                Leverage
                              </div>
                              <div className="mt-2 text-sm font-semibold text-white">
                                {position.leverage ? `${position.leverage}x` : "n/a"}
                              </div>
                            </div>
                          </div>
                        </article>
                      ))}
                    </div>
                  </AppPanel>

                  <AppPanel
                    eyebrow="Activity + signals"
                    title="Recent account and risk flow"
                    body="Modeled after wallet activity panels: a single stream for orders, fills, and closures, with risk signals beside it."
                  >
                    <div className="grid gap-4 xl:grid-cols-[1.05fr,0.95fr]">
                      <div className="space-y-3">
                        {activityItems.length ? (
                          activityItems.map((item, index) => (
                            <article
                              key={`${item.kind}-${item.title}-${index}`}
                              className="rounded-[18px] border border-white/10 bg-[#10182c] px-4 py-4"
                            >
                              <div className="flex items-start gap-3">
                                <div className={cn("mt-1.5 h-2.5 w-2.5 rounded-full", item.tone)} />
                                <div className="min-w-0 flex-1">
                                  <div className="flex flex-wrap items-center justify-between gap-3">
                                    <div className="text-sm font-semibold text-white">
                                      {item.title}
                                    </div>
                                    <div className="text-xs text-slate-500">
                                      {formatTime(item.timestamp)}
                                    </div>
                                  </div>
                                  <div className="mt-2 text-sm leading-6 text-slate-400">
                                    {item.detail}
                                  </div>
                                </div>
                              </div>
                            </article>
                          ))
                        ) : (
                          <div className="rounded-[18px] border border-white/10 bg-[#10182c] px-4 py-5 text-sm text-slate-400">
                            No recent activity returned for this account context.
                          </div>
                        )}
                      </div>

                      <div className="space-y-3">
                        {riskSummary?.signals.map((signal) => (
                          <RiskSignalCard key={signal.title} signal={signal} />
                        ))}

                        <article className="rounded-[20px] border border-white/10 bg-[#10182c] p-4">
                          <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-slate-500">
                            Portfolio replay
                          </div>
                          <div className="mt-4 rounded-[18px] border border-white/10 bg-[#0a1020] px-3 py-4">
                            <Sparkline values={portfolioSeries} stroke="#34d399" />
                          </div>
                        </article>
                      </div>
                    </div>
                  </AppPanel>
                </div>

                <AppPanel
                  id="plan"
                  eyebrow="Execution brief"
                  title="Bounded next actions"
                  body="Safe plans stay explicit: size cap, leverage cap, invalidation, and rationale. The interface is advisory-first by design."
                >
                  <div className="grid gap-3 xl:grid-cols-3">
                    {payload.riskSummary.safeOrderPlan.map((plan) => (
                      <SafeOrderCard key={plan.symbol} plan={plan} />
                    ))}
                  </div>

                  {!compactMode ? (
                    <div className="mt-4 grid gap-3 xl:grid-cols-2">
                      {payload.dataSources.map((source) => (
                        <div
                          key={source}
                          className="rounded-[18px] border border-white/10 bg-[#10182c] px-4 py-3 text-sm text-slate-400"
                        >
                          {source}
                        </div>
                      ))}
                    </div>
                  ) : null}
                </AppPanel>
              </>
            ) : null}
          </div>
        </div>
      </div>
    </main>
  );
}
