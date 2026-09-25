import { useMemo, useState } from "react";
import { Check, Copy, Download } from "lucide-react";
import { badgeFileName, buildBadgeSVG, downloadSVG, htmlSnippet, markdownSnippet } from "../lib/badge";
import type { ScanResult } from "../lib/scanner";

export default function BadgePanel({ result }: { result: ScanResult }) {
  const [copied, setCopied] = useState<string | null>(null);
  const svg = useMemo(() => buildBadgeSVG(result.score, result.verdict), [result]);
  const md = markdownSnippet(result.score, result.verdict);
  const html = htmlSnippet(result.score, result.verdict);

  const copy = async (kind: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    setCopied(kind);
    setTimeout(() => setCopied(null), 1600);
  };

  const copyBtn = (kind: string, label: string, text: string) => (
    <button key={kind} onClick={() => copy(kind, text)} className="btn-ghost !px-3 !py-2 text-xs">
      {copied === kind ? <Check size={14} className="text-emerald-300" /> : <Copy size={14} />}
      {copied === kind ? "Copied!" : label}
    </button>
  );

  return (
    <div className="card space-y-5 p-6">
      <div>
        <h3 className="text-sm font-bold text-white">Shareable “scanned” badge</h3>
        <p className="mt-1 text-[13px] leading-relaxed text-mist">
          Download the SVG and drop it into your README with the snippet below — it certifies this
          file was scanned by SkillBadge with a score of <b className="text-fog">{result.score}/100</b>.
        </p>
      </div>

      <div className="flex items-center justify-center rounded-xl border border-edge bg-void/60 p-8">
        <div dangerouslySetInnerHTML={{ __html: svg }} className="[&>svg]:h-8 [&>svg]:w-auto" />
      </div>

      <div className="space-y-3">
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-mist">Markdown (README)</span>
            {copyBtn("md", "Copy Markdown", md)}
          </div>
          <div className="code-block">{md}</div>
        </div>
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-mist">HTML</span>
            {copyBtn("html", "Copy HTML", html)}
          </div>
          <div className="code-block">{html}</div>
        </div>
      </div>

      <button onClick={() => downloadSVG(result.score, result.verdict)} className="btn-primary w-full">
        <Download size={16} />
        Download {badgeFileName(result.score)}
      </button>
    </div>
  );
}
