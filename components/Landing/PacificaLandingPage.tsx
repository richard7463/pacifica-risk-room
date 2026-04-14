import Link from "next/link";
import {
  ArrowRight,
  Bot,
  Copy,
  DatabaseZap,
  FileCode2,
  Gauge,
  Radar,
  Route,
  ShieldAlert,
  Sparkles,
  Terminal,
  WalletCards,
} from "lucide-react";
import { DEFAULT_LIVE_PACIFICA_ACCOUNT } from "@/lib/pacificaRiskRoom";

const API_EXAMPLE = `curl "https://pacifica-risk-room.vercel.app/api/pacifica-risk-room?account=${DEFAULT_LIVE_PACIFICA_ACCOUNT}"`;
const SKILL_EXAMPLE = `curl -s https://pacifica-risk-room.vercel.app/skill.md > SKILL.md`;
const PROOF_ITEMS = [
  {
    title: "Market intelligence layer",
    body: "Prices, funding, open interest, volume, and watchlist context.",
    icon: Gauge,
  },
  {
    title: "Account posture tracking",
    body: "Account equity, available balance, positions, fills, and portfolio replay.",
    icon: Route,
  },
  {
    title: "Pre-trade scenario lab",
    body: "Simulate adds, reductions, collateral top-ups, and rotations before any order goes live.",
    icon: ShieldAlert,
  },
  {
    title: "Watch and agent workflow",
    body: "Saved desks, alert thresholds, and a reusable skill so AI assistants can check risk before suggesting leverage.",
    icon: FileCode2,
  },
] as const;

function Pill({
  children,
  tone = "mint",
}: {
  children: React.ReactNode;
  tone?: "mint" | "paper" | "ember";
}) {
  return (
    <span
      className={
        tone === "paper"
          ? "inline-flex items-center rounded-full border border-[#f7f1df]/15 bg-[#f7f1df]/8 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.24em] text-[#f7f1df]/80"
          : tone === "ember"
            ? "inline-flex items-center rounded-full border border-[#ff7a59]/30 bg-[#ff7a59]/12 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.24em] text-[#ffd2c6]"
            : "inline-flex items-center rounded-full border border-[#65f3e0]/30 bg-[#65f3e0]/12 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.24em] text-[#bafdf4]"
      }
    >
      {children}
    </span>
  );
}

function CodeBlock({
  label,
  code,
}: {
  label: string;
  code: string;
}) {
  return (
    <div className="soft-scan rounded-[30px] border border-[#f7f1df]/12 bg-[#091514]/90 p-4 shadow-[0_24px_90px_rgba(0,0,0,0.36)]">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="font-mono text-[11px] uppercase tracking-[0.24em] text-[#f7f1df]/45">
          {label}
        </div>
        <Copy className="h-4 w-4 text-[#65f3e0]/65" />
      </div>
      <pre className="overflow-x-auto rounded-[20px] border border-[#65f3e0]/12 bg-[#020807]/75 p-4 text-sm leading-7 text-[#bafdf4]">
        <code>{code}</code>
      </pre>
    </div>
  );
}

function AudienceCard({
  icon: Icon,
  title,
  body,
  accent,
}: {
  icon: typeof ShieldAlert;
  title: string;
  body: string;
  accent: string;
}) {
  return (
    <article className="grain group rounded-[34px] border border-[#f7f1df]/12 bg-[#0c1715]/90 p-6 shadow-[0_26px_90px_rgba(0,0,0,0.3)] transition duration-300 hover:-translate-y-1 hover:border-[#65f3e0]/28">
      <div
        className="flex h-14 w-14 items-center justify-center rounded-[22px] text-[#07100f]"
        style={{ background: accent }}
      >
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="font-display mt-7 text-2xl font-semibold tracking-[-0.05em] text-[#f7f1df]">
        {title}
      </h3>
      <p className="mt-4 text-sm leading-7 text-[#a8b6ac]">{body}</p>
    </article>
  );
}

