import Link from "next/link";
import { ArrowRight, Bot, Copy, ShieldCheck, Terminal } from "lucide-react";
import { DEFAULT_LIVE_PACIFICA_ACCOUNT } from "@/lib/pacificaRiskRoom";
import { PACIFICA_ACCOUNT_HEALTH_SKILL } from "@/lib/skillContent";

const API_EXAMPLE = `curl "https://pacifica-risk-room.vercel.app/api/pacifica-risk-room?account=${DEFAULT_LIVE_PACIFICA_ACCOUNT}"`;
const INSTALL_EXAMPLE = "curl -s https://pacifica-risk-room.vercel.app/skill.md > SKILL.md";

function CodeBlock({
  title,
  code,
}: {
  title: string;
  code: string;
}) {
  return (
    <div className="rounded-[26px] border border-white/10 bg-[#0a1020] p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="font-mono text-[11px] uppercase tracking-[0.24em] text-slate-500">
          {title}
        </div>
        <Copy className="h-4 w-4 text-slate-500" />
      </div>
      <pre className="overflow-x-auto rounded-[18px] border border-white/10 bg-black/25 p-4 text-sm leading-7 text-cyan-100">
        <code>{code}</code>
      </pre>
    </div>
  );
}

export default function SkillPage() {
  return (
    <main className="min-h-screen bg-[#05070d] text-slate-100">
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(circle_at_18%_10%,rgba(34,211,238,0.18),transparent_27%),linear-gradient(135deg,#05070d_0%,#08111f_52%,#060914_100%)]" />

      <div className="mx-auto max-w-6xl px-5 py-8">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-300 text-[#06111d]">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <div className="font-semibold text-white">Pacifica Account Health Skill</div>
              <div className="text-sm text-slate-500">Agent-readable risk checks</div>
            </div>
          </Link>
          <Link
            href="/app"
            className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#06111d]"
          >
            Launch App
            <ArrowRight className="h-4 w-4" />
          </Link>
        </header>

        <section className="py-16">
          <div className="inline-flex rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.22em] text-cyan-100">
            skill.md
          </div>
          <h1 className="mt-6 max-w-4xl text-[46px] font-semibold leading-[0.94] tracking-[-0.075em] text-white md:text-[72px]">
            Let AI agents check Pacifica risk before suggesting leverage.
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-300">
            This skill turns the Pacifica Account Health API into a repeatable agent
            workflow: ask for a wallet, call the API, classify account health, and
            return a concise risk report.
          </p>
        </section>

        <section className="grid gap-5 lg:grid-cols-2">
          <CodeBlock title="Install" code={INSTALL_EXAMPLE} />
          <CodeBlock title="Try API" code={API_EXAMPLE} />
        </section>

        <section className="mt-8 grid gap-5 lg:grid-cols-[0.85fr,1.15fr]">
          <div className="rounded-[30px] border border-white/10 bg-[#0b111f] p-6">
            <ShieldCheck className="h-8 w-8 text-cyan-200" />
            <h2 className="mt-5 text-3xl font-semibold tracking-[-0.05em] text-white">
              What the skill does
            </h2>
            <div className="mt-5 space-y-3 text-sm leading-7 text-slate-400">
              <p>Checks account health status and score.</p>
              <p>Identifies the largest risk-driving position.</p>
              <p>Computes exposure divided by equity.</p>
              <p>Reports liquidation buffer and funding context.</p>
              <p>Refuses to recommend fresh leverage when risk is critical.</p>
            </div>
          </div>

          <div className="rounded-[30px] border border-white/10 bg-[#0b111f] p-6">
            <div className="mb-4 flex items-center gap-3">
              <Terminal className="h-5 w-5 text-cyan-200" />
              <div className="font-mono text-[11px] uppercase tracking-[0.24em] text-slate-500">
                Full skill.md
              </div>
            </div>
            <pre className="max-h-[620px] overflow-auto rounded-[22px] border border-white/10 bg-black/25 p-5 text-xs leading-6 text-slate-300">
              <code>{PACIFICA_ACCOUNT_HEALTH_SKILL}</code>
            </pre>
          </div>
        </section>
      </div>
    </main>
  );
}
