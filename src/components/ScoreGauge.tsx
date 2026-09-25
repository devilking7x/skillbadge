import { VERDICT_META, type ScanResult } from "../lib/scanner";

export default function ScoreGauge({ result }: { result: ScanResult }) {
  const meta = VERDICT_META[result.verdict];
  const r = 64;
  const c = 2 * Math.PI * r;
  const frac = result.score / 100;

  const counts = {
    critical: result.findings.filter((f) => f.severity === "critical").length,
    warning: result.findings.filter((f) => f.severity === "warning").length,
    info: result.findings.filter((f) => f.severity === "info").length,
  };

  return (
    <div className="card flex flex-col items-center gap-4 p-6">
      <div className="relative h-44 w-44">
        <svg viewBox="0 0 160 160" className="h-full w-full -rotate-90">
          <circle cx="80" cy="80" r={r} fill="none" stroke="#1c2a2e" strokeWidth="12" />
          <circle
            cx="80"
            cy="80"
            r={r}
            fill="none"
            stroke={meta.color}
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={`${c * frac} ${c}`}
            className="transition-all duration-700"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-5xl font-bold tracking-tight text-white" style={{ fontVariantNumeric: "tabular-nums" }}>
            {result.score}
          </span>
          <span className="text-xs font-medium text-mist">/ 100 trust</span>
        </div>
      </div>

      <div>
        <span
          className="inline-flex items-center rounded-full px-4 py-1.5 text-sm font-bold tracking-wide"
          style={{ color: meta.color, backgroundColor: `${meta.color}1a`, border: `1px solid ${meta.color}55` }}
        >
          {result.verdict}
        </span>
      </div>
      <p className="text-center text-sm leading-relaxed text-mist">{meta.blurb}</p>

      <div className="grid w-full grid-cols-3 gap-2 text-center">
        <div className="rounded-xl border border-red-500/25 bg-red-500/5 px-2 py-2.5">
          <div className="text-xl font-bold text-red-300">{counts.critical}</div>
          <div className="text-[10px] font-semibold uppercase tracking-wider text-red-300/70">critical</div>
        </div>
        <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 px-2 py-2.5">
          <div className="text-xl font-bold text-amber-300">{counts.warning}</div>
          <div className="text-[10px] font-semibold uppercase tracking-wider text-amber-300/70">warnings</div>
        </div>
        <div className="rounded-xl border border-sky-500/25 bg-sky-500/5 px-2 py-2.5">
          <div className="text-xl font-bold text-sky-300">{counts.info}</div>
          <div className="text-[10px] font-semibold uppercase tracking-wider text-sky-300/70">info</div>
        </div>
      </div>

      <div className="flex w-full flex-wrap gap-x-4 gap-y-1 border-t border-edge pt-3 text-[11px] text-mist">
        <span><b className="text-fog">{result.stats.lines}</b> lines</span>
        <span><b className="text-fog">{(result.stats.bytes / 1024).toFixed(1)} KB</b></span>
        <span><b className="text-fog">{result.stats.urls}</b> URLs</span>
        <span><b className="text-fog">{result.stats.codeBlocks}</b> code blocks</span>
      </div>
    </div>
  );
}
