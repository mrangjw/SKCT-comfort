import type { Question } from '../types';

interface Props {
  question: Question;
  selected: number;
  onClose: () => void;
  onAddWrongNote?: () => void;
  isWrong: boolean;
}

export default function ExplanationModal({ question, selected, onClose, onAddWrongNote, isWrong }: Props) {
  const labels = ['①', '②', '③', '④', '⑤'];
  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div
        className="bg-bg-card w-full sm:max-w-lg max-h-[80vh] rounded-t-2xl sm:rounded-2xl overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-bg-card border-b border-bg-hover/50 px-4 py-3 flex items-center justify-between">
          <h3 className="font-bold">해설</h3>
          <button onClick={onClose} className="text-text-dim text-xl leading-none">&times;</button>
        </div>
        <div className="p-4 space-y-3">
          <div className="text-sm text-text-dim">
            정답: <span className="text-correct font-bold">{labels[question.answer]} {question.options[question.answer]}</span>
          </div>
          {selected >= 0 && selected !== question.answer && (
            <div className="text-sm text-text-dim">
              내 답: <span className="text-wrong">{labels[selected]} {question.options[selected]}</span>
            </div>
          )}
          <div className="selectable bg-bg p-3 rounded-lg text-sm leading-relaxed whitespace-pre-wrap">
            {question.explanation}
          </div>
          {isWrong && onAddWrongNote && (
            <button
              onClick={onAddWrongNote}
              className="w-full py-2.5 bg-warning/20 text-warning rounded-lg text-sm font-medium"
            >
              오답노트에 추가
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
