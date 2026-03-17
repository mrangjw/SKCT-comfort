import type { SectionInfo, SectionStats, Page } from '../types';

interface Props {
  sections: SectionInfo[];
  stats: Record<string, SectionStats>;
  wrongNotesCount: number;
  onSelectSection: (section: SectionInfo) => void;
  onNavigate: (page: Page) => void;
  onStartAllQuiz: () => void;
}

export default function Home({ sections, stats, wrongNotesCount, onSelectSection, onNavigate, onStartAllQuiz }: Props) {
  const totalCorrect = Object.values(stats).reduce((s, v) => s + v.correct, 0);
  const totalTotal = Object.values(stats).reduce((s, v) => s + v.total, 0);
  const overallPct = totalTotal > 0 ? Math.round((totalCorrect / totalTotal) * 100) : 0;

  return (
    <div className="min-h-dvh px-4 pb-24">
      {/* Header */}
      <div className="pt-6 pb-4">
        <h1 className="text-2xl font-bold">SKCT Comfort</h1>
        <p className="text-text-dim text-sm mt-1">SK 종합역량검사 인지검사 연습</p>
      </div>

      {/* Overall stats */}
      {totalTotal > 0 && (
        <div className="bg-bg-card rounded-2xl p-4 mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-text-dim">전체 진행도</span>
            <span className="text-lg font-bold">{overallPct}%</span>
          </div>
          <div className="h-2 bg-bg-hover rounded-full overflow-hidden">
            <div className="h-full bg-primary-light rounded-full transition-all" style={{ width: `${overallPct}%` }} />
          </div>
          <div className="flex justify-between mt-2 text-xs text-text-dim">
            <span>{totalCorrect}/{totalTotal} 정답</span>
            <span>{totalTotal}문제 풀이</span>
          </div>
        </div>
      )}

      {/* Exam simulator */}
      <button
        onClick={() => onNavigate('exam-simulator' as Page)}
        className="w-full bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-4 text-left active:bg-emerald-500/20 transition-colors mb-3"
      >
        <div className="flex items-center gap-3">
          <div className="text-2xl w-10 h-10 flex items-center justify-center rounded-xl bg-emerald-500/20">
            🖥️
          </div>
          <div className="flex-1">
            <span className="font-medium">시험 시뮬레이션</span>
            <p className="text-xs text-text-dim mt-0.5">PDF + OMR + 타이머 + 계산기 + 메모 (PC 전용)</p>
          </div>
          <span className="text-text-dim">&rsaquo;</span>
        </div>
      </button>

      {/* Study tips */}
      <button
        onClick={() => onNavigate('study-tips' as Page)}
        className="w-full bg-accent/10 border border-accent/30 rounded-2xl p-4 text-left active:bg-accent/20 transition-colors mb-3"
      >
        <div className="flex items-center gap-3">
          <div className="text-2xl w-10 h-10 flex items-center justify-center rounded-xl bg-accent/20">
            💡
          </div>
          <div className="flex-1">
            <span className="font-medium">공부 전략 & 꿀팁</span>
            <p className="text-xs text-text-dim mt-0.5">영역별 전략, 시험 환경, 멘탈 관리</p>
          </div>
          <span className="text-text-dim">&rsaquo;</span>
        </div>
      </button>

      {/* All sections random quiz */}
      <button
        onClick={onStartAllQuiz}
        className="w-full bg-primary-light/10 border border-primary-light/30 rounded-2xl p-4 text-left active:bg-primary-light/20 transition-colors mb-4"
      >
        <div className="flex items-center gap-3">
          <div className="text-2xl w-10 h-10 flex items-center justify-center rounded-xl bg-primary-light/20">
            🔀
          </div>
          <div className="flex-1">
            <span className="font-medium">전체 랜덤</span>
            <p className="text-xs text-text-dim mt-0.5">5개 영역 300문항 섞어서 풀기</p>
          </div>
          <span className="text-text-dim">&rsaquo;</span>
        </div>
      </button>

      {/* Section cards */}
      <div className="space-y-3 mb-6">
        {sections.map(sec => {
          const s = stats[sec.id];
          const pct = s && s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0;
          return (
            <button
              key={sec.id}
              onClick={() => onSelectSection(sec)}
              className="w-full bg-bg-card rounded-2xl p-4 text-left active:bg-bg-hover transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="text-2xl w-10 h-10 flex items-center justify-center rounded-xl" style={{ backgroundColor: sec.color + '20' }}>
                  {sec.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{sec.name}</span>
                    {s && s.total > 0 && <span className="text-sm text-text-dim">{pct}%</span>}
                  </div>
                  <p className="text-xs text-text-dim mt-0.5 truncate">
                    {sec.types.join(' · ')}
                  </p>
                  {s && s.total > 0 && (
                    <div className="h-1 bg-bg-hover rounded-full overflow-hidden mt-2">
                      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: sec.color }} />
                    </div>
                  )}
                </div>
                <span className="text-text-dim">&rsaquo;</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Bottom nav */}
      <div className="fixed bottom-0 left-0 right-0 bg-bg-card/95 backdrop-blur-sm border-t border-bg-hover/50">
        <div className="flex justify-around py-2 max-w-lg mx-auto">
          <button onClick={() => onNavigate('home')} className="flex flex-col items-center gap-0.5 px-3 py-1 text-primary-light">
            <span className="text-lg">🏠</span>
            <span className="text-[10px]">홈</span>
          </button>
          <button onClick={() => onNavigate('stats')} className="flex flex-col items-center gap-0.5 px-3 py-1 text-text-dim">
            <span className="text-lg">📈</span>
            <span className="text-[10px]">통계</span>
          </button>
          <button onClick={() => {onNavigate('wrong-notes' as Page)}} className="flex flex-col items-center gap-0.5 px-3 py-1 text-text-dim relative">
            <span className="text-lg">📝</span>
            <span className="text-[10px]">오답노트</span>
            {wrongNotesCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 bg-wrong text-white text-[9px] w-4 h-4 rounded-full flex items-center justify-center">
                {wrongNotesCount > 99 ? '99+' : wrongNotesCount}
              </span>
            )}
          </button>
          <button onClick={() => onNavigate('pdf-generator')} className="flex flex-col items-center gap-0.5 px-3 py-1 text-text-dim">
            <span className="text-lg">🤖</span>
            <span className="text-[10px]">AI생성</span>
          </button>
          <button onClick={() => onNavigate('ai-questions')} className="flex flex-col items-center gap-0.5 px-3 py-1 text-text-dim">
            <span className="text-lg">📚</span>
            <span className="text-[10px]">AI문제</span>
          </button>
          <button onClick={() => onNavigate('feedback' as Page)} className="flex flex-col items-center gap-0.5 px-3 py-1 text-text-dim">
            <span className="text-lg">💬</span>
            <span className="text-[10px]">문의</span>
          </button>
          <button onClick={() => onNavigate('settings')} className="flex flex-col items-center gap-0.5 px-3 py-1 text-text-dim">
            <span className="text-lg">⚙️</span>
            <span className="text-[10px]">설정</span>
          </button>
        </div>
      </div>
    </div>
  );
}
