import * as XLSX from "xlsx";

const download = (blob, name) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
};

const saveTxt = (lines, name) => download(new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" }), name);

const statsSections = (s) => [
  ["Primeira linha - frequencia (numero,vezes,%)", s.first_line_freq.map((f) => [f.number, f.count, f.pct])],
  ["Primeira linha - qtd sorteados juntos (qtd,vezes,%)", s.first_line_together.map((f) => [f.qty, f.count, f.pct])],
  ["Trincas mais frequentes (n1,n2,n3,vezes)", s.top_trios.map((t) => [...t.numbers, t.count])],
  ["Quadras mais frequentes (n1,n2,n3,n4,vezes)", s.top_quads.map((t) => [...t.numbers, t.count])],
  ["Soma (minimo,maximo,media,desvio padrao)", [[s.sum.min, s.sum.max, s.sum.mean, s.sum.std]]],
  ["Soma - intervalos (inicio,fim,vezes,%)", s.sum.histogram.map((h) => [h.start, h.start + 9, h.count, h.pct])],
  ["Pares x impares (pares,impares,vezes,%)", s.parity.map((p) => [p.even, p.odd, p.count, p.pct])],
  ["Repetidos do concurso anterior (repetidos,vezes,%)", s.repeats.map((r) => [r.repeated, r.count, r.pct])],
  ["Repetidos - pares x impares (repetidos,pares,impares,vezes,%)", s.repeats_parity.map((r) => [r.repeated, r.even, r.odd, r.count, r.pct])],
  ["Frequencia geral (numero,vezes,%)", s.number_freq.map((f) => [f.number, f.count, f.pct])],
];

const fname = (base, ext) => `${base}_${new Date().toISOString().slice(0, 10)}.${ext}`;

export const exportStatsTxt = (s) => {
  const lines = [];
  statsSections(s).forEach(([title, rows]) => {
    lines.push(`# ${title}`, ...rows.map((r) => r.join(",")), "");
  });
  saveTxt(lines, fname("lotofacil_estatisticas", "txt"));
};

export const exportStatsXls = (s) => {
  const wb = XLSX.utils.book_new();
  statsSections(s).forEach(([title, rows], i) => {
    const [name, header] = title.split(" (");
    const cols = header.replace(")", "").split(",");
    const ws = XLSX.utils.aoa_to_sheet([cols, ...rows]);
    XLSX.utils.book_append_sheet(wb, ws, `${i + 1}-${name}`.slice(0, 31).replace(/[\\/?*[\]:]/g, ""));
  });
  XLSX.writeFile(wb, fname("lotofacil_estatisticas", "xlsx"));
};

export const exportGamesTxt = (games) => saveTxt(games.map((g) => g.numbers.join(",")), fname("lotofacil_jogos", "txt"));

export const exportGamesXls = (games) => {
  const header = [...Array(15)].map((_, i) => `B${i + 1}`);
  const ws = XLSX.utils.aoa_to_sheet([header, ...games.map((g) => g.numbers)]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Jogos");
  XLSX.writeFile(wb, fname("lotofacil_jogos", "xlsx"));
};
