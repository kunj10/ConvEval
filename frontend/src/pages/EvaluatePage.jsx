import { useState } from "react";
import { api } from "../utils/api";
import { DomainRadar } from "../components/DomainRadar";
import { FacetTable } from "../components/FacetTable";
import { ScoreBar } from "../components/ScoreBar";
import BentoCard from "../components/BentoCard";
import { Play, Activity, Server, Settings2 } from "lucide-react";

const SAMPLE_CONV = {
  conversation_id: "demo_001",
  conversation_type: "customer_support",
  turns: [
    { turn_id: 1, speaker: "user", text: "Hi, I placed an order 2 weeks ago and it still hasn't arrived. Can you help?" },
    { turn_id: 2, speaker: "agent", text: "I'm sorry to hear that! Please share your order number and I'll look into it immediately." },
    { turn_id: 3, speaker: "user", text: "My order number is #98765." },
    { turn_id: 4, speaker: "agent", text: "Thank you! I can see there's been a shipping delay. I'll escalate this now and you'll receive an update within 24 hours. I apologize for the inconvenience." },
  ],
};

const DOMAIN_COLORS = { linguistic_quality: "#EDEDED", pragmatics: "#EDEDED", safety: "#EDEDED", emotion: "#EDEDED" };

export default function EvaluatePage() {
  const [convJson, setConvJson] = useState(JSON.stringify(SAMPLE_CONV, null, 2));
  const [domains, setDomains] = useState({ linguistic_quality: true, pragmatics: true, safety: true, emotion: true });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTurn, setActiveTurn] = useState(0);

  const selectedDomains = Object.entries(domains).filter(([, v]) => v).map(([k]) => k);

  const handleEvaluate = async () => {
    setError(null);
    setLoading(true);
    setResult(null);
    try {
      const conversation = JSON.parse(convJson);
      const res = await api.evaluate(conversation, null, selectedDomains.length === 4 ? null : selectedDomains);
      setResult(res);
      setActiveTurn(0);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLoadSample = async () => {
    try {
      const { conversations } = await api.getSamples(1);
      if (conversations[0]) setConvJson(JSON.stringify(conversations[0], null, 2));
    } catch (e) { setConvJson(JSON.stringify(SAMPLE_CONV, null, 2)); }
  };

  const turn = result?.turn_results?.[activeTurn];

  return (
    <div className="max-w-[1400px] mx-auto py-8 px-6">
      
      {/* Header & Main CTA */}
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight mb-2">Evaluation Platform</h1>
          <p className="text-text-muted">Run inference and evaluate conversational transcripts across architectural facets.</p>
        </div>
        <button 
          onClick={handleEvaluate} 
          disabled={loading}
          className="px-6 py-2.5 rounded-lg bg-white text-black font-semibold tracking-tight hover:bg-gray-200 transition-colors flex items-center gap-2 disabled:opacity-50"
        >
          {loading ? <span className="animate-pulse">Running...</span> : <><Play size={16} fill="currentColor" /> Run Evaluation</>}
        </button>
      </div>

      <div className="grid grid-cols-12 gap-6">

        {/* --- ROW 1: INPUT AND SETTINGS --- */}
        <BentoCard className="col-span-12 lg:col-span-8 flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-sm font-semibold tracking-tight uppercase text-text-muted flex items-center gap-2">
              <Server size={16} /> JSON Payload
            </h2>
            <button 
              onClick={handleLoadSample}
              className="text-xs text-text-muted hover:text-white transition-colors"
            >
              Load Sample
            </button>
          </div>
          <div className="flex-1 bg-[#000000] border border-white-10 rounded-lg overflow-hidden">
            <textarea
              className="w-full h-full min-h-[300px] bg-transparent p-4 text-[13px] leading-relaxed font-mono text-[#D4D4D4] focus:outline-none resize-none scrollbar-thin"
              value={convJson}
              onChange={(e) => setConvJson(e.target.value)}
              spellCheck={false}
              style={{
                // Simulate a subtle syntax highlight by making the text gray and keeping a dark bg
                color: "#D4D4D4"
              }}
            />
          </div>
          {error && <div className="mt-4 text-xs text-red-400 font-mono">{error}</div>}
        </BentoCard>

        <BentoCard className="col-span-12 lg:col-span-4 flex flex-col">
          <h2 className="text-sm font-semibold tracking-tight uppercase text-text-muted mb-6 flex items-center gap-2">
            <Settings2 size={16} /> Configuration
          </h2>
          <div className="flex flex-col gap-4">
            {Object.keys(domains).map((d) => (
              <label key={d} className="flex items-center justify-between cursor-pointer group">
                <span className="text-sm font-medium capitalize text-[#EDEDED]">{d.replace("_", " ")}</span>
                <div className={`w-8 h-4 rounded-full transition-colors relative ${domains[d] ? 'bg-white' : 'bg-white/10'}`}>
                  <div className={`absolute top-[2px] w-3 h-3 rounded-full bg-black transition-all ${domains[d] ? 'left-[18px]' : 'left-[2px] bg-[#A1A1AA]'}`} />
                </div>
                <input
                  type="checkbox"
                  hidden
                  checked={domains[d]}
                  onChange={() => setDomains((prev) => ({ ...prev, [d]: !prev[d] }))}
                />
              </label>
            ))}
          </div>
          <div className="mt-auto pt-8">
             <div className="p-4 rounded-lg bg-white/5 border border-white-10 text-xs text-text-muted leading-relaxed">
               Evaluation runs completely locally. Open-weights models are loaded via transformers directly into your VPC.
             </div>
          </div>
        </BentoCard>

        {/* --- ROW 2: RESULTS (Empty or Loaded) --- */}
        {!result && !loading && (
          <div className="col-span-12 mt-8 py-24 flex flex-col items-center justify-center border border-dashed border-white-10 rounded-xl text-text-muted">
            <Activity size={32} className="mb-4 opacity-50" />
            <p className="text-sm">Ready for evaluation. Select domains and click Run.</p>
          </div>
        )}

        {loading && (
          <div className="col-span-12 mt-8 py-24 flex flex-col items-center justify-center border border-dashed border-white-10 rounded-xl text-text-muted">
            <div className="w-8 h-8 border-2 border-white-10 border-t-white rounded-full animate-spin mb-4" />
            <p className="text-sm animate-pulse">Evaluating {JSON.parse(convJson).turns?.length || 0} turns...</p>
          </div>
        )}

        {result && (
          <>
            {/* Stats Row */}
            <BentoCard className="col-span-12 md:col-span-3">
              <div className="text-xs uppercase tracking-wider text-text-muted mb-2">Total Evals</div>
              <div className="text-3xl font-semibold tracking-tight">{result.overall_summary.total_facet_evaluations}</div>
            </BentoCard>
            <BentoCard className="col-span-12 md:col-span-3">
              <div className="text-xs uppercase tracking-wider text-text-muted mb-2">Mean Score</div>
              <div className="text-3xl font-semibold tracking-tight text-white">{result.overall_summary.overall_mean_score}</div>
            </BentoCard>
            <BentoCard className="col-span-12 md:col-span-3">
              <div className="text-xs uppercase tracking-wider text-text-muted mb-2">Confidence</div>
              <div className="text-3xl font-semibold tracking-tight text-white">{Math.round(result.overall_summary.overall_mean_confidence * 100)}%</div>
            </BentoCard>
            <BentoCard className="col-span-12 md:col-span-3">
              <div className="text-xs uppercase tracking-wider text-text-muted mb-2">Turns Scored</div>
              <div className="text-3xl font-semibold tracking-tight">{result.turn_results.length}</div>
            </BentoCard>

            {/* Radar & Domain Row */}
            {turn && (
              <>
                <BentoCard className="col-span-12 lg:col-span-6 flex flex-col">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wider">Domain Radar</h3>
                    <select 
                      className="bg-black border border-white-10 text-xs px-2 py-1 rounded text-white outline-none"
                      value={activeTurn}
                      onChange={(e) => setActiveTurn(parseInt(e.target.value))}
                    >
                      {result.turn_results.map((t, i) => (
                        <option key={i} value={i}>Turn {t.turn_id} ({t.speaker})</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex-1 flex items-center justify-center -ml-6 grayscale opacity-80">
                    <DomainRadar domainSummaries={turn.domain_summaries} />
                  </div>
                </BentoCard>

                <BentoCard className="col-span-12 lg:col-span-6 flex flex-col">
                  <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-6">Domain Averages</h3>
                  <div className="flex flex-col gap-6 flex-1 justify-center">
                    {Object.entries(turn.domain_summaries).map(([d, s]) => (
                      <div key={d} className="flex items-center gap-4">
                        <div className="w-32 text-sm font-medium capitalize text-text-muted">
                          {d.replace("_", " ")}
                        </div>
                        <div className="flex-1">
                          <ScoreBar score={Math.round(s.mean)} color="#FFFFFF" />
                        </div>
                        <div className="w-12 text-right">
                          <span className="text-white font-mono text-sm">{s.mean.toFixed(2)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </BentoCard>

                {/* Facet Table Row */}
                <BentoCard className="col-span-12">
                  <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-6">Facet Breakdown</h3>
                  <FacetTable facetResults={turn.facet_results} />
                </BentoCard>
              </>
            )}
          </>
        )}

      </div>
    </div>
  );
}
