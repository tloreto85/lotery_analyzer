import { useCallback, useEffect, useState } from "react";
import "@/App.css";
import { toast } from "sonner";
import { Toaster } from "./components/ui/sonner";
import { Button } from "./components/ui/button";
import { FileText, FileSpreadsheet, Sparkles, Trash2 } from "lucide-react";
import { UploadZone } from "./components/lotto/UploadZone";
import { StatCards } from "./components/lotto/StatCards";
import { AnalysisTabs } from "./components/lotto/AnalysisTabs";
import { GeneratorDialog } from "./components/lotto/GeneratorDialog";
import { GeneratedGames } from "./components/lotto/GeneratedGames";
import { GameHistory } from "./components/lotto/GameHistory";
import { uploadContests, fetchStats, clearContests, generateGames, fetchBatches, errMsg } from "./lib/api";
import { exportStatsTxt, exportStatsXls } from "./lib/exporters";

const WINDOWS = [[0, "Todos"], [10, "10"], [20, "20"], [30, "30"], [50, "50"]];

export default function App() {
  const [win, setWin] = useState(0);
  const [stats, setStats] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [dialog, setDialog] = useState({ open: false, ask: false });
  const [genLoading, setGenLoading] = useState(false);
  const [games, setGames] = useState(null);
  const [totalAll, setTotalAll] = useState(0);
  const [batches, setBatches] = useState([]);

  const loadBatches = useCallback(() => fetchBatches().then(setBatches).catch((e) => toast.error(errMsg(e))), []);

  const load = useCallback(async (w) => {
    loadBatches();
    try {
      const [s, all] = await Promise.all([fetchStats(w), w ? fetchStats(0) : null]);
      setStats(s);
      setTotalAll((all || s).total);
    } catch (e) { toast.error(errMsg(e)); }
  }, [loadBatches]);

  useEffect(() => { load(win); }, [win, load]);

  const onFile = async (file) => {
    setUploading(true);
    try {
      const r = await uploadContests(await file.text());
      toast.success(`${r.inserted} ${r.inserted === 1 ? "novo concurso salvo" : "novos concursos salvos"}${r.skipped ? `, ${r.skipped} já existiam` : ""}${r.invalid ? `, ${r.invalid} linhas inválidas` : ""}.`);
      await load(win);
      setDialog({ open: true, ask: true });
    } catch (e) { toast.error(errMsg(e)); }
    setUploading(false);
  };

  const onGenerate = async (w, q, opts) => {
    setGenLoading(true);
    try {
      const r = await generateGames(w, q, opts);
      setGames(r);
      setDialog({ open: false, ask: false });
      loadBatches();
      toast.success(r.games.length < q
        ? `${r.games.length} de ${q} jogos gerados (as restrições não permitem mais jogos diferentes).`
        : `${r.games.length} jogos gerados.`);
      setTimeout(() => document.getElementById("games")?.scrollIntoView({ behavior: "smooth" }), 100);
    } catch (e) { toast.error(errMsg(e)); }
    setGenLoading(false);
  };

  const onClear = async () => {
    if (!window.confirm("Apagar todo o histórico de concursos salvos?")) return;
    try {
      await clearContests();
      setGames(null);
      toast.success("Histórico apagado.");
      load(win);
    } catch (e) { toast.error(errMsg(e)); }
  };

  const has = stats && stats.total > 0;

  return (
    <div className="min-h-screen app-bg text-slate-200">
      <Toaster theme="dark" position="top-right" richColors />
      <div className="max-w-[1400px] mx-auto px-4 sm:px-8 py-10 space-y-10">
        <header className="flex flex-wrap items-end justify-between gap-6 rise">
          <div>
            <p className="label text-emerald-400">Lotofácil · análise estatística</p>
            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white mt-2">
              Painel de tendências
            </h1>
            <p className="text-sm text-slate-400 mt-3 max-w-xl">
              Carregue seus concursos, veja os padrões e gere jogos com base nos últimos resultados salvos.
            </p>
          </div>
          {has && (
            <div className="flex flex-wrap gap-2">
              <Button data-testid="button-export-stats-txt" variant="outline" className="btn-ghost" onClick={() => exportStatsTxt(stats)}>
                <FileText className="w-4 h-4 mr-2" />Salvar TXT
              </Button>
              <Button data-testid="button-export-stats-xls" variant="outline" className="btn-ghost" onClick={() => exportStatsXls(stats)}>
                <FileSpreadsheet className="w-4 h-4 mr-2" />Salvar XLS
              </Button>
              <Button data-testid="button-open-generator" className="btn-brand" onClick={() => setDialog({ open: true, ask: false })}>
                <Sparkles className="w-4 h-4 mr-2" />Gerar jogos
              </Button>
            </div>
          )}
        </header>

        <UploadZone onFile={onFile} loading={uploading} />

        {stats && !has && (
          <p data-testid="empty-state" className="text-slate-500 text-sm">Nenhum concurso salvo ainda. Carregue um arquivo .txt para começar.</p>
        )}

        {has && (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="label">Analisar últimos</span>
                <div className="flex gap-1 rounded-lg border border-slate-800 bg-slate-900 p-1" data-testid="stats-window-selector">
                  {WINDOWS.map(([v, l]) => (
                    <button key={v} data-testid={`stats-window-${v}`} onClick={() => setWin(v)}
                      className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${win === v ? "bg-emerald-500 text-slate-950" : "text-slate-400 hover:text-white"}`}>{l}</button>
                  ))}
                </div>
              </div>
              <Button data-testid="button-clear-history" variant="ghost" size="sm" className="text-slate-500 hover:text-red-400 hover:bg-transparent" onClick={onClear}>
                <Trash2 className="w-4 h-4 mr-1" />Limpar concursos ({totalAll})
              </Button>
            </div>
            <StatCards s={stats} />
            <AnalysisTabs s={stats} />
          </>
        )}

        {games && <div id="games"><GeneratedGames result={games} /></div>}

        <GameHistory batches={batches} onChange={loadBatches} />
      </div>

      <GeneratorDialog open={dialog.open} askFirst={dialog.ask} total={totalAll} loading={genLoading}
        onOpenChange={(o) => setDialog((d) => ({ ...d, open: o }))} onGenerate={onGenerate} />
    </div>
  );
}
