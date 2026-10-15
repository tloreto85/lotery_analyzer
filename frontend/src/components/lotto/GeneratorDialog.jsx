import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Loader2 } from "lucide-react";
import { NumberPicker } from "./NumberPicker";
import { BallRow } from "./Ball";
import { CostBadge } from "./Cost";
import { fetchStats } from "../../lib/api";

const WINDOWS = [[10, "Últimos 10"], [20, "Últimos 20"], [30, "Últimos 30"], [50, "Últimos 50"], [0, "Todos"]];

const Choice = ({ active, onClick, testid, children }) => (
  <button data-testid={testid} onClick={onClick}
    className={`rounded-md border px-2 py-2.5 text-xs font-semibold transition-colors ${
      active ? "border-emerald-400 bg-emerald-500 text-slate-950" : "border-slate-700 text-slate-300 hover:border-emerald-500"
    }`}>{children}</button>
);

const validate = (qty, picks, delayed) => {
  if (!Number.isInteger(qty) || qty < 1 || qty > 100) return "Informe um valor entre 1 e 100.";
  if (picks.fixed.length + delayed > 15) return "Dezenas fixas + atrasadas não podem passar de 15.";
  if (picks.excluded.length > 10) return "Exclua no máximo 10 dezenas.";
  return null;
};

export const GeneratorDialog = ({ open, onOpenChange, askFirst, total, loading, onGenerate }) => {
  const [step, setStep] = useState("ask");
  const [win, setWin] = useState(10);
  const [qty, setQty] = useState(10);
  const [picks, setPicks] = useState({ fixed: [], excluded: [] });
  const [delayed, setDelayed] = useState(0);
  const [late, setLate] = useState([]);

  useEffect(() => { if (open) setStep(askFirst ? "ask" : "config"); }, [open, askFirst]);

  useEffect(() => {
    if (!open || step !== "config") return;
    fetchStats(win).then((s) => setLate((s.delays || []).filter((d) => d.current > 0))).catch(() => setLate([]));
  }, [open, step, win]);

  const error = validate(qty, picks, delayed);
  const lateFree = late.filter((d) => !picks.fixed.includes(d.number) && !picks.excluded.includes(d.number)).slice(0, 5);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="modal-generator" className="bg-slate-950 border-slate-800 text-slate-100 sm:max-w-2xl max-h-[92vh] overflow-y-auto">
        {step === "ask" ? (
          <>
            <DialogHeader>
              <DialogTitle className="font-display text-xl">Novos concursos carregados</DialogTitle>
              <DialogDescription className="text-slate-400">Você gostaria de usar as informações obtidas para gerar jogos?</DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2">
              <Button data-testid="generator-ask-no" variant="ghost" className="text-slate-300 hover:bg-slate-800 hover:text-white" onClick={() => onOpenChange(false)}>Agora não</Button>
              <Button data-testid="generator-ask-yes" className="btn-brand" onClick={() => setStep("config")}>Sim, gerar jogos</Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="font-display text-xl">Gerador de jogos</DialogTitle>
              <DialogDescription className="text-slate-400">Baseado em quantos concursos salvos? ({total} disponíveis)</DialogDescription>
            </DialogHeader>
            <div data-testid="select-concursos-window" className="grid grid-cols-5 gap-2">
              {WINDOWS.map(([v, l]) => <Choice key={v} testid={`window-option-${v}`} active={win === v} onClick={() => setWin(v)}>{l}</Choice>)}
            </div>
            <div className="grid sm:grid-cols-2 gap-6 mt-2">
              <div>
                <p className="label mb-2">Dezenas fixas / excluídas</p>
                <NumberPicker value={picks} onChange={setPicks} />
              </div>
              <div className="space-y-4">
                <div>
                  <p className="label mb-2">Incluir dezenas atrasadas</p>
                  <div data-testid="delayed-selector" className="grid grid-cols-3 gap-2">
                    {[[0, "Não"], [1, "1 por jogo"], [2, "2 por jogo"]].map(([v, l]) => (
                      <Choice key={v} testid={`delayed-option-${v}`} active={delayed === v} onClick={() => setDelayed(v)}>{l}</Choice>
                    ))}
                  </div>
                  <div data-testid="delayed-candidates" className="mt-3">
                    <p className="text-[11px] text-slate-500 mb-1.5">Sorteadas entre as 5 mais atrasadas da base escolhida:</p>
                    {lateFree.length ? <BallRow numbers={lateFree.map((d) => d.number)} tone="gold" /> : <p className="text-xs text-slate-500">Nenhuma dezena atrasada disponível.</p>}
                  </div>
                </div>
                <div>
                  <label className="label" htmlFor="qty">Quantos jogos? (máximo 100)</label>
                  <Input id="qty" data-testid="input-games-count" type="number" min={1} max={100} value={qty}
                    onChange={(e) => setQty(Number(e.target.value))} className="mt-2 bg-slate-900 border-slate-700 font-mono" />
                  {!error && <div className="mt-2"><CostBadge count={qty} testid="generator-cost" /></div>}
                </div>
              </div>
            </div>
            {error && <p data-testid="games-count-error" className="text-xs text-red-400">{error}</p>}
            <DialogFooter>
              <Button data-testid="button-generate-games" className="btn-brand w-full" disabled={!!error || loading}
                onClick={() => onGenerate(win, qty, { ...picks, delayed })}>
                {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}Gerar {error ? "" : qty} jogos
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
