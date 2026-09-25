import { useMemo, useState } from "react";
import { FlaskConical, Github, ScanSearch, ShieldCheck, Sparkles } from "lucide-react";
import BadgePanel from "./components/BadgePanel";
import Dropzone from "./components/Dropzone";
import FindingsList from "./components/FindingsList";
import HistoryPanel from "./components/HistoryPanel";
import ReportPanel from "./components/ReportPanel";
import ScoreGauge from "./components/ScoreGauge";
import { clearHistory, loadHistory, removeEntry, saveScan, type HistoryEntry } from "./lib/history";
import { SAMPLES } from "./lib/samples";
import { CHECK_COUNT, scanSkill, type ScanResult } from "./lib/scanner";

type Tab = "findings" | "badge" | "report";

const SAMPLE_STYLES: Record<string, string> = {
  clean: "border-emerald-400/40 text-emerald-300 hover:bg-emerald-400/10",
  shady: "border-red-400/40 text-red-300 hover:bg-red-400/10",
  borderline: "border-amber-400/40 text-amber-300 hover:bg-amber-400/10",
};

export default function App() {
  const [result, setResult] = useState<ScanResult | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>(() => loadHistory());
  const [tab, setTab] = useState<Tab>("findings");

  const runScan = (content: string, fileName: string) => {
    const r = scanSkill(content, fileName);
    setResult(r);
    setHistory(saveScan(r, content));
    setTab("findings");
    document.getElementById("results")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const viewHistory = (entry: HistoryEntry) => {
    setResult(scanSkill(entry.content, entry.fileName));
    setTab("findings");
    document.getElementById("results")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const tabs = useMemo(
    () =>
      [
        { id: "findings", label: `Findings (${result?.findings.length ?? 0})` },
        { id: "badge", label: "Badge" },
        { id: "report", label: "JSON report" },
      ] as { id: Tab; label: string }[],
    [result],
  );

  return (
    <div className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
      {/* Header */}
      <header className="flex items-center justify-between py-5">
        <div className="flex items-center gap-2.5">
          <span className="rounded-xl bg-emerald-400/10 p-2">
            <ShieldCheck size={20} className="text-emerald-300" />
          </span>
          <span className="text-lg font-bold tracking-tight text-white">
            Skill<span className="text-emerald-300">Badge</span>
          </span>
        </div>
        <a
          href="https://github.com/devilking7x/skillbadge"
          target="_blank"
          rel="noreferrer"
          className="btn-ghost !px-3 !py-2 text-xs"
        >
          <Github size={14} />
          <span className="hidden sm:inline">devilking7x/skillbadge</span>
          <span className="sm:hidden">GitHub</span>
        </a>
      </header>

      {/* Hero */}
      <section className="pb-8 pt-6 text-center sm:pt-10">
        <p className="eyebrow justify-center">
          <ScanSearch size={12} />
          In-browser trust scanner for AI agent skills
        </p>
        <h1 className="hero mx-auto mt-4 text-white">
          Is that <span className="text-emerald-300">SKILL.md</span> safe to install?
        </h1>
        <p className="hero-sub mx-auto mt-4">
          Drop any skill file and get an instant heuristic security scan — {CHECK_COUNT} checks for
          prompt-injection, exfiltration URLs, <span className="font-mono text-fog">curl&nbsp;|&nbsp;bash</span> pipes,
          hardcoded secrets, obfuscation, and more. 100% client-side: your file never leaves the browser.
        </p>

        {/* Demo samples */}
        <div className="mx-auto mt-6 flex max-w-2xl flex-col items-center gap-3">
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-mist/80">
            <FlaskConical size={12} />
            Try an instant demo — no file needed
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {SAMPLES.map((s) => (
              <button
                key={s.id}
                onClick={() => runScan(s.content, s.fileName)}
                className={`rounded-xl border bg-panel/70 px-4 py-2.5 text-sm font-medium transition active:scale-[0.98] ${SAMPLE_STYLES[s.id]}`}
                title={s.tagline}
              >
                <span className="flex items-center gap-2">
                  <Sparkles size={14} />
                  {s.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Scanner input */}
      <section className="mx-auto max-w-3xl">
        <Dropzone onScan={runScan} />
      </section>

      {/* Results */}
      {result && (
        <section id="results" className="mx-auto mt-10 max-w-5xl scroll-mt-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-bold text-white">
              Scan result — <span className="font-mono text-mist">{result.fileName}</span>
            </h2>
            <span className="text-xs text-mist/70">
              scanned {new Date(result.scannedAt).toLocaleTimeString()}
            </span>
          </div>

          <div className="grid gap-4 lg:grid-cols-[340px_1fr]">
            <ScoreGauge result={result} />
            <div>
              <div className="mb-3 flex gap-2">
                {tabs.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setTab(t.id)}
                    className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                      tab === t.id
                        ? "bg-emerald-400 text-emerald-950"
                        : "border border-edge bg-panel-2 text-mist hover:text-white"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
              {tab === "findings" && <FindingsList findings={result.findings} />}
              {tab === "badge" && <BadgePanel result={result} />}
              {tab === "report" && <ReportPanel result={result} />}
            </div>
          </div>
        </section>
      )}

      {/* History */}
      <section className="mx-auto mt-10 max-w-5xl">
        <HistoryPanel
          entries={history}
          onView={viewHistory}
          onDelete={(id) => setHistory(removeEntry(id))}
          onClear={() => setHistory(clearHistory())}
        />
      </section>

      {/* Footer */}
      <footer className="mx-auto mt-14 max-w-5xl border-t border-edge pt-6 text-center">
        <p className="text-xs leading-relaxed text-mist/70">
          SkillBadge runs {CHECK_COUNT} heuristic checks entirely in your browser — no uploads, no tracking, no servers.
          Heuristics catch patterns, not intent: always review flagged skills manually before installing.
        </p>
        <p className="mt-2 text-xs text-mist/50">
          MIT licensed · <a href="https://github.com/devilking7x/skillbadge" target="_blank" rel="noreferrer" className="underline hover:text-emerald-300">devilking7x/skillbadge</a>
        </p>
      </footer>
    </div>
  );
}
