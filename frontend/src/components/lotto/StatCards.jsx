import { Database, Calculator, TrendingUp, Activity, Repeat } from "lucide-react";

const Card = ({ id, label, value, sub, Icon, i }) => (
  <div data-testid={id} className="panel p-5 rise" style={{ animationDelay: `${i * 60}ms` }}>
    <div className="flex items-center justify-between">
      <span className="label">{label}</span>
      <Icon className="w-4 h-4 text-slate-500" />
    </div>
    <p className="mt-3 font-mono text-2xl sm:text-3xl font-bold text-emerald-400">{value}</p>
    {sub && <p className="mt-1 text-xs text-slate-500">{sub}</p>}
  </div>
);

export const StatCards = ({ s }) => {
  const cards = [
    { id: "stat-total-concursos", label: "Concursos analisados", value: s.total, sub: `#${s.first_concurso} a #${s.last_concurso}`, Icon: Database },
    { id: "stat-soma-media", label: "Média da soma", value: s.sum.mean, sub: `Faixa mais comum: ${s.sum.most_frequent_range}`, Icon: Calculator },
    { id: "stat-desvio-padrao", label: "Desvio padrão", value: s.sum.std, sub: "da soma das dezenas", Icon: TrendingUp },
    { id: "stat-soma-min-max", label: "Soma mín – máx", value: `${s.sum.min}–${s.sum.max}`, Icon: Activity },
    { id: "stat-repetidos-medio", label: "Média de repetidos", value: s.avg_repeats, sub: "do concurso anterior", Icon: Repeat },
  ];
  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
      {cards.map((c, i) => <Card key={c.id} {...c} i={i} />)}
    </div>
  );
};
