import { Activity, Box, Lock, Server, Shield, Zap } from "lucide-react";
import BentoCard from "../components/BentoCard";
import BentoTerminal from "../components/BentoTerminal";

export default function Dashboard() {
  return (
    <div className="max-w-[1200px] mx-auto py-12 px-6">
      
      {/* Header */}
      <div className="mb-12">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4 text-[#EDEDED]">
          The Universal Evaluation Platform
        </h1>
        <p className="text-lg text-text-muted max-w-2xl leading-relaxed">
          Scale your AI inference and automatically evaluate conversational models across 300+ linguistic, pragmatic, and safety facets.
        </p>
      </div>

      {/* Bento Grid */}
      <div className="grid grid-cols-12 gap-6">
        
        {/* Card 1: Deploy Any Model (col-span-8) */}
        <BentoCard className="col-span-12 lg:col-span-8 group flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-white/5 rounded-lg border border-white-10">
                <Server size={20} className="text-[#EDEDED]" />
              </div>
              <h2 className="text-xl font-semibold tracking-tight">Deploy Any Model</h2>
            </div>
            <p className="text-text-muted leading-relaxed max-w-md">
              Run Qwen, Llama, or Mixtral locally or in the cloud. Serve instruction-tuned open-weights models dynamically.
            </p>
          </div>
          <BentoTerminal />
        </BentoCard>

        {/* Card 2: Model Frameworks (col-span-4) */}
        <BentoCard className="col-span-12 lg:col-span-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-white/5 rounded-lg border border-white-10">
                <Box size={20} className="text-[#EDEDED]" />
              </div>
              <h2 className="text-xl font-semibold tracking-tight">Custom Models</h2>
            </div>
            <p className="text-text-muted leading-relaxed">
              Bring your own fine-tuned weights using PEFT and LoRA adapters.
            </p>
          </div>
          
          <div className="mt-8 grid grid-cols-2 gap-4">
            {[
              { name: "PyTorch", color: "bg-white/5 text-[#EDEDED] border-white-10" },
              { name: "JAX", color: "bg-white/5 text-[#EDEDED] border-white-10" },
              { name: "Transformers", color: "bg-white/5 text-[#EDEDED] border-white-10" },
              { name: "vLLM", color: "bg-white/5 text-[#EDEDED] border-white-10" }
            ].map((fw) => (
              <div key={fw.name} className={`px-4 py-3 rounded-xl border flex items-center justify-center font-mono text-sm transition-transform duration-500 hover:-translate-y-1 ${fw.color}`}>
                {fw.name}
              </div>
            ))}
          </div>
        </BentoCard>

        {/* Card 3: Observability (col-span-4) */}
        <BentoCard className="col-span-12 lg:col-span-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-white/5 rounded-lg border border-white-10">
              <Activity size={20} className="text-[#EDEDED]" />
            </div>
            <h2 className="text-xl font-semibold tracking-tight">Observability</h2>
          </div>
          <p className="text-text-muted mb-8 leading-relaxed">
            Monitor per-token log-probability confidence scores in real time.
          </p>
          
          <div className="bg-black rounded-xl p-4 border border-white-10">
            <div className="flex justify-between items-end mb-2">
              <span className="text-sm font-mono text-text-muted">Latency Reduction</span>
              <span className="text-xl font-semibold text-white">-42%</span>
            </div>
            <svg className="w-full h-16 grayscale" viewBox="0 0 100 30" preserveAspectRatio="none">
              <path 
                d="M0,30 L10,25 L20,28 L30,15 L40,20 L50,8 L60,12 L70,5 L80,10 L90,2 L100,0" 
                fill="none" 
                stroke="#FFFFFF" 
                strokeWidth="2" 
                className="animate-[dash_3s_ease-in-out_infinite]"
              />
            </svg>
          </div>
        </BentoCard>

        {/* Card 4: Enterprise Ready (col-span-8) */}
        <BentoCard className="col-span-12 lg:col-span-8 flex flex-col md:flex-row gap-8 items-center">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-white/5 rounded-lg border border-white-10">
                <Shield size={20} className="text-[#EDEDED]" />
              </div>
              <h2 className="text-xl font-semibold tracking-tight">Enterprise Ready</h2>
            </div>
            <p className="text-text-muted leading-relaxed">
              Designed for production compliance. ConvEval operates entirely within your VPC. No data is sent to external APIs like OpenAI, ensuring strict privacy and security for your conversational transcripts.
            </p>
            <div className="mt-6 flex gap-4">
              <span className="flex items-center gap-2 text-sm px-3 py-1.5 rounded-full bg-white/5 border border-white-10">
                <Lock size={14} className="text-white" /> SOC2 Compliant
              </span>
              <span className="flex items-center gap-2 text-sm px-3 py-1.5 rounded-full bg-white/5 border border-white-10">
                <Zap size={14} className="text-white" /> Zero-Trust
              </span>
            </div>
          </div>
          
          <div className="w-full md:w-1/3 aspect-square rounded-2xl border border-white-10 bg-black flex items-center justify-center relative overflow-hidden">
            <Shield size={64} className="text-white/20" />
            
            {/* CSS Animated Border Beam Effect - Monochrome */}
            <div className="absolute inset-0 rounded-2xl border border-transparent [mask-image:linear-gradient(black,transparent)] before:absolute before:inset-0 before:bg-[conic-gradient(from_0deg,transparent_0_340deg,white_360deg)] before:animate-[spin_5s_linear_infinite] before:opacity-20" style={{ padding: '1px', WebkitMaskComposite: 'xor', maskComposite: 'exclude' }}>
              <div className="absolute inset-0 rounded-2xl bg-surface-dark"></div>
            </div>
          </div>
        </BentoCard>

      </div>
    </div>
  );
}
