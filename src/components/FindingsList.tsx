import { useState } from "react";
import { AlertOctagon, AlertTriangle, ChevronDown, Info, ShieldCheck } from "lucide-react";
import { SEVERITY_META, CHECK_COUNT, type Finding, type Severity } from "../lib/scanner";

const ICONS: Record<Severity, typeof Info> = {
  critical: AlertOctagon,
  warning: AlertTriangle,
  info: Info,
};

function FindingCard({ finding }: { finding: Finding }) {
  const [open, setOpen] = useState(finding.severity === "critical");
  const meta = SEVERITY_META[finding.severity];
  const Icon = ICONS[finding.severity];

  return (
    <div className={`card overflow-hidden ${meta.border} border`}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-start gap-3 p-4 text-left"
        aria-expanded={open}
      >
        <span className={`mt-0.5 rounded-lg p-1.5 ${meta.bg}`}>
          <Icon size={16} className={meta.color} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-white">{finding.title}</span>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${meta.bg} ${meta.color}`}>
              {meta.label}
            </span>
            <span className="rounded-full bg-panel-2 px-2 py-0.5 text-[10px] font-medium text-mist">
              {finding.matches.length} hit{finding.matches.length === 1 ? "" : "s"}
            </span>
          </span>
          <span className="mt-1 block text-[13px] leading-relaxed text-mist">{finding.explanation}</span>
        </span>
        <ChevronDown
          size={16}
          className={`mt-1 shrink-0 text-mist transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="space-y-2 border-t border-edge bg-void/40 p-4">
          {finding.matches.map((m, i) => (
            <div key={i} className="flex gap-3">
              <span className="w-10 shrink-0 pt-2 text-right font-mono text-[11px] text-mist/60">
                L{m.line}
              </span>
              <div className="code-block flex-1">{m.snippet || "(empty line)"}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function FindingsList({ findings }: { findings: Finding[] }) {
  const [filter, setFilter] = useState<Severity | "all">("all");
  const visible = filter === "all" ? findings : findings.filter((f) => f.severity === filter);

  const tabs: { id: Severity | "all"; label: string }[] = [
    { id: "all", label: `All (${findings.length})` },
    { id: "critical", label: `Critical (${findings.filter((f) => f.severity === "critical").length})` },
    { id: "warning", label: `Warning (${findings.filter((f) => f.severity === "warning").length})` },
    { id: "info", label: `Info (${findings.filter((f) => f.severity === "info").length})` },
  ];

  if (findings.length === 0) {
    return (
      <div className="card flex flex-col items-center gap-3 p-10 text-center">
        <span className="rounded-2xl bg-emerald-400/10 p-4">
          <ShieldCheck size={28} className="text-emerald-300" />
        </span>
        <p className="text-sm font-semibold text-white">No findings — clean scan</p>
        <p className="max-w-sm text-[13px] leading-relaxed text-mist">
          None of the {CHECK_COUNT} heuristic checks triggered on this file. It passed prompt-injection,
          exfiltration, obfuscation, and secret-detection checks.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setFilter(t.id)}
            className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
              filter === t.id
                ? "bg-emerald-400 text-emerald-950"
                : "border border-edge bg-panel-2 text-mist hover:text-white"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {visible.length === 0 ? (
        <p className="card p-6 text-center text-sm text-mist">No findings at this severity.</p>
      ) : (
        visible.map((f) => <FindingCard key={f.id} finding={f} />)
      )}
    </div>
  );
}
