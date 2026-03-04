import { useState } from 'react';
import type { Question, QuizConfig } from '../types';
import { useQuiz } from '../hooks/useQuiz';
import { useTimer } from '../hooks/useTimer';
import QuestionCard from './QuestionCard';
import ExplanationModal from './ExplanationModal';
import Timer from './Timer';

interface Props {
  config: QuizConfig;
  allQuestions: Question[];
  onFinish: (results: { questionId: string; selected: number; correct: boolean; timeSpent: number }[]) => void;
  onBack: () => void;
  onAddWrongNote: (questionId: string, wrongAnswer: number) => void;
}

export default function Quiz({ config, allQuestions, onFinish, onBack, onAddWrongNote }: Props) {
  const quiz = useQuiz();
  const [showExplanation, setShowExplanation] = useState(false);
  const [started, setStarted] = useState(false);

  const timer = useTimer(config.timerSeconds, config.timerEnabled, () => quiz.timeUp());

  if (!started) {
    quiz.start(allQuestions, config);
    setStarted(true);
    timer.reset();
  }

  if (quiz.finished) {
    onFinish(quiz.results);
    return null;
  }

  if (!quiz.currentQuestion) return null;

  const errorCount = quiz.results.filter(r => !r.correct).length;

  return (
    <div className="min-h-dvh flex flex-col">
      {/* Header */}
      <div className="sticky top-0 bg-bg/95 backdrop-blur-sm z-10 px-4 pt-3 pb-2 space-y-2">
        <div className="flex items-center justify-between">
          <button onClick={onBack} className="text-text-dim text-sm">&larr; 나가기</button>
          <div className="flex items-center gap-3 text-sm">
            {config.maxErrors && config.maxErrors > 0 && (
              <span className={`${errorCount >= (config.maxErrors - 1) ? 'text-wrong' : 'text-text-dim'}`}>
                오답 {errorCount}/{config.maxErrors}
              </span>
            )}
            <span className="text-text-dim">{quiz.progress?.current}/{quiz.progress?.total}</span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-bg-hover rounded-full overflow-hidden">
          <div
            className="h-full bg-primary-light rounded-full transition-all duration-300"
            style={{ width: `${((quiz.progress?.current || 0) / (quiz.progress?.total || 1)) * 100}%` }}
          />
        </div>

        {config.timerEnabled && <Timer timeLeft={timer.timeLeft} total={config.timerSeconds} />}
      </div>

      {/* Question */}
      <div className="flex-1 px-4 py-4">
        <QuestionCard
          question={quiz.currentQuestion}
          selected={quiz.selected}
          showAnswer={quiz.showAnswer}
          onSelect={(idx) => {
            quiz.answer(idx, config.maxErrors);
            timer.stop();
          }}
        />
      </div>

      {/* Bottom actions */}
      {quiz.showAnswer && (
        <div className="sticky bottom-0 bg-bg/95 backdrop-blur-sm px-4 py-3 flex gap-2">
          <button
            onClick={() => setShowExplanation(true)}
            className="flex-1 py-3 bg-bg-card border border-bg-hover/50 rounded-xl text-sm font-medium"
          >
            해설 보기
          </button>
          <button
            onClick={() => { quiz.next(); timer.reset(); }}
            className="flex-1 py-3 bg-primary-light rounded-xl text-sm font-medium text-white"
          >
            {(quiz.progress?.current || 0) >= (quiz.progress?.total || 0) ? '결과 보기' : '다음 문제'}
          </button>
        </div>
      )}

      {/* Explanation modal */}
      {showExplanation && quiz.currentQuestion && (
        <ExplanationModal
          question={quiz.currentQuestion}
          selected={quiz.selected ?? -1}
          isWrong={quiz.selected !== quiz.currentQuestion.answer}
          onClose={() => setShowExplanation(false)}
          onAddWrongNote={() => {
            onAddWrongNote(quiz.currentQuestion!.id, quiz.selected ?? -1);
            setShowExplanation(false);
          }}
        />
      )}
    </div>
  );
}
