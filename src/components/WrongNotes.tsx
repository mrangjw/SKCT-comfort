import { useState } from 'react';
import type { Question, QuizConfig, Section } from '../types';
import type { WrongNote } from '../hooks/useWrongNotes';

interface Props {
  wrongQuestions: { question: Question; note: WrongNote }[];
  onBack: () => void;
  onUpdateMemo: (questionId: string, memo: string) => void;
  onMarkReviewed: (questionId: string) => void;
  onRemove: (questionId: string) => void;
  onStartWrongQuiz: (config: QuizConfig) => void;
}

export default function WrongNotes({ wrongQuestions, onBack, onUpdateMemo, onMarkReviewed, onRemove, onStartWrongQuiz }: Props) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [editingMemo, setEditingMemo] = useState<string | null>(null);
  const [memoText, setMemoText] = useState('');
  const [filter, setFilter] = useState<'all' | 'unreviewed'>('all');

  const filtered = filter === 'all' ? wrongQuestions : wrongQuestions.filter(w => !w.note.reviewed);
  const unreviewedCount = wrongQuestions.filter(w => !w.note.reviewed).length;

  const labels = ['①', '②', '③', '④', '⑤'];

  return (
    <div className="min-h-dvh px-4 pb-24">
      <div className="pt-4 pb-4 flex items-center gap-3">
        <button onClick={onBack} className="text-text-dim">&larr;</button>
        <h2 className="text-xl font-bold">오답노트</h2>
        <span className="text-sm text-text-dim ml-auto">{wrongQuestions.length}문제</span>
      </div>

      {wrongQuestions.length === 0 ? (
        <div className="text-center py-20 text-text-dim">
          <div className="text-4xl mb-3">✨</div>
          <p>아직 오답이 없습니다</p>
        </div>
      ) : (
        <>
          {/* Filter + Practice button */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs ${filter === 'all' ? 'bg-primary-light text-white' : 'bg-bg-card text-text-dim'}`}
            >전체 ({wrongQuestions.length})</button>
            <button
              onClick={() => setFilter('unreviewed')}
              className={`px-3 py-1.5 rounded-lg text-xs ${filter === 'unreviewed' ? 'bg-wrong text-white' : 'bg-bg-card text-text-dim'}`}
            >미복습 ({unreviewedCount})</button>
            <button
              onClick={() => {
                if (filtered.length === 0) return;
                onStartWrongQuiz({
                  section: filtered[0].question.section as Section,
                  mode: 'practice',
                  timerEnabled: false,
                  timerSeconds: 45,
                });
              }}
              className="ml-auto px-3 py-1.5 bg-warning/20 text-warning rounded-lg text-xs font-medium"
            >오답 다시 풀기</button>
          </div>

          {/* List */}
          <div className="space-y-2">
            {filtered.map(({ question: q, note }) => (
              <div key={q.id} className="bg-bg-card rounded-xl overflow-hidden">
                <button
                  onClick={() => setExpanded(expanded === q.id ? null : q.id)}
                  className="w-full p-3 text-left"
                >
                  <div className="flex items-start gap-2">
                    <span className={`text-xs px-1.5 py-0.5 rounded ${note.reviewed ? 'bg-correct/20 text-correct' : 'bg-wrong/20 text-wrong'}`}>
                      {note.reviewed ? '복습완료' : '미복습'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm line-clamp-2">{q.question}</p>
                      <p className="text-xs text-text-dim mt-1">{q.type} · {note.date}</p>
                    </div>
                  </div>
                </button>

                {expanded === q.id && (
                  <div className="px-3 pb-3 space-y-2">
                    {q.passage && (
                      <div className="selectable bg-bg p-2 rounded text-xs leading-relaxed max-h-32 overflow-y-auto">{q.passage}</div>
                    )}
                    <div className="text-xs space-y-1">
                      {q.options.map((opt, i) => (
                        <div key={i} className={`px-2 py-1 rounded ${i === q.answer ? 'bg-correct/20 text-correct' : i === note.wrongAnswer ? 'bg-wrong/20 text-wrong' : 'text-text-dim'}`}>
                          {labels[i]} {opt}
                        </div>
                      ))}
                    </div>
                    <div className="selectable bg-bg p-2 rounded text-xs leading-relaxed">
                      <span className="text-text-dim">해설: </span>{q.explanation}
                    </div>

                    {/* Memo */}
                    {editingMemo === q.id ? (
                      <div className="flex gap-1">
                        <input
                          value={memoText}
                          onChange={e => setMemoText(e.target.value)}
                          placeholder="메모 입력..."
                          className="flex-1 bg-bg border border-bg-hover/50 rounded px-2 py-1 text-xs"
                          autoFocus
                        />
                        <button onClick={() => { onUpdateMemo(q.id, memoText); setEditingMemo(null); }} className="px-2 py-1 bg-primary-light rounded text-xs text-white">저장</button>
                      </div>
                    ) : (
                      <button onClick={() => { setEditingMemo(q.id); setMemoText(note.memo); }} className="text-xs text-text-dim underline">
                        {note.memo ? `메모: ${note.memo}` : '메모 추가'}
                      </button>
                    )}

                    <div className="flex gap-1">
                      {!note.reviewed && (
                        <button onClick={() => onMarkReviewed(q.id)} className="flex-1 py-1.5 bg-correct/20 text-correct rounded text-xs">복습 완료</button>
                      )}
                      <button onClick={() => onRemove(q.id)} className="flex-1 py-1.5 bg-wrong/20 text-wrong rounded text-xs">삭제</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
