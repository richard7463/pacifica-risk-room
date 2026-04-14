"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  ArrowRight,
  BellRing,
  BookmarkPlus,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Copy,
  ExternalLink,
  FlaskConical,
  Loader2,
  PlugZap,
  Radar,
  RefreshCcw,
  ShieldCheck,
  ShieldX,
  Sparkles,
  Target,
  Trash2,
  Wallet,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { DEFAULT_LIVE_PACIFICA_ACCOUNT } from "@/lib/pacificaRiskRoom";
import type {
  PacificaFundingCurve,
  PacificaOrder,
  PacificaRiskRoomResponse,
  PacificaRiskStatus,
  PacificaTradeHistoryItem,
} from "@/lib/pacificaRiskRoom";
import {
  DEFAULT_SCENARIO_INPUT,
  buildPlannerOptions,
  buildScenarioResult,
  computeHealthMetrics,
  evaluateWatchItem,
  type PacificaPlannerOption,
  type PacificaScenarioAction,
  type PacificaScenarioInput,
  type PacificaWatchItem,
} from "@/lib/pacificaDecision";

const DEFAULT_SYMBOLS = "BTC, ETH, SOL, XRP, HYPE, PUMP";
const WATCH_STORAGE_KEY = "pacifica-risk-room.watch-items";
const GUIDE_STORAGE_KEY = "pacifica-risk-room.guide-seen";

const SOURCE_LABELS = {
  live: "Live",
  sample: "Sample",
  none: "Unavailable",
} as const;

const WORKSPACE_TABS = [
  { id: "overview", label: "Desk", icon: ShieldCheck },
  { id: "scenario", label: "Scenario", icon: FlaskConical },
  { id: "planner", label: "Planner", icon: Target },
  { id: "watch", label: "Watch", icon: BellRing },
] as const;

type WorkspaceId = (typeof WORKSPACE_TABS)[number]["id"];

type WalletFamily = "solana" | "ethereum";

interface SolanaPublicKeyLike {
  toString(): string;
}

interface SolanaWalletProvider {
  isBackpack?: boolean;
  isPhantom?: boolean;
  isSolflare?: boolean;
  publicKey?: SolanaPublicKeyLike | null;
  connect: (
    options?: { onlyIfTrusted?: boolean },
  ) => Promise<{ publicKey?: SolanaPublicKeyLike | null } | void>;
  disconnect?: () => Promise<void>;
  on?: (event: string, listener: (...args: unknown[]) => void) => void;
  removeListener?: (event: string, listener: (...args: unknown[]) => void) => void;
}

interface EthereumWalletProvider {
  isCoinbaseWallet?: boolean;
  isMetaMask?: boolean;
  request: (args: {
    method: string;
    params?: unknown[] | Record<string, unknown>;
  }) => Promise<unknown>;
  on?: (event: string, listener: (...args: unknown[]) => void) => void;
  removeListener?: (event: string, listener: (...args: unknown[]) => void) => void;
}

type WalletProviderDescriptor =
  | {
      family: "solana";
      label: string;
      provider: SolanaWalletProvider;
    }
  | {
      family: "ethereum";
      label: string;
      provider: EthereumWalletProvider;
    };

interface ConnectedWalletState {
  address: string;
  family: WalletFamily;
  label: string;
}

type GuideTargetId =
  | "connect-wallet"
  | "wallet-form"
  | "desk-metrics"
  | "scenario-panel"
  | "watch-panel";

const GUIDE_STEPS = [
  {
    id: "connect",
    eyebrow: "Step 1",
    targetId: "connect-wallet" as GuideTargetId,
    title: "Connect a wallet first",
    summary:
      "Use this button to sync a browser wallet into the desk instantly. It is the fastest way to turn the workspace from sample mode into a real account view.",
    detail:
      "Phantom, Backpack, Solflare, and MetaMask are supported. After connect, the address is written into the account field and the desk refreshes automatically.",
    actionLabel: "Connect Wallet",
    workspace: "overview" as WorkspaceId,
  },
  {
    id: "wallet",
    eyebrow: "Step 2",
    targetId: "wallet-form" as GuideTargetId,
    title: "Paste or switch the Pacifica account here",
    summary:
      "This is your account switcher. Even if you connect a wallet, you can still overwrite the input to inspect any Pacifica wallet or subaccount manually.",
    detail:
      "Use Review desk to load that account, or Use sample mode when you just want to demo the product flow without a live account.",
    actionLabel: "Review Desk",
    workspace: "overview" as WorkspaceId,
  },
  {
    id: "desk",
    eyebrow: "Step 3",
    targetId: "desk-metrics" as GuideTargetId,
    title: "Read these three numbers before making a trade",
    summary:
      "Risk score, exposure versus equity, and liquidation buffer are the core health check. If these are stretched, the desk is already stressed.",
    detail:
      "A better desk has a higher score, lower exposure multiple, and a wider liquidation buffer. Read these before touching leverage.",
    actionLabel: "Open Scenario",
    workspace: "overview" as WorkspaceId,
  },
  {
    id: "scenario",
    eyebrow: "Step 4",
    targetId: "scenario-panel" as GuideTargetId,
    title: "Scenario is where the product becomes useful",
    summary:
      "This is the pre-trade simulator. Add, reduce, rotate, or top up collateral and compare the projected desk against the live one before you place anything.",
    detail:
      "If the projected score drops or the liquidation buffer gets tighter, that simulated move is making the account worse.",
    actionLabel: "Open Watch",
    workspace: "scenario" as WorkspaceId,
  },
  {
    id: "watch",
    eyebrow: "Step 5",
    targetId: "watch-panel" as GuideTargetId,
    title: "Watch turns it into a monitoring app",
    summary:
      "Save threshold presets here so you can reload important desks instantly and know which wallet needs attention first.",
    detail:
      "Set a minimum score, maximum exposure multiple, and liquidation floor. That gives you a reusable risk profile instead of a one-off query.",
    actionLabel: "Finish Tour",
    workspace: "watch" as WorkspaceId,
  },
] as const;

declare global {
  interface Window {
    backpack?: {
      solana?: SolanaWalletProvider;
    };
    ethereum?: EthereumWalletProvider;
    phantom?: {
      solana?: SolanaWalletProvider;
    };
    solflare?: SolanaWalletProvider;
  }
}

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
    border: "border-emerald-400/28",
    glow: "shadow-[0_24px_90px_rgba(16,185,129,0.14)]",
    icon: ShieldCheck,
    label: "Healthy",
    text: "text-emerald-200",
  },
  watch: {
    badge: "border-amber-400/25 bg-amber-400/10 text-amber-200",
    border: "border-amber-400/25",
    glow: "shadow-[0_24px_90px_rgba(245,158,11,0.14)]",
    icon: AlertTriangle,
    label: "Watch",
    text: "text-amber-200",
  },
  critical: {
    badge: "border-[#ff7a59]/28 bg-[#ff7a59]/10 text-[#ffd2c6]",
    border: "border-[#ff7a59]/28",
    glow: "shadow-[0_24px_90px_rgba(255,122,89,0.14)]",
    icon: ShieldX,
    label: "High risk",
    text: "text-[#ffd2c6]",
  },
};

interface WatchSnapshotState {
  loading: boolean;
  error: string;
  payload: PacificaRiskRoomResponse | null;
}

const compactUsdFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
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

function formatSigned(value: number, suffix = "") {
  return `${value >= 0 ? "+" : ""}${value.toFixed(0)}${suffix}`;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function resolveWalletProvider(): WalletProviderDescriptor | null {
  if (typeof window === "undefined") {
    return null;
  }

  if (window.backpack?.solana) {
    return {
      family: "solana",
      label: "Backpack",
      provider: window.backpack.solana,
    };
  }

  if (window.phantom?.solana) {
    return {
      family: "solana",
      label: "Phantom",
      provider: window.phantom.solana,
    };
  }

  if (window.solflare) {
    return {
      family: "solana",
      label: "Solflare",
      provider: window.solflare,
    };
  }

  if (window.ethereum) {
    return {
      family: "ethereum",
      label: window.ethereum.isCoinbaseWallet ? "Coinbase Wallet" : "MetaMask",
      provider: window.ethereum,
    };
  }

  return null;
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
          ? "border-[#f7f1df]/12 bg-white/[0.04] text-[#cbd6ce]"
          : tone === "risk"
            ? "border-[#ff7a59]/28 bg-[#ff7a59]/10 text-[#ffd2c6]"
            : "border-[#65f3e0]/25 bg-[#65f3e0]/10 text-[#bafdf4]",
      )}
    >
      {children}
    </span>
  );
}

function ShellPane({
  eyebrow,
  title,
  action,
  children,
  className,
}: {
  eyebrow: string;
  title: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "grain rounded-[30px] border border-[#f7f1df]/12 bg-[#0c1715]/95 shadow-[0_28px_100px_rgba(0,0,0,0.3)]",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-4 border-b border-[#f7f1df]/10 px-5 py-4">
        <div>
          <div className="font-mono text-[11px] uppercase tracking-[0.24em] text-[#7f9189]">
            {eyebrow}
          </div>
          <div className="font-display mt-2 text-[28px] font-semibold tracking-[-0.06em] text-[#f7f1df]">
            {title}
          </div>
        </div>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

function WorkspaceTabButton({
  label,
  active,
  icon: Icon,
  onClick,
}: {
  label: string;
  active: boolean;
  icon: typeof ShieldCheck;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 rounded-[18px] border px-4 py-3 text-left transition",
        active
          ? "border-[#65f3e0]/28 bg-[#65f3e0]/10 text-[#f7f1df]"
          : "border-transparent text-[#a8b6ac] hover:border-[#f7f1df]/12 hover:bg-white/[0.04] hover:text-[#f7f1df]",
      )}
    >
      <Icon className="h-4 w-4" />
      <span className="text-sm font-medium">{label}</span>
    </button>
  );
}

function HeaderMetric({
  label,
  value,
  detail,
  tone = "default",
}: {
  label: string;
  value: string;
  detail: string;
  tone?: "default" | "good" | "warn" | "danger";
}) {
  return (
    <div
      className={cn(
        "rounded-[22px] border bg-[#101b18] px-4 py-4",
        tone === "good"
          ? "border-emerald-400/20"
          : tone === "warn"
            ? "border-amber-400/20"
            : tone === "danger"
              ? "border-[#ff7a59]/24"
              : "border-[#f7f1df]/12",
      )}
    >
      <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#7f9189]">
        {label}
      </div>
      <div className="font-display mt-3 text-[34px] font-semibold leading-none tracking-[-0.07em] text-[#f7f1df]">
        {value}
      </div>
      <div className="mt-2 text-sm text-[#a8b6ac]">{detail}</div>
    </div>
  );
}

function ScenarioActionButton({
  label,
  value,
  active,
  onClick,
}: {
  label: string;
  value: PacificaScenarioAction;
  active: boolean;
  onClick: (value: PacificaScenarioAction) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onClick(value)}
      className={cn(
        "rounded-full border px-4 py-2 text-sm font-medium transition",
        active
          ? "border-[#65f3e0]/30 bg-[#65f3e0]/10 text-[#bafdf4]"
          : "border-[#f7f1df]/12 bg-[#101b18] text-[#a8b6ac] hover:text-[#f7f1df]",
      )}
    >
      {label}
    </button>
  );
}

