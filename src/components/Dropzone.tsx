import { useRef, useState } from "react";
import { FileUp, ShieldCheck, UploadCloud } from "lucide-react";

interface Props {
  onScan: (content: string, fileName: string) => void;
}

export default function Dropzone({ onScan }: Props) {
  const [dragging, setDragging] = useState(false);
  const [text, setText] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const readFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => onScan(String(reader.result ?? ""), file.name || "SKILL.md");
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) readFile(file);
  };

  return (
    <div className="card p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-bold text-white">Scan a skill</h2>
        <span className="chip">
          <ShieldCheck size={12} className="text-emerald-300" />
          100% local — nothing leaves your browser
        </span>
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-8 text-center transition ${
          dragging
            ? "border-emerald-400/70 bg-emerald-400/5"
            : "border-edge bg-void/40 hover:border-emerald-400/40 hover:bg-void/70"
        }`}
        role="button"
        aria-label="Drop a SKILL.md file or click to choose one"
      >
        <UploadCloud size={28} className={dragging ? "text-emerald-300" : "text-mist"} />
        <p className="text-sm font-medium text-fog">
          Drag &amp; drop a <span className="font-mono">SKILL.md</span> here, or click to browse
        </p>
        <p className="text-xs text-mist/70">Scans instantly, in your browser. No uploads, no servers.</p>
        <input
          ref={inputRef}
          type="file"
          accept=".md,.markdown,text/markdown,text/plain"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) readFile(f);
            e.target.value = "";
          }}
        />
      </div>

      <div className="my-4 flex items-center gap-3 text-[11px] font-semibold uppercase tracking-wider text-mist/70">
        <span className="h-px flex-1 bg-edge" /> or paste the contents <span className="h-px flex-1 bg-edge" />
      </div>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={"---\nname: my-skill\ndescription: What it does\n---\n\n# My Skill\n\nPaste your SKILL.md here…"}
        rows={8}
        spellCheck={false}
        className="w-full resize-y rounded-xl border border-edge bg-void/60 p-3 font-mono text-xs leading-relaxed text-fog placeholder:text-mist/40 focus:border-emerald-400/50 focus:outline-none"
      />
      <button
        onClick={() => text.trim() && onScan(text, "pasted-SKILL.md")}
        disabled={!text.trim()}
        className="btn-primary mt-3 w-full"
      >
        <FileUp size={16} />
        Scan pasted content
      </button>
    </div>
  );
}
