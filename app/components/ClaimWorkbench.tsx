"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, FileSearch, Gauge, Moon, ShieldCheck, Sparkles, Sun } from "lucide-react";
import type { ProcessClaimResponse } from "@/src/domain/contracts";
import type { TestCase } from "@/src/lib/fixtures";

type Props = {
  policyName: string;
  testCases: TestCase[];
};

export function ClaimWorkbench({ policyName, testCases }: Props) {
  const [selectedCaseId, setSelectedCaseId] = useState(testCases[0]?.case_id ?? "");
  const selectedCase = useMemo(() => testCases.find((testCase) => testCase.case_id === selectedCaseId) ?? testCases[0], [selectedCaseId, testCases]);
  const [payload, setPayload] = useState(() => JSON.stringify(selectedCase.input, null, 2));
  const [result, setResult] = useState<ProcessClaimResponse | null>(null);
  const [evalSummary, setEvalSummary] = useState<{ passed: number; total: number } | null>(null);
  const [isProcessing, setProcessing] = useState(false);
  const [isDarkMode, setDarkMode] = useState(false);

  useEffect(() => {
    const storedTheme = window.localStorage.getItem("plum-theme");
    const shouldUseDark = storedTheme === "dark";
    document.documentElement.classList.toggle("dark", shouldUseDark);
    queueMicrotask(() => setDarkMode(shouldUseDark));
  }, []);

  function toggleTheme() {
    const next = !isDarkMode;
    setDarkMode(next);
    document.documentElement.classList.toggle("dark", next);
    window.localStorage.setItem("plum-theme", next ? "dark" : "light");
  }

  function loadCase(caseId: string) {
    const next = testCases.find((testCase) => testCase.case_id === caseId) ?? testCases[0];
    setSelectedCaseId(next.case_id);
    setPayload(JSON.stringify(next.input, null, 2));
    setResult(null);
  }

  async function processCurrentClaim() {
    setProcessing(true);
    setResult(null);
    const response = await fetch("/api/claims/process", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ case_id: selectedCaseId, input: JSON.parse(payload) })
    });
    setResult(await response.json());
    setProcessing(false);
  }

  async function runAllEvals() {
    setProcessing(true);
    const response = await fetch("/api/evals/run");
    const json = await response.json();
    setEvalSummary({ passed: json.passed, total: json.total });
    setProcessing(false);
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-8 px-6 py-8 transition-colors">
      <header className="overflow-hidden rounded-[2rem] border border-white/80 bg-white/80 p-8 shadow-glow backdrop-blur transition-colors dark:border-white/10 dark:bg-slate-950/95 dark:shadow-[0_24px_90px_rgba(0,0,0,0.55)]">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-plum-100 bg-plum-50 px-4 py-2 text-sm font-semibold text-plum-600 transition-colors dark:border-plum-500/30 dark:bg-plum-500/10 dark:text-plum-100">
              <Sparkles className="h-4 w-4" />
              Multi-agent claims intelligence for {policyName}
            </div>
            <h1 className="max-w-4xl text-4xl font-black tracking-tight text-slate-950 transition-colors md:text-6xl dark:text-white">
              Explainable health insurance decisions, built for messy real-world documents.
            </h1>
            <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-600 transition-colors dark:text-slate-300">
              Submit a claim, catch document problems before adjudication, extract structured facts, and inspect every policy check that shaped the final decision.
            </p>
          </div>
          <div className="flex min-w-72 flex-col gap-3">
            <button
              type="button"
              onClick={toggleTheme}
              className="inline-flex items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-800 shadow-sm transition hover:bg-slate-50 dark:border-white/10 dark:bg-slate-900 dark:text-white dark:hover:bg-slate-800"
              aria-pressed={isDarkMode}
            >
              {isDarkMode ? <Sun className="h-4 w-4 text-amber-300" /> : <Moon className="h-4 w-4 text-plum-600" />}
              {isDarkMode ? "Light mode" : "Dark mode"}
            </button>
            <div className="grid grid-cols-3 gap-3 rounded-3xl bg-slate-950 p-4 text-white transition-colors dark:border dark:border-white/10 dark:bg-slate-900">
              <Metric label="Cases" value="12" />
              <Metric label="Agents" value="6" />
              <Metric label="Trace" value="100%" />
            </div>
          </div>
        </div>
      </header>

      <section className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm transition-colors dark:border-white/10 dark:bg-slate-950/95 dark:shadow-2xl dark:shadow-black/30">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-slate-950 transition-colors dark:text-white">Claim Submission</h2>
              <p className="text-sm text-slate-500 transition-colors dark:text-slate-400">Load a fixture or edit the JSON payload directly.</p>
            </div>
            <FileSearch className="h-8 w-8 text-plum-500" />
          </div>

          <label className="text-sm font-semibold text-slate-700 transition-colors dark:text-slate-300" htmlFor="case">
            Demo scenario
          </label>
          <select
            id="case"
            className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 outline-none ring-plum-500 transition focus:ring-2 dark:border-white/10 dark:bg-slate-900 dark:text-slate-100"
            value={selectedCaseId}
            onChange={(event) => loadCase(event.target.value)}
          >
            {testCases.map((testCase) => (
              <option key={testCase.case_id} value={testCase.case_id}>
                {testCase.case_id} - {testCase.case_name}
              </option>
            ))}
          </select>

          <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-600 transition-colors dark:bg-white/5 dark:text-slate-300">{selectedCase.description}</div>

          <textarea
            className="mt-4 h-[30rem] w-full rounded-2xl border border-slate-200 bg-slate-950 p-4 font-mono text-sm text-slate-100 outline-none ring-plum-500 transition focus:ring-2 dark:border-white/10 dark:bg-black/40 dark:text-plum-50"
            value={payload}
            onChange={(event) => setPayload(event.target.value)}
          />

          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <button
              className="rounded-2xl bg-plum-600 px-5 py-3 font-bold text-white shadow-lg shadow-plum-500/20 transition hover:bg-plum-500 disabled:cursor-not-allowed disabled:opacity-60"
              onClick={processCurrentClaim}
              disabled={isProcessing}
            >
              {isProcessing ? "Processing..." : "Process Claim"}
            </button>
            <button
              className="rounded-2xl border border-slate-200 bg-white px-5 py-3 font-bold text-slate-800 transition hover:bg-slate-50 dark:border-white/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/15"
              onClick={runAllEvals}
              disabled={isProcessing}
            >
              Run 12-Case Eval
            </button>
          </div>

          {evalSummary ? (
            <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800 transition-colors dark:border-emerald-400/30 dark:bg-emerald-400/10 dark:text-emerald-200">
              Eval runner passed {evalSummary.passed}/{evalSummary.total} expected decisions.
            </div>
          ) : null}
        </div>

        <DecisionPanel result={result} />
      </section>
    </main>
  );
}

