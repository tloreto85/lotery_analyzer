import { Tabs, TabsList, TabsTrigger, TabsContent } from "../ui/tabs";
import { Bars, Rows, Pct } from "./charts";
import { Ball, BallRow } from "./Ball";

const Block = ({ title, desc, children }) => (
  <div className="panel p-5 sm:p-6 min-w-0">
    <h3 className="font-display text-base text-white">{title}</h3>
    {desc && <p className="text-xs text-slate-500 mt-1 mb-4">{desc}</p>}
    {children}
  </div>
);

const FirstLine = ({ s }) => (
  <div className="grid lg:grid-cols-2 gap-6">
    <Block title="Números 1 a 5 que mais se repetem" desc="Frequência de cada dezena da primeira linha do volante">
      <Rows testid="table-first-line-freq" head={["Dezena", "Vezes", "%"]}
        rows={s.first_line_freq.map((f, i) => [<Ball key={f.number} n={f.number} size="sm" tone={i === 0 ? "gold" : "brand"} />, f.count, <Pct v={f.pct} />])} />
    </Block>
    <Block title="Quantos da primeira linha saem juntos" desc="Ex.: 3 números (120x) = em 120 concursos saíram exatamente 3 dezenas entre 1 e 5">
      <Bars data={s.first_line_together.map((f) => ({ ...f, name: `${f.qty} nº` }))} x="name" />
      <Rows testid="table-first-line-together" head={["Qtd. juntos", "Vezes", "%"]}
        rows={s.first_line_together.map((f) => [`${f.qty} número${f.qty === 1 ? "" : "s"}`, `${f.count}x`, <Pct v={f.pct} />])} />
    </Block>
  </div>
);

const ComboTable = ({ testid, items }) => (
  <Rows testid={testid} head={["#", "Dezenas", "Vezes", "%"]}
    rows={items.map((t, i) => [i + 1, <BallRow numbers={t.numbers} />, `${t.count}x`, <Pct v={t.pct} />])} />
);

const Combos = ({ s }) => (
  <div className="grid lg:grid-cols-2 gap-6">
    <Block title="Trincas mais frequentes" desc="3 dezenas com maior tendência de saírem juntas"><ComboTable testid="table-trios" items={s.top_trios} /></Block>
    <Block title="Quadras mais frequentes" desc="4 dezenas com maior tendência de saírem juntas"><ComboTable testid="table-quads" items={s.top_quads} /></Block>
  </div>
);

const Sum = ({ s }) => (
  <div className="grid lg:grid-cols-3 gap-6">
    <Block title="Resumo da soma">
      <dl data-testid="sum-summary" className="grid grid-cols-2 gap-4">
        {[["Mínimo", s.sum.min], ["Máximo", s.sum.max], ["Média", s.sum.mean], ["Desvio padrão", s.sum.std]].map(([k, v]) => (
          <div key={k}><dt className="label">{k}</dt><dd className="font-mono text-2xl text-white">{v}</dd></div>
        ))}
      </dl>
      <div className="mt-6 rounded-lg bg-amber-400/10 border border-amber-400/30 p-4">
        <p className="label text-amber-300">Intervalo que mais ocorre</p>
        <p data-testid="sum-most-frequent" className="font-mono text-2xl text-amber-300">{s.sum.most_frequent_range}</p>
        <p className="text-xs text-slate-400">{s.sum.most_frequent_range_count} concursos</p>
      </div>
    </Block>
    <div className="lg:col-span-2 min-w-0">
      <Block title="Distribuição da soma (faixas de 10)">
        <Bars data={s.sum.histogram} x="range" height={300} highlight={(d) => d.range === s.sum.most_frequent_range} />
      </Block>
    </div>
  </div>
);

const Parity = ({ s }) => (
  <div className="grid lg:grid-cols-2 gap-6">
    <Block title="Pares x Ímpares" desc="Distribuição da quantidade de pares e ímpares por concurso">
      <Rows testid="table-parity" head={["Pares x Ímpares", "Vezes", "%"]} rows={s.parity.map((p) => [p.label, `${p.count}x`, <Pct v={p.pct} />])} />
    </Block>
    <Block title="Gráfico">
      <Bars data={[...s.parity].sort((a, b) => a.even - b.even)} x="label" height={280} />
    </Block>
  </div>
);

const Repeats = ({ s }) => (
  <div className="grid lg:grid-cols-2 gap-6">
    <Block title="Repetidos do concurso anterior" desc="Quantas dezenas se repetem de um concurso para o seguinte">
      <Bars data={s.repeats.map((r) => ({ ...r, name: `${r.repeated}` }))} x="name" />
      <Rows testid="table-repeats" head={["Repetidos", "Vezes", "%"]} rows={s.repeats.map((r) => [r.repeated, `${r.count}x`, <Pct v={r.pct} />])} />
    </Block>
    <Block title="Pares x Ímpares dos repetidos" desc="Ex.: 9 repetidos – 4 pares x 5 ímpares">
      <div className="max-h-[560px] overflow-y-auto pr-1">
        <Rows testid="table-repeats-parity" head={["Combinação", "Vezes", "%"]} rows={s.repeats_parity.map((r) => [r.label, `${r.count}x`, <Pct v={r.pct} />])} />
      </div>
    </Block>
  </div>
);

const TABS = [
  ["primeira-linha", "Primeira linha", FirstLine],
  ["combinacoes", "3 ou 4 juntos", Combos],
  ["soma", "Soma", Sum],
  ["pares-impares", "Pares x Ímpares", Parity],
  ["repetidos", "Repetidos", Repeats],
];

export const AnalysisTabs = ({ s }) => (
  <Tabs defaultValue="primeira-linha" className="w-full">
    <TabsList className="h-auto flex flex-wrap justify-start gap-1 bg-slate-900 border border-slate-800 p-1">
      {TABS.map(([id, label]) => (
        <TabsTrigger key={id} value={id} data-testid={`tab-${id}`} className="tab-trigger">{label}</TabsTrigger>
      ))}
    </TabsList>
    {TABS.map(([id, , C]) => (
      <TabsContent key={id} value={id} className="mt-6"><C s={s} /></TabsContent>
    ))}
  </Tabs>
);
