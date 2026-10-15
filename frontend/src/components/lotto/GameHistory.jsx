import { useState } from "react";
import { toast } from "sonner";
import { ChevronDown, Trash2, Search } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { BallRow } from "./Ball";
import { GameCards, ExportButtons } from "./GeneratedGames";
import { checkBatch, deleteBatch, errMsg } from "../../lib/api";

const fmtDate = (iso) => new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });

const CheckSummary = ({ check, testid }) => (
  <div data-testid={testid} className="flex flex-wrap gap-2 text-xs">
    {["15", "14", "13", "12", "11"].map((k) => (
      <span key={k} className={`rounded-md border px-2 py-1 font-mono ${check.summary[k] ? "border-amber-400/40 bg-amber-400/10 text-amber-300" : "border-slate-800 text-slate-500"}`}>
        {k} pts: {check.summary[k]}
      </span>
    ))}
  </div>
);

const BatchItem = ({ batch, i, onDeleted }) => {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState(batch);
  const [num, setNum] = useState("");
  const check = data.check;

  const recheck = async () => {
    try { setData(await checkBatch(batch.id, Number(num) || undefined)); }
    catch (e) { toast.error(errMsg(e)); }
  };

  const remove = async () => {
    if (!window.confirm("Excluir este lote de jogos do histórico?")) return;
    try { await deleteBatch(batch.id); toast.success("Lote excluído."); onDeleted(); }
    catch (e) { toast.error(errMsg(e)); }
  };

  return (
    <div data-testid={`batch-item-${i}`} className="panel">
      <button data-testid={`batch-toggle-${i}`} onClick={() => setOpen(!open)} className="w-full flex flex-wrap items-center gap-x-6 gap-y-2 p-4 text-left">
        <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${open ? "rotate-180" : ""}`} />
        <span className="font-display text-white">{data.games.length} {data.games.length === 1 ? "jogo" : "jogos"}</span>
        <span className="text-xs text-slate-400">{fmtDate(data.created_at)} · base: últimos {data.based_on} (até #{data.last_concurso})</span>
        <span data-testid={`batch-status-${i}`} className={`ml-auto text-xs font-semibold ${check ? "text-amber-300" : "text-slate-500"}`}>
          {check ? `Conferido #${check.concurso} · melhor: ${check.best} acertos` : `Aguardando concurso #${data.last_concurso + 1}`}
        </span>
      </button>
      {open && (
        <div className="border-t border-slate-800 p-4 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Input data-testid={`batch-check-input-${i}`} type="number" placeholder={`Concurso (padrão #${data.last_concurso + 1})`}
                value={num} onChange={(e) => setNum(e.target.value)} className="w-56 h-9 bg-slate-900 border-slate-700 font-mono text-sm" />
              <Button data-testid={`batch-check-button-${i}`} size="sm" className="btn-brand" onClick={recheck}><Search className="w-4 h-4 mr-1" />Conferir</Button>
            </div>
            <div className="flex gap-2">
              <ExportButtons games={data.games} prefix={`batch-${i}-`} />
              <Button data-testid={`batch-delete-${i}`} variant="ghost" size="sm" className="text-slate-500 hover:text-red-400 hover:bg-transparent" onClick={remove}><Trash2 className="w-4 h-4" /></Button>
            </div>
          </div>
          {check && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <span className="label">Resultado #{check.concurso}</span>
                <BallRow numbers={check.numbers} tone="gold" />
              </div>
              <CheckSummary check={check} testid={`batch-summary-${i}`} />
            </div>
          )}
          <GameCards games={data.games} check={check} prefix={`batch-${i}-`} />
        </div>
      )}
    </div>
  );
};

export const GameHistory = ({ batches, onChange }) => (
  <section data-testid="games-history" className="space-y-4">
    <div>
      <h2 className="font-display text-xl text-white">Histórico de jogos ({batches.length})</h2>
      <p className="text-sm text-slate-400">Cada lote é conferido automaticamente quando o concurso seguinte for carregado. Dezenas acertadas em dourado.</p>
    </div>
    {batches.length === 0 ? (
      <p data-testid="games-history-empty" className="text-sm text-slate-500">Nenhum jogo gerado ainda.</p>
    ) : (
      batches.map((b, i) => <BatchItem key={`${b.id}-${b.check?.concurso ?? "x"}`} batch={b} i={i} onDeleted={onChange} />)
    )}
  </section>
);