function DecisionPanel({ result }: { result: ProcessClaimResponse | null }) {
  if (!result) {
    return (
      <div className="flex min-h-[42rem] items-center justify-center rounded-[2rem] border border-dashed border-slate-300 bg-white/70 p-8 text-center transition-colors dark:border-white/15 dark:bg-slate-950/90">
        <div>
          <ShieldCheck className="mx-auto h-12 w-12 text-plum-500" />
          <h2 className="mt-4 text-2xl font-bold text-slate-950 transition-colors dark:text-white">Decision cockpit ready</h2>
          <p className="mt-2 max-w-md text-slate-500 transition-colors dark:text-slate-400">Process a claim to see the status card, approved amount, confidence, extracted facts, and trace timeline.</p>
        </div>
      </div>
    );
  }

  const isEarlyStop = result.status === "NEEDS_MEMBER_ACTION";
  const statusLabel = isEarlyStop ? "Needs member action" : result.decision.replace("_", " ");
  const tone = isEarlyStop || (result.status === "DECIDED" && result.decision !== "APPROVED") ? "amber" : "emerald";

  return (
    <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm transition-colors dark:border-white/10 dark:bg-slate-950/95 dark:shadow-2xl dark:shadow-black/30">
      <div className={`rounded-3xl border p-6 transition-colors ${tone === "emerald" ? "border-emerald-200 bg-emerald-50 dark:border-emerald-400/30 dark:bg-emerald-400/10" : "border-amber-200 bg-amber-50 dark:border-amber-400/30 dark:bg-amber-400/10"}`}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-bold uppercase tracking-widest text-slate-500 transition-colors dark:text-slate-400">System output</p>
            <h2 className="mt-2 text-4xl font-black text-slate-950 transition-colors dark:text-white">{statusLabel}</h2>
            <p className="mt-3 max-w-2xl text-slate-700 transition-colors dark:text-slate-200">{isEarlyStop ? result.message : result.reason}</p>
          </div>
          {tone === "emerald" ? <CheckCircle2 className="h-10 w-10 text-emerald-600" /> : <AlertTriangle className="h-10 w-10 text-amber-600" />}
        </div>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        <SummaryTile label="Approved amount" value={result.status === "DECIDED" ? currency(result.approved_amount) : "Not decided"} />
        <SummaryTile label="Confidence" value={`${Math.round(result.confidence_score * 100)}%`} />
        <SummaryTile label="Trace events" value={`${result.trace.length}`} />
      </div>

      {result.status === "DECIDED" && result.line_items.length > 0 ? (
        <section className="mt-6">
          <h3 className="mb-3 text-lg font-bold text-slate-950 transition-colors dark:text-white">Line-item adjudication</h3>
          <div className="overflow-hidden rounded-2xl border border-slate-200 transition-colors dark:border-white/10">
            {result.line_items.map((item, index) => (
              <div key={`${item.description}-${index}`} className="grid grid-cols-[1fr_auto] gap-4 border-b border-slate-100 p-4 transition-colors last:border-0 dark:border-white/10">
                <div>
                  <p className="font-semibold text-slate-900 transition-colors dark:text-slate-100">{item.description}</p>
                  <p className="text-sm text-slate-500 transition-colors dark:text-slate-400">{item.reason ?? "No item-level note"}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-slate-950 transition-colors dark:text-white">{currency(item.amount)}</p>
                  <p className="text-xs font-bold uppercase text-slate-500 transition-colors dark:text-slate-400">{item.decision ?? "Observed"}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="mt-6">
        <div className="mb-3 flex items-center gap-2">
          <Gauge className="h-5 w-5 text-plum-500" />
          <h3 className="text-lg font-bold text-slate-950 transition-colors dark:text-white">Explainability trace</h3>
        </div>
        <div className="space-y-3">
          {result.trace.map((event) => (
            <div key={event.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 transition-colors dark:border-white/10 dark:bg-white/5">
              <div className="flex items-center justify-between gap-4">
                <p className="text-sm font-bold text-slate-500 transition-colors dark:text-slate-400">{event.agent}</p>
                <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-600 transition-colors dark:bg-slate-900 dark:text-slate-200">{event.status}</span>
              </div>
              <h4 className="mt-2 font-bold text-slate-950 transition-colors dark:text-white">{event.title}</h4>
              <p className="mt-1 text-sm leading-6 text-slate-600 transition-colors dark:text-slate-300">{event.detail}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white/10 p-4 text-center">
      <p className="text-2xl font-black">{value}</p>
      <p className="text-xs font-semibold uppercase tracking-widest text-white/60">{label}</p>
    </div>
  );
}

function SummaryTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 transition-colors dark:border-white/10 dark:bg-white/5">
      <p className="text-xs font-bold uppercase tracking-widest text-slate-500 transition-colors dark:text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-black text-slate-950 transition-colors dark:text-white">{value}</p>
    </div>
  );
}

function currency(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(amount);
}
