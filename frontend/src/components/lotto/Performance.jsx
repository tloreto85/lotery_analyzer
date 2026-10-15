import { useEffect, useState } from "react";
import { fetchPerformance, errMsg } from "../../lib/api";
import { toast } from "sonner";
import { Rows, Pct } from "./charts";

export const Performance = ({ refreshKey }) => {
  const [rows, setRows] = useState(null);

  useEffect(() => {
    fetchPerformance().then(setRows).catch((e) => toast.error(errMsg(e)));
  }, [refreshKey]);

  if (!rows) return null;
  const overall = rows.filter((r) => r.overall);
  const winner = overall.length === 2 ? [...overall].sort((a, b) => b.avg_batch - a.avg_batch)[0] : null;

  return (
    <section data-testid="performance-section" className="space-y-4">
      <div>
        <h2 className="font-display text-xl text-white">Desempenho: gerador x fechamento</h2>
        <p className="text-sm text-slate-400">Média de acertos por jogo (e média por lote) dos lotes já conferidos com o concurso seguinte à geração.</p>
      </div>
      {rows.length === 0 ? (
        <p data-testid="performance-empty" className="text-sm text-slate-500">Nenhum lote conferido ainda. Carregue o próximo concurso para ver o desempenho.</p>
      ) : (
        <div className="panel p-5 space-y-4">
          {winner && (
            <p data-testid="performance-winner" className="text-sm text-slate-300">
              Melhor média até agora: <span className="text-amber-300 font-semibold">{winner.label.replace(" (geral)", "")}</span> com{" "}
              <span className="font-mono text-amber-300">{winner.avg_batch}</span> acertos por jogo (média por lote).
            </p>
          )}
          <Rows testid="table-performance" head={["Tipo", "Lotes", "Jogos", "Média/jogo", "Média/lote", "Melhor", "11+ pts", "15 · 14 · 13 · 12 · 11"]}
            rows={rows.map((r) => [
              <span className={r.overall ? "font-semibold text-white" : "pl-3 text-slate-400"}>{r.label}</span>,
              r.batches, r.games, <span className="text-emerald-400">{r.avg}</span>, r.avg_batch, r.best, <Pct v={r.pct_11} />,
              ["15", "14", "13", "12", "11"].map((k) => r.tiers[k]).join(" · "),
            ])} />
        </div>
      )}
    </section>
  );
};
