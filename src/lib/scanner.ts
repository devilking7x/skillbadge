/* SkillBadge heuristic trust scanner — 100% client-side, regex-based checks. */

export type Severity = "critical" | "warning" | "info";
export type Verdict = "TRUSTED" | "CAUTION" | "SUSPICIOUS" | "DANGEROUS";

export interface Match {
  line: number;
  snippet: string;
}

export interface Finding {
  id: string;
  severity: Severity;
  title: string;
  explanation: string;
  matches: Match[];
}

export interface ScanResult {
  fileName: string;
  scannedAt: string;
  score: number;
  verdict: Verdict;
  findings: Finding[];
  stats: { lines: number; bytes: number; urls: number; codeBlocks: number };
}

interface CheckDef {
  id: string;
  severity: Severity;
  title: string;
  explanation: string;
  patterns?: RegExp[];
  whole?: (content: string) => Match[];
  escalate?: (matches: Match[]) => Severity | null;
  deduct?: number;
}

const DEDUCT: Record<Severity, number> = { critical: 18, warning: 7, info: 2 };

const CHECKS: CheckDef[] = [
  {
    id: "prompt-override",
    severity: "critical",
    title: "Prompt-injection / instruction override",
    explanation:
      "Phrases that try to override the agent's system instructions (e.g. “ignore previous instructions”). A skill should guide behavior, never hijack the agent's core directives — this is the classic prompt-injection pattern.",
    patterns: [
      /\bignore\s+(all\s+)?(previous|prior|earlier|your)\s+(instructions|prompts?|directives)\b/i,
      /\bdisregard\s+(your|all|the|any)\s+(previous\s+|prior\s+)?(instructions|system\s+prompts?)\b/i,
      /\bforget\s+(your|all)\s+(instructions|training|system\s+prompts?)\b/i,
      /\b(you\s+are\s+now|from\s+now\s+on[,\s]+you\s+are)\b/i,
      /\bnew\s+system\s+prompt\b/i,
      /\boverride\s+(your|the)\s+(system|previous|core)\b/i,
      /\bjailbreak\b/i,
      /\bDAN\s+mode\b/i,
    ],
  },
  {
    id: "secrecy-directive",
    severity: "warning",
    title: "Secrecy directive toward the user",
    explanation:
      "Instructs the agent to hide behavior from the user (“do not tell the user”). Legitimate skills are transparent; secrecy directives are a red flag for hidden side effects.",
    patterns: [
      /\bdo\s+not\s+(tell|mention|reveal|disclose|inform|show)\s+(the\s+)?user\b/i,
      /\bkeep\s+(this|it)\s+(secret|hidden|confidential)\b/i,
      /\bhide\s+(this|it)\s+from\s+(the\s+)?user\b/i,
      /\bnever\s+(mention|reveal|disclose)\s+(this|it)\b/i,
      /\bdon'?t\s+let\s+the\s+user\s+know\b/i,
    ],
  },
  {
    id: "credential-harvest",
    severity: "critical",
    title: "Credential harvesting language",
    explanation:
      "Asks the user (or agent) to hand over API keys, passwords, or tokens. Skills should reference environment variables or secret managers — never collect raw credentials in conversation.",
    patterns: [
      /\b(paste|enter|provide|send|share|give\s+me)\s+(your\s+)?(api\s+key|apikey|password|secret\s+key|private\s+key|access\s+token)\b/i,
      /\bask\s+(the\s+user\s+)?for\s+(their\s+)?(api\s+key|password|token|secret)\b/i,
      /\bsteal\b[^.\n]{0,40}\b(credential|token|key|password)s?\b/i,
    ],
  },
  {
    id: "exfil-domains",
    severity: "critical",
    title: "Known exfiltration / drop domains",
    explanation:
      "References domains and webhook endpoints commonly abused for data exfiltration (Discord webhooks, webhook.site, ngrok tunnels, anonymous file drops). Even in examples, these deserve scrutiny.",
    patterns: [
      /(discord\.com|discordapp\.com)\/api\/webhooks/i,
      /\b(webhook\.site|requestbin\.(com|net)|pipedream\.net|beeceptor\.com|webhook\.in|mockbin\.com|requestcatcher\.com)\b/i,
      /[a-z0-9-]+\.(ngrok\.io|ngrok-free\.app|trycloudflare\.com|loca\.lt|serveo\.net)\b/i,
      /\b(transfer\.sh|file\.io|0x0\.st|termbin\.com|ix\.io)\b/i,
      /pastebin\.com\/raw/i,
    ],
  },
  {
    id: "raw-ip-url",
    severity: "warning",
    title: "Raw IP address in URL",
    explanation:
      "URLs pointing at bare IP addresses instead of domain names are a common trait of throwaway command-and-control servers and phishing infrastructure.",
    patterns: [/\bhttps?:\/\/\d{1,3}(\.\d{1,3}){3}(:\d+)?\b/],
  },
  {
    id: "curl-pipe-shell",
    severity: "critical",
    title: "Remote script piped straight into a shell",
    explanation:
      "The classic “curl … | bash” pattern downloads and executes remote code with zero verification. A skill should never ask an agent (or user) to run this — pin versions, verify checksums, or vendor the script instead.",
    patterns: [
      /\bcurl\b[^|\n]{0,200}\|\s*(sudo\s+)?(bash|sh|zsh|fish|dash)\b/,
      /\bwget\b[^|\n]{0,200}\|\s*(sudo\s+)?(bash|sh|zsh)\b/,
      /\bcurl\b[^|\n]{0,200}\|\s*tar\b/,
    ],
  },
  {
    id: "rm-rf",
    severity: "warning",
    title: "Recursive forced deletion (rm -rf)",
    explanation:
      "“rm -rf” permanently deletes files without confirmation. It is especially dangerous when the target is broad (/, ~, $HOME, wildcards) — a single typo in a skill can wipe a machine.",
    patterns: [/\brm\s+(-[a-z]*r[a-z]*f|-[a-z]*f[a-z]*r)\b/],
    escalate: (matches) =>
      matches.some((m) => /(\s|^)\/(\s|$|\*)|~\/|\$HOME|\/\*/.test(m.snippet))
        ? "critical"
        : null,
  },
  {
    id: "chmod-danger",
    severity: "warning",
    title: "Dangerous permission changes",
    explanation:
      "“chmod 777” or making downloaded files executable weakens the system's defenses. Downloaded executables should be checksummed and given minimal permissions.",
    patterns: [
      /\bchmod\s+(777|a\+rwx)\b/,
      /\bchmod\s+\+x\b[^.\n]{0,60}(curl|wget|http|\/tmp|\/dev\/shm)/i,
    ],
  },
  {
    id: "sudo-elevate",
    severity: "warning",
    title: "Privilege escalation (sudo)",
    explanation:
      "Running package managers, network tools, or destructive commands as root via sudo gives a skill full system control. Prefer user-space installs and flag any sudo requirement explicitly.",
    patterns: [
      /\bsudo\s+(-\S+\s+)*(apt|apt-get|yum|dnf|pacman|rm|chmod|chown|curl|wget|bash|sh|dd|mkfs|pip\s+install)\b/,
    ],
  },
  {
    id: "eval-exec",
    severity: "warning",
    title: "Dynamic code execution (eval / exec)",
    explanation:
      "eval(), exec(), os.system() and shell=True subprocess calls execute strings as code — a prime target for injection if any part of the string comes from untrusted input.",
    patterns: [
      /\beval\s*\(/,
      /\bexec\s*\(/,
      /os\.system\s*\(/,
      /subprocess\.(call|run|Popen)\s*\([^)]*shell\s*=\s*True/,
      /child_process\.(exec|execSync)\s*\(/,
      /\bnew\s+Function\s*\(/,
    ],
  },
  {
    id: "base64-blob",
    severity: "warning",
    title: "Large base64 blob / decoding",
    explanation:
      "Long base64 strings (or explicit base64 decoding) are a common way to smuggle payloads past casual review. Inspect what the blob actually decodes to before trusting it.",
    patterns: [
      /[A-Za-z0-9+/]{80,}={0,2}/,
      /\bbase64\s+(-d|--decode|-D)\b/,
      /Buffer\.from\(\s*[^,]+,\s*['"]base64['"]\s*\)/,
    ],
  },
  {
    id: "obfuscation",
    severity: "warning",
    title: "Obfuscated code patterns",
    explanation:
      "Hex escapes, String.fromCharCode, atob() on long strings, and reversed-string tricks are used to hide what code really does. Legitimate skills have no reason to obfuscate.",
    patterns: [
      /(\\x[0-9a-fA-F]{2}){4,}/,
      /String\.fromCharCode\s*\(/,
      /String\.fromCodePoint\s*\(/,
      /\.split\(\s*['"]{2}\s*\)\.reverse\(\)/,
      /\batob\s*\(\s*['"][A-Za-z0-9+/=]{40,}/,
    ],
  },
  {
    id: "hardcoded-secret",
    severity: "critical",
    title: "Hardcoded secret / API key",
    explanation:
      "Looks like a real credential embedded in the file (Stripe/OpenAI-style keys, GitHub tokens, AWS keys, private keys, or high-entropy assignments). Secrets belong in environment variables, never in a SKILL.md.",
    patterns: [
      /sk-(live|proj|test)-[A-Za-z0-9]{16,}/,
      /\b(ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{20,}/,
      /\bxox[baprs]-[A-Za-z0-9-]{10,}/,
      /\bAKIA[0-9A-Z]{16}\b/,
      /-----BEGIN (RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/,
      /(api[_-]?key|secret|passwd|password|access[_-]?token)\s*[:=]\s*["'][A-Za-z0-9_\-./+]{16,}["']/i,
    ],
  },
  {
    id: "env-exfil",
    severity: "warning",
    title: "Environment / shell-history snooping",
    explanation:
      "Reads environment variables, SSH keys, cloud credentials, or shell history — data that often contains secrets and is a stepping stone to exfiltration.",
    patterns: [
      /\bprintenv\b/,
      /\benv\b[^.\n]{0,30}\|\s*(curl|wget|nc|base64|jq)/,
      /~\/.ssh\/id_[a-z]+/,
      /~\/.aws\/credentials/,
      /\/etc\/(passwd|shadow)/,
      /\.(bash_history|zsh_history)/,
    ],
  },
  {
    id: "reverse-shell",
    severity: "critical",
    title: "Reverse-shell primitives",
    explanation:
      "Netcat with -e, /dev/tcp redirections, and mkfifo pipelines are textbook reverse-shell building blocks. There is no legitimate reason for a skill to include these.",
    patterns: [
      /\bnc(at)?\b[^.\n]{0,60}-e\s+\/(bin\/)?(ba)?sh/,
      /\/dev\/tcp\//,
      /mkfifo[^.\n]{0,40}\|\s*(ba)?sh/,
      /\bncat\b[^.\n]{0,60}--exec\b/,
      /\bsocat\b[^.\n]{0,60}EXEC:/,
    ],
  },
  {
    id: "persistence",
    severity: "warning",
    title: "Persistence mechanisms",
    explanation:
      "Cron jobs, @reboot entries, systemd units, launch agents, or shell rc files make code run again later without the user asking. Persistence in a skill is a strong malware indicator.",
    patterns: [
      /\bcrontab\b/,
      /@reboot\b/,
      /\bsystemd\b/,
      /Launch(Agents|Daemons)/,
      /CurrentVersion\\Run/,
      /\.(bashrc|zshrc|bash_profile|profile)\b/,
    ],
  },
  {
    id: "sensitive-paths",
    severity: "warning",
    title: "Access to sensitive local paths",
    explanation:
      "Touches SSH keys, cloud credentials, GPG keys, or browser profile data (cookies, saved logins). Skills should not reach into these directories.",
    patterns: [
      /~\/\.ssh\//,
      /~\/\.aws\//,
      /~\/\.gnupg\//,
      /Google\/Chrome\/(Default\/)?(Cookies|Login Data)/,
      /\/etc\/ssh\//,
    ],
  },
  {
    id: "encoded-url",
    severity: "info",
    title: "URL-encoded characters in links",
    explanation:
      "Percent-encoded bytes inside URLs can disguise the real destination. Decode them to make sure the link goes where it claims to.",
    patterns: [/https?:\/\/\S*%[0-9A-Fa-f]{2}\S*/],
  },
  {
    id: "http-plain",
    severity: "info",
    title: "Insecure plain-HTTP URL",
    explanation:
      "Plain http:// links send data unencrypted and are trivially interceptable. Prefer https:// everywhere; http is only acceptable for localhost development.",
    patterns: [/(^|[\s"'`(<])http:\/\/(?!localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])[^\s"'`)>\]]+/],
  },
  {
    id: "frontmatter",
    severity: "info",
    title: "Missing SKILL.md frontmatter",
    explanation:
      "A well-formed SKILL.md starts with YAML frontmatter containing at least “name” and “description”. Missing metadata isn't a security issue, but it hurts discoverability and tooling support.",
    whole: (content) => {
      const fm = content.match(/^---\s*\n([\s\S]*?)\n---/);
      if (!fm) return [{ line: 1, snippet: "(no frontmatter block found)" }];
      const missing: string[] = [];
      if (!/^\s*name\s*:/m.test(fm[1])) missing.push("name");
      if (!/^\s*description\s*:/m.test(fm[1])) missing.push("description");
      if (missing.length === 0) return [];
      return [{ line: 1, snippet: `frontmatter missing: ${missing.join(", ")}` }];
    },
  },
];

function snippetOf(line: string): string {
  const t = line.trim();
  return t.length > 180 ? t.slice(0, 177) + "…" : t;
}

export function scanSkill(content: string, fileName: string): ScanResult {
  const lines = content.split("\n");
  const findings: Finding[] = [];

  for (const check of CHECKS) {
    const matches: Match[] = [];
    if (check.whole) {
      matches.push(...check.whole(content));
    } else if (check.patterns) {
      lines.forEach((line, i) => {
        for (const re of check.patterns!) {
          re.lastIndex = 0;
          if (re.test(line)) {
            matches.push({ line: i + 1, snippet: snippetOf(line) });
            break; // one match per line per check
          }
        }
      });
    }
    if (matches.length === 0) continue;
    const severity = check.escalate?.(matches) ?? check.severity;
    findings.push({
      id: check.id,
      severity,
      title: check.title,
      explanation: check.explanation,
      matches,
    });
  }

  // Order: critical → warning → info
  const rank: Record<Severity, number> = { critical: 0, warning: 1, info: 2 };
  findings.sort((a, b) => rank[a.severity] - rank[b.severity]);

  const score = Math.max(
    0,
    Math.min(
      100,
      100 -
        findings.reduce(
          (acc, f) =>
            acc + (CHECKS.find((c) => c.id === f.id)?.deduct ?? DEDUCT[f.severity]),
          0,
        ),
    ),
  );

  const verdict: Verdict =
    score >= 90 ? "TRUSTED" : score >= 65 ? "CAUTION" : score >= 35 ? "SUSPICIOUS" : "DANGEROUS";

  const urlMatches = content.match(/https?:\/\/[^\s"'`)>\]]+/g) ?? [];
  const codeFences = (content.match(/```/g) ?? []).length;

  return {
    fileName,
    scannedAt: new Date().toISOString(),
    score,
    verdict,
    findings,
    stats: {
      lines: lines.length,
      bytes: new Blob([content]).size,
      urls: urlMatches.length,
      codeBlocks: Math.floor(codeFences / 2),
    },
  };
}

export const CHECK_COUNT = CHECKS.length;

export const SEVERITY_META: Record<
  Severity,
  { label: string; color: string; bg: string; border: string }
> = {
  critical: { label: "Critical", color: "text-red-300", bg: "bg-red-500/10", border: "border-red-500/30" },
  warning: { label: "Warning", color: "text-amber-300", bg: "bg-amber-500/10", border: "border-amber-500/30" },
  info: { label: "Info", color: "text-sky-300", bg: "bg-sky-500/10", border: "border-sky-500/30" },
};

export const VERDICT_META: Record<Verdict, { color: string; ring: string; blurb: string }> = {
  TRUSTED: {
    color: "#34d399",
    ring: "stroke-emerald-400",
    blurb: "No significant issues found. Looks safe to install.",
  },
  CAUTION: {
    color: "#fbbf24",
    ring: "stroke-amber-400",
    blurb: "Some warnings worth reviewing before installing.",
  },
  SUSPICIOUS: {
    color: "#fb923c",
    ring: "stroke-orange-400",
    blurb: "Multiple red flags — do not install without a full manual review.",
  },
  DANGEROUS: {
    color: "#f87171",
    ring: "stroke-red-400",
    blurb: "Looks actively malicious. Do not install. Delete the file.",
  },
};
