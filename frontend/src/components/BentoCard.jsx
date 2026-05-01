export default function BentoCard({ children, className = "" }) {
  return (
    <div
      className={`relative overflow-hidden bg-surface-dark border border-white-10 rounded-xl p-6 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)] transition-colors duration-500 ease-in-out hover:border-white/30 ${className}`}
    >
      <div className="relative z-10 h-full">{children}</div>
    </div>
  );
}
