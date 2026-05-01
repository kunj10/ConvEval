export function ScoreBar({ score, max = 5, color }) {
  const pct = (score / max) * 100;
  const cols = { 1: "#ef4444", 2: "#f97316", 3: "#eab308", 4: "#22c55e", 5: "#06b6d4" };
  const c = color || cols[score] || "#6366f1";
  return (
    <div className="flex items-center gap-3">
      <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: c }} />
      </div>
      <span className="text-xs font-mono px-2 py-0.5 rounded-md font-bold text-white shadow-sm" style={{ background: c }}>{score}</span>
    </div>
  );
}
