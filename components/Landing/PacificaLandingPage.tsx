import Link from "next/link";
import {
  Activity,
  ArrowRight,
  Bot,
  CheckCircle2,
  Copy,
  DatabaseZap,
  LineChart,
  Radar,
  ShieldAlert,
  Terminal,
  WalletCards,
} from "lucide-react";
import { DEFAULT_LIVE_PACIFICA_ACCOUNT } from "@/lib/pacificaRiskRoom";

const API_EXAMPLE = `curl "https://pacifica-risk-room.vercel.app/api/pacifica-risk-room?account=${DEFAULT_LIVE_PACIFICA_ACCOUNT}"`;
const SKILL_EXAMPLE = `curl -s https://pacifica-risk-room.vercel.app/skill.md > SKILL.md`;

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.22em] text-cyan-100">
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
    <div className="rounded-[26px] border border-white/10 bg-[#0a1020] p-4 shadow-[0_22px_80px_rgba(2,6,23,0.38)]">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="font-mono text-[11px] uppercase tracking-[0.24em] text-slate-500">
          {label}
        </div>
        <Copy className="h-4 w-4 text-slate-500" />
      </div>
      <pre className="overflow-x-auto rounded-[18px] border border-white/10 bg-black/25 p-4 text-sm leading-7 text-cyan-100">
        <code>{code}</code>
      </pre>
    </div>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  body,
}: {
  icon: typeof ShieldAlert;
  title: string;
  body: string;
}) {
  return (
    <article className="rounded-[30px] border border-white/10 bg-[#0b111f] p-5 shadow-[0_24px_80px_rgba(2,6,23,0.34)]">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-300 text-[#06111d]">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="mt-5 text-xl font-semibold tracking-[-0.04em] text-white">{title}</h3>
      <p className="mt-3 text-sm leading-7 text-slate-400">{body}</p>
    </article>
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
    <div className="flex gap-4 rounded-[26px] border border-white/10 bg-[#0b111f] p-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-cyan-300 font-semibold text-[#06111d]">
        {number}
      </div>
      <div>
        <div className="font-semibold text-white">{title}</div>
        <div className="mt-2 text-sm leading-7 text-slate-400">{body}</div>
      </div>
    </div>
  );
}

export default function PacificaLandingPage() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#05070d] text-slate-100">
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(circle_at_18%_10%,rgba(34,211,238,0.18),transparent_27%),radial-gradient(circle_at_88%_6%,rgba(244,63,94,0.12),transparent_21%),linear-gradient(135deg,#05070d_0%,#08111f_52%,#060914_100%)]" />
      <div className="fixed inset-0 -z-10 opacity-[0.08] [background-image:linear-gradient(rgba(255,255,255,.32)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.32)_1px,transparent_1px)] [background-size:52px_52px]" />

      <header className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-300 text-[#06111d]">
            <Radar className="h-5 w-5" />
          </div>
          <div>
            <div className="font-semibold text-white">Pacifica Account Health</div>
            <div className="text-sm text-slate-500">Product + Agent Skill</div>
          </div>
        </Link>
        <nav className="hidden items-center gap-6 text-sm text-slate-400 md:flex">
          <Link href="#skill" className="hover:text-white">Skill</Link>
          <Link href="#api" className="hover:text-white">API</Link>
          <Link href="#track" className="hover:text-white">Track Fit</Link>
          <Link href="/app" className="rounded-full bg-white px-4 py-2 font-semibold text-[#06111d]">
            Launch App
          </Link>
        </nav>
      </header>

      <section className="mx-auto grid max-w-7xl gap-8 px-5 pb-16 pt-10 lg:grid-cols-[1.04fr,0.96fr] lg:items-center">
        <div>
          <div className="flex flex-wrap gap-2">
            <Pill>Analytics & Data</Pill>
            <Pill>Pacifica REST</Pill>
            <Pill>Agent Skill</Pill>
          </div>
          <h1 className="mt-6 max-w-4xl text-[48px] font-semibold leading-[0.92] tracking-[-0.075em] text-white md:text-[78px]">
            Account health checks for humans and AI trading agents.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
            Pacifica Account Health is both a live dashboard and an agent-readable
            skill. It checks liquidation risk, exposure versus equity, funding cost,
            and the next safe action before anyone adds leverage.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/app"
              className="inline-flex items-center gap-2 rounded-full bg-cyan-300 px-6 py-3 font-semibold text-[#06111d] transition hover:bg-cyan-200"
            >
              Launch App
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/skill.md"
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-6 py-3 font-semibold text-white transition hover:bg-white/[0.08]"
            >
              Download skill.md
              <Bot className="h-4 w-4" />
            </Link>
          </div>
        </div>

        <div className="rounded-[36px] border border-rose-400/25 bg-[#0b111f]/95 p-5 shadow-[0_32px_130px_rgba(2,6,23,0.48)]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="font-mono text-[11px] uppercase tracking-[0.26em] text-slate-500">
                Live demo account
              </div>
              <div className="mt-3 flex items-center gap-3 text-2xl font-semibold text-rose-100">
                <ShieldAlert className="h-6 w-6" />
                High risk
              </div>
            </div>
            <Pill>49 / 100</Pill>
          </div>
          <div className="mt-6 rounded-[28px] border border-white/10 bg-black/25 p-5">
            <div className="text-sm leading-7 text-slate-300">
              BTC is about 7.6% from liquidation and exposure is about 11.8x
              account equity. Do not add leverage.
            </div>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {[
              ["Equity", "~$10"],
              ["BTC exposure", "~$120"],
              ["Exposure / equity", "~11.8x"],
              ["Liq buffer", "~7.6%"],
            ].map(([label, value]) => (
              <div key={label} className="rounded-[22px] border border-white/10 bg-[#101827] p-4">
                <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-500">
                  {label}
                </div>
                <div className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-white">
                  {value}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-4 px-5 pb-16 md:grid-cols-3">
        <FeatureCard
          icon={WalletCards}
          title="For traders"
          body="Open the app, paste a Pacifica wallet or subaccount, and see whether the account is safe before adding leverage."
        />
        <FeatureCard
          icon={Bot}
          title="For agents"
          body="Install skill.md so AI assistants can call the Account Health API before giving Pacifica leverage guidance."
        />
        <FeatureCard
          icon={DatabaseZap}
          title="For builders"
          body="Use the API response directly: health score, account posture, positions, funding, and market context."
        />
      </section>

      <section id="skill" className="mx-auto grid max-w-7xl gap-6 px-5 pb-16 lg:grid-cols-[0.9fr,1.1fr]">
        <div>
          <Pill>Agent Skill</Pill>
          <h2 className="mt-5 text-[38px] font-semibold leading-none tracking-[-0.06em] text-white md:text-[54px]">
            Ship the risk check into any AI workflow.
          </h2>
          <p className="mt-5 text-base leading-8 text-slate-400">
            The skill teaches agents when to ask for a Pacifica wallet, how to call the
            API, how to classify high-risk accounts, and how to produce a concise risk
            report without pretending to be financial advice.
          </p>
          <div className="mt-6 grid gap-3">
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

      <section id="api" className="mx-auto grid max-w-7xl gap-6 px-5 pb-16 lg:grid-cols-[1.1fr,0.9fr]">
        <CodeBlock label="Try API" code={API_EXAMPLE} />
        <div className="rounded-[30px] border border-white/10 bg-[#0b111f] p-6">
          <Terminal className="h-8 w-8 text-cyan-200" />
          <h2 className="mt-5 text-[34px] font-semibold tracking-[-0.055em] text-white">
            One endpoint for product and agents.
          </h2>
          <p className="mt-4 text-sm leading-7 text-slate-400">
            The UI and skill both use the same Pacifica Account Health API. That keeps
            the product honest: the agent report is derived from the same data a human
            sees in the dashboard.
          </p>
        </div>
      </section>

      <section id="track" className="mx-auto max-w-7xl px-5 pb-20">
        <div className="rounded-[36px] border border-white/10 bg-[#0b111f] p-6 md:p-8">
          <div className="grid gap-8 lg:grid-cols-[0.9fr,1.1fr]">
            <div>
              <Pill>Hackathon Fit</Pill>
              <h2 className="mt-5 text-[38px] font-semibold leading-none tracking-[-0.06em] text-white md:text-[54px]">
                Built for Analytics & Data.
              </h2>
              <p className="mt-5 text-base leading-8 text-slate-400">
                Pacifica defines this track around market intelligence, PnL tracking,
                and risk dashboards. This project combines all three, then exposes the
                same logic as an agent skill.
              </p>
            </div>
            <div className="grid gap-3">
              {[
                ["Market intelligence", "Prices, funding, open interest, volume, and watchlist context."],
                ["PnL and posture tracking", "Account equity, available balance, positions, fills, and portfolio replay."],
                ["Risk dashboard", "Health score, liquidation buffer, exposure/equity, and recommended action."],
                ["Agent layer", "A reusable skill so AI assistants can check risk before suggesting leverage."],
              ].map(([title, body]) => (
                <div key={title} className="flex gap-3 rounded-[22px] border border-white/10 bg-[#101827] p-4">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-cyan-200" />
                  <div>
                    <div className="font-semibold text-white">{title}</div>
                    <div className="mt-1 text-sm leading-6 text-slate-400">{body}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/10 px-5 py-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 text-sm text-slate-500 md:flex-row md:items-center md:justify-between">
          <div>Pacifica Account Health</div>
          <div className="flex flex-wrap gap-4">
            <Link href="/app" className="hover:text-white">App</Link>
            <Link href="/skill" className="hover:text-white">Skill Page</Link>
            <Link href="/skill.md" className="hover:text-white">skill.md</Link>
            <Link href="https://github.com/richard7463/pacifica-risk-room" className="hover:text-white">GitHub</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
