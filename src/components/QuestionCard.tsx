import type { Question } from '../types';
import DataTable from './DataTable';
import BarChart from './BarChart';

interface Props {
  question: Question;
  selected: number | null;
  showAnswer: boolean;
  onSelect: (idx: number) => void;
}

export default function QuestionCard({ question, selected, showAnswer, onSelect }: Props) {
  const labels = ['①', '②', '③', '④', '⑤'];

  return (
    <div className="flex flex-col gap-4">
      {/* 유형 & 난이도 */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-text-dim bg-bg-hover px-2 py-0.5 rounded">{question.type}</span>
        <div className="flex gap-0.5">
          {[1, 2, 3].map(d => (
            <div key={d} className={`w-1.5 h-1.5 rounded-full ${d <= question.difficulty ? 'bg-warning' : 'bg-bg-hover'}`} />
          ))}
        </div>
      </div>

      {/* 지문 */}
      {question.passage && (
        <div className="selectable bg-bg p-3 rounded-lg border border-bg-hover/50 text-sm leading-relaxed max-h-48 overflow-y-auto">
          {question.passage}
        </div>
      )}

      {/* 표 */}
      {question.table && <DataTable table={question.table} />}

      {/* 차트 */}
      {question.chart && <BarChart chart={question.chart} />}

      {/* 문제 */}
      <p className="selectable text-base font-medium leading-relaxed">{question.question}</p>

      {/* 선택지 */}
      <div className="flex flex-col gap-2">
        {question.options.map((opt, i) => {
          let style = 'bg-bg-card border-bg-hover/50 active:bg-bg-hover';
          if (showAnswer) {
            if (i === question.answer) style = 'bg-correct/20 border-correct text-correct';
            else if (i === selected) style = 'bg-wrong/20 border-wrong text-wrong';
            else style = 'bg-bg-card border-bg-hover/30 opacity-50';
          } else if (i === selected) {
            style = 'bg-primary/20 border-primary-light';
          }

          return (
            <button
              key={i}
              onClick={() => onSelect(i)}
              disabled={showAnswer}
              className={`selectable flex items-start gap-2 p-3 rounded-lg border text-left text-sm transition-all ${style}`}
            >
              <span className="font-medium shrink-0 mt-0.5">{labels[i]}</span>
              <span className="leading-relaxed">{opt}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
