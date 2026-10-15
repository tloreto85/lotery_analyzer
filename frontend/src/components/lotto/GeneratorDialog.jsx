import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Loader2 } from "lucide-react";

const WINDOWS = [[10, "Últimos 10"], [20, "Últimos 20"], [30, "Últimos 30"], [50, "Últimos 50"], [0, "Todos"]];

export const GeneratorDialog = ({ open, onOpenChange, askFirst, total, loading, onGenerate }) => {
  const [step, setStep] = useState("ask");
  const [win, setWin] = useState(10);
  const [qty, setQty] = useState(10);

  useEffect(() => { if (open) setStep(askFirst ? "ask" : "config"); }, [open, askFirst]);

  const valid = qty >= 1 && qty <= 100;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="modal-generator" className="bg-slate-950 border-slate-800 text-slate-100 sm:max-w-lg">
        {step === "ask" ? (
          <>
            <DialogHeader>
              <DialogTitle className="font-display text-xl">Novos concursos carregados</DialogTitle>
              <DialogDescription className="text-slate-400">
                Você gostaria de usar as informações obtidas para gerar jogos?
              </DialogDescription>
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
              <DialogDescription className="text-slate-400">
                Baseado em quantos concursos salvos? ({total} disponíveis)
              </DialogDescription>
            </DialogHeader>
            <div data-testid="select-concursos-window" className="grid grid-cols-5 gap-2">
              {WINDOWS.map(([v, l]) => (
                <button key={v} data-testid={`window-option-${v}`} onClick={() => setWin(v)}
                  className={`rounded-md border px-2 py-3 text-xs font-semibold transition-colors ${
                    win === v ? "border-emerald-400 bg-emerald-500 text-slate-950" : "border-slate-700 text-slate-300 hover:border-emerald-500"
                  }`}>{l}</button>
              ))}
            </div>
            <label className="label mt-2" htmlFor="qty">Quantos jogos? (máximo 100)</label>
            <Input id="qty" data-testid="input-games-count" type="number" min={1} max={100} value={qty}
              onChange={(e) => setQty(Number(e.target.value))} className="bg-slate-900 border-slate-700 font-mono" />
            {!valid && <p data-testid="games-count-error" className="text-xs text-red-400">Informe um valor entre 1 e 100.</p>}
            <DialogFooter>
              <Button data-testid="button-generate-games" className="btn-brand w-full" disabled={!valid || loading}
                onClick={() => onGenerate(win, qty)}>
                {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}Gerar {valid ? qty : ""} jogos
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
