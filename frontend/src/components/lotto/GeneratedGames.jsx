import { Button } from "../ui/button";
import { FileText, FileSpreadsheet } from "lucide-react";
import { BallGrid } from "./Ball";
import { exportGamesTxt, exportGamesXls } from "../../lib/exporters";

export const GeneratedGames = ({ result }) => (
  <section data-testid="generated-games-container" className="space-y-5">
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h2 className="font-display text-xl text-white">Jogos gerados ({result.games.length})</h2>
        <p className="text-sm text-slate-400">Baseado nos últimos {result.based_on} concursos salvos</p>
      </div>
      <div className="flex gap-2">
        <Button data-testid="button-export-games-txt" variant="outline" className="btn-ghost" onClick={() => exportGamesTxt(result.games)}>
          <FileText className="w-4 h-4 mr-2" />TXT
        </Button>
        <Button data-testid="button-export-games-xls" variant="outline" className="btn-ghost" onClick={() => exportGamesXls(result.games)}>
          <FileSpreadsheet className="w-4 h-4 mr-2" />XLS
        </Button>
      </div>
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {result.games.map((g, i) => (
        <div key={g.numbers.join("-")} data-testid={`generated-game-item-${i}`} className="panel p-4 flex gap-4 rise" style={{ animationDelay: `${Math.min(i, 20) * 25}ms` }}>
          <BallGrid selected={g.numbers} />
          <div className="text-xs space-y-1.5 text-slate-400">
            <p className="font-display text-sm text-white">Jogo {String(i + 1).padStart(2, "0")}</p>
            <p>Soma <span className="font-mono text-slate-100">{g.sum}</span></p>
            <p>{g.even}P x {15 - g.even}I</p>
            <p>Repetidos <span className="font-mono text-slate-100">{g.repeated}</span></p>
          </div>
        </div>
      ))}
    </div>
  </section>
);
