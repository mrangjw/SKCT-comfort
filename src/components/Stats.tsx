import type { SectionStats, Page } from '../types';
import { SECTIONS } from '../data/sections';

interface Props {
  stats: Record<string, SectionStats>;
  onBack: () => void;
  onNavigate: (page: Page) => void;
}

export default function Stats({ stats, onBack, onNavigate: _onNavigate }: Props) {
  const totalCorrect = Object.values(stats).reduce((s, v) => s + v.correct, 0);
  const totalTotal = Object.values(stats).reduce((s, v) => s + v.total, 0);

  return (
    <div className="min-h-dvh px-4 pb-24">
      <div className="pt-4 pb-4 flex items-center gap-3">
        <button onClick={onBack} className="text-text-dim">&larr;</button>
        <h2 className="text-xl font-bold">통계</h2>
      </div>

      {/* Overall */}
      <div className="bg-bg-card rounded-2xl p-4 mb-4 text-center">
        <div className="text-3xl font-bold">{totalTotal > 0 ? Math.round((totalCorrect / totalTotal) * 100) : 0}%</div>
        <p className="text-text-dim text-sm mt-1">{totalCorrect}/{totalTotal} 정답 · 총 {totalTotal}문제</p>
      </div>

      {/* Per section */}
      {SECTIONS.map(sec => {
        const s = stats[sec.id];
        if (!s || s.total === 0) return (
          <div key={sec.id} className="bg-bg-card rounded-2xl p-4 mb-3 opacity-50">
            <div className="flex items-center gap-2 mb-2">
              <span>{sec.icon}</span>
              <span className="font-medium">{sec.name}</span>
            </div>
            <p className="text-sm text-text-dim">아직 풀이 기록이 없습니다</p>
          </div>
        );

        const pct = Math.round((s.correct / s.total) * 100);
        const weakTypes = Object.entries(s.byType)
          .filter(([, v]) => v.total >= 3 && v.correct / v.total < 0.5)
          .map(([k]) => k);

        return (
          <div key={sec.id} className="bg-bg-card rounded-2xl p-4 mb-3">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span>{sec.icon}</span>
                <span className="font-medium">{sec.name}</span>
              </div>
              <span className="text-lg font-bold" style={{ color: sec.color }}>{pct}%</span>
            </div>

            <div className="h-2 bg-bg-hover rounded-full overflow-hidden mb-3">
              <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: sec.color }} />
            </div>

            <div className="text-xs text-text-dim mb-2">{s.correct}/{s.total} 정답</div>

            {/* By type */}
            <div className="space-y-1.5">
              {Object.entries(s.byType).map(([type, v]) => {
                const tp = Math.round((v.correct / v.total) * 100);
                return (
                  <div key={type} className="flex items-center gap-2 text-xs">
                    <span className="flex-1 truncate">{type}</span>
                    <div className="w-20 h-1.5 bg-bg-hover rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${tp}%`, backgroundColor: tp < 50 ? '#ef4444' : sec.color }} />
                    </div>
                    <span className={`w-8 text-right ${tp < 50 ? 'text-wrong' : 'text-text-dim'}`}>{tp}%</span>
                  </div>
                );
              })}
            </div>

            {weakTypes.length > 0 && (
              <div className="mt-3 bg-wrong/10 rounded-lg p-2">
                <span className="text-xs text-wrong">약점: {weakTypes.join(', ')}</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
