import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "../ui/dialog";
import { Button } from "../ui/button";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { previewClosure, errMsg } from "../../lib/api";
import { CostBadge } from "./Cost";

const MODES = [[15, "Completo", "todas as combinações"], [14, "Garante 14", "se as 15 sorteadas estiverem entre as escolhidas (e as fixas saírem)"], [13, "Garante 13", "se as 15 sorteadas estiverem entre as escolhidas (e as fixas saírem)"]];
const STYLE = {
  none: "bg-slate-800 text-slate-400 border border-slate-700 hover:border-emerald-500",
  selected: "bg-emerald-500 text-slate-950 ring-2 ring-emerald-300",
  fixed: "bg-amber-400 text-slate-950 ring-2 ring-amber-200",
};

const validate = (sel, fixed) => {
  if (sel.length < 16 || sel.length > 20) return "Escolha de 16 a 20 dezenas.";
  if (fixed.length > 10) return "Fixe no máximo 10 dezenas.";
  return null;
};

export const ClosureDialog = ({ open, onOpenChange, stats, loading, onGenerate }) => {
  const [sel, setSel] = useState([]);
  const [fixed, setFixed] = useState([]);
  const [mode, setMode] = useState(14);
  const [preview, setPreview] = useState({ count: null, error: null });

  const state = (n) => (fixed.includes(n) ? "fixed" : sel.includes(n) ? "selected" : "none");
  const sort = (a) => [...a].sort((x, y) => x - y);
  const toggle = (n) => {
    const s = state(n);
    if (s === "none") sel.length < 20 ? setSel(sort([...sel, n])) : toast.info("Máximo de 20 dezenas no fechamento.");
    if (s === "selected") setFixed(sort([...fixed, n]));
    if (s === "fixed") { setFixed(fixed.filter((x) => x !== n)); setSel(sel.filter((x) => x !== n)); }
  };
  const suggest = (k) => {
    setSel(sort([...stats.number_freq].sort((a, b) => b.count - a.count).slice(0, k).map((f) => f.number)));
    setFixed([]);
  };
  const error = validate(sel, fixed);

  useEffect(() => {
    if (error) { setPreview({ count: null, error: null }); return; }
    let alive = true;
    const t = setTimeout(() => {
      previewClosure(sel, mode, fixed).then((r) => alive && setPreview({ count: r.count, error: null }))
        .catch((e) => alive && setPreview({ count: null, error: errMsg(e) }));
    }, 300);
    return () => { alive = false; clearTimeout(t); };
  }, [sel, fixed, mode, error]);

  const msg = error || preview.error;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="modal-closure" className="bg-slate-950 border-slate-800 text-slate-100 sm:max-w-2xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Fechamento</DialogTitle>
          <DialogDescription className="text-slate-400">Escolha de 16 a 20 dezenas e, se quiser, fixe algumas para reduzir a quantidade de jogos.</DialogDescription>
        </DialogHeader>
        <div className="grid sm:grid-cols-2 gap-6">
          <div className="space-y-3">
            <div data-testid="closure-picker" className="grid grid-cols-5 gap-1.5 w-fit">
              {Array.from({ length: 25 }, (_, i) => i + 1).map((n) => (
                <button key={n} type="button" data-testid={`closure-number-${n}`} data-state={state(n)} data-selected={state(n) !== "none"} onClick={() => toggle(n)}
                  className={`w-9 h-9 rounded-full font-mono text-xs font-bold transition-colors ${STYLE[state(n)]}`}>
                  {String(n).padStart(2, "0")}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-slate-500">Clique: 1x escolhe · 2x fixa (dourado) · 3x remove</p>
            <p data-testid="closure-count" className="text-xs text-slate-400">
              {sel.length} de 16–20 dezenas escolhidas · <span className="text-amber-300">{fixed.length} {fixed.length === 1 ? "fixa" : "fixas"}</span>
            </p>
            <div className="flex flex-wrap gap-1.5">
              <span className="text-[11px] text-slate-500 w-full">Sugerir as mais frequentes:</span>
              {[16, 17, 18, 19, 20].map((k) => (
                <button key={k} data-testid={`closure-suggest-${k}`} onClick={() => suggest(k)} className="rounded border border-slate-700 px-2 py-1 text-xs text-slate-300 hover:border-emerald-500">{k}</button>
              ))}
              {sel.length > 0 && <button data-testid="closure-clear" onClick={() => { setSel([]); setFixed([]); }} className="text-xs underline text-slate-500 hover:text-white ml-1">Limpar</button>}
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
            <div data-testid="closure-estimate" className="text-sm text-slate-300 pt-2 space-y-2">
              {preview.count ? (
                <>
                  <p>{preview.count === 1 ? "Será gerado" : "Serão gerados"} <span className="font-mono text-emerald-400">{preview.count}</span> {preview.count === 1 ? "jogo" : "jogos"}.</p>
                  <CostBadge count={preview.count} testid="closure-cost" />
                </>
              ) : "—"}
            </div>
          </div>
        </div>
        {msg && <p data-testid="closure-error" className="text-xs text-red-400">{msg}</p>}
        <DialogFooter>
          <Button data-testid="button-generate-closure" className="btn-brand w-full" disabled={!!msg || !preview.count || loading} onClick={() => onGenerate(sel, mode, fixed)}>
            {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}Gerar fechamento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
