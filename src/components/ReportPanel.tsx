import { useMemo } from "react";
import { Download, TerminalSquare } from "lucide-react";
import type { ScanResult } from "../lib/scanner";

export interface JsonReport {
  tool: string;
  version: string;
  scannedAt: string;
  file: string;
  score: number;
  verdict: ScanResult["verdict"];
  ci: { fail: boolean; threshold: number; reason: string };
  summary: { critical: number; warning: number; info: number; total: number };
  findings: { id: string; severity: string; title: string; matches: { line: number; snippet: string }[] }[];
}

export function buildReport(result: ScanResult): JsonReport {
  const summary = {
    critical: result.findings.filter((f) => f.severity === "critical").length,
    warning: result.findings.filter((f) => f.severity === "warning").length,
    info: result.findings.filter((f) => f.severity === "info").length,
    total: result.findings.length,
  };
  const threshold = 65;
  const fail = result.score < threshold;
  return {
    tool: "skillbadge",
    version: "1.0.0",
    scannedAt: result.scannedAt,
    file: result.fileName,
    score: result.score,
    verdict: result.verdict,
    ci: {
      fail,
      threshold,
      reason: fail
        ? `score ${result.score} is below the fail threshold of ${threshold} — exit 1`
        : `score ${result.score} meets the threshold of ${threshold} — exit 0`,
    },
    summary,
    findings: result.findings.map((f) => ({
      id: f.id,
      severity: f.severity,
      title: f.title,
      matches: f.matches,
    })),
  };
}

export default function ReportPanel({ result }: { result: ScanResult }) {
  const report = useMemo(() => buildReport(result), [result]);
  const json = useMemo(() => JSON.stringify(report, null, 2), [report]);

  const download = () => {
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${result.fileName.replace(/\.md$/i, "")}-skillbadge-report.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="card space-y-4 p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-white">CI-friendly JSON report</h3>
          <p className="mt-1 max-w-md text-[13px] leading-relaxed text-mist">
            Machine-readable report with an explicit <span className="font-mono text-fog">ci.fail</span>{" "}
            flag and threshold — pipe it into your pipeline and fail the build on untrusted skills.
          </p>
        </div>
        <button onClick={download} className="btn-primary">
          <Download size={16} />
          Download JSON
        </button>
      </div>
      <div className="flex items-center gap-2 rounded-xl border border-edge bg-void/60 px-4 py-3 font-mono text-xs text-mist">
        <TerminalSquare size={14} className="text-emerald-300" />
        <span>
          suggested gate: <span className="text-fog">fail if score &lt; 65</span> → this scan would{" "}
          <span className={report.ci.fail ? "font-bold text-red-300" : "font-bold text-emerald-300"}>
            {report.ci.fail ? "FAIL ✗" : "PASS ✓"}
          </span>
        </span>
      </div>
      <pre className="code-block max-h-96 overflow-auto !whitespace-pre">{json}</pre>
    </div>
  );
}
