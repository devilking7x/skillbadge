import { Clock, Eye, History, Trash2 } from "lucide-react";
import { VERDICT_META } from "../lib/scanner";
import type { HistoryEntry } from "../lib/history";

interface Props {
  entries: HistoryEntry[];
  onView: (entry: HistoryEntry) => void;
  onDelete: (id: string) => void;
  onClear: () => void;
}

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export default function HistoryPanel({ entries, onView, onDelete, onClear }: Props) {
  if (entries.length === 0) {
    return (
      <div className="card flex items-center gap-3 p-5">
        <History size={18} className="shrink-0 text-mist/60" />
        <p className="text-[13px] text-mist">
          No scans yet. Every scan you run is saved here in your browser (localStorage) so you can re-view it later.
        </p>
      </div>
    );
  }

  return (
    <div className="card p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-bold text-white">
          <History size={15} className="text-emerald-300" />
          Scan history
          <span className="rounded-full bg-panel-2 px-2 py-0.5 text-[10px] font-semibold text-mist">{entries.length}</span>
        </h2>
        <button onClick={onClear} className="text-xs font-medium text-mist/70 transition hover:text-red-300">
          Clear all
        </button>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {entries.map((e) => {
          const meta = VERDICT_META[e.verdict];
          return (
            <div key={e.id} className="group flex items-center gap-3 rounded-xl border border-edge bg-void/40 p-3">
              <span
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-base font-bold"
                style={{ color: meta.color, backgroundColor: `${meta.color}14`, border: `1px solid ${meta.color}44` }}
              >
                {e.score}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-medium text-fog" title={e.fileName}>{e.fileName}</p>
                <p className="flex items-center gap-1 text-[11px] text-mist/70">
                  <Clock size={10} />
                  {fmtDate(e.scannedAt)} · {e.findingCount} finding{e.findingCount === 1 ? "" : "s"}
                </p>
              </div>
              <div className="flex shrink-0 gap-1">
                <button
                  onClick={() => onView(e)}
                  className="rounded-lg border border-edge p-1.5 text-mist transition hover:border-emerald-400/40 hover:text-emerald-300"
                  title="Re-view this scan"
                >
                  <Eye size={14} />
                </button>
                <button
                  onClick={() => onDelete(e.id)}
                  className="rounded-lg border border-edge p-1.5 text-mist transition hover:border-red-400/40 hover:text-red-300"
                  title="Delete"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
