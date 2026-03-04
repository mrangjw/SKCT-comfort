import type { ChartData } from '../types';

const DEFAULT_COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#a855f7'];

export default function BarChart({ chart }: { chart: ChartData }) {
  const allValues = chart.datasets.flatMap(d => d.data);
  const maxVal = Math.max(...allValues, 1);

  return (
    <div className="overflow-x-auto -mx-4 px-4 mb-4">
      {chart.unit && <p className="text-right text-text-dim text-xs mb-1">{chart.unit}</p>}
      <div className="flex items-end gap-1 min-w-[300px] h-40">
        {chart.labels.map((label, li) => (
          <div key={li} className="flex-1 flex flex-col items-center gap-0.5">
            <div className="flex items-end gap-0.5 w-full h-32">
              {chart.datasets.map((ds, di) => {
                const val = ds.data[li] || 0;
                const h = (val / maxVal) * 100;
                return (
                  <div key={di} className="flex-1 flex flex-col items-center justify-end h-full">
                    <span className="text-[10px] text-text-dim mb-0.5">{val}</span>
                    <div
                      className="w-full rounded-t"
                      style={{ height: `${h}%`, backgroundColor: ds.color || DEFAULT_COLORS[di % DEFAULT_COLORS.length], minHeight: val > 0 ? 4 : 0 }}
                    />
                  </div>
                );
              })}
            </div>
            <span className="text-[10px] text-text-dim truncate max-w-full">{label}</span>
          </div>
        ))}
      </div>
      {chart.datasets.length > 1 && (
        <div className="flex gap-3 mt-2 justify-center">
          {chart.datasets.map((ds, i) => (
            <div key={i} className="flex items-center gap-1 text-xs text-text-dim">
              <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: ds.color || DEFAULT_COLORS[i % DEFAULT_COLORS.length] }} />
              {ds.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
