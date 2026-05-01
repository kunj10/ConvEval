import { useState } from "react";
import { ScoreBar } from "./ScoreBar";
import { ConfidencePill } from "./ConfidencePill";

const DOMAIN_COLORS = {
  linguistic_quality: "#6366f1",
  pragmatics: "#06b6d4",
  safety: "#22c55e",
  emotion: "#f97316",
};

export function FacetTable({ facetResults }) {
  const [search, setSearch] = useState("");
  const [domainFilter, setDomainFilter] = useState("all");
  const [sortBy, setSortBy] = useState("facet_id");

  const domains = [...new Set(facetResults.map((f) => f.domain))];
  const filtered = facetResults
    .filter((f) => domainFilter === "all" || f.domain === domainFilter)
    .filter(
      (f) =>
        !search ||
        f.facet_name.toLowerCase().includes(search.toLowerCase()) ||
        f.facet_id.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      if (sortBy === "score") return b.score - a.score;
      if (sortBy === "confidence") return b.confidence - a.confidence;
      return a.facet_id.localeCompare(b.facet_id);
    });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <input
          className="bg-dark border border-white-10 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-white/20 w-full md:w-64"
          placeholder="Search facets…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="flex gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 hide-scrollbar">
          {["all", ...domains].map((d) => (
            <button
              key={d}
              className={`px-3 py-1.5 rounded-lg text-sm transition-colors whitespace-nowrap border ${
                domainFilter === d ? "bg-white/10 text-white" : "border-white-10 text-text-muted hover:bg-white/5"
              }`}
              style={domainFilter === d && d !== "all" ? { borderColor: DOMAIN_COLORS[d], color: DOMAIN_COLORS[d] } : {}}
              onClick={() => setDomainFilter(d)}
            >
              {d === "all" ? "All" : d.replace("_", " ")}
            </button>
          ))}
        </div>
        <select 
          className="bg-dark border border-white-10 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-white/20 w-full md:w-auto" 
          value={sortBy} 
          onChange={(e) => setSortBy(e.target.value)}
        >
          <option value="facet_id">Sort: ID</option>
          <option value="score">Sort: Score ↓</option>
          <option value="confidence">Sort: Confidence ↓</option>
        </select>
      </div>

      <div className="text-xs text-text-muted font-mono">{filtered.length} facets shown</div>

      <div className="overflow-x-auto border border-white-10 rounded-xl bg-dark/30">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-white/5 border-b border-white-10 text-text-muted font-medium">
            <tr>
              <th className="px-4 py-3">ID</th>
              <th className="px-4 py-3">Facet</th>
              <th className="px-4 py-3">Domain</th>
              <th className="px-4 py-3 w-48">Score</th>
              <th className="px-4 py-3 w-32">Confidence</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white-10">
            {filtered.map((f) => (
              <tr key={f.facet_id} title={f.evaluation_question} className="hover:bg-white/5 transition-colors">
                <td className="px-4 py-3 font-mono text-xs text-text-muted">{f.facet_id}</td>
                <td className="px-4 py-3 text-white truncate max-w-[200px]">{f.facet_name}</td>
                <td className="px-4 py-3">
                  <span
                    className="px-2 py-1 rounded-md text-xs font-medium"
                    style={{ background: DOMAIN_COLORS[f.domain] + "22", color: DOMAIN_COLORS[f.domain] }}
                  >
                    {f.domain.replace("_", " ")}
                  </span>
                </td>
                <td className="px-4 py-3"><ScoreBar score={f.score} /></td>
                <td className="px-4 py-3"><ConfidencePill value={f.confidence} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
