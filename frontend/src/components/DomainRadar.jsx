import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer, Tooltip } from "recharts";
const DOMAIN_LABELS = {
  linguistic_quality: "Linguistic",
  pragmatics: "Pragmatics",
  safety: "Safety",
  emotion: "Emotion",
};
export function DomainRadar({ domainSummaries }) {
  const data = Object.entries(domainSummaries || {}).map(([k, v]) => ({
    domain: DOMAIN_LABELS[k] || k,
    score: parseFloat(v.mean?.toFixed(2) || 0),
    fullMark: 5,
  }));
  if (!data.length) return null;
  return (
    <ResponsiveContainer width="100%" height={220}>
      <RadarChart data={data}>
        <PolarGrid stroke="#334155" />
        <PolarAngleAxis dataKey="domain" tick={{ fill: "#94a3b8", fontSize: 12 }} />
        <Radar dataKey="score" stroke="#6366f1" fill="#6366f1" fillOpacity={0.35} />
        <Tooltip formatter={(v) => v.toFixed(2)} />
      </RadarChart>
    </ResponsiveContainer>
  );
}
