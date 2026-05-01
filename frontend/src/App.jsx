import { useState } from "react";
import Dashboard from "./pages/Dashboard";
import EvaluatePage from "./pages/EvaluatePage";
import "./styles/globals.css";

export default function App() {
  const [page, setPage] = useState("dashboard");

  return (
    <div className="relative min-h-screen text-[#EDEDED] font-sans selection:bg-[#EDEDED]/20">
      
      {/* Brutalist Header */}
      <header className="sticky top-0 z-50 flex items-center justify-between px-6 py-4 border-b border-white-10 bg-dark">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 flex items-center justify-center">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" className="drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]">
              <path 
                d="M 5 12 C 5 6, 12 6, 12 12 C 12 18, 19 18, 19 12 C 19 6, 12 6, 12 12 C 12 18, 5 18, 5 12 Z" 
                stroke="#EDEDED" 
                strokeWidth="1" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
              />
              {[
                [5, 12], [19, 12], [12, 12],
                [7.8, 8.4], [16.2, 15.6],
                [7.8, 15.6], [16.2, 8.4]
              ].map(([cx, cy], i) => (
                <circle key={i} cx={cx} cy={cy} r="1.5" fill="#000000" stroke="#EDEDED" strokeWidth="1" />
              ))}
            </svg>
          </div>
          <span className="font-semibold tracking-tight text-xl text-[#EDEDED] ml-1">ConvEval</span>
        </div>
        
        <nav className="flex gap-1 bg-surface-dark p-1 rounded-full border border-white-10 shadow-inner">
          {[
            { id: "dashboard", label: "Overview" },
            { id: "evaluate", label: "Evaluations" }
          ].map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setPage(id)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-300 ${
                page === id 
                  ? "bg-white/10 text-white shadow-sm" 
                  : "text-text-muted hover:text-white hover:bg-white/5"
              }`}
            >
              {label}
            </button>
          ))}
        </nav>

        <div>
          <a 
            href="http://localhost:8000/docs" 
            target="_blank" 
            rel="noreferrer" 
            className="text-sm font-medium text-text-muted hover:text-white transition-colors duration-300 flex items-center gap-2"
          >
            API Docs <span className="opacity-50">↗</span>
          </a>
        </div>
      </header>

      <main className="relative z-10">
        {page === "dashboard" && <Dashboard />}
        {page === "evaluate" && <EvaluatePage />}
      </main>
    </div>
  );
}