function Metric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[24px] border border-[#f7f1df]/12 bg-[#f7f1df]/6 p-4">
      <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-[#a8b6ac]">
        {label}
      </div>
      <div className="font-display mt-3 text-[34px] font-semibold leading-none tracking-[-0.06em] text-[#f7f1df]">
        {value}
      </div>
    </div>
  );
}

function Step({
  number,
  title,
  body,
}: {
  number: string;
  title: string;
  body: string;
}) {
  return (
    <div className="flex gap-4 rounded-[28px] border border-[#f7f1df]/12 bg-[#0c1715]/90 p-4">
      <div className="font-display flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#d8ff6a] text-lg font-bold text-[#07100f]">
        {number}
      </div>
      <div>
        <div className="font-display text-lg font-semibold tracking-[-0.035em] text-[#f7f1df]">
          {title}
        </div>
        <div className="mt-1 text-sm leading-7 text-[#a8b6ac]">{body}</div>
      </div>
    </div>
  );
}

export default function PacificaLandingPage() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#07100f] text-[#f7f1df]">
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(circle_at_20%_8%,rgba(101,243,224,0.18),transparent_26%),radial-gradient(circle_at_88%_2%,rgba(216,255,106,0.14),transparent_22%),radial-gradient(circle_at_70%_80%,rgba(255,122,89,0.12),transparent_28%),linear-gradient(135deg,#07100f_0%,#0b1817_48%,#060a0b_100%)]" />
      <div className="fixed inset-0 -z-10 risk-grid opacity-55" />
      <div className="pointer-events-none fixed inset-x-0 top-0 z-20 h-px bg-gradient-to-r from-transparent via-[#65f3e0] to-transparent opacity-70" />

      <header className="mx-auto flex max-w-7xl items-center justify-between px-5 py-6">
        <Link href="/" className="group flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-[18px] bg-[#65f3e0] text-[#07100f] shadow-[0_0_42px_rgba(101,243,224,0.28)] transition group-hover:rotate-[-4deg]">
            <Radar className="h-5 w-5" />
          </div>
          <div>
            <div className="font-display text-lg font-semibold tracking-[-0.04em] text-[#f7f1df]">
              Pacifica Account Health
            </div>
            <div className="text-sm text-[#a8b6ac]">Product + Agent Skill</div>
          </div>
        </Link>
        <nav className="hidden items-center gap-2 rounded-full border border-[#f7f1df]/10 bg-[#07100f]/65 p-1.5 text-sm text-[#a8b6ac] backdrop-blur md:flex">
          <Link href="#skill" className="rounded-full px-4 py-2 hover:bg-[#f7f1df]/8 hover:text-[#f7f1df]">
            Skill
          </Link>
          <Link href="#api" className="rounded-full px-4 py-2 hover:bg-[#f7f1df]/8 hover:text-[#f7f1df]">
            API
          </Link>
          <Link href="#proof" className="rounded-full px-4 py-2 hover:bg-[#f7f1df]/8 hover:text-[#f7f1df]">
            Proof
          </Link>
          <Link href="/app" className="rounded-full bg-[#f7f1df] px-5 py-2 font-semibold text-[#07100f]">
            Launch App
          </Link>
        </nav>
      </header>

      <section className="mx-auto grid max-w-7xl gap-8 px-5 pb-20 pt-12 lg:grid-cols-[1.04fr,0.96fr] lg:items-center">
        <div className="rise-in">
          <div className="flex flex-wrap gap-2">
            <Pill>Analytics & Data</Pill>
            <Pill tone="paper">Pacifica REST</Pill>
            <Pill tone="ember">Agent Skill</Pill>
          </div>
          <h1 className="font-display mt-7 max-w-5xl text-[48px] font-extrabold leading-[0.92] tracking-[-0.065em] text-[#f7f1df] md:text-[92px] md:leading-[0.88] md:tracking-[-0.09em]">
            Account health for traders and AI agents.
          </h1>
          <p className="mt-7 max-w-2xl text-lg leading-8 text-[#c7d0c6]">
            A Pacifica-native decision layer that scores live account health,
            simulates what-if trades, builds de-risk plans, and saves desks into a
            repeatable watch workflow before anyone adds leverage.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/app"
              className="inline-flex items-center gap-2 rounded-full bg-[#65f3e0] px-6 py-3 font-semibold text-[#07100f] shadow-[0_18px_60px_rgba(101,243,224,0.24)] transition hover:-translate-y-0.5 hover:bg-[#bafdf4]"
            >
              Launch App
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/skill.md"
              className="inline-flex items-center gap-2 rounded-full border border-[#f7f1df]/14 bg-[#f7f1df]/7 px-6 py-3 font-semibold text-[#f7f1df] transition hover:-translate-y-0.5 hover:bg-[#f7f1df]/12"
            >
              Download skill.md
              <Bot className="h-4 w-4" />
            </Link>
          </div>
        </div>

        <div className="grain rise-in rounded-[38px] border border-[#ff7a59]/30 bg-[#0d1716]/95 p-5 shadow-[0_40px_160px_rgba(0,0,0,0.42)] [animation-delay:120ms]">
          <div className="rounded-[30px] border border-[#f7f1df]/12 bg-[#07100f]/72 p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="font-mono text-[11px] uppercase tracking-[0.28em] text-[#a8b6ac]">
                  Live risk passport
                </div>
                <div className="mt-4 flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#ff7a59] text-[#07100f]">
                    <ShieldAlert className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="font-display text-3xl font-bold tracking-[-0.055em] text-[#ffe0d8]">
                      High risk
                    </div>
                    <div className="text-sm text-[#a8b6ac]">BTC drives the account health score</div>
                  </div>
                </div>
              </div>
              <div className="rounded-full border border-[#65f3e0]/25 bg-[#65f3e0]/10 px-4 py-2 font-mono text-sm text-[#bafdf4]">
                49 / 100
              </div>
            </div>

            <div className="mt-6 rounded-[26px] border border-[#ff7a59]/20 bg-[#ff7a59]/8 p-5 text-sm leading-7 text-[#ffe0d8]">
              BTC is about 7.6% from liquidation and exposure is about 11.8x
              account equity. Do not add leverage.
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <Metric label="Equity" value="~$10" />
              <Metric label="BTC exposure" value="~$120" />
              <Metric label="Exposure / equity" value="~11.8x" />
              <Metric label="Liq buffer" value="~7.6%" />
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-4 px-5 pb-20 md:grid-cols-3">
        <AudienceCard
          icon={WalletCards}
          title="For traders"
          body="Review the live desk, test a trade in Scenario Lab, and pick the cleanest action path before sending an order."
          accent="#65f3e0"
        />
        <AudienceCard
          icon={Bot}
          title="For agents"
          body="Install skill.md so AI assistants can check risk, refuse unsafe leverage, and stay aligned with the same product logic."
          accent="#d8ff6a"
        />
        <AudienceCard
          icon={DatabaseZap}
          title="For builders"
          body="Use one API response for live posture, then layer on scenario simulation, planning, and alert workflows in the app shell."
          accent="#ff7a59"
        />
      </section>

      <section id="skill" className="mx-auto grid max-w-7xl gap-7 px-5 pb-20 lg:grid-cols-[0.9fr,1.1fr]">
        <div>
          <Pill tone="ember">Agent Skill</Pill>
          <h2 className="font-display mt-5 text-[42px] font-bold leading-[0.92] tracking-[-0.075em] text-[#f7f1df] md:text-[64px]">
            Ship the risk check into any AI workflow.
          </h2>
          <p className="mt-5 text-base leading-8 text-[#a8b6ac]">
            The skill teaches agents when to ask for a Pacifica wallet, how to call the
            API, how to classify high-risk accounts, and how to produce a concise risk
            report without pretending to be financial advice.
          </p>
          <div className="mt-7 grid gap-3">
            <Step number="1" title="Download skill.md" body="The skill is served from the same production app." />
            <Step number="2" title="Agent calls the API" body="The agent sends a wallet address to the Account Health API." />
            <Step number="3" title="Return risk report" body="The response becomes a trader-readable account health summary." />
          </div>
        </div>
        <div className="space-y-4">
          <CodeBlock label="Install Skill" code={SKILL_EXAMPLE} />
          <CodeBlock
            label="Agent Prompt"
            code={`Use the Pacifica Account Health skill to check this wallet before suggesting any leverage: ${DEFAULT_LIVE_PACIFICA_ACCOUNT}`}
          />
        </div>
      </section>

      <section id="api" className="mx-auto grid max-w-7xl gap-6 px-5 pb-20 lg:grid-cols-[1.1fr,0.9fr]">
        <CodeBlock label="Try API" code={API_EXAMPLE} />
        <div className="grain rounded-[34px] border border-[#f7f1df]/12 bg-[#0c1715]/90 p-7 shadow-[0_26px_90px_rgba(0,0,0,0.28)]">
          <Terminal className="h-9 w-9 text-[#65f3e0]" />
          <h2 className="font-display mt-6 text-[38px] font-bold leading-none tracking-[-0.065em] text-[#f7f1df]">
            One endpoint for product and agents.
          </h2>
          <p className="mt-5 text-sm leading-7 text-[#a8b6ac]">
            The UI and skill both use the same Pacifica Account Health API. That keeps
            the product honest: the agent report is derived from the same data a human
            sees in the dashboard.
          </p>
        </div>
      </section>

      <section id="proof" className="mx-auto max-w-7xl px-5 pb-24">
        <div className="grain rounded-[40px] border border-[#f7f1df]/12 bg-[#0c1715]/90 p-7 shadow-[0_30px_100px_rgba(0,0,0,0.34)] md:p-9">
          <div className="grid gap-9 lg:grid-cols-[0.86fr,1.14fr]">
            <div>
              <Pill>Product Proof</Pill>
              <h2 className="font-display mt-5 text-[42px] font-bold leading-[0.94] tracking-[-0.075em] text-[#f7f1df] md:text-[64px]">
                Risk data, not decoration.
              </h2>
              <p className="mt-5 text-base leading-8 text-[#a8b6ac]">
                The product combines live Pacifica account state, market context,
                liquidation distance, and carry cost into one decision layer. The same
                logic powers the UI, API, and agent skill.
              </p>
            </div>
            <div className="grid gap-3">
              {PROOF_ITEMS.map(({ title, body, icon: Icon }) => (
                <div key={title} className="flex gap-4 rounded-[24px] border border-[#f7f1df]/12 bg-[#07100f]/65 p-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#f7f1df]/8 text-[#65f3e0]">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="font-display text-lg font-semibold tracking-[-0.035em] text-[#f7f1df]">
                      {title}
                    </div>
                    <div className="mt-1 text-sm leading-6 text-[#a8b6ac]">{body}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-[#f7f1df]/10 px-5 py-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 text-sm text-[#a8b6ac] md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[#d8ff6a]" />
            Pacifica Account Health
          </div>
          <div className="flex flex-wrap gap-4">
            <Link href="/app" className="hover:text-[#f7f1df]">App</Link>
            <Link href="/skill" className="hover:text-[#f7f1df]">Skill Page</Link>
            <Link href="/skill.md" className="hover:text-[#f7f1df]">skill.md</Link>
            <Link href="https://github.com/richard7463/pacifica-risk-room" className="hover:text-[#f7f1df]">GitHub</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
