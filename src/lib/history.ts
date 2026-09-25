import type { ScanResult } from "./scanner";

export interface HistoryEntry {
  id: string;
  fileName: string;
  scannedAt: string;
  score: number;
  verdict: ScanResult["verdict"];
  findingCount: number;
  content: string;
}

const KEY = "skillbadge:history:v1";
const MAX = 25;

export function loadHistory(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as HistoryEntry[];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export function saveScan(result: ScanResult, content: string): HistoryEntry[] {
  const entry: HistoryEntry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    fileName: result.fileName,
    scannedAt: result.scannedAt,
    score: result.score,
    verdict: result.verdict,
    findingCount: result.findings.length,
    content,
  };
  const next = [entry, ...loadHistory()].slice(0, MAX);
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* storage full or unavailable — non-fatal */
  }
  return next;
}

export function removeEntry(id: string): HistoryEntry[] {
  const next = loadHistory().filter((e) => e.id !== id);
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  return next;
}

export function clearHistory(): HistoryEntry[] {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
  return [];
}
