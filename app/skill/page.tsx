import Link from "next/link";
import {
  ArrowRight,
  Bot,
  Copy,
  FileCode2,
  Gauge,
  Radar,
  ShieldCheck,
  Terminal,
  WalletCards,
} from "lucide-react";
import { DEFAULT_LIVE_PACIFICA_ACCOUNT } from "@/lib/pacificaRiskRoom";
import { PACIFICA_ACCOUNT_HEALTH_SKILL } from "@/lib/skillContent";

const API_EXAMPLE = `curl "https://pacifica-risk-room.vercel.app/api/pacifica-risk-room?account=${DEFAULT_LIVE_PACIFICA_ACCOUNT}"`;
const INSTALL_EXAMPLE = "curl -s https://pacifica-risk-room.vercel.app/skill.md > SKILL.md";

const SKILL_STEPS = [
  {
    title: "Ask for a Pacifica wallet",
    body: "The skill tells the agent not to guess account state. It needs a wallet or subaccount first.",
    icon: WalletCards,
  },
  {
    title: "Call the health API",
    body: "One endpoint returns account equity, positions, liquidation buffer, funding, signals, and market context.",
    icon: Terminal,
  },
  {
    title: "Return a bounded report",
    body: "The agent produces a risk status, explains the driver, and avoids fresh leverage recommendations when the score is critical.",
    icon: ShieldCheck,
  },
] as const;

function CodeBlock({
  title,
  code,
}: {
  title: string;
  code: string;
}) {
  return (
    <div className="soft-scan rounded-[30px] border border-[#f7f1df]/12 bg-[#091514]/90 p-4 shadow-[0_24px_90px_rgba(0,0,0,0.34)]">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="font-mono text-[11px] uppercase tracking-[0.24em] text-[#f7f1df]/45">
          {title}
        </div>
        <Copy className="h-4 w-4 text-[#65f3e0]/70" />
      </div>
      <pre className="overflow-x-auto rounded-[20px] border border-[#65f3e0]/12 bg-[#020807]/75 p-4 text-sm leading-7 text-[#bafdf4]">
        <code>{code}</code>
      </pre>
    </div>
  );
}

function StepCard({
  title,
  body,
  icon: Icon,
}: {
  title: string;
  body: string;
  icon: typeof WalletCards;
}) {
  return (
    <article className="grain rounded-[28px] border border-[#f7f1df]/12 bg-[#0c1715]/90 p-5 shadow-[0_22px_70px_rgba(0,0,0,0.24)]">
      <div className="flex h-12 w-12 items-center justify-center rounded-[20px] bg-[#d8ff6a] text-[#07100f]">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="font-display mt-6 text-2xl font-semibold tracking-[-0.055em] text-[#f7f1df]">
        {title}
      </h3>
      <p className="mt-3 text-sm leading-7 text-[#a8b6ac]">{body}</p>
    </article>
  );
}

