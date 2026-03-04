import type { Question, QuizResult, Section } from '../types';

interface Props {
  results: QuizResult[];
  questions: Question[];
  section: Section;
  stoppedByErrors: boolean;
  onRetry: () => void;
  onHome: () => void;
}

export default function Result({ results, questions, section: _section, stoppedByErrors, onRetry, onHome }: Props) {
  const correct = results.filter(r => r.correct).length;
  const total = results.length;
  const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
  const avgTime = total > 0 ? (results.reduce((s, r) => s + r.timeSpent, 0) / total).toFixed(1) : '0';

  const getGrade = () => {
    if (pct >= 90) return { label: '탁월', color: 'text-correct' };
    if (pct >= 70) return { label: '우수', color: 'text-primary-light' };
    if (pct >= 50) return { label: '보통', color: 'text-warning' };
    return { label: '노력 필요', color: 'text-wrong' };
  };
  const grade = getGrade();

  return (
    <div className="min-h-dvh px-4 py-6">
      {stoppedByErrors && (
        <div className="bg-wrong/20 border border-wrong/50 rounded-xl p-3 mb-4 text-center">
          <span className="text-wrong text-sm font-medium">오답 제한 초과로 중단되었습니다</span>
        </div>
      )}

      {/* Score */}
      <div className="text-center py-8">
        <div className="text-6xl font-bold mb-2">{pct}%</div>
        <div className={`text-lg font-medium ${grade.color}`}>{grade.label}</div>
        <p className="text-text-dim text-sm mt-2">{correct}/{total} 정답 · 평균 {avgTime}초</p>
      </div>

      {/* Per-question breakdown */}
      <div className="bg-bg-card rounded-2xl p-4 mb-6">
        <h3 className="text-sm font-medium mb-3">문제별 결과</h3>
        <div className="flex flex-wrap gap-1.5">
          {results.map((r, i) => (
            <div
              key={i}
              className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-medium ${
                r.correct ? 'bg-correct/20 text-correct' : 'bg-wrong/20 text-wrong'
              }`}
            >
              {i + 1}
            </div>
          ))}
        </div>
      </div>

      {/* Wrong answers list */}
      {results.filter(r => !r.correct).length > 0 && (
        <div className="bg-bg-card rounded-2xl p-4 mb-6">
          <h3 className="text-sm font-medium mb-3">틀린 문제</h3>
          <div className="space-y-2">
            {results.filter(r => !r.correct).map((r, i) => {
              const q = questions.find(q => q.id === r.questionId);
              if (!q) return null;
              return (
                <div key={i} className="text-sm bg-bg rounded-lg p-3">
                  <p className="text-text-dim text-xs mb-1">{q.type}</p>
                  <p className="line-clamp-2">{q.question}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <button onClick={onHome} className="flex-1 py-3 bg-bg-card border border-bg-hover/50 rounded-xl text-sm font-medium">
          홈으로
        </button>
        <button onClick={onRetry} className="flex-1 py-3 bg-primary-light rounded-xl text-sm font-medium text-white">
          다시 풀기
        </button>
      </div>
    </div>
  );
}
