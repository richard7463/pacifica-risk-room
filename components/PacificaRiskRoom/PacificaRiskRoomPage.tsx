"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BookOpen,
  CandlestickChart,
  CircleAlert,
  ExternalLink,
  Loader2,
  Radar,
  RefreshCcw,
  ShieldCheck,
  ShieldX,
  Waves,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { DEFAULT_LIVE_PACIFICA_ACCOUNT } from "@/lib/pacificaRiskRoom";
import type {
  PacificaFundingCurve,
  PacificaOrder,
  PacificaPosition,
  PacificaRiskRoomResponse,
  PacificaRiskStatus,
  PacificaTradeHistoryItem,
} from "@/lib/pacificaRiskRoom";

const DEFAULT_SYMBOLS = "BTC, ETH, SOL, XRP, HYPE, PUMP";

const SOURCE_LABELS = {
  live: "Live",
  sample: "Sample",
  none: "Unavailable",
} as const;

const NAV_ITEMS = [
  { label: "Health", href: "#health", icon: ShieldCheck },
  { label: "Position", href: "#position", icon: Activity },
  { label: "Action", href: "#action", icon: CircleAlert },
  { label: "Markets", href: "#markets", icon: CandlestickChart },
  { label: "Funding", href: "#funding", icon: Waves },
  { label: "Data", href: "#data", icon: BookOpen },
] as const;

const RISK_TONES: Record<
  PacificaRiskStatus,
  {
    badge: string;
    border: string;
    glow: string;
    icon: typeof ShieldCheck;
    label: string;
    text: string;
  }
> = {
  stable: {
    badge: "border-emerald-400/25 bg-emerald-400/10 text-emerald-200",
    border: "border-emerald-400/30",
    glow: "shadow-[0_30px_120px_rgba(16,185,129,0.16)]",
    icon: ShieldCheck,
    label: "Healthy",
    text: "text-emerald-200",
  },
  watch: {
    badge: "border-amber-400/25 bg-amber-400/10 text-amber-200",
    border: "border-amber-400/30",
    glow: "shadow-[0_30px_120px_rgba(245,158,11,0.15)]",
    icon: AlertTriangle,
    label: "Watch",
    text: "text-amber-200",
  },
  critical: {
    badge: "border-rose-400/30 bg-rose-400/10 text-rose-200",
    border: "border-rose-400/35",
    glow: "shadow-[0_30px_120px_rgba(244,63,94,0.18)]",
    icon: ShieldX,
    label: "High risk",
    text: "text-rose-200",
  },
};

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

function formatPrice(value: number) {
  if (!Number.isFinite(value)) {
    return "n/a";
  }

  return value >= 100 ? formatUsd(value) : value.toFixed(value < 0.01 ? 6 : 4);
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

function shortAddress(address: string) {
  if (address.length <= 14) {
    return address;
  }

  return `${address.slice(0, 6)}...${address.slice(-6)}`;
}

function positionSideLabel(side: string) {
  const normalized = side.toLowerCase();
  if (normalized.includes("bid") || normalized.includes("long")) {
    return "Long";
  }

  if (normalized.includes("ask") || normalized.includes("short")) {
    return "Short";
  }

  return side || "Position";
}

function StatusPill({
  children,
  tone = "default",
}: {
  children: ReactNode;
  tone?: "default" | "soft" | "risk";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em]",
        tone === "soft"
          ? "border-white/10 bg-white/[0.04] text-slate-300"
          : tone === "risk"
            ? "border-rose-400/30 bg-rose-400/10 text-rose-200"
            : "border-cyan-300/20 bg-cyan-300/10 text-cyan-200",
      )}
    >
      {children}
    </span>
  );
}

