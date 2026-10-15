const STYLE = {
  none: "bg-slate-800 text-slate-400 border border-slate-700 hover:border-emerald-500",
  fixed: "bg-emerald-500 text-slate-950 ring-2 ring-emerald-300",
  excluded: "bg-red-500/20 text-red-300 border border-red-500/60 line-through",
};
const NEXT = { none: "fixed", fixed: "excluded", excluded: "none" };

export const NumberPicker = ({ value, onChange }) => {
  const state = (n) => (value.fixed.includes(n) ? "fixed" : value.excluded.includes(n) ? "excluded" : "none");
  const toggle = (n) => {
    const next = NEXT[state(n)];
    const fixed = value.fixed.filter((x) => x !== n);
    const excluded = value.excluded.filter((x) => x !== n);
    if (next === "fixed") fixed.push(n);
    if (next === "excluded") excluded.push(n);
    onChange({ fixed: fixed.sort((a, b) => a - b), excluded: excluded.sort((a, b) => a - b) });
  };
  return (
    <div className="space-y-2">
      <div data-testid="number-picker" className="grid grid-cols-5 gap-1.5 w-fit">
        {Array.from({ length: 25 }, (_, i) => i + 1).map((n) => (
          <button key={n} type="button" data-testid={`picker-number-${n}`} data-state={state(n)} onClick={() => toggle(n)}
            className={`w-9 h-9 rounded-full font-mono text-xs font-bold transition-colors ${STYLE[state(n)]}`}>
            {String(n).padStart(2, "0")}
          </button>
        ))}
      </div>
      <p className="text-[11px] text-slate-500">Clique: 1x fixa · 2x exclui · 3x limpa</p>
      <p data-testid="picker-summary" className="text-xs text-slate-400">
        <span className="text-emerald-400">{value.fixed.length} {value.fixed.length === 1 ? "fixa" : "fixas"}</span> · <span className="text-red-300">{value.excluded.length} {value.excluded.length === 1 ? "excluída" : "excluídas"}</span>
        {(value.fixed.length > 0 || value.excluded.length > 0) && (
          <button type="button" data-testid="picker-clear" onClick={() => onChange({ fixed: [], excluded: [] })} className="ml-3 underline text-slate-500 hover:text-white">Limpar seleção</button>
        )}
      </p>
    </div>
  );
};
