import { Button } from "../ui/button";
import { FileText, FileSpreadsheet } from "lucide-react";
import { BallGrid } from "./Ball";
import { exportGamesTxt, exportGamesXls } from "../../lib/exporters";

export const ExportButtons = ({ games, prefix = "" }) => (
  <div className="flex gap-2">
    <Button data-testid={`${prefix}button-export-games-txt`} variant="outline" size="sm" className="btn-ghost" onClick={() => exportGamesTxt(games)}>
      <FileText className="w-4 h-4 mr-2" />TXT
    </Button>
    <Button data-testid={`${prefix}button-export-games-xls`} variant="outline" size="sm" className="btn-ghost" onClick={() => exportGamesXls(games)}>
      <FileSpreadsheet className="w-4 h-4 mr-2" />XLS
    </Button>
  </div>
);

const hitTone = (h) => (h >= 11 ? "text-amber-300 bg-amber-400/15 border-amber-400/40" : "text-slate-400 bg-slate-800 border-slate-700");

export const GameCards = ({ games, check, prefix = "" }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
    {games.map((g, i) => (
      <div key={g.numbers.join("-")} data-testid={`${prefix}generated-game-item-${i}`} className="panel p-4 flex gap-4 rise" style={{ animationDelay: `${Math.min(i, 20) * 25}ms` }}>
        <BallGrid selected={g.numbers} drawn={check?.numbers} />
        <div className="text-xs space-y-1.5 text-slate-400">
          <p className="font-display text-sm text-white">Jogo {String(i + 1).padStart(2, "0")}</p>
          <p>Soma <span className="font-mono text-slate-100">{g.sum}</span></p>
          <p>{g.even}P x {15 - g.even}I</p>
          <p>Repetidos <span className="font-mono text-slate-100">{g.repeated}</span></p>
          {g.late?.length > 0 && <p data-testid={`${prefix}game-late-${i}`}>Atrasadas <span className="font-mono text-amber-300">{g.late.map((n) => String(n).padStart(2, "0")).join(", ")}</span></p>}
          {check && (
            <p data-testid={`${prefix}game-hits-${i}`} className={`inline-block rounded border px-2 py-0.5 font-mono font-bold ${hitTone(check.hits[i])}`}>
              {check.hits[i]} acertos
            </p>
          )}
        </div>
      </div>
    ))}
  </div>
);

export const OptionsSummary = ({ o, testid }) => {
  if (!o || (!o.fixed?.length && !o.excluded?.length && !o.delayed)) return null;
  const fmt = (a) => a.map((n) => String(n).padStart(2, "0")).join(", ");
  return (
    <p data-testid={testid} className="text-xs text-slate-400 space-x-3">
      {o.fixed?.length > 0 && <span>Fixas: <span className="font-mono text-emerald-400">{fmt(o.fixed)}</span></span>}
      {o.excluded?.length > 0 && <span>Excluídas: <span className="font-mono text-red-300">{fmt(o.excluded)}</span></span>}
      {o.delayed > 0 && <span>Atrasadas: <span className="text-amber-300">{o.delayed} por jogo</span></span>}
    </p>
  );
};

export const GeneratedGames = ({ result }) => (
  <section data-testid="generated-games-container" className="space-y-5">
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="space-y-1">
        <h2 className="font-display text-xl text-white">Jogos gerados ({result.games.length})</h2>
        <p className="text-sm text-slate-400">
          Baseado nos últimos {result.based_on} concursos salvos · salvo no histórico, será conferido com o concurso #{result.last_concurso + 1}
        </p>
        <OptionsSummary o={result.options} testid="generated-options-summary" />
      </div>
      <ExportButtons games={result.games} />
    </div>
    <GameCards games={result.games} />
  </section>
);
