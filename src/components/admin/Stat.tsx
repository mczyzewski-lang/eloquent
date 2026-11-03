export function Stat({ label, value, hint }: { label: string; value: React.ReactNode; hint?: string }) {
  return (
    <div className="rounded-2xl border border-navy/10 bg-white p-4">
      <p className="text-xs font-bold uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-1 font-display text-2xl font-semibold text-navy">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-muted">{hint}</p>}
    </div>
  );
}

export function Funnel({ title, steps }: { title: string; steps: [string, number][] }) {
  const max = Math.max(1, ...steps.map((s) => s[1]));
  return (
    <div className="rounded-2xl border border-navy/10 bg-white p-4">
      <p className="font-display text-lg font-semibold text-navy">{title}</p>
      <ul className="mt-3 space-y-2">
        {steps.map(([label, value], i) => {
          const prev = i > 0 ? steps[i - 1][1] : 0;
          return (
            <li key={label}>
              <div className="flex justify-between text-sm">
                <span>{label}</span>
                <span className="font-semibold">
                  {value}
                  {prev > 0 && <span className="ml-2 text-muted">({Math.round((value / prev) * 100)}%)</span>}
                </span>
              </div>
              <div className="mt-1 h-2 rounded-full bg-navy/5">
                <div className="h-2 rounded-full bg-gold-deep" style={{ width: `${(value / max) * 100}%` }} />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export const pct = (v: number | null) => (v === null ? "—" : `${Math.round(v * 100)}%`);
export const usd = (v: number) => `$${v.toFixed(v < 1 ? 4 : 2)}`;
