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

export const GeneratedGames = ({ result }) => (
  <section data-testid="generated-games-container" className="space-y-5">
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h2 className="font-display text-xl text-white">Jogos gerados ({result.games.length})</h2>
        <p className="text-sm text-slate-400">
          Baseado nos últimos {result.based_on} concursos salvos · salvo no histórico, será conferido com o concurso #{result.last_concurso + 1}
        </p>
      </div>
      <ExportButtons games={result.games} />
    </div>
    <GameCards games={result.games} />
  </section>
);