export default function SkillPage() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#07100f] text-[#f7f1df]">
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(circle_at_18%_8%,rgba(101,243,224,0.17),transparent_27%),radial-gradient(circle_at_90%_8%,rgba(216,255,106,0.13),transparent_22%),radial-gradient(circle_at_72%_82%,rgba(255,122,89,0.11),transparent_28%),linear-gradient(135deg,#07100f_0%,#0b1817_52%,#050807_100%)]" />
      <div className="fixed inset-0 -z-10 risk-grid opacity-50" />
      <div className="pointer-events-none fixed inset-x-0 top-0 z-20 h-px bg-gradient-to-r from-transparent via-[#65f3e0] to-transparent opacity-70" />

      <div className="mx-auto max-w-7xl px-5 py-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <Link href="/" className="group flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-[18px] bg-[#65f3e0] text-[#07100f] shadow-[0_0_42px_rgba(101,243,224,0.28)] transition group-hover:rotate-[-4deg]">
              <Radar className="h-5 w-5" />
            </div>
            <div>
              <div className="font-display text-lg font-semibold tracking-[-0.04em] text-[#f7f1df]">
                Pacifica Account Health
              </div>
              <div className="text-sm text-[#a8b6ac]">Agent-readable risk checks</div>
            </div>
          </Link>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/skill.md"
              className="inline-flex items-center gap-2 rounded-full border border-[#f7f1df]/12 bg-[#f7f1df]/7 px-4 py-2 text-sm font-semibold text-[#f7f1df] transition hover:bg-[#f7f1df]/12"
            >
              skill.md
              <FileCode2 className="h-4 w-4" />
            </Link>
            <Link
              href="/app"
              className="inline-flex items-center gap-2 rounded-full bg-[#65f3e0] px-4 py-2 text-sm font-semibold text-[#07100f] transition hover:bg-[#bafdf4]"
            >
              Launch App
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </header>

        <section className="grid gap-8 py-16 lg:grid-cols-[1.05fr,0.95fr] lg:items-center">
          <div className="rise-in">
            <div className="inline-flex rounded-full border border-[#ff7a59]/30 bg-[#ff7a59]/12 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.24em] text-[#ffd2c6]">
              Agent Skill
            </div>
            <h1 className="font-display mt-6 max-w-5xl text-[48px] font-extrabold leading-[0.92] tracking-[-0.065em] text-[#f7f1df] md:text-[88px] md:leading-[0.88] md:tracking-[-0.09em]">
              Make agents check risk before they talk leverage.
            </h1>
            <p className="mt-7 max-w-2xl text-lg leading-8 text-[#c7d0c6]">
              The skill turns Pacifica Account Health into an agent workflow:
              request the account, call the API, classify the risk driver, and
              return a concise account-health report.
            </p>
          </div>

          <div className="grain rise-in rounded-[38px] border border-[#65f3e0]/24 bg-[#0d1716]/95 p-5 shadow-[0_40px_150px_rgba(0,0,0,0.42)] [animation-delay:120ms]">
            <div className="rounded-[30px] border border-[#f7f1df]/12 bg-[#07100f]/72 p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#d8ff6a] text-[#07100f]">
                  <Bot className="h-6 w-6" />
                </div>
                <div>
                  <div className="font-mono text-[11px] uppercase tracking-[0.24em] text-[#a8b6ac]">
                    Skill output
                  </div>
                  <div className="font-display mt-1 text-3xl font-bold tracking-[-0.06em] text-[#f7f1df]">
                    Account health report
                  </div>
                </div>
              </div>
              <div className="mt-6 grid gap-3">
                <div className="rounded-[22px] border border-[#ff7a59]/22 bg-[#ff7a59]/8 p-4 text-sm leading-7 text-[#ffe0d8]">
                  Risk is critical because BTC exposure is much larger than account equity and liquidation buffer is tight.
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-[20px] border border-[#f7f1df]/12 bg-[#f7f1df]/6 p-4">
                    <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#a8b6ac]">Score</div>
                    <div className="font-display mt-2 text-4xl font-semibold tracking-[-0.07em]">49/100</div>
                  </div>
                  <div className="rounded-[20px] border border-[#f7f1df]/12 bg-[#f7f1df]/6 p-4">
                    <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#a8b6ac]">Decision</div>
                    <div className="font-display mt-2 text-4xl font-semibold tracking-[-0.07em]">De-risk</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          {SKILL_STEPS.map((step) => (
            <StepCard key={step.title} {...step} />
          ))}
        </section>

        <section className="mt-8 grid gap-5 lg:grid-cols-2">
          <CodeBlock title="Install" code={INSTALL_EXAMPLE} />
          <CodeBlock title="Try API" code={API_EXAMPLE} />
        </section>

        <section className="mt-8 grid gap-5 lg:grid-cols-[0.82fr,1.18fr]">
          <div className="grain rounded-[34px] border border-[#f7f1df]/12 bg-[#0c1715]/90 p-6">
            <Gauge className="h-9 w-9 text-[#65f3e0]" />
            <h2 className="font-display mt-6 text-[40px] font-bold leading-none tracking-[-0.07em] text-[#f7f1df]">
              Same logic as the product UI.
            </h2>
            <div className="mt-5 space-y-3 text-sm leading-7 text-[#a8b6ac]">
              <p>Checks account health status and score.</p>
              <p>Identifies the largest risk-driving position.</p>
              <p>Computes exposure divided by equity.</p>
              <p>Reports liquidation buffer and funding context.</p>
              <p>Blocks fresh leverage guidance when risk is critical.</p>
            </div>
          </div>

          <div className="soft-scan rounded-[34px] border border-[#f7f1df]/12 bg-[#0c1715]/90 p-5">
            <div className="mb-4 flex items-center gap-3">
              <Terminal className="h-5 w-5 text-[#65f3e0]" />
              <div className="font-mono text-[11px] uppercase tracking-[0.24em] text-[#f7f1df]/45">
                Full skill.md
              </div>
            </div>
            <pre className="max-h-[620px] overflow-auto rounded-[22px] border border-[#65f3e0]/12 bg-[#020807]/75 p-5 text-xs leading-6 text-[#cbd6ce]">
              <code>{PACIFICA_ACCOUNT_HEALTH_SKILL}</code>
            </pre>
          </div>
        </section>
      </div>
    </main>
  );
}