function Panel({
  id,
  eyebrow,
  title,
  body,
  action,
  children,
  className,
}: {
  id?: string;
  eyebrow: string;
  title: string;
  body?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      id={id}
      className={cn(
        "rounded-[30px] border border-white/10 bg-[#0b111f]/95 p-5 shadow-[0_24px_90px_rgba(2,6,23,0.4)] md:p-6",
        className,
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="font-mono text-[11px] uppercase tracking-[0.26em] text-slate-500">
            {eyebrow}
          </div>
          <h2 className="mt-2 text-[24px] font-semibold tracking-[-0.045em] text-white">
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

function StatTile({
  label,
  value,
  detail,
  tone = "default",
}: {
  label: string;
  value: string;
  detail?: string;
  tone?: "default" | "good" | "warn" | "danger";
}) {
  return (
    <article
      className={cn(
        "rounded-[24px] border bg-[#101827] p-4",
        tone === "good"
          ? "border-emerald-400/20"
          : tone === "warn"
            ? "border-amber-400/20"
            : tone === "danger"
              ? "border-rose-400/25"
              : "border-white/10",
      )}
    >
      <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-500">
        {label}
      </div>
      <div className="mt-3 text-[30px] font-semibold leading-none tracking-[-0.055em] text-white">
        {value}
      </div>
      {detail ? <div className="mt-2 text-sm leading-6 text-slate-400">{detail}</div> : null}
    </article>
  );
}

function ProgressBar({
  value,
  dangerAt,
}: {
  value: number;
  dangerAt: number;
}) {
  const pct = Math.max(4, Math.min(100, (value / dangerAt) * 100));
  return (
    <div className="h-3 rounded-full bg-white/10">
      <div
        className={cn(
          "h-full rounded-full",
          value < dangerAt * 0.6
            ? "bg-rose-400"
            : value < dangerAt
              ? "bg-amber-300"
              : "bg-emerald-300",
        )}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function Sparkline({ values, stroke }: { values: number[]; stroke: string }) {
  if (values.length < 2) {
    return (
      <div className="flex h-20 items-center justify-center rounded-[18px] border border-white/10 bg-black/20 font-mono text-[10px] uppercase tracking-[0.22em] text-slate-500">
        No history
      </div>
    );
  }

  const width = 280;
  const height = 80;
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
      className="h-20 w-full overflow-visible"
      preserveAspectRatio="none"
    >
      <polyline
        fill="none"
        stroke={stroke}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="4"
        points={points}
      />
    </svg>
  );
}

function NavRail() {
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

function buildTradeActivity(trade: PacificaTradeHistoryItem) {
  return {
    timestamp: trade.createdAt,
    title: `${trade.symbol} ${trade.side.replaceAll("_", " ")}`,
    detail: `${formatCompactUsd(trade.notionalUsd)} fill at ${formatPrice(trade.price)}`,
  };
}

function buildOrderActivity(order: PacificaOrder) {
  return {
    timestamp: order.createdAt,
    title: `${order.symbol} ${order.orderType}`,
    detail: `${order.side} ${order.amount} ${order.reduceOnly ? "reduce-only" : "increase"}`,
  };
}

function ActionList({
  primaryPosition,
  reduceToTargetUsd,
  collateralToTargetUsd,
  targetExposureMultiple,
}: {
  primaryPosition: PacificaPosition | null;
  reduceToTargetUsd: number;
  collateralToTargetUsd: number;
  targetExposureMultiple: number;
}) {
  const symbol = primaryPosition?.symbol || "current position";
  const actions = primaryPosition
    ? [
        `Do not add new leverage until ${symbol} risk improves.`,
        reduceToTargetUsd > 0
          ? `Reduce about ${formatUsd(reduceToTargetUsd)} of ${symbol} exposure to move below ${targetExposureMultiple}x equity.`
          : `Keep exposure below ${targetExposureMultiple}x equity before opening new positions.`,
        collateralToTargetUsd > 0
          ? `Adding about ${formatUsd(collateralToTargetUsd)} collateral would also bring exposure back under ${targetExposureMultiple}x.`
          : "Collateral is enough for the current target exposure band.",
        "Keep a reduce-only exit active before making any fresh directional trade.",
      ]
    : [
        "No live position is open for this account.",
        "Use the market context below before taking a new position.",
        "Keep first entries small until the account builds more equity history.",
      ];

  return (
    <div className="grid gap-3">
      {actions.map((action, index) => (
        <div
          key={action}
          className="flex gap-3 rounded-[20px] border border-white/10 bg-[#101827] p-4"
        >
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-cyan-300 text-sm font-semibold text-[#07111f]">
            {index + 1}
          </div>
          <div className="text-sm leading-7 text-slate-200">{action}</div>
        </div>
      ))}
    </div>
  );
}

function PositionRiskCard({
  position,
  equityUsd,
  accountMarginUsd,
  exposureMultiple,
}: {
  position: PacificaPosition | null;
  equityUsd: number;
  accountMarginUsd: number;
  exposureMultiple: number;
}) {
  if (!position) {
    return (
      <div className="rounded-[24px] border border-white/10 bg-[#101827] p-5 text-sm leading-7 text-slate-400">
        No open Pacifica position was returned for this account. The health score will focus on
        available equity and market context until a position exists.
      </div>
    );
  }

  const sideLabel = positionSideLabel(position.side);
  const liquidationBuffer = position.liquidationDistancePct ?? 0;

  return (
    <article className="rounded-[28px] border border-white/10 bg-[#101827] p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="font-mono text-[11px] uppercase tracking-[0.26em] text-slate-500">
            Main risk driver
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <h3 className="text-[34px] font-semibold leading-none tracking-[-0.06em] text-white">
              {position.symbol} {sideLabel}
            </h3>
            <StatusPill tone="risk">
              {liquidationBuffer ? `${liquidationBuffer.toFixed(1)}% liq buffer` : "No liq price"}
            </StatusPill>
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm text-slate-500">Exposure / equity</div>
          <div className="mt-1 text-[32px] font-semibold tracking-[-0.05em] text-rose-100">
            {exposureMultiple.toFixed(1)}x
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Account equity"
          value={formatUsd(equityUsd, 1)}
          detail="Live account equity from Pacifica"
          tone="good"
        />
        <StatTile
          label="Position exposure"
          value={formatCompactUsd(position.notionalUsd)}
          detail={`${position.amount} ${position.symbol} at mark`}
          tone={exposureMultiple >= 10 ? "danger" : "warn"}
        />
        <StatTile
          label="Liquidation price"
          value={position.liquidationPrice ? formatPrice(position.liquidationPrice) : "n/a"}
          detail={`Mark now ${formatPrice(position.markPrice)}`}
          tone={liquidationBuffer < 8 ? "danger" : "warn"}
        />
        <StatTile
          label="Margin used"
          value={formatUsd(accountMarginUsd, 1)}
          detail="Total margin used by the account"
          tone="warn"
        />
      </div>

      <div className="mt-5 rounded-[22px] border border-white/10 bg-black/20 p-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-sm font-semibold text-white">Liquidation buffer</div>
            <div className="mt-1 text-sm text-slate-400">
              Below 8% is treated as high risk for new leverage.
            </div>
          </div>
          <div className="font-mono text-sm text-slate-300">
            {position.liquidationDistancePct === null
              ? "n/a"
              : `${position.liquidationDistancePct.toFixed(2)}%`}
          </div>
        </div>
        <div className="mt-4">
          <ProgressBar value={liquidationBuffer} dangerAt={12} />
        </div>
      </div>
    </article>
  );
}

function MarketRow({
  market,
  isFocused,
  onFocus,
}: {
  market: PacificaRiskRoomResponse["marketSnapshot"][number];
  isFocused: boolean;
  onFocus: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onFocus}
      className={cn(
        "w-full rounded-[20px] border p-4 text-left transition",
        isFocused
          ? "border-cyan-300/30 bg-cyan-300/10"
          : "border-white/10 bg-[#101827] hover:border-white/20",
      )}
    >
      <div className="grid gap-3 md:grid-cols-[1fr_repeat(4,minmax(0,0.8fr))] md:items-center">
        <div>
          <div className="text-lg font-semibold text-white">{market.symbol}</div>
          <div className="mt-1 text-sm text-slate-500">{market.maxLeverage}x max leverage</div>
        </div>
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-500">
            Mark
          </div>
          <div className="mt-1 text-sm font-semibold text-white">{formatPrice(market.mark)}</div>
        </div>
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-500">
            24h
          </div>
          <div className={cn("mt-1 text-sm font-semibold", market.change24hPct >= 0 ? "text-emerald-300" : "text-rose-300")}>
            {formatPct(market.change24hPct)}
          </div>
        </div>
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-500">
            Funding
          </div>
          <div className="mt-1 text-sm font-semibold text-white">
            {formatFundingRate(market.nextFundingRate)}
          </div>
        </div>
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-500">
            Volume
          </div>
          <div className="mt-1 text-sm font-semibold text-white">
            {formatCompactUsd(market.volume24h)}
          </div>
        </div>
      </div>
    </button>
  );
}

function FundingCard({
  curve,
  activeNotional,
}: {
  curve: PacificaFundingCurve;
  activeNotional: number;
}) {
  const values = curve.points
    .slice()
    .reverse()
    .map((point) => point.nextFundingRate * 10000);
  const nextCost = Math.abs(activeNotional * curve.nextFundingRate);

  return (
    <article className="rounded-[24px] border border-white/10 bg-[#101827] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-slate-500">
            {curve.symbol}
          </div>
          <div className="mt-2 text-[28px] font-semibold leading-none tracking-[-0.05em] text-white">
            {formatFundingRate(curve.nextFundingRate)}
          </div>
        </div>
        <StatusPill tone="soft">{curve.regime}</StatusPill>
      </div>
      <div className="mt-4 rounded-[18px] border border-white/10 bg-black/20 px-3 py-3">
        <Sparkline values={values} stroke="#22d3ee" />
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-[16px] border border-white/10 bg-black/20 px-4 py-3">
          <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-500">
            Cost on current position
          </div>
          <div className="mt-2 text-sm font-semibold text-white">
            {activeNotional ? formatUsd(nextCost, 4) : "n/a"}
          </div>
        </div>
        <div className="rounded-[16px] border border-white/10 bg-black/20 px-4 py-3">
          <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-500">
            Cost per $1k
          </div>
          <div className="mt-2 text-sm font-semibold text-white">
            {formatUsd(curve.hourlyCarryFor1kUsd, 4)}
          </div>
        </div>
      </div>
    </article>
  );
}

export default function PacificaRiskRoomPage() {
  const searchParams = useSearchParams();
  const compactMode = searchParams.get("compact") === "1";
  const [accountInput, setAccountInput] = useState(DEFAULT_LIVE_PACIFICA_ACCOUNT);
  const [submittedAccount, setSubmittedAccount] = useState(DEFAULT_LIVE_PACIFICA_ACCOUNT);
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
          throw new Error("Failed to load Pacifica account health data");
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
          setFocusSymbol(nextPayload.account.positions[0]?.symbol || nextPayload.marketSnapshot[0]?.symbol || "");
        }
      } catch (loadError) {
        if (cancelled) {
          return;
        }

        setError(
          loadError instanceof Error
            ? loadError.message
            : "Failed to load Pacifica account health data",
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

  const riskSummary = payload?.riskSummary || null;
  const riskTone = riskSummary ? RISK_TONES[riskSummary.status] : RISK_TONES.watch;
  const RiskIcon = riskTone.icon;
  const primaryPosition = payload?.account.positions[0] || null;
  const grossExposure = payload
    ? payload.account.positions.reduce((sum, item) => sum + item.notionalUsd, 0)
    : 0;
  const equityUsd = payload?.account.equityUsd || 0;
  const exposureMultiple = equityUsd > 0 ? grossExposure / equityUsd : 0;
  const targetExposureMultiple = riskSummary?.status === "critical" ? 8 : 10;
  const reduceToTargetUsd = Math.max(0, grossExposure - equityUsd * targetExposureMultiple);
  const collateralToTargetUsd =
    targetExposureMultiple > 0
      ? Math.max(0, grossExposure / targetExposureMultiple - equityUsd)
      : 0;
  const focusMarket =
    payload?.marketSnapshot.find((item) => item.symbol === focusSymbol) || null;
  const primaryFunding =
    payload?.fundingCurves.find((item) => item.symbol === primaryPosition?.symbol) ||
    payload?.fundingCurves.find((item) => item.symbol === focusSymbol) ||
    null;
  const portfolioSeries = payload?.account.portfolioHistory.map((item) => item.equityUsd) || [];
  const activityItems = payload
    ? [
        ...payload.account.openOrders.slice(0, 3).map(buildOrderActivity),
        ...payload.account.tradeHistory.slice(0, 6).map(buildTradeActivity),
      ]
        .sort((left, right) => (right.timestamp || 0) - (left.timestamp || 0))
        .slice(0, 6)
    : [];

  return (
    <main className="min-h-screen overflow-hidden bg-[#05070d] text-slate-100">
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(circle_at_18%_8%,rgba(34,211,238,0.16),transparent_26%),radial-gradient(circle_at_92%_12%,rgba(244,63,94,0.12),transparent_22%),linear-gradient(135deg,#05070d_0%,#08111f_52%,#060914_100%)]" />
      <div className="fixed inset-0 -z-10 opacity-[0.08] [background-image:linear-gradient(rgba(255,255,255,.3)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.3)_1px,transparent_1px)] [background-size:48px_48px]" />

      <div className="mx-auto max-w-[1540px] px-4 py-4 md:px-6">
        <div className="grid gap-4 xl:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="rounded-[32px] border border-white/10 bg-[#0a0f1c]/95 p-4 shadow-[0_28px_120px_rgba(2,6,23,0.45)] xl:sticky xl:top-4 xl:h-[calc(100vh-2rem)]">
            <div className="rounded-[24px] border border-cyan-300/15 bg-cyan-300/10 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-300 text-[#06111d]">
                  <Radar className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-base font-semibold text-white">Pacifica Account Health</div>
                  <div className="text-sm text-cyan-100/70">Risk before leverage</div>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <StatusPill>Market {payload ? SOURCE_LABELS[payload.sourceStatus.market] : "..."}</StatusPill>
                <StatusPill tone="soft">
                  Account {payload ? SOURCE_LABELS[payload.sourceStatus.account] : "..."}
                </StatusPill>
              </div>
            </div>

            <div className="mt-4">
              <NavRail />
            </div>

            <form
              className="mt-5 space-y-3 rounded-[24px] border border-white/10 bg-[#101827] p-4"
              onSubmit={(event) => {
                event.preventDefault();
                setSubmittedAccount(accountInput.trim());
              }}
            >
              <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-slate-500">
                Pacifica wallet
              </div>
              <input
                value={accountInput}
                onChange={(event) => setAccountInput(event.target.value)}
                placeholder="Wallet or subaccount address"
                className="w-full rounded-[18px] border border-white/10 bg-[#0a1020] px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-300/50"
              />
              <button
                type="submit"
                className="w-full rounded-[16px] bg-cyan-300 px-4 py-3 text-sm font-semibold text-[#06111d] transition hover:bg-cyan-200"
              >
                Check health
              </button>
              <button
                type="button"
                onClick={() => {
                  setAccountInput("");
                  setSubmittedAccount("");
                }}
                className="w-full rounded-[16px] border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-slate-200 transition hover:bg-white/[0.08]"
              >
                Use sample mode
              </button>
            </form>

            <div className={cn("mt-5 rounded-[24px] border bg-[#101827] p-4", riskTone.border, riskTone.glow)}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-slate-500">
                    Health score
                  </div>
                  <div className={cn("mt-2 flex items-center gap-2 text-sm font-semibold", riskTone.text)}>
                    <RiskIcon className="h-4 w-4" />
                    {riskTone.label}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setRefreshNonce((value) => value + 1)}
                  className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-slate-300 transition hover:bg-white/[0.08]"
                >
                  {isRefreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
                  Refresh
                </button>
              </div>
              <div className="mt-4 text-[52px] font-semibold leading-none tracking-[-0.07em] text-white">
                {riskSummary ? riskSummary.score : "--"}
              </div>
              <div className="mt-1 font-mono text-[11px] uppercase tracking-[0.22em] text-slate-500">
                out of 100
              </div>
            </div>

            {!compactMode ? (
              <Link
                href="https://docs.pacifica.fi/api-documentation/api"
                className="mt-5 flex items-center justify-between rounded-[18px] border border-white/10 bg-[#101827] px-4 py-3 text-sm text-slate-300 transition hover:bg-white/[0.05]"
              >
                <span className="flex items-center gap-3">
                  <BookOpen className="h-4 w-4" />
                  Pacifica API docs
                </span>
                <ExternalLink className="h-4 w-4" />
              </Link>
            ) : null}
          </aside>

          <div className="space-y-4">
            <section
              id="health"
              className={cn(
                "rounded-[34px] border bg-[#0a0f1c]/95 p-5 shadow-[0_30px_140px_rgba(2,6,23,0.45)] md:p-7",
                riskTone.border,
              )}
            >
              <div className="grid gap-6 2xl:grid-cols-[1.2fr,0.8fr]">
                <div>
                  <div className="flex flex-wrap gap-2">
                    <StatusPill>Analytics & risk dashboard</StatusPill>
                    <StatusPill tone="soft">
                      {payload ? `Updated ${new Date(payload.generatedAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}` : "Loading"}
                    </StatusPill>
                  </div>
                  <h1 className="mt-5 max-w-4xl text-[40px] font-semibold leading-[0.95] tracking-[-0.07em] text-white md:text-[64px]">
                    Know your Pacifica liquidation risk before adding leverage.
                  </h1>
                  <p className="mt-5 max-w-3xl text-base leading-8 text-slate-300">
                    A live account health monitor that turns Pacifica equity, position exposure,
                    liquidation distance, funding, and recent activity into one clear safety decision.
                  </p>
                </div>

                <div className="rounded-[28px] border border-white/10 bg-[#101827] p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="font-mono text-[11px] uppercase tracking-[0.24em] text-slate-500">
                        Current decision
                      </div>
                      <div className={cn("mt-3 flex items-center gap-2 text-xl font-semibold", riskTone.text)}>
                        <RiskIcon className="h-5 w-5" />
                        {riskTone.label}
                      </div>
                    </div>
                    <StatusPill tone={riskSummary?.status === "critical" ? "risk" : "soft"}>
                      {riskSummary ? `${riskSummary.score}/100` : "--"}
                    </StatusPill>
                  </div>
                  <div className="mt-5 rounded-[22px] border border-white/10 bg-black/20 p-4 text-sm leading-7 text-slate-200">
                    {riskSummary?.verdict || "Loading current Pacifica account state..."}
                  </div>
                  <div className="mt-4 text-sm leading-6 text-slate-500">
                    Account: {payload ? shortAddress(payload.account.accountId) : shortAddress(DEFAULT_LIVE_PACIFICA_ACCOUNT)}
                  </div>
                </div>
              </div>

              {error ? (
                <div className="mt-5 rounded-[20px] border border-rose-400/25 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
                  {error}
                </div>
              ) : null}
            </section>

            {isLoading && !payload ? (
              <div className="flex min-h-[360px] items-center justify-center rounded-[32px] border border-white/10 bg-[#0a0f1c]/95">
                <div className="flex items-center gap-3 text-slate-300">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Loading Pacifica account health...
                </div>
              </div>
            ) : null}

            {payload ? (
              <>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <StatTile
                    label="Account equity"
                    value={formatUsd(payload.account.equityUsd, 1)}
                    detail={`Available ${formatUsd(payload.account.availableToSpendUsd, 1)}`}
                    tone="good"
                  />
                  <StatTile
                    label="Total exposure"
                    value={formatCompactUsd(grossExposure)}
                    detail={`${exposureMultiple.toFixed(1)}x account equity`}
                    tone={exposureMultiple >= 10 ? "danger" : "warn"}
                  />
                  <StatTile
                    label="Open positions"
                    value={String(payload.account.positions.length)}
                    detail={primaryPosition ? `${primaryPosition.symbol} is the main risk driver` : "No open position"}
                  />
                  <StatTile
                    label="Funding on position"
                    value={
                      primaryPosition && primaryFunding
                        ? formatUsd(Math.abs(primaryPosition.notionalUsd * primaryFunding.nextFundingRate), 4)
                        : "n/a"
                    }
                    detail={primaryFunding ? `${primaryFunding.symbol} next funding ${formatFundingRate(primaryFunding.nextFundingRate)}` : "No funding curve"}
                  />
                </div>

                <div className="grid gap-4 2xl:grid-cols-[1.1fr,0.9fr]">
                  <Panel
                    id="position"
                    eyebrow="Position risk"
                    title={primaryPosition ? `${primaryPosition.symbol} is driving the health score` : "No live position"}
                    body="This section explains the account risk in plain language: exposure, liquidation buffer, and account margin."
                  >
                    <PositionRiskCard
                      position={primaryPosition}
                      equityUsd={payload.account.equityUsd}
                      accountMarginUsd={payload.account.marginUsedUsd}
                      exposureMultiple={exposureMultiple}
                    />
                  </Panel>

                  <Panel
                    id="action"
                    eyebrow="Recommended action"
                    title="What to do next"
                    body="The action list is tied to the live account position, not unrelated markets."
                    action={<StatusPill tone={riskSummary?.status === "critical" ? "risk" : "soft"}>{riskTone.label}</StatusPill>}
                  >
                    <ActionList
                      primaryPosition={primaryPosition}
                      reduceToTargetUsd={reduceToTargetUsd}
                      collateralToTargetUsd={collateralToTargetUsd}
                      targetExposureMultiple={targetExposureMultiple}
                    />
                  </Panel>
                </div>

                <div className="grid gap-4 2xl:grid-cols-[0.9fr,1.1fr]">
                  <Panel
                    id="funding"
                    eyebrow="Funding cost"
                    title={primaryFunding ? `${primaryFunding.symbol} carry on the live position` : "Funding context"}
                    body="Funding is shown as a cost on the current account exposure, so it is clear whether carry matters."
                  >
                    {primaryFunding ? (
                      <FundingCard
                        curve={primaryFunding}
                        activeNotional={primaryPosition?.notionalUsd || 0}
                      />
                    ) : (
                      <div className="rounded-[24px] border border-white/10 bg-[#101827] p-5 text-sm text-slate-400">
                        No funding curve was returned for the active position.
                      </div>
                    )}
                  </Panel>

                  <Panel
                    id="markets"
                    eyebrow="Market context"
                    title="Use the watchlist as context, not as the main decision"
                    body="The account health score is driven by the live position. Market data stays available for comparison."
                    action={<StatusPill tone="soft">{payload.watchlistSymbols.join(", ")}</StatusPill>}
                  >
                    <div className="grid gap-3">
                      {payload.marketSnapshot.map((market) => (
                        <MarketRow
                          key={market.symbol}
                          market={market}
                          isFocused={focusSymbol === market.symbol}
                          onFocus={() => setFocusSymbol(market.symbol)}
                        />
                      ))}
                    </div>
                  </Panel>
                </div>

                <div className="grid gap-4 2xl:grid-cols-[1.05fr,0.95fr]">
                  <Panel
                    eyebrow="Recent activity"
                    title="Account fills and open orders"
                    body="Only real account activity is shown here. Position-history records without close prices are intentionally hidden."
                  >
                    <div className="grid gap-3">
                      {activityItems.length ? (
                        activityItems.map((item, index) => (
                          <article
                            key={`${item.title}-${index}`}
                            className="rounded-[20px] border border-white/10 bg-[#101827] p-4"
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div>
                                <div className="text-sm font-semibold text-white">{item.title}</div>
                                <div className="mt-2 text-sm text-slate-400">{item.detail}</div>
                              </div>
                              <div className="shrink-0 text-xs text-slate-500">
                                {formatTime(item.timestamp)}
                              </div>
                            </div>
                          </article>
                        ))
                      ) : (
                        <div className="rounded-[20px] border border-white/10 bg-[#101827] p-5 text-sm text-slate-400">
                          No recent fills or open orders were returned.
                        </div>
                      )}
                    </div>
                  </Panel>

                  <Panel
                    eyebrow="Health signals"
                    title="Why the score changed"
                    body="These are the exact inputs behind the account health score."
                  >
                    <div className="grid gap-3">
                      {riskSummary?.signals.map((signal) => (
                        <article
                          key={signal.title}
                          className="rounded-[20px] border border-white/10 bg-[#101827] p-4"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="text-sm font-semibold text-white">{signal.title}</div>
                            <StatusPill tone={signal.tone === "critical" ? "risk" : "soft"}>
                              {signal.tone}
                            </StatusPill>
                          </div>
                          <div className="mt-3 text-[28px] font-semibold leading-none tracking-[-0.05em] text-white">
                            {signal.value}
                          </div>
                          <div className="mt-2 text-sm leading-6 text-slate-400">{signal.detail}</div>
                        </article>
                      ))}
                    </div>
                  </Panel>
                </div>

                <Panel
                  id="data"
                  eyebrow="Live data proof"
                  title="Pacifica data used in this health check"
                  body="The product uses Pacifica REST data for account state, positions, funding, market prices, and recent trades."
                >
                  <div className="grid gap-4 xl:grid-cols-[0.9fr,1.1fr]">
                    <article className="rounded-[24px] border border-white/10 bg-[#101827] p-4">
                      <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-slate-500">
                        Portfolio replay
                      </div>
                      <div className="mt-4 rounded-[18px] border border-white/10 bg-black/20 px-3 py-4">
                        <Sparkline values={portfolioSeries} stroke="#34d399" />
                      </div>
                    </article>

                    <article className="rounded-[24px] border border-white/10 bg-[#101827] p-4">
                      <div className="flex flex-wrap gap-2">
                        {payload.dataSources.map((source) => (
                          <StatusPill key={source} tone="soft">
                            {source.replace("Pacifica REST ", "")}
                          </StatusPill>
                        ))}
                      </div>
                      {payload.notes.length ? (
                        <div className="mt-4 space-y-2">
                          {payload.notes.map((note) => (
                            <div
                              key={note}
                              className="rounded-[16px] border border-white/10 bg-black/20 px-4 py-3 text-sm leading-6 text-slate-400"
                            >
                              {note}
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </article>
                  </div>
                </Panel>
              </>
            ) : null}
          </div>
        </div>
      </div>
    </main>
  );
}
