import { useSyncExternalStore } from "react";
import { Input } from "../ui/input";

const KEY = "lotofacil_price";
const DEFAULT = 3.5;
const listeners = new Set();

const getPrice = () => Number(localStorage.getItem(KEY)) || DEFAULT;
const setPrice = (v) => {
  localStorage.setItem(KEY, String(v));
  listeners.forEach((l) => l());
};
const subscribe = (l) => { listeners.add(l); return () => listeners.delete(l); };

export const usePrice = () => useSyncExternalStore(subscribe, getPrice);
export const brl = (v) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export const CostBadge = ({ count, testid }) => {
  const price = usePrice();
  return (
    <span data-testid={testid} className="inline-flex items-center gap-1 rounded-md border border-slate-700 bg-slate-900 px-2.5 py-1 text-xs text-slate-300">
      Custo <span className="font-mono font-semibold text-emerald-400">{brl(count * price)}</span>
      <span className="text-slate-500">({count} × {brl(price)})</span>
    </span>
  );
};

export const PriceSetting = () => {
  const price = usePrice();
  return (
    <label className="flex items-center gap-2 text-xs text-slate-400">
      Valor da aposta (15 dezenas) R$
      <Input data-testid="input-bet-price" type="number" step="0.5" min="0.5" defaultValue={price}
        onChange={(e) => Number(e.target.value) > 0 && setPrice(Number(e.target.value))}
        className="w-20 h-8 bg-slate-900 border-slate-700 font-mono text-xs" />
    </label>
  );
};
