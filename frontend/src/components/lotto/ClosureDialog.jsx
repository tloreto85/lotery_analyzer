import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "../ui/dialog";
import { Button } from "../ui/button";
import { Loader2 } from "lucide-react";

const COUNTS = { 15: { 16: 16, 17: 136, 18: 816 }, 14: { 16: 1, 17: 8, 18: 24, 19: 145, 20: 481 }, 13: { 16: 1, 17: 1, 18: 6, 19: 13, 20: 42 } };
const MODES = [[15, "Completo", "todas as combinações"], [14, "Garante 14", "se as 15 sorteadas estiverem entre as escolhidas"], [13, "Garante 13", "se as 15 sorteadas estiverem entre as escolhidas"]];

const validate = (sel, mode) => {
  if (sel.length < 16 || sel.length > 20) return "Escolha de 16 a 20 dezenas.";
  if (mode === 15 && sel.length > 18) return "Fechamento completo disponível até 18 dezenas (816 jogos).";
  return null;
};

export const ClosureDialog = ({ open, onOpenChange, stats, loading, onGenerate }) => {
  const [sel, setSel] = useState([]);
  const [mode, setMode] = useState(14);

  const toggle = (n) => setSel((s) => (s.includes(n) ? s.filter((x) => x !== n) : s.length < 20 ? [...s, n].sort((a, b) => a - b) : s));
  const suggest = (k) => setSel([...stats.number_freq].sort((a, b) => b.count - a.count).slice(0, k).map((f) => f.number).sort((a, b) => a - b));
  const error = validate(sel, mode);
  const count = COUNTS[mode][sel.length];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="modal-closure" className="bg-slate-950 border-slate-800 text-slate-100 sm:max-w-2xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Fechamento</DialogTitle>
          <DialogDescription className="text-slate-400">Escolha de 16 a 20 dezenas e gere jogos combinando-as.</DialogDescription>
        </DialogHeader>
        <div className="grid sm:grid-cols-2 gap-6">
          <div className="space-y-3">
            <div data-testid="closure-picker" className="grid grid-cols-5 gap-1.5 w-fit">
              {Array.from({ length: 25 }, (_, i) => i + 1).map((n) => (
                <button key={n} type="button" data-testid={`closure-number-${n}`} data-selected={sel.includes(n)} onClick={() => toggle(n)}
                  className={`w-9 h-9 rounded-full font-mono text-xs font-bold transition-colors ${sel.includes(n) ? "bg-emerald-500 text-slate-950 ring-2 ring-emerald-300" : "bg-slate-800 text-slate-400 border border-slate-700 hover:border-emerald-500"}`}>
                  {String(n).padStart(2, "0")}
                </button>
              ))}
            </div>
            <p data-testid="closure-count" className="text-xs text-slate-400">{sel.length} de 16–20 dezenas escolhidas</p>
            <div className="flex flex-wrap gap-1.5">
              <span className="text-[11px] text-slate-500 w-full">Sugerir as mais frequentes:</span>
              {[16, 17, 18, 19, 20].map((k) => (
                <button key={k} data-testid={`closure-suggest-${k}`} onClick={() => suggest(k)} className="rounded border border-slate-700 px-2 py-1 text-xs text-slate-300 hover:border-emerald-500">{k}</button>
              ))}
              {sel.length > 0 && <button data-testid="closure-clear" onClick={() => setSel([])} className="text-xs underline text-slate-500 hover:text-white ml-1">Limpar</button>}
            </div>
          </div>
          <div className="space-y-2">
            <p className="label">Tipo de fechamento</p>
            {MODES.map(([v, l, d]) => (
              <button key={v} data-testid={`closure-mode-${v}`} onClick={() => setMode(v)}
                className={`w-full text-left rounded-md border px-3 py-2.5 transition-colors ${mode === v ? "border-emerald-400 bg-emerald-500/15" : "border-slate-700 hover:border-emerald-500"}`}>
                <span className="block text-sm font-semibold text-white">{l}</span>
                <span className="block text-[11px] text-slate-400">{d}</span>
              </button>
            ))}
            <p data-testid="closure-estimate" className="text-sm text-slate-300 pt-2">
              {count ? <>{count === 1 ? "Será gerado" : "Serão gerados"} <span className="font-mono text-emerald-400">{count}</span> {count === 1 ? "jogo" : "jogos"}.</> : "—"}
            </p>
          </div>
        </div>
        {error && <p data-testid="closure-error" className="text-xs text-red-400">{error}</p>}
        <DialogFooter>
          <Button data-testid="button-generate-closure" className="btn-brand w-full" disabled={!!error || loading} onClick={() => onGenerate(sel, mode)}>
            {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}Gerar fechamento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