function ComparisonCell({
  label,
  current,
  projected,
  delta,
  tone = "default",
}: {
  label: string;
  current: string;
  projected: string;
  delta: string;
  tone?: "default" | "good" | "warn" | "danger";
}) {
  return (
    <div
      className={cn(
        "rounded-[22px] border bg-[#101b18] px-4 py-4",
        tone === "good"
          ? "border-emerald-400/20"
          : tone === "warn"
            ? "border-amber-400/20"
            : tone === "danger"
              ? "border-[#ff7a59]/24"
              : "border-[#f7f1df]/12",
      )}
    >
      <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#7f9189]">
        {label}
      </div>
      <div className="mt-3 flex items-end justify-between gap-4">
        <div>
          <div className="text-xs text-[#7f9189]">Current</div>
          <div className="font-display mt-1 text-2xl font-semibold tracking-[-0.05em] text-[#f7f1df]">
            {current}
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs text-[#7f9189]">Projected</div>
          <div className="font-display mt-1 text-2xl font-semibold tracking-[-0.05em] text-[#f7f1df]">
            {projected}
          </div>
        </div>
      </div>
      <div className="mt-3 text-sm text-[#a8b6ac]">Delta {delta}</div>
    </div>
  );
}

function MarketListRow({
  market,
  active,
  onClick,
}: {
  market: PacificaRiskRoomResponse["marketSnapshot"][number];
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full rounded-[20px] border px-4 py-3 text-left transition",
        active
          ? "border-[#65f3e0]/28 bg-[#65f3e0]/10"
          : "border-[#f7f1df]/12 bg-[#101b18] hover:border-[#f7f1df]/20",
      )}
    >
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="text-sm font-semibold text-[#f7f1df]">{market.symbol}</div>
          <div className="mt-1 text-xs text-[#7f9189]">{market.maxLeverage}x max</div>
        </div>
        <div className="text-right">
          <div className="text-sm font-semibold text-[#f7f1df]">{formatPrice(market.mark)}</div>
          <div
            className={cn(
              "mt-1 text-xs",
              market.change24hPct >= 0 ? "text-emerald-300" : "text-rose-300",
            )}
          >
            {formatPct(market.change24hPct)}
          </div>
        </div>
      </div>
    </button>
  );
}

