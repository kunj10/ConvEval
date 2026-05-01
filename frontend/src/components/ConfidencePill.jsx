export function ConfidencePill({ value }) {
  // value is between 0.0 and 1.0
  const color = value > 0.85 ? "bg-emerald-500" : value > 0.70 ? "bg-blue-500" : value > 0.5 ? "bg-yellow-500" : "bg-red-500";
  return (
    <div className="flex items-center gap-2">
      <div className={`w-2 h-2 rounded-full ${color}`}></div>
      <span className="font-mono text-sm text-text-muted">{(value * 100).toFixed(0)}%</span>
    </div>
  )
}
