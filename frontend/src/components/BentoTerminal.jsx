import { useEffect, useState } from "react";
import { Terminal } from "lucide-react";

const CODE_SNIPPET = `import bentoml

@bentoml.service(
    resources={"cpu": "2"},
    traffic={"timeout": 10}
)
class ConvEvalService:
    def __init__(self):
        self.model = bentoml.models.get("qwen2-7b-instruct:latest")
        
    @bentoml.api
    def evaluate(self, conversation: dict) -> dict:
        return self.model.predict(conversation)
`;

export default function BentoTerminal() {
  const [typedText, setTypedText] = useState("");

  useEffect(() => {
    let index = 0;
    const interval = setInterval(() => {
      setTypedText(CODE_SNIPPET.slice(0, index));
      index++;
      if (index > CODE_SNIPPET.length) {
        clearInterval(interval);
      }
    }, 20); // Typing speed
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="mt-6 rounded-xl bg-[#011627] border border-white-10 overflow-hidden font-mono text-sm shadow-2xl">
      <div className="flex items-center gap-2 px-4 py-3 bg-[#011627] border-b border-white-10">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-[#EF4444] opacity-80" />
          <div className="w-3 h-3 rounded-full bg-[#F59E0B] opacity-80" />
          <div className="w-3 h-3 rounded-full bg-[#10B981] opacity-80" />
        </div>
        <div className="ml-4 text-xs text-text-muted flex items-center gap-2">
          <Terminal size={14} />
          <span>service.py</span>
        </div>
      </div>
      <div className="p-4 overflow-x-auto">
        <pre className="text-[#d6deeb] leading-relaxed">
          <code>{typedText}<span className="animate-pulse">|</span></code>
        </pre>
      </div>
    </div>
  );
}
