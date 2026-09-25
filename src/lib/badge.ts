import { VERDICT_META, type Verdict } from "./scanner";

const SITE = "https://devilking7x.github.io/skillbadge/";

function textWidth(text: string): number {
  return Math.ceil(text.length * 6.4) + 12;
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** Build a shields.io-style SVG badge for a scan result. */
export function buildBadgeSVG(score: number, verdict: Verdict): string {
  const left = "skillbadge";
  const right = `${score}/100 · ${verdict}`;
  const lw = textWidth(left);
  const rw = textWidth(right);
  const w = lw + rw;
  const color = VERDICT_META[verdict].color;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="20" role="img" aria-label="skillbadge: ${esc(right)}">
  <title>skillbadge: ${esc(right)}</title>
  <linearGradient id="s" x2="0" y2="100%">
    <stop offset="0" stop-color="#fff" stop-opacity=".12"/>
    <stop offset="1" stop-opacity=".12"/>
  </linearGradient>
  <clipPath id="r"><rect width="${w}" height="20" rx="4" fill="#fff"/></clipPath>
  <g clip-path="url(#r)">
    <rect width="${lw}" height="20" fill="#0c1214"/>
    <rect x="${lw}" width="${rw}" height="20" fill="${color}"/>
    <rect width="${w}" height="20" fill="url(#s)"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="Verdana,DejaVu Sans,sans-serif" font-size="11">
    <text x="${lw / 2}" y="14" fill="#e6edec">${esc(left)}</text>
    <text x="${lw + rw / 2}" y="14" fill="#07110d" font-weight="bold">${esc(right)}</text>
  </g>
</svg>`;
}

export function badgeFileName(score: number): string {
  return `skillbadge-${score}.svg`;
}

export function markdownSnippet(score: number, verdict: Verdict): string {
  const file = badgeFileName(score);
  return `[![SkillBadge: ${score}/100 — ${verdict}](${file})](${SITE})`;
}

export function htmlSnippet(score: number, verdict: Verdict): string {
  const file = badgeFileName(score);
  return `<a href="${SITE}"><img src="${file}" alt="SkillBadge: ${score}/100 — ${verdict}" /></a>`;
}

export function downloadSVG(score: number, verdict: Verdict): void {
  const svg = buildBadgeSVG(score, verdict);
  const blob = new Blob([svg], { type: "image/svg+xml" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = badgeFileName(score);
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
