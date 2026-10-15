import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from "recharts";

const Tip = ({ active, payload, label }) =>
  active && payload?.length ? (
    <div className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-xs">
      <p className="text-slate-400">{label}</p>
      <p className="font-mono text-emerald-400">{payload[0].value} vezes</p>
    </div>
  ) : null;

export const Bars = ({ data, x, y = "count", height = 240, highlight }) => (
  <div style={{ height }} className="w-full">
    <ResponsiveContainer>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
        <CartesianGrid stroke="#1F2937" vertical={false} />
        <XAxis dataKey={x} tick={{ fill: "#9CA3AF", fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: "#6B7280", fontSize: 11 }} axisLine={false} tickLine={false} />
        <Tooltip content={<Tip />} cursor={{ fill: "rgba(16,185,129,0.08)" }} />
        <Bar dataKey={y} radius={[4, 4, 0, 0]}>
          {data.map((d, i) => (
            <Cell key={i} fill={highlight && highlight(d) ? "#F59E0B" : "#10B981"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  </div>
);

export const Rows = ({ testid, head, rows }) => (
  <div data-testid={testid} className="overflow-x-auto">
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left">
          {head.map((h) => <th key={h} className="label pb-2 pr-4 font-semibold">{h}</th>)}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i} className="border-t border-slate-800/80">
            {r.map((c, j) => <td key={j} className="py-2 pr-4 font-mono text-slate-200">{c}</td>)}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

export const Pct = ({ v }) => (
  <div className="flex items-center gap-2 min-w-[110px]">
    <div className="h-1.5 flex-1 rounded bg-slate-800 overflow-hidden">
      <div className="h-full bg-emerald-500" style={{ width: `${Math.min(v, 100)}%` }} />
    </div>
    <span className="text-xs text-slate-400 w-12 text-right">{v}%</span>
  </div>
);