function WatchRow({
  item,
  active,
  score,
  alertsCount,
  onClick,
}: {
  item: PacificaWatchItem;
  active: boolean;
  score: number | null;
  alertsCount: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full rounded-[18px] border px-4 py-3 text-left transition",
        active
          ? "border-[#65f3e0]/28 bg-[#65f3e0]/10"
          : "border-[#f7f1df]/12 bg-[#101b18] hover:border-[#f7f1df]/20",
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-medium text-[#f7f1df]">{item.label}</div>
          <div className="mt-1 text-xs text-[#7f9189]">{shortAddress(item.accountId)}</div>
        </div>
        <div className="text-right">
          <div className="font-mono text-xs text-[#f7f1df]">{score === null ? "--" : `${score}/100`}</div>
          <div className="mt-1 text-xs text-[#7f9189]">
            {alertsCount ? `${alertsCount} alerts` : "quiet"}
          </div>
        </div>
      </div>
    </button>
  );
}

function PlanLane({
  option,
  onLoad,
}: {
  option: PacificaPlannerOption;
  onLoad: (option: PacificaPlannerOption) => void;
}) {
  const tone = RISK_TONES[option.projected.riskSummary.status];

  return (
    <article className={cn("rounded-[26px] border bg-[#101b18] px-5 py-5", tone.border, tone.glow)}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#7f9189]">
            Plan
          </div>
          <div className="font-display mt-2 text-[32px] font-semibold tracking-[-0.06em] text-[#f7f1df]">
            {option.title}
          </div>
        </div>
        <StatusPill tone={option.projected.riskSummary.status === "critical" ? "risk" : "soft"}>
          {tone.label}
        </StatusPill>
      </div>
      <p className="mt-4 text-sm leading-7 text-[#c7d0c6]">{option.summary}</p>
      <div className="mt-5 rounded-[22px] border border-[#f7f1df]/12 bg-[#07100f]/55 px-4 py-4">
        <div className="text-sm font-semibold text-[#f7f1df]">
          Projected score {option.projected.riskSummary.score}/100
        </div>
        <div className="mt-2 text-sm text-[#a8b6ac]">{option.rationale}</div>
      </div>
      <div className="mt-5 space-y-2">
        {option.steps.map((step) => (
          <div
            key={step}
            className="rounded-[18px] border border-[#f7f1df]/12 bg-[#07100f]/45 px-4 py-3 text-sm leading-6 text-[#e9e0cf]"
          >
            {step}
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() => onLoad(option)}
        className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#65f3e0] px-4 py-2 text-sm font-semibold text-[#07100f] transition hover:bg-[#bafdf4]"
      >
        Load Into Scenario
        <ArrowRight className="h-4 w-4" />
      </button>
    </article>
  );
}

function WatchCard({
  item,
  snapshot,
  isCurrent,
  onLoad,
  onCopy,
  onDelete,
  copied,
}: {
  item: PacificaWatchItem;
  snapshot: WatchSnapshotState | null;
  isCurrent: boolean;
  onLoad: () => void;
  onCopy: () => void;
  onDelete: () => void;
  copied: boolean;
}) {
  const payload = snapshot?.payload;
  const evaluation = payload ? evaluateWatchItem(item, payload) : null;
  const tone = evaluation ? RISK_TONES[evaluation.severity] : RISK_TONES.watch;

  return (
    <article className={cn("rounded-[24px] border bg-[#101b18] px-4 py-4", tone.border)}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-base font-semibold text-[#f7f1df]">{item.label}</div>
          <div className="mt-1 text-sm text-[#7f9189]">{item.accountId}</div>
        </div>
        <StatusPill tone={evaluation?.severity === "critical" ? "risk" : "soft"}>
          {payload ? `${payload.riskSummary.score}/100` : snapshot?.loading ? "syncing" : "idle"}
        </StatusPill>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-[18px] border border-[#f7f1df]/12 bg-[#07100f]/55 px-4 py-3">
          <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#7f9189]">
            Thresholds
          </div>
          <div className="mt-2 text-sm leading-7 text-[#c7d0c6]">
            Score {item.minScore}+ · Exposure {item.maxExposureMultiple}x · Buffer {item.minLiqBufferPct}% · Funding {item.maxFundingDragUsd} USD
          </div>
        </div>
        <div className="rounded-[18px] border border-[#f7f1df]/12 bg-[#07100f]/55 px-4 py-3">
          <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#7f9189]">
            State
          </div>
          {snapshot?.loading ? (
            <div className="mt-2 inline-flex items-center gap-2 text-sm text-[#c7d0c6]">
              <Loader2 className="h-4 w-4 animate-spin" />
              Checking
            </div>
          ) : snapshot?.error ? (
            <div className="mt-2 text-sm text-[#ffd2c6]">{snapshot.error}</div>
          ) : evaluation ? (
            <div className="mt-2 text-sm leading-7 text-[#c7d0c6]">
              {evaluation.alerts.length
                ? evaluation.alerts[0]
                : isCurrent
                  ? "Current workspace account. Thresholds are currently quiet."
                  : "No thresholds are breached right now."}
            </div>
          ) : (
            <div className="mt-2 text-sm text-[#a8b6ac]">No recent watch data.</div>
          )}
        </div>
      </div>

      {evaluation?.alerts.length ? (
        <div className="mt-4 space-y-2">
          {evaluation.alerts.slice(0, 3).map((alert) => (
            <div
              key={alert}
              className="rounded-[16px] border border-[#ff7a59]/22 bg-[#ff7a59]/8 px-4 py-3 text-sm text-[#ffe0d8]"
            >
              {alert}
            </div>
          ))}
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onLoad}
          className="inline-flex items-center gap-2 rounded-full border border-[#f7f1df]/12 bg-white/[0.04] px-4 py-2 text-sm text-[#f7f1df] transition hover:bg-white/[0.08]"
        >
          Load
          <ChevronRight className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={onCopy}
          className="inline-flex items-center gap-2 rounded-full border border-[#f7f1df]/12 bg-white/[0.04] px-4 py-2 text-sm text-[#f7f1df] transition hover:bg-white/[0.08]"
        >
          <Copy className="h-4 w-4" />
          {copied ? "Copied" : "Share"}
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="inline-flex items-center gap-2 rounded-full border border-[#f7f1df]/12 bg-white/[0.04] px-4 py-2 text-sm text-[#ffd2c6] transition hover:bg-white/[0.08]"
        >
          <Trash2 className="h-4 w-4" />
          Remove
        </button>
      </div>
    </article>
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

export default function PacificaRiskRoomPage() {
  const searchParams = useSearchParams();
  const compactMode = searchParams.get("compact") === "1";
  const requestedAccount =
    searchParams.get("account")?.trim() || DEFAULT_LIVE_PACIFICA_ACCOUNT;

  const [activeWorkspace, setActiveWorkspace] = useState<WorkspaceId>("overview");
  const [accountInput, setAccountInput] = useState(requestedAccount);
  const [submittedAccount, setSubmittedAccount] = useState(requestedAccount);
  const [refreshNonce, setRefreshNonce] = useState(0);
  const [payload, setPayload] = useState<PacificaRiskRoomResponse | null>(null);
  const [focusSymbol, setFocusSymbol] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [scenarioInput, setScenarioInput] = useState<PacificaScenarioInput>({
    ...DEFAULT_SCENARIO_INPUT,
    symbol: "BTC",
    rotateToSymbol: "SOL",
  });
  const [watchItems, setWatchItems] = useState<PacificaWatchItem[]>([]);
  const [watchStorageReady, setWatchStorageReady] = useState(false);
  const [watchLabel, setWatchLabel] = useState("");
  const [watchThresholds, setWatchThresholds] = useState({
    minScore: 65,
    maxExposureMultiple: 8,
    minLiqBufferPct: 10,
    maxFundingDragUsd: 3,
  });
  const [watchSnapshots, setWatchSnapshots] = useState<Record<string, WatchSnapshotState>>({});
  const [copiedWatchId, setCopiedWatchId] = useState("");
  const [guideOpen, setGuideOpen] = useState(false);
  const [guideStepIndex, setGuideStepIndex] = useState(0);
  const [guideShouldAutoOpen, setGuideShouldAutoOpen] = useState(false);
  const [guideTargetRect, setGuideTargetRect] = useState<{
    top: number;
    left: number;
    width: number;
    height: number;
    radius: number;
  } | null>(null);
  const [guideCardPosition, setGuideCardPosition] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);
  const [walletStatus, setWalletStatus] = useState<"idle" | "connecting" | "connected">(
    "idle",
  );
  const [walletError, setWalletError] = useState("");
  const [connectedWallet, setConnectedWallet] = useState<ConnectedWalletState | null>(null);
  const walletProviderRef = useRef<WalletProviderDescriptor | null>(null);
  const walletCleanupRef = useRef<(() => void) | null>(null);
  const connectWalletButtonRef = useRef<HTMLButtonElement | null>(null);
  const walletFormRef = useRef<HTMLFormElement | null>(null);
  const deskMetricsRef = useRef<HTMLDivElement | null>(null);
  const scenarioPanelRef = useRef<HTMLDivElement | null>(null);
  const watchPanelRef = useRef<HTMLDivElement | null>(null);

  const closeGuide = (persist = true) => {
    setGuideOpen(false);
    setGuideTargetRect(null);
    setGuideCardPosition(null);
    if (persist) {
      try {
        window.localStorage.setItem(GUIDE_STORAGE_KEY, "1");
      } catch {
        // ignore browser storage restrictions
      }
    }
  };

  const openGuide = (step = 0) => {
    setGuideStepIndex(step);
    setGuideOpen(true);
  };

  const syncConnectedWallet: (
    address: string,
    descriptor: Pick<WalletProviderDescriptor, "family" | "label">,
  ) => void = useCallback((
    address: string,
    descriptor: Pick<WalletProviderDescriptor, "family" | "label">,
  ) => {
    setConnectedWallet({
      address,
      family: descriptor.family,
      label: descriptor.label,
    });
    setWalletStatus("connected");
    setWalletError("");
    setAccountInput(address);
    setSubmittedAccount(address);
    setWatchLabel((current) => current || `Desk ${shortAddress(address)}`);
  }, []);

  const clearWalletListeners: () => void = useCallback(() => {
    walletCleanupRef.current?.();
    walletCleanupRef.current = null;
  }, []);

  const clearWalletConnection: (
    keepDeskInput?: boolean,
    disconnectProvider?: boolean,
  ) => void = useCallback((keepDeskInput = true, disconnectProvider = true) => {
    clearWalletListeners();
    const descriptor = walletProviderRef.current;
    walletProviderRef.current = null;
    setConnectedWallet(null);
    setWalletStatus("idle");
    setWalletError("");

    if (!keepDeskInput) {
      setAccountInput("");
      setSubmittedAccount("");
    }

    if (disconnectProvider && descriptor?.family === "solana") {
      descriptor.provider.disconnect?.().catch(() => {
        // ignore wallet disconnect errors
      });
    }
  }, [clearWalletListeners]);

  const attachWalletListeners: (descriptor: WalletProviderDescriptor) => void =
    useCallback((descriptor: WalletProviderDescriptor) => {
    clearWalletListeners();

    if (descriptor.family === "solana") {
      const handleAccountChanged = (...args: unknown[]) => {
        const nextKey = (args[0] as SolanaPublicKeyLike | null | undefined) || null;
        const nextAddress = nextKey?.toString() || "";
        if (!nextAddress) {
          clearWalletConnection(true, false);
          return;
        }

        syncConnectedWallet(nextAddress, descriptor);
      };
      const handleDisconnect = () => {
        clearWalletConnection(true, false);
      };

      descriptor.provider.on?.("accountChanged", handleAccountChanged);
      descriptor.provider.on?.("disconnect", handleDisconnect);
      walletCleanupRef.current = () => {
        descriptor.provider.removeListener?.("accountChanged", handleAccountChanged);
        descriptor.provider.removeListener?.("disconnect", handleDisconnect);
      };

      return;
    }

    const handleAccountsChanged = (...args: unknown[]) => {
      const accounts = args[0];
      const nextAddress =
        Array.isArray(accounts) && accounts.length ? String(accounts[0]) : "";

      if (!nextAddress) {
        clearWalletConnection(true, false);
        return;
      }

      syncConnectedWallet(nextAddress, descriptor);
    };
    const handleDisconnect = () => {
      clearWalletConnection(true, false);
    };

    descriptor.provider.on?.("accountsChanged", handleAccountsChanged);
    descriptor.provider.on?.("disconnect", handleDisconnect);
      walletCleanupRef.current = () => {
        descriptor.provider.removeListener?.("accountsChanged", handleAccountsChanged);
        descriptor.provider.removeListener?.("disconnect", handleDisconnect);
      };
    }, [clearWalletConnection, clearWalletListeners, syncConnectedWallet]);

  async function handleConnectWallet() {
    setWalletError("");
    setWalletStatus("connecting");

    const descriptor = resolveWalletProvider();
    if (!descriptor) {
      setWalletStatus("idle");
      setWalletError(
        "No supported browser wallet was found. Install Phantom, Backpack, Solflare, or MetaMask.",
      );
      openGuide(0);
      return;
    }

    walletProviderRef.current = descriptor;

    try {
      let nextAddress = "";

      if (descriptor.family === "solana") {
        const connection = await descriptor.provider.connect();
        nextAddress =
          descriptor.provider.publicKey?.toString() ||
          connection?.publicKey?.toString() ||
          "";
      } else {
        const accounts = await descriptor.provider.request({
          method: "eth_requestAccounts",
        });
        nextAddress =
          Array.isArray(accounts) && accounts.length ? String(accounts[0]) : "";
      }

      if (!nextAddress) {
        throw new Error("Wallet connected, but no address was returned.");
      }

      attachWalletListeners(descriptor);
      syncConnectedWallet(nextAddress, descriptor);
      setGuideStepIndex((current) => Math.max(current, 1));
    } catch (connectionError) {
      walletProviderRef.current = null;
      clearWalletListeners();
      setWalletStatus("idle");
      setConnectedWallet(null);
      setWalletError(
        connectionError instanceof Error
          ? connectionError.message
          : "Wallet connection was interrupted.",
      );
    }
  }

  async function handleDisconnectWallet() {
    clearWalletConnection();
  }

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(WATCH_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as PacificaWatchItem[];
        if (Array.isArray(parsed)) {
          setWatchItems(parsed);
        }
      }
    } catch {
      // ignore invalid browser storage
    } finally {
      setWatchStorageReady(true);
    }
  }, [attachWalletListeners, clearWalletListeners, syncConnectedWallet]);

  useEffect(() => {
    try {
      const hasSeenGuide = window.localStorage.getItem(GUIDE_STORAGE_KEY);
      if (!hasSeenGuide) {
        setGuideShouldAutoOpen(true);
      }
    } catch {
      setGuideShouldAutoOpen(true);
    }
  }, []);

  useEffect(() => {
    if (!guideShouldAutoOpen || !payload || compactMode) {
      return;
    }

    openGuide(0);
    setGuideShouldAutoOpen(false);
  }, [guideShouldAutoOpen, payload, compactMode]);

  useEffect(() => {
    let cancelled = false;

    const hydrateWallet = async () => {
      const descriptor = resolveWalletProvider();
      if (!descriptor) {
        return;
      }

      try {
        if (descriptor.family === "solana") {
          const address = descriptor.provider.publicKey?.toString() || "";
          if (address && !cancelled) {
            walletProviderRef.current = descriptor;
            attachWalletListeners(descriptor);
            syncConnectedWallet(address, descriptor);
          }
          return;
        }

        const accounts = await descriptor.provider.request({ method: "eth_accounts" });
        const address =
          Array.isArray(accounts) && accounts.length ? String(accounts[0]) : "";
        if (address && !cancelled) {
          walletProviderRef.current = descriptor;
          attachWalletListeners(descriptor);
          syncConnectedWallet(address, descriptor);
        }
      } catch {
        // ignore wallet hydration issues on first paint
      }
    };

    hydrateWallet();

    return () => {
      cancelled = true;
      clearWalletListeners();
    };
  }, [attachWalletListeners, clearWalletListeners, syncConnectedWallet]);

  useEffect(() => {
    if (!watchStorageReady) {
      return;
    }

    window.localStorage.setItem(WATCH_STORAGE_KEY, JSON.stringify(watchItems));
  }, [watchItems, watchStorageReady]);

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
        setFocusSymbol((current) => {
          if (
            current &&
            nextPayload.marketSnapshot.some((market) => market.symbol === current)
          ) {
            return current;
          }

          return (
            nextPayload.account.positions[0]?.symbol ||
            nextPayload.marketSnapshot[0]?.symbol ||
            current
          );
        });
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

  useEffect(() => {
    if (!payload) {
      return;
    }

    const defaultSymbol =
      payload.account.positions[0]?.symbol || payload.marketSnapshot[0]?.symbol || "BTC";
    const alternateSymbol =
      payload.marketSnapshot.find((item) => item.symbol !== defaultSymbol)?.symbol ||
      defaultSymbol;

    setScenarioInput((current) => {
      const nextSymbol = payload.marketSnapshot.some(
        (item) => item.symbol === current.symbol,
      )
        ? current.symbol
        : defaultSymbol;
      const nextRotateTo = payload.marketSnapshot.some(
        (item) => item.symbol === current.rotateToSymbol && item.symbol !== nextSymbol,
      )
        ? current.rotateToSymbol
        : alternateSymbol;

      if (
        current.symbol === nextSymbol &&
        current.rotateToSymbol === nextRotateTo &&
        current.leverage ===
          Math.min(
            Math.max(current.leverage, 2),
            (payload.marketSnapshot.find((item) => item.symbol === nextSymbol)?.maxLeverage || 5),
          )
      ) {
        return current;
      }

      return {
        ...current,
        symbol: nextSymbol,
        rotateToSymbol: nextRotateTo,
        leverage: Math.min(
          Math.max(current.leverage, 2),
          payload.marketSnapshot.find((item) => item.symbol === nextSymbol)?.maxLeverage || 5,
        ),
      };
    });

    if (!watchLabel && submittedAccount.trim()) {
      setWatchLabel(`Desk ${shortAddress(submittedAccount.trim())}`);
    }
  }, [payload, submittedAccount, watchLabel]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const url = new URL(window.location.href);
    if (submittedAccount.trim()) {
      url.searchParams.set("account", submittedAccount.trim());
    } else {
      url.searchParams.delete("account");
    }
    if (compactMode) {
      url.searchParams.set("compact", "1");
    } else {
      url.searchParams.delete("compact");
    }
    window.history.replaceState({}, "", `${url.pathname}${url.search}`);
  }, [submittedAccount, compactMode]);

  useEffect(() => {
    if (!watchItems.length) {
      setWatchSnapshots({});
      return;
    }

    let cancelled = false;

    const loadWatchSnapshots = async () => {
      const currentAccountId =
        payload?.sourceStatus.account === "live" ? payload.account.accountId : null;
      const remoteItems = watchItems.filter((item) => item.accountId !== currentAccountId);

      setWatchSnapshots((current) => {
        const next = { ...current };
        for (const item of remoteItems) {
          next[item.id] = {
            loading: true,
            error: "",
            payload: current[item.id]?.payload || null,
          };
        }

        if (currentAccountId && payload) {
          for (const item of watchItems.filter((watchItem) => watchItem.accountId === currentAccountId)) {
            next[item.id] = {
              loading: false,
              error: "",
              payload,
            };
          }
        }

        return next;
      });

      const results = await Promise.all(
        remoteItems.map(async (item) => {
          try {
            const response = await fetch(
              `/api/pacifica-risk-room?account=${encodeURIComponent(item.accountId)}&symbols=${encodeURIComponent(DEFAULT_SYMBOLS)}`,
              { cache: "no-store" },
            );
            const nextPayload = (await response.json()) as PacificaRiskRoomResponse;
            if (!response.ok || !nextPayload.success) {
              throw new Error("Unable to refresh watch");
            }

            return {
              id: item.id,
              payload: nextPayload,
              error: "",
            };
          } catch (watchError) {
            return {
              id: item.id,
              payload: null,
              error:
                watchError instanceof Error ? watchError.message : "Unable to refresh watch",
            };
          }
        }),
      );

      if (cancelled) {
        return;
      }

      setWatchSnapshots((current) => {
        const next = { ...current };
        for (const item of results) {
          next[item.id] = {
            loading: false,
            error: item.error,
            payload: item.payload,
          };
        }
        return next;
      });
    };

    loadWatchSnapshots();
    const interval = window.setInterval(loadWatchSnapshots, 60_000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [watchItems, payload]);

  const primaryPosition = payload?.account.positions[0] || null;
  const riskSummary = payload?.riskSummary || null;
  const riskTone = riskSummary ? RISK_TONES[riskSummary.status] : RISK_TONES.watch;
  const RiskIcon = riskTone.icon;
  const selectedMarket =
    payload?.marketSnapshot.find((item) => item.symbol === focusSymbol) ||
    payload?.marketSnapshot[0] ||
    null;
  const selectedPosition =
    payload?.account.positions.find((item) => item.symbol === scenarioInput.symbol) || null;
  const currentMetrics = payload
    ? computeHealthMetrics(payload.account, payload.fundingCurves)
    : null;
  const scenarioResult = payload
    ? buildScenarioResult(payload, scenarioInput)
    : null;
  const plannerOptions = payload ? buildPlannerOptions(payload) : [];
  const activityItems = payload
    ? [
        ...payload.account.openOrders.slice(0, 3).map(buildOrderActivity),
        ...payload.account.tradeHistory.slice(0, 6).map(buildTradeActivity),
      ]
        .sort((left, right) => (right.timestamp || 0) - (left.timestamp || 0))
        .slice(0, 6)
    : [];
  const topFunding = payload?.fundingCurves.slice(0, 4) || [];
  const currentWatchItem = watchItems.find(
    (item) => item.accountId === submittedAccount.trim(),
  );
  const currentWatchEvaluation =
    payload && currentWatchItem ? evaluateWatchItem(currentWatchItem, payload) : null;
  const savedAlertCount = watchItems.reduce((count, item) => {
    const currentSnapshot =
      payload &&
      payload.sourceStatus.account === "live" &&
      payload.account.accountId === item.accountId
        ? payload
        : watchSnapshots[item.id]?.payload;
    if (!currentSnapshot) {
      return count;
    }

    return count + evaluateWatchItem(item, currentSnapshot).alerts.length;
  }, 0);
  const scenarioSizeCap = payload
    ? Math.max(
        250,
        Math.round(selectedPosition?.notionalUsd || 0),
        Math.round(payload.account.availableToSpendUsd * 1.5),
      )
    : 1000;
  const selectedMarketMaxLeverage = selectedMarket?.maxLeverage || 10;
  const activeGuideStep = GUIDE_STEPS[guideStepIndex] || GUIDE_STEPS[0];

  const resolveGuideTargetElement = useCallback(() => {
    switch (activeGuideStep.targetId) {
      case "connect-wallet":
        return connectWalletButtonRef.current;
      case "wallet-form":
        return walletFormRef.current;
      case "desk-metrics":
        return deskMetricsRef.current;
      case "scenario-panel":
        return scenarioPanelRef.current;
      case "watch-panel":
        return watchPanelRef.current;
      default:
        return null;
    }
  }, [activeGuideStep.targetId]);

  useEffect(() => {
    if (!guideOpen) {
      return;
    }

    if (activeWorkspace !== activeGuideStep.workspace) {
      setActiveWorkspace(activeGuideStep.workspace);
    }
  }, [guideOpen, activeGuideStep.workspace, activeWorkspace]);

  useEffect(() => {
    if (!guideOpen) {
      return;
    }

    const target = resolveGuideTargetElement();
    if (!target) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      target.scrollIntoView({
        behavior: "smooth",
        block: "center",
        inline: "nearest",
      });
    }, 80);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [guideOpen, guideStepIndex, activeWorkspace, resolveGuideTargetElement]);

  useEffect(() => {
    if (!guideOpen) {
      return;
    }

    const syncGuidePosition = () => {
      const target = resolveGuideTargetElement();
      if (!target) {
        return;
      }

      const rect = target.getBoundingClientRect();
      const padding = activeGuideStep.targetId === "connect-wallet" ? 10 : 12;
      const highlight = {
        top: Math.max(8, rect.top - padding),
        left: Math.max(8, rect.left - padding),
        width: Math.min(window.innerWidth - 16, rect.width + padding * 2),
        height: Math.min(window.innerHeight - 16, rect.height + padding * 2),
        radius:
          activeGuideStep.targetId === "connect-wallet"
            ? 999
            : activeGuideStep.targetId === "desk-metrics"
              ? 30
              : 26,
      };

      const cardWidth = Math.min(360, window.innerWidth - 24);
      const belowTop = rect.bottom + 18;
      const aboveTop = rect.top - 250;
      const top =
        belowTop + 240 < window.innerHeight
          ? belowTop
          : Math.max(12, aboveTop);
      const left = clamp(
        rect.left + Math.min(24, rect.width * 0.2),
        12,
        window.innerWidth - cardWidth - 12,
      );

      setGuideTargetRect(highlight);
      setGuideCardPosition({
        top,
        left,
        width: cardWidth,
      });
    };

    const raf = window.requestAnimationFrame(syncGuidePosition);
    window.addEventListener("resize", syncGuidePosition);
    window.addEventListener("scroll", syncGuidePosition, true);

    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener("resize", syncGuidePosition);
      window.removeEventListener("scroll", syncGuidePosition, true);
    };
  }, [
    guideOpen,
    guideStepIndex,
    activeWorkspace,
    payload,
    currentMetrics?.exposureMultiple,
    activeGuideStep.targetId,
    resolveGuideTargetElement,
  ]);

  function handlePlannerLoad(option: PacificaPlannerOption) {
    setScenarioInput(option.scenario);
    if (option.scenario.symbol) {
      setFocusSymbol(option.scenario.symbol);
    }
    setActiveWorkspace("scenario");
  }

  function handleSaveWatch() {
    const accountId = submittedAccount.trim();
    if (!accountId) {
      return;
    }

    const now = new Date().toISOString();
    setWatchItems((current) => {
      const existing = current.find((item) => item.accountId === accountId);
      const nextItem: PacificaWatchItem = {
        id: existing?.id || crypto.randomUUID(),
        label: watchLabel.trim() || `Desk ${shortAddress(accountId)}`,
        accountId,
        minScore: watchThresholds.minScore,
        maxExposureMultiple: watchThresholds.maxExposureMultiple,
        minLiqBufferPct: watchThresholds.minLiqBufferPct,
        maxFundingDragUsd: watchThresholds.maxFundingDragUsd,
        createdAt: existing?.createdAt || now,
        updatedAt: now,
      };

      if (existing) {
        return current.map((item) => (item.id === existing.id ? nextItem : item));
      }

      return [nextItem, ...current].slice(0, 8);
    });
  }

  function handleLoadWatch(item: PacificaWatchItem) {
    setAccountInput(item.accountId);
    setSubmittedAccount(item.accountId);
    setWatchLabel(item.label);
    setWatchThresholds({
      minScore: item.minScore,
      maxExposureMultiple: item.maxExposureMultiple,
      minLiqBufferPct: item.minLiqBufferPct,
      maxFundingDragUsd: item.maxFundingDragUsd,
    });
    setActiveWorkspace("watch");
  }

  function handleDeleteWatch(id: string) {
    setWatchItems((current) => current.filter((item) => item.id !== id));
    setWatchSnapshots((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
  }

  async function handleCopyWatchLink(item: PacificaWatchItem) {
    const link = `${window.location.origin}/app?account=${encodeURIComponent(item.accountId)}`;
    await navigator.clipboard.writeText(link);
    setCopiedWatchId(item.id);
    window.setTimeout(() => {
      setCopiedWatchId((current) => (current === item.id ? "" : current));
    }, 1500);
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#07100f] text-[#f7f1df]">
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(circle_at_18%_8%,rgba(101,243,224,0.17),transparent_27%),radial-gradient(circle_at_92%_12%,rgba(216,255,106,0.12),transparent_22%),radial-gradient(circle_at_70%_80%,rgba(255,122,89,0.10),transparent_28%),linear-gradient(135deg,#07100f_0%,#0b1817_52%,#050807_100%)]" />
      <div className="fixed inset-0 -z-10 risk-grid opacity-50" />
      <div className="pointer-events-none fixed inset-x-0 top-0 z-20 h-px bg-gradient-to-r from-transparent via-[#65f3e0] to-transparent opacity-70" />

      <div className="mx-auto max-w-[1680px] px-4 py-4 md:px-6">
        <div
          className={cn(
            "grid gap-4",
            compactMode ? "grid-cols-1" : "xl:grid-cols-[260px_minmax(0,1fr)_340px]",
          )}
        >
          {!compactMode ? (
            <aside className="order-2 rounded-[32px] border border-[#f7f1df]/12 bg-[#0c1715]/95 p-4 shadow-[0_28px_120px_rgba(2,6,23,0.45)] xl:order-1 xl:h-[calc(100vh-2rem)] xl:sticky xl:top-4">
              <div className="rounded-[24px] border border-[#65f3e0]/25 bg-[#65f3e0]/10 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#65f3e0] text-[#07100f]">
                    <Radar className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="font-display text-lg font-semibold tracking-[-0.05em] text-[#f7f1df]">
                      Pacifica Account Health
                    </div>
                    <div className="text-sm text-[#bafdf4]/70">Decision workspace</div>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <StatusPill>
                    Market {payload ? SOURCE_LABELS[payload.sourceStatus.market] : "..."}
                  </StatusPill>
                  <StatusPill tone="soft">
                    Account {payload ? SOURCE_LABELS[payload.sourceStatus.account] : "..."}
                  </StatusPill>
                </div>
              </div>

              <form
                ref={walletFormRef}
                className="mt-4 rounded-[24px] border border-[#f7f1df]/12 bg-[#101b18] p-4"
                onSubmit={(event) => {
                  event.preventDefault();
                  setSubmittedAccount(accountInput.trim());
                }}
              >
                <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-[#7f9189]">
                  Pacifica wallet
                </div>
                {connectedWallet ? (
                  <div className="mt-3 rounded-[18px] border border-[#65f3e0]/20 bg-[#65f3e0]/10 px-4 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-[#bafdf4]">
                          {connectedWallet.label} linked
                        </div>
                        <div className="mt-1 text-xs text-[#bafdf4]/70">
                          {shortAddress(connectedWallet.address)} synced into the desk
                        </div>
                      </div>
                      <StatusPill>{connectedWallet.family}</StatusPill>
                    </div>
                  </div>
                ) : (
                  <div className="mt-3 rounded-[18px] border border-[#f7f1df]/12 bg-[#07100f]/55 px-4 py-3 text-sm leading-6 text-[#a8b6ac]">
                    Connect a browser wallet from the header or paste any Pacifica account below.
                  </div>
                )}
                <input
                  value={accountInput}
                  onChange={(event) => setAccountInput(event.target.value)}
                  placeholder="Wallet or subaccount address"
                  className="mt-3 w-full rounded-[18px] border border-[#f7f1df]/12 bg-[#07100f] px-4 py-3 text-sm text-[#f7f1df] outline-none transition placeholder:text-[#7f9189] focus:border-[#65f3e0]/60"
                />
                {walletError ? (
                  <div className="mt-3 rounded-[16px] border border-[#ff7a59]/24 bg-[#ff7a59]/10 px-4 py-3 text-sm text-[#ffd2c6]">
                    {walletError}
                  </div>
                ) : null}
                <div className="mt-3 grid gap-2">
                  <button
                    type="submit"
                    className="w-full rounded-[16px] bg-[#65f3e0] px-4 py-3 text-sm font-semibold text-[#07100f] transition hover:bg-[#bafdf4]"
                  >
                    Review desk
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAccountInput("");
                      setSubmittedAccount("");
                    }}
                    className="w-full rounded-[16px] border border-[#f7f1df]/12 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-[#e9e0cf] transition hover:bg-white/[0.08]"
                  >
                    Use sample mode
                  </button>
                </div>
              </form>

              <div className="mt-4">
                <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-[#7f9189]">
                  Workspace
                </div>
                <div className="mt-3 space-y-2">
                  {WORKSPACE_TABS.map(({ id, label, icon }) => (
                    <WorkspaceTabButton
                      key={id}
                      label={label}
                      icon={icon}
                      active={activeWorkspace === id}
                      onClick={() => setActiveWorkspace(id)}
                    />
                  ))}
                </div>
              </div>

              <div className="mt-5">
                <div className="flex items-center justify-between gap-2">
                  <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-[#7f9189]">
                    Saved watch
                  </div>
                  <StatusPill tone={savedAlertCount ? "risk" : "soft"}>
                    {savedAlertCount ? `${savedAlertCount} alerts` : "quiet"}
                  </StatusPill>
                </div>
                <div className="mt-3 space-y-2">
                  {watchItems.length ? (
                    watchItems.slice(0, 4).map((item) => {
                      const currentPayload =
                        payload &&
                        payload.sourceStatus.account === "live" &&
                        payload.account.accountId === item.accountId
                          ? payload
                          : watchSnapshots[item.id]?.payload;
                      const alertsCount = currentPayload
                        ? evaluateWatchItem(item, currentPayload).alerts.length
                        : 0;

                      return (
                        <WatchRow
                          key={item.id}
                          item={item}
                          active={submittedAccount.trim() === item.accountId}
                          score={currentPayload?.riskSummary.score || null}
                          alertsCount={alertsCount}
                          onClick={() => handleLoadWatch(item)}
                        />
                      );
                    })
                  ) : (
                    <div className="rounded-[18px] border border-[#f7f1df]/12 bg-[#101b18] px-4 py-4 text-sm leading-7 text-[#a8b6ac]">
                      Save desks here after you define thresholds in the Watch workspace.
                    </div>
                  )}
                </div>
              </div>

              <Link
                href="https://docs.pacifica.fi/api-documentation/api"
                className="mt-5 flex items-center justify-between rounded-[18px] border border-[#f7f1df]/12 bg-[#101b18] px-4 py-3 text-sm text-[#cbd6ce] transition hover:bg-white/[0.05]"
              >
                <span className="flex items-center gap-3">
                  <BookOpen className="h-4 w-4" />
                  Pacifica API docs
                </span>
                <ExternalLink className="h-4 w-4" />
              </Link>
            </aside>
          ) : null}

          <section className="order-1 min-w-0 space-y-4 xl:order-2">
            <section
              className={cn(
                "grain rounded-[32px] border bg-[#0c1715]/95 p-5 shadow-[0_32px_140px_rgba(0,0,0,0.34)]",
                riskTone.border,
              )}
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap gap-2">
                    <StatusPill>Perps risk console</StatusPill>
                    <StatusPill tone="soft">
                      {payload
                        ? `Updated ${new Date(payload.generatedAt).toLocaleTimeString("en-US", {
                            hour: "numeric",
                            minute: "2-digit",
                          })}`
                        : "Loading"}
                    </StatusPill>
                    {currentWatchEvaluation?.alerts.length ? (
                      <StatusPill tone="risk">
                        {currentWatchEvaluation.alerts.length} live alerts
                      </StatusPill>
                    ) : null}
                  </div>
                  <div className="mt-4 flex flex-wrap items-center gap-4">
                    <div>
                      <div className="font-display text-[34px] font-semibold tracking-[-0.06em] text-[#f7f1df]">
                        {payload?.account.mode === "live" ? "Live desk" : "Sample desk"}
                      </div>
                      <div className="mt-1 text-sm text-[#a8b6ac]">
                        {payload
                          ? `${shortAddress(payload.account.accountId)} · ${payload.account.positions.length} positions · ${payload.account.openOrders.length} open orders`
                          : "Connecting to Pacifica"}
                      </div>
                    </div>
                    <div className={cn("inline-flex items-center gap-2 text-base font-semibold", riskTone.text)}>
                      <RiskIcon className="h-5 w-5" />
                      {riskTone.label}
                    </div>
                  </div>
                  <p className="mt-4 max-w-4xl text-sm leading-7 text-[#c7d0c6]">
                    {riskSummary?.verdict ||
                      "Loading Pacifica account posture, liquidation buffer, funding, and market context."}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => openGuide(0)}
                    className="inline-flex items-center gap-2 rounded-full border border-[#f7f1df]/12 bg-white/[0.04] px-4 py-2 text-sm text-[#cbd6ce] transition hover:bg-white/[0.08]"
                  >
                    <Sparkles className="h-4 w-4" />
                    Guide
                  </button>
                  <button
                    type="button"
                    onClick={() => setRefreshNonce((value) => value + 1)}
                    className="inline-flex items-center gap-2 rounded-full border border-[#f7f1df]/12 bg-white/[0.04] px-4 py-2 text-sm text-[#cbd6ce] transition hover:bg-white/[0.08]"
                  >
                    {isRefreshing ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCcw className="h-4 w-4" />
                    )}
                    Refresh
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveWatch}
                    className="inline-flex items-center gap-2 rounded-full bg-[#65f3e0] px-4 py-2 text-sm font-semibold text-[#07100f] transition hover:bg-[#bafdf4]"
                  >
                    <BookmarkPlus className="h-4 w-4" />
                    Save Watch
                  </button>
                  <button
                    ref={connectWalletButtonRef}
                    type="button"
                    onClick={connectedWallet ? handleDisconnectWallet : handleConnectWallet}
                    className={cn(
                      "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition",
                      connectedWallet
                        ? "border border-[#65f3e0]/24 bg-[#65f3e0]/10 text-[#bafdf4] hover:bg-[#65f3e0]/16"
                        : "bg-[#d8ff6a] text-[#07100f] hover:bg-[#ebff9b]",
                    )}
                  >
                    {walletStatus === "connecting" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : connectedWallet ? (
                      <PlugZap className="h-4 w-4" />
                    ) : (
                      <Wallet className="h-4 w-4" />
                    )}
                    {walletStatus === "connecting"
                      ? "Connecting..."
                      : connectedWallet
                        ? `${connectedWallet.label} ${shortAddress(connectedWallet.address)}`
                        : "Connect Wallet"}
                  </button>
                </div>
              </div>

              {error ? (
                <div className="mt-5 rounded-[20px] border border-[#ff7a59]/28 bg-[#ff7a59]/10 px-4 py-3 text-sm text-[#ffd2c6]">
                  {error}
                </div>
              ) : null}

              <div
                ref={deskMetricsRef}
                className="mt-5 grid gap-3 md:grid-cols-2 2xl:grid-cols-5"
              >
                <HeaderMetric
                  label="Risk score"
                  value={riskSummary ? `${riskSummary.score}` : "--"}
                  detail="Out of 100"
                  tone={riskSummary?.status === "critical" ? "danger" : "warn"}
                />
                <HeaderMetric
                  label="Exposure / equity"
                  value={currentMetrics ? `${currentMetrics.exposureMultiple.toFixed(1)}x` : "--"}
                  detail="Gross exposure against account equity"
                  tone={currentMetrics && currentMetrics.exposureMultiple >= 10 ? "danger" : "warn"}
                />
                <HeaderMetric
                  label="Liq buffer"
                  value={
                    currentMetrics?.tightestLiqDistancePct !== null &&
                    currentMetrics?.tightestLiqDistancePct !== undefined
                      ? `${currentMetrics.tightestLiqDistancePct.toFixed(1)}%`
                      : "n/a"
                  }
                  detail="Nearest liquidation distance"
                  tone={
                    currentMetrics?.tightestLiqDistancePct !== null &&
                    currentMetrics?.tightestLiqDistancePct !== undefined &&
                    currentMetrics.tightestLiqDistancePct < 8
                      ? "danger"
                      : "good"
                  }
                />
                <HeaderMetric
                  label="Funding next hour"
                  value={currentMetrics ? formatUsd(currentMetrics.fundingDragUsd, 4) : "--"}
                  detail="Carry drag on current book"
                  tone="default"
                />
                <HeaderMetric
                  label="Saved watches"
                  value={`${watchItems.length}`}
                  detail={
                    savedAlertCount
                      ? `${savedAlertCount} triggered thresholds`
                      : "No triggered thresholds"
                  }
                  tone={savedAlertCount ? "danger" : "good"}
                />
              </div>
            </section>

            {isLoading && !payload ? (
              <div className="flex min-h-[420px] items-center justify-center rounded-[32px] border border-[#f7f1df]/12 bg-[#0c1715]/95">
                <div className="flex items-center gap-3 text-[#cbd6ce]">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Loading Pacifica workspace...
                </div>
              </div>
            ) : null}

            {payload ? (
              <>
                <div className="flex flex-wrap gap-2">
                  {WORKSPACE_TABS.map(({ id, label, icon: Icon }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setActiveWorkspace(id)}
                      className={cn(
                        "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition",
                        activeWorkspace === id
                          ? "border-[#65f3e0]/28 bg-[#65f3e0]/10 text-[#bafdf4]"
                          : "border-[#f7f1df]/12 bg-[#101b18] text-[#a8b6ac] hover:text-[#f7f1df]",
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      {label}
                    </button>
                  ))}
                </div>

                {activeWorkspace === "overview" ? (
                  <div className="grid gap-4 xl:grid-cols-[1.15fr,0.85fr]">
                    <ShellPane
                      eyebrow="Position board"
                      title={
                        primaryPosition
                          ? `${primaryPosition.symbol} drives the current desk`
                          : "No live position is open"
                      }
                      className="min-w-0"
                    >
                      {primaryPosition ? (
                        <div className="space-y-4">
                          <div className="flex flex-wrap items-start justify-between gap-4">
                            <div>
                              <div className="text-sm text-[#7f9189]">Main risk driver</div>
                              <div className="font-display mt-2 text-[48px] font-semibold tracking-[-0.07em] text-[#f7f1df]">
                                {primaryPosition.symbol} {positionSideLabel(primaryPosition.side)}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm text-[#7f9189]">Exposure / equity</div>
                              <div className="font-display mt-2 text-[48px] font-semibold tracking-[-0.07em] text-[#ffd2c6]">
                                {currentMetrics ? `${currentMetrics.exposureMultiple.toFixed(1)}x` : "--"}
                              </div>
                            </div>
                          </div>

                          <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-4">
                            <HeaderMetric
                              label="Account equity"
                              value={formatUsd(payload.account.equityUsd, 1)}
                              detail={`Available ${formatUsd(payload.account.availableToSpendUsd, 1)}`}
                              tone="good"
                            />
                            <HeaderMetric
                              label="Position exposure"
                              value={formatCompactUsd(primaryPosition.notionalUsd)}
                              detail={`${primaryPosition.amount} ${primaryPosition.symbol} at mark`}
                              tone="danger"
                            />
                            <HeaderMetric
                              label="Liquidation price"
                              value={
                                primaryPosition.liquidationPrice
                                  ? formatPrice(primaryPosition.liquidationPrice)
                                  : "n/a"
                              }
                              detail={`Mark now ${formatPrice(primaryPosition.markPrice)}`}
                              tone="warn"
                            />
                            <HeaderMetric
                              label="Margin used"
                              value={formatUsd(payload.account.marginUsedUsd, 1)}
                              detail="Total margin used by the desk"
                              tone="warn"
                            />
                          </div>

                          <div className="rounded-[24px] border border-[#f7f1df]/12 bg-[#07100f]/55 p-5">
                            <div className="flex items-center justify-between gap-4">
                              <div>
                                <div className="text-sm font-semibold text-[#f7f1df]">
                                  Liquidation buffer
                                </div>
                                <div className="mt-1 text-sm text-[#a8b6ac]">
                                  Below 8% is treated as too tight for fresh leverage.
                                </div>
                              </div>
                              <div className="font-mono text-sm text-[#cbd6ce]">
                                {currentMetrics?.tightestLiqDistancePct !== null &&
                                currentMetrics?.tightestLiqDistancePct !== undefined
                                  ? `${currentMetrics.tightestLiqDistancePct.toFixed(2)}%`
                                  : "n/a"}
                              </div>
                            </div>
                            <div className="mt-4 h-3 rounded-full bg-white/10">
                              <div
                                className={cn(
                                  "h-full rounded-full",
                                  (currentMetrics?.tightestLiqDistancePct || 0) < 8
                                    ? "bg-[#ff7a59]"
                                    : (currentMetrics?.tightestLiqDistancePct || 0) < 14
                                      ? "bg-amber-300"
                                      : "bg-emerald-300",
                                )}
                                style={{
                                  width: `${Math.max(
                                    4,
                                    Math.min(
                                      100,
                                      (((currentMetrics?.tightestLiqDistancePct || 0) / 12) * 100),
                                    ),
                                  )}%`,
                                }}
                              />
                            </div>
                          </div>

                          <div className="grid gap-3 md:grid-cols-2">
                            <div className="rounded-[24px] border border-[#f7f1df]/12 bg-[#101b18] p-4">
                              <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-[#7f9189]">
                                Operator playbook
                              </div>
                              <div className="mt-4 space-y-3">
                                {riskSummary?.operatorPlaybook.map((step) => (
                                  <div
                                    key={step}
                                    className="rounded-[18px] border border-[#f7f1df]/12 bg-[#07100f]/45 px-4 py-3 text-sm leading-6 text-[#e9e0cf]"
                                  >
                                    {step}
                                  </div>
                                ))}
                              </div>
                            </div>
                            <div className="rounded-[24px] border border-[#f7f1df]/12 bg-[#101b18] p-4">
                              <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-[#7f9189]">
                                Health signals
                              </div>
                              <div className="mt-4 space-y-3">
                                {riskSummary?.signals.map((signal) => (
                                  <div
                                    key={signal.title}
                                    className="rounded-[18px] border border-[#f7f1df]/12 bg-[#07100f]/45 px-4 py-3"
                                  >
                                    <div className="flex items-center justify-between gap-3">
                                      <div className="text-sm font-semibold text-[#f7f1df]">
                                        {signal.title}
                                      </div>
                                      <StatusPill tone={signal.tone === "critical" ? "risk" : "soft"}>
                                        {signal.tone}
                                      </StatusPill>
                                    </div>
                                    <div className="font-display mt-3 text-[30px] font-semibold tracking-[-0.05em] text-[#f7f1df]">
                                      {signal.value}
                                    </div>
                                    <div className="mt-2 text-sm text-[#a8b6ac]">
                                      {signal.detail}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="rounded-[24px] border border-[#f7f1df]/12 bg-[#101b18] px-4 py-5 text-sm leading-7 text-[#a8b6ac]">
                          No live position was returned for this account. Open the Scenario workspace
                          to test a bounded first entry before trading.
                        </div>
                      )}
                    </ShellPane>

                    <ShellPane
                      eyebrow="Execution brief"
                      title="Action ladder"
                      className="min-w-0"
                    >
                      <div className="space-y-3">
                        {plannerOptions.length ? (
                          plannerOptions.map((option) => (
                            <div
                              key={option.id}
                              className="rounded-[22px] border border-[#f7f1df]/12 bg-[#101b18] px-4 py-4"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <div className="text-sm font-semibold text-[#f7f1df]">
                                    {option.title}
                                  </div>
                                  <div className="mt-2 text-sm leading-6 text-[#a8b6ac]">
                                    {option.summary}
                                  </div>
                                </div>
                                <StatusPill
                                  tone={
                                    option.projected.riskSummary.status === "critical"
                                      ? "risk"
                                      : "soft"
                                  }
                                >
                                  {option.projected.riskSummary.score}/100
                                </StatusPill>
                              </div>
                              <button
                                type="button"
                                onClick={() => handlePlannerLoad(option)}
                                className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#65f3e0] px-4 py-2 text-sm font-semibold text-[#07100f] transition hover:bg-[#bafdf4]"
                              >
                                Explore Plan
                                <ArrowRight className="h-4 w-4" />
                              </button>
                            </div>
                          ))
                        ) : (
                          <div className="rounded-[22px] border border-[#f7f1df]/12 bg-[#101b18] px-4 py-5 text-sm text-[#a8b6ac]">
                            Waiting for live account data.
                          </div>
                        )}
                      </div>
                    </ShellPane>
                  </div>
                ) : null}

                {activeWorkspace === "scenario" ? (
                  <div
                    ref={scenarioPanelRef}
                    className="grid gap-4 xl:grid-cols-[0.84fr,1.16fr]"
                  >
                    <ShellPane eyebrow="Scenario lab" title="Test the trade before you place it">
                      <div className="space-y-5">
                        <div>
                          <div className="text-sm text-[#a8b6ac]">
                            Simulate adds, reductions, collateral top-ups, and rotations against the
                            live Pacifica desk.
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {[
                            ["Hold", "hold"],
                            ["Add long", "add_long"],
                            ["Add short", "add_short"],
                            ["Reduce", "reduce"],
                            ["Rotate", "rotate"],
                          ].map(([label, value]) => (
                            <ScenarioActionButton
                              key={value}
                              label={label}
                              value={value as PacificaScenarioAction}
                              active={scenarioInput.action === value}
                              onClick={(nextAction) =>
                                setScenarioInput((current) => ({
                                  ...current,
                                  action: nextAction,
                                  sizeUsd: nextAction === "hold" ? 0 : Math.max(current.sizeUsd, 50),
                                }))
                              }
                            />
                          ))}
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                          <label className="block">
                            <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#7f9189]">
                              Source market
                            </div>
                            <select
                              value={scenarioInput.symbol}
                              onChange={(event) => {
                                const nextSymbol = event.target.value;
                                setScenarioInput((current) => ({
                                  ...current,
                                  symbol: nextSymbol,
                                  rotateToSymbol:
                                    current.rotateToSymbol === nextSymbol
                                      ? payload.marketSnapshot.find((item) => item.symbol !== nextSymbol)?.symbol || current.rotateToSymbol
                                      : current.rotateToSymbol,
                                  leverage: Math.min(
                                    current.leverage,
                                    payload.marketSnapshot.find((item) => item.symbol === nextSymbol)?.maxLeverage || current.leverage,
                                  ),
                                }));
                                setFocusSymbol(nextSymbol);
                              }}
                              className="mt-2 w-full rounded-[18px] border border-[#f7f1df]/12 bg-[#101b18] px-4 py-3 text-sm text-[#f7f1df] outline-none"
                            >
                              {payload.marketSnapshot.map((market) => (
                                <option key={market.symbol} value={market.symbol}>
                                  {market.symbol}
                                </option>
                              ))}
                            </select>
                          </label>

                          <label className="block">
                            <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#7f9189]">
                              Target market
                            </div>
                            <select
                              value={scenarioInput.rotateToSymbol}
                              onChange={(event) =>
                                setScenarioInput((current) => ({
                                  ...current,
                                  rotateToSymbol: event.target.value,
                                }))
                              }
                              disabled={scenarioInput.action !== "rotate"}
                              className="mt-2 w-full rounded-[18px] border border-[#f7f1df]/12 bg-[#101b18] px-4 py-3 text-sm text-[#f7f1df] outline-none disabled:opacity-45"
                            >
                              {payload.marketSnapshot
                                .filter((market) => market.symbol !== scenarioInput.symbol)
                                .map((market) => (
                                  <option key={market.symbol} value={market.symbol}>
                                    {market.symbol}
                                  </option>
                                ))}
                            </select>
                          </label>
                        </div>

                        <div>
                          <div className="flex items-center justify-between gap-3">
                            <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#7f9189]">
                              Size change
                            </div>
                            <div className="text-sm text-[#f7f1df]">
                              {formatUsd(scenarioInput.sizeUsd, 0)}
                            </div>
                          </div>
                          <input
                            type="range"
                            min={0}
                            max={scenarioSizeCap}
                            step={25}
                            value={Math.min(scenarioInput.sizeUsd, scenarioSizeCap)}
                            onChange={(event) =>
                              setScenarioInput((current) => ({
                                ...current,
                                sizeUsd: Number(event.target.value),
                              }))
                            }
                            className="mt-3 h-2 w-full accent-[#65f3e0]"
                            disabled={scenarioInput.action === "hold"}
                          />
                          <input
                            type="number"
                            min={0}
                            step={25}
                            value={scenarioInput.sizeUsd}
                            onChange={(event) =>
                              setScenarioInput((current) => ({
                                ...current,
                                sizeUsd: Number(event.target.value) || 0,
                              }))
                            }
                            className="mt-3 w-full rounded-[18px] border border-[#f7f1df]/12 bg-[#101b18] px-4 py-3 text-sm text-[#f7f1df] outline-none"
                            disabled={scenarioInput.action === "hold"}
                          />
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                          <div>
                            <div className="flex items-center justify-between gap-3">
                              <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#7f9189]">
                                Assumed leverage
                              </div>
                              <div className="text-sm text-[#f7f1df]">
                                {scenarioInput.leverage}x
                              </div>
                            </div>
                            <input
                              type="range"
                              min={2}
                              max={selectedMarketMaxLeverage}
                              step={1}
                              value={Math.min(scenarioInput.leverage, selectedMarketMaxLeverage)}
                              onChange={(event) =>
                                setScenarioInput((current) => ({
                                  ...current,
                                  leverage: Number(event.target.value),
                                }))
                              }
                              className="mt-3 h-2 w-full accent-[#d8ff6a]"
                            />
                          </div>
                          <label className="block">
                            <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#7f9189]">
                              Collateral delta
                            </div>
                            <input
                              type="number"
                              step={5}
                              value={scenarioInput.collateralDeltaUsd}
                              onChange={(event) =>
                                setScenarioInput((current) => ({
                                  ...current,
                                  collateralDeltaUsd: Number(event.target.value) || 0,
                                }))
                              }
                              className="mt-2 w-full rounded-[18px] border border-[#f7f1df]/12 bg-[#101b18] px-4 py-3 text-sm text-[#f7f1df] outline-none"
                            />
                          </label>
                        </div>
                      </div>
                    </ShellPane>

                    <ShellPane
                      eyebrow="Projected state"
                      title="Outcome book"
                      action={
                        scenarioResult ? (
                        <StatusPill
                            tone={
                              scenarioResult.riskSummary.status === "critical" ? "risk" : "soft"
                            }
                          >
                            {RISK_TONES[scenarioResult.riskSummary.status].label}
                          </StatusPill>
                        ) : null
                      }
                    >
                      {scenarioResult && currentMetrics ? (
                        <div className="space-y-4">
                          <div className="rounded-[24px] border border-[#f7f1df]/12 bg-[#07100f]/55 px-5 py-5">
                            <div className="flex flex-wrap items-start justify-between gap-4">
                              <div>
                                <div className="text-sm text-[#7f9189]">Projected verdict</div>
                                <div className="font-display mt-2 text-[40px] font-semibold tracking-[-0.06em] text-[#f7f1df]">
                                  {scenarioResult.riskSummary.score}/100
                                </div>
                              </div>
                              <div
                                className={cn(
                                  "text-sm font-semibold",
                                  RISK_TONES[scenarioResult.riskSummary.status].text,
                                )}
                              >
                                {formatSigned(scenarioResult.scoreDelta)}
                              </div>
                            </div>
                            <div className="mt-4 text-sm leading-7 text-[#e9e0cf]">
                              {scenarioResult.riskSummary.verdict}
                            </div>
                          </div>

                          <div className="grid gap-3 md:grid-cols-2">
                            <ComparisonCell
                              label="Risk score"
                              current={`${payload.riskSummary.score}`}
                              projected={`${scenarioResult.riskSummary.score}`}
                              delta={formatSigned(scenarioResult.scoreDelta)}
                              tone={scenarioResult.scoreDelta > 0 ? "good" : "danger"}
                            />
                            <ComparisonCell
                              label="Exposure / equity"
                              current={`${currentMetrics.exposureMultiple.toFixed(1)}x`}
                              projected={`${scenarioResult.metrics.exposureMultiple.toFixed(1)}x`}
                              delta={`${(scenarioResult.metrics.exposureMultiple - currentMetrics.exposureMultiple).toFixed(1)}x`}
                              tone={scenarioResult.metrics.exposureMultiple < currentMetrics.exposureMultiple ? "good" : "warn"}
                            />
                            <ComparisonCell
                              label="Liq buffer"
                              current={
                                currentMetrics.tightestLiqDistancePct !== null
                                  ? `${currentMetrics.tightestLiqDistancePct.toFixed(1)}%`
                                  : "n/a"
                              }
                              projected={
                                scenarioResult.metrics.tightestLiqDistancePct !== null
                                  ? `${scenarioResult.metrics.tightestLiqDistancePct.toFixed(1)}%`
                                  : "n/a"
                              }
                              delta={
                                currentMetrics.tightestLiqDistancePct !== null &&
                                scenarioResult.metrics.tightestLiqDistancePct !== null
                                  ? `${(scenarioResult.metrics.tightestLiqDistancePct - currentMetrics.tightestLiqDistancePct).toFixed(1)}%`
                                  : "n/a"
                              }
                              tone="good"
                            />
                            <ComparisonCell
                              label="Funding drag"
                              current={formatUsd(currentMetrics.fundingDragUsd, 4)}
                              projected={formatUsd(scenarioResult.metrics.fundingDragUsd, 4)}
                              delta={formatUsd(scenarioResult.metrics.fundingDragUsd - currentMetrics.fundingDragUsd, 4)}
                              tone={scenarioResult.metrics.fundingDragUsd <= currentMetrics.fundingDragUsd ? "good" : "warn"}
                            />
                          </div>

                          <div className="rounded-[24px] border border-[#f7f1df]/12 bg-[#101b18] p-4">
                            <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-[#7f9189]">
                              Assumptions
                            </div>
                            <div className="mt-4 space-y-2">
                              {scenarioResult.assumptions.map((assumption) => (
                                <div
                                  key={assumption}
                                  className="rounded-[18px] border border-[#f7f1df]/12 bg-[#07100f]/45 px-4 py-3 text-sm leading-6 text-[#c7d0c6]"
                                >
                                  {assumption}
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="rounded-[24px] border border-[#f7f1df]/12 bg-[#101b18] px-4 py-5 text-sm text-[#a8b6ac]">
                          Waiting for live desk data.
                        </div>
                      )}
                    </ShellPane>
                  </div>
                ) : null}

                {activeWorkspace === "planner" ? (
                  <ShellPane eyebrow="Action planner" title="Three decision paths for the current desk">
                    <div className="grid gap-4 xl:grid-cols-3">
                      {plannerOptions.length ? (
                        plannerOptions.map((option) => (
                          <PlanLane key={option.id} option={option} onLoad={handlePlannerLoad} />
                        ))
                      ) : (
                        <div className="rounded-[24px] border border-[#f7f1df]/12 bg-[#101b18] px-4 py-5 text-sm text-[#a8b6ac]">
                          No planner options are available without live account data.
                        </div>
                      )}
                    </div>
                  </ShellPane>
                ) : null}

                {activeWorkspace === "watch" ? (
                  <div
                    ref={watchPanelRef}
                    className="grid gap-4 xl:grid-cols-[0.78fr,1.22fr]"
                  >
                    <ShellPane eyebrow="Watch builder" title="Save thresholds for repeat monitoring">
                      <div className="space-y-4">
                        <div className="rounded-[22px] border border-[#f7f1df]/12 bg-[#07100f]/55 px-4 py-4 text-sm leading-7 text-[#c7d0c6]">
                          Turn this into a real monitoring product by saving desk-specific risk floors
                          and loading them back into the workspace.
                        </div>

                        <label className="block">
                          <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#7f9189]">
                            Watch label
                          </div>
                          <input
                            value={watchLabel}
                            onChange={(event) => setWatchLabel(event.target.value)}
                            placeholder="Desk name"
                            className="mt-2 w-full rounded-[18px] border border-[#f7f1df]/12 bg-[#101b18] px-4 py-3 text-sm text-[#f7f1df] outline-none"
                          />
                        </label>

                        <div className="grid gap-4 md:grid-cols-2">
                          <label className="block">
                            <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#7f9189]">
                              Min score
                            </div>
                            <input
                              type="number"
                              min={20}
                              max={95}
                              value={watchThresholds.minScore}
                              onChange={(event) =>
                                setWatchThresholds((current) => ({
                                  ...current,
                                  minScore: Number(event.target.value) || 0,
                                }))
                              }
                              className="mt-2 w-full rounded-[18px] border border-[#f7f1df]/12 bg-[#101b18] px-4 py-3 text-sm text-[#f7f1df] outline-none"
                            />
                          </label>
                          <label className="block">
                            <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#7f9189]">
                              Max exposure / equity
                            </div>
                            <input
                              type="number"
                              min={1}
                              max={25}
                              step={0.5}
                              value={watchThresholds.maxExposureMultiple}
                              onChange={(event) =>
                                setWatchThresholds((current) => ({
                                  ...current,
                                  maxExposureMultiple: Number(event.target.value) || 0,
                                }))
                              }
                              className="mt-2 w-full rounded-[18px] border border-[#f7f1df]/12 bg-[#101b18] px-4 py-3 text-sm text-[#f7f1df] outline-none"
                            />
                          </label>
                          <label className="block">
                            <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#7f9189]">
                              Min liq buffer
                            </div>
                            <input
                              type="number"
                              min={2}
                              max={30}
                              step={0.5}
                              value={watchThresholds.minLiqBufferPct}
                              onChange={(event) =>
                                setWatchThresholds((current) => ({
                                  ...current,
                                  minLiqBufferPct: Number(event.target.value) || 0,
                                }))
                              }
                              className="mt-2 w-full rounded-[18px] border border-[#f7f1df]/12 bg-[#101b18] px-4 py-3 text-sm text-[#f7f1df] outline-none"
                            />
                          </label>
                          <label className="block">
                            <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#7f9189]">
                              Max funding drag
                            </div>
                            <input
                              type="number"
                              min={0}
                              max={50}
                              step={0.5}
                              value={watchThresholds.maxFundingDragUsd}
                              onChange={(event) =>
                                setWatchThresholds((current) => ({
                                  ...current,
                                  maxFundingDragUsd: Number(event.target.value) || 0,
                                }))
                              }
                              className="mt-2 w-full rounded-[18px] border border-[#f7f1df]/12 bg-[#101b18] px-4 py-3 text-sm text-[#f7f1df] outline-none"
                            />
                          </label>
                        </div>

                        {currentWatchEvaluation ? (
                          <div className="rounded-[22px] border border-[#f7f1df]/12 bg-[#101b18] px-4 py-4">
                            <div className="flex items-center justify-between gap-3">
                              <div className="text-sm font-semibold text-[#f7f1df]">
                                Current desk against saved thresholds
                              </div>
                              <StatusPill
                                tone={
                                  currentWatchEvaluation.severity === "critical"
                                    ? "risk"
                                    : "soft"
                                }
                              >
                                {currentWatchEvaluation.alerts.length
                                  ? `${currentWatchEvaluation.alerts.length} alerts`
                                  : "quiet"}
                              </StatusPill>
                            </div>
                            <div className="mt-3 text-sm text-[#a8b6ac]">
                              {currentWatchEvaluation.alerts.length
                                ? currentWatchEvaluation.alerts[0]
                                : "The current desk is inside the saved watch thresholds."}
                            </div>
                          </div>
                        ) : null}

                        <button
                          type="button"
                          onClick={handleSaveWatch}
                          className="inline-flex items-center gap-2 rounded-full bg-[#65f3e0] px-4 py-2 text-sm font-semibold text-[#07100f] transition hover:bg-[#bafdf4]"
                        >
                          <BookmarkPlus className="h-4 w-4" />
                          Save / Update Watch
                        </button>
                      </div>
                    </ShellPane>

                    <ShellPane eyebrow="Saved desks" title="Triggered thresholds and quick reload">
                      <div className="space-y-3">
                        {watchItems.length ? (
                          watchItems.map((item) => {
                            const snapshot =
                              payload &&
                              payload.sourceStatus.account === "live" &&
                              payload.account.accountId === item.accountId
                                ? { loading: false, error: "", payload }
                                : watchSnapshots[item.id] || null;

                            return (
                              <WatchCard
                                key={item.id}
                                item={item}
                                snapshot={snapshot}
                                isCurrent={submittedAccount.trim() === item.accountId}
                                onLoad={() => handleLoadWatch(item)}
                                onCopy={() => handleCopyWatchLink(item)}
                                onDelete={() => handleDeleteWatch(item.id)}
                                copied={copiedWatchId === item.id}
                              />
                            );
                          })
                        ) : (
                          <div className="rounded-[24px] border border-[#f7f1df]/12 bg-[#101b18] px-4 py-5 text-sm leading-7 text-[#a8b6ac]">
                            No saved watches yet. Define thresholds on the left, save the desk, and
                            this pane becomes a real alert console.
                          </div>
                        )}
                      </div>
                    </ShellPane>
                  </div>
                ) : null}
              </>
            ) : null}
          </section>

          {!compactMode ? (
            <aside className="order-3 space-y-4">
              <ShellPane eyebrow="Market inspector" title={selectedMarket ? `${selectedMarket.symbol} focus` : "Market focus"}>
                {selectedMarket ? (
                  <div className="space-y-4">
                    <div className="rounded-[22px] border border-[#f7f1df]/12 bg-[#07100f]/55 px-4 py-4">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="font-display text-[42px] font-semibold tracking-[-0.07em] text-[#f7f1df]">
                            {selectedMarket.symbol}
                          </div>
                          <div className="mt-1 text-sm text-[#a8b6ac]">
                            {selectedMarket.maxLeverage}x max · Funding {formatFundingRate(selectedMarket.nextFundingRate)}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-[#7f9189]">Mark</div>
                          <div className="font-display mt-1 text-[32px] font-semibold tracking-[-0.06em] text-[#f7f1df]">
                            {formatPrice(selectedMarket.mark)}
                          </div>
                        </div>
                      </div>
                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <div className="rounded-[18px] border border-[#f7f1df]/12 bg-[#101b18] px-4 py-3">
                          <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#7f9189]">
                            Crowd
                          </div>
                          <div className="mt-2 text-sm font-semibold text-[#f7f1df]">
                            {selectedMarket.crowdedScore}
                          </div>
                        </div>
                        <div className="rounded-[18px] border border-[#f7f1df]/12 bg-[#101b18] px-4 py-3">
                          <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#7f9189]">
                            24h volume
                          </div>
                          <div className="mt-2 text-sm font-semibold text-[#f7f1df]">
                            {formatCompactUsd(selectedMarket.volume24h)}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      {payload?.marketSnapshot.map((market) => (
                        <MarketListRow
                          key={market.symbol}
                          market={market}
                          active={market.symbol === selectedMarket.symbol}
                          onClick={() => setFocusSymbol(market.symbol)}
                        />
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="rounded-[22px] border border-[#f7f1df]/12 bg-[#101b18] px-4 py-5 text-sm text-[#a8b6ac]">
                    No market data yet.
                  </div>
                )}
              </ShellPane>

              <ShellPane eyebrow="Carry board" title="Funding radar">
                <div className="space-y-3">
                  {topFunding.map((curve: PacificaFundingCurve) => (
                    <div
                      key={curve.symbol}
                      className="rounded-[20px] border border-[#f7f1df]/12 bg-[#101b18] px-4 py-4"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold text-[#f7f1df]">{curve.symbol}</div>
                          <div className="mt-1 text-xs text-[#7f9189]">{curve.regime}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-semibold text-[#f7f1df]">
                            {formatFundingRate(curve.nextFundingRate)}
                          </div>
                          <div className="mt-1 text-xs text-[#7f9189]">
                            {formatUsd(curve.hourlyCarryFor1kUsd, 4)} / $1k
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ShellPane>

              <ShellPane eyebrow="Activity tape" title="Recent orders and fills">
                <div className="space-y-3">
                  {activityItems.length ? (
                    activityItems.map((item, index) => (
                      <div
                        key={`${item.title}-${index}`}
                        className="rounded-[20px] border border-[#f7f1df]/12 bg-[#101b18] px-4 py-4"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className="text-sm font-semibold text-[#f7f1df]">{item.title}</div>
                            <div className="mt-2 text-sm text-[#a8b6ac]">{item.detail}</div>
                          </div>
                          <div className="text-xs text-[#7f9189]">{formatTime(item.timestamp)}</div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-[20px] border border-[#f7f1df]/12 bg-[#101b18] px-4 py-5 text-sm text-[#a8b6ac]">
                      No recent fills or orders were returned.
                    </div>
                  )}
                </div>
              </ShellPane>
            </aside>
          ) : null}
        </div>
      </div>

      {guideOpen && guideTargetRect && guideCardPosition ? (
        <>
          <div
            className="pointer-events-none fixed z-40 border border-[#65f3e0]/40 bg-transparent"
            style={{
              top: guideTargetRect.top,
              left: guideTargetRect.left,
              width: guideTargetRect.width,
              height: guideTargetRect.height,
              borderRadius: guideTargetRect.radius,
              boxShadow:
                "0 0 0 9999px rgba(2, 8, 7, 0.74), 0 0 0 1px rgba(101,243,224,0.3), 0 0 36px rgba(101,243,224,0.2)",
            }}
          />
          <div
            className="fixed z-50 rounded-[28px] border border-[#f7f1df]/12 bg-[#0a1412]/96 p-5 shadow-[0_28px_120px_rgba(0,0,0,0.52)] backdrop-blur-xl"
            style={{
              top: guideCardPosition.top,
              left: guideCardPosition.left,
              width: guideCardPosition.width,
            }}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="font-mono text-[11px] uppercase tracking-[0.24em] text-[#7f9189]">
                  Product Tour
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <StatusPill>{activeGuideStep.eyebrow}</StatusPill>
                  <StatusPill tone="soft">
                    {guideStepIndex + 1} / {GUIDE_STEPS.length}
                  </StatusPill>
                </div>
              </div>
              <button
                type="button"
                onClick={() => closeGuide()}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#f7f1df]/12 bg-white/[0.04] text-[#cbd6ce] transition hover:bg-white/[0.08]"
                aria-label="Close guide"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-5">
              <div className="font-display text-[34px] font-semibold leading-[0.96] tracking-[-0.06em] text-[#f7f1df]">
                {activeGuideStep.title}
              </div>
              <div className="mt-3 text-sm leading-7 text-[#d7e4da]">
                {activeGuideStep.summary}
              </div>
              <div className="mt-4 rounded-[20px] border border-[#f7f1df]/10 bg-white/[0.03] px-4 py-4 text-sm leading-7 text-[#a8b6ac]">
                {activeGuideStep.detail}
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              {GUIDE_STEPS.map((step, index) => (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => setGuideStepIndex(index)}
                  className={cn(
                    "rounded-full border px-3 py-2 text-xs font-medium transition",
                    index === guideStepIndex
                      ? "border-[#65f3e0]/28 bg-[#65f3e0]/10 text-[#bafdf4]"
                      : "border-[#f7f1df]/10 bg-white/[0.03] text-[#a8b6ac] hover:text-[#f7f1df]",
                  )}
                >
                  {step.eyebrow}
                </button>
              ))}
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setGuideStepIndex((current) => Math.max(0, current - 1))}
                  disabled={guideStepIndex === 0}
                  className="inline-flex items-center gap-2 rounded-full border border-[#f7f1df]/12 bg-white/[0.04] px-4 py-2 text-sm text-[#cbd6ce] transition hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => closeGuide()}
                  className="inline-flex items-center gap-2 rounded-full border border-[#f7f1df]/12 bg-white/[0.04] px-4 py-2 text-sm text-[#cbd6ce] transition hover:bg-white/[0.08]"
                >
                  Skip
                </button>
              </div>

              <div className="flex flex-wrap gap-2">
                {activeGuideStep.id === "connect" && !connectedWallet ? (
                  <button
                    type="button"
                    onClick={() => {
                      void handleConnectWallet();
                    }}
                    className="inline-flex items-center gap-2 rounded-full bg-[#65f3e0] px-4 py-2 text-sm font-semibold text-[#07100f] transition hover:bg-[#bafdf4]"
                  >
                    {activeGuideStep.actionLabel}
                    <Wallet className="h-4 w-4" />
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => {
                    if (guideStepIndex === GUIDE_STEPS.length - 1) {
                      closeGuide();
                      return;
                    }

                    setGuideStepIndex((current) =>
                      Math.min(GUIDE_STEPS.length - 1, current + 1),
                    );
                  }}
                  className="inline-flex items-center gap-2 rounded-full bg-[#d8ff6a] px-5 py-2 text-sm font-semibold text-[#07100f] transition hover:bg-[#ebff9b]"
                >
                  {guideStepIndex === GUIDE_STEPS.length - 1 ? "Finish Tour" : "Next Step"}
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </>
      ) : null}
    </main>
  );
}
