export const Ball = ({ n, size = "md", tone = "brand" }) => {
  const sz = size === "sm" ? "w-7 h-7 text-[11px]" : "w-9 h-9 text-sm";
  const tones = {
    brand: "bg-emerald-500 text-slate-950 shadow-emerald-500/30",
    gold: "bg-amber-400 text-slate-950 shadow-amber-400/30",
    muted: "bg-slate-800 text-slate-500 border border-slate-700/60 shadow-none",
  };
  return (
    <span className={`ball ${sz} ${tones[tone]}`}>{String(n).padStart(2, "0")}</span>
  );
};

export const BallRow = ({ numbers, size = "sm", tone }) => (
  <div className="flex flex-wrap gap-1.5">
    {numbers.map((n) => (
      <Ball key={n} n={n} size={size} tone={tone} />
    ))}
  </div>
);

export const BallGrid = ({ selected }) => (
  <div className="grid grid-cols-5 gap-1.5 w-fit">
    {Array.from({ length: 25 }, (_, i) => i + 1).map((n) => (
      <Ball key={n} n={n} size="sm" tone={selected.includes(n) ? "brand" : "muted"} />
    ))}
  </div>
);
