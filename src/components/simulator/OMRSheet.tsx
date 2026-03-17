import { useState, useCallback } from 'react';
import { ANSWER_KEYS, SECTION_LABELS, BOOK_SOURCE } from '../../data/answer-keys';
import type { Section } from '../../types';

const SEC_ORDER: Section[] = ['language', 'data-analysis', 'math', 'logic', 'sequence'];

interface Props {
  questionCount: number;
}

export default function OMRSheet({ questionCount }: Props) {
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [correctAnswers, setCorrectAnswers] = useState<Record<number, number>>({});
  const [graded, setGraded] = useState(false);
  const [showGradeModal, setShowGradeModal] = useState(false);
  const [gradeInput, setGradeInput] = useState('');
  const [gradeMode, setGradeMode] = useState<'manual' | 'eduwill'>('eduwill');
  const [selectedTest, setSelectedTest] = useState(0);
  const [selectedSection, setSelectedSection] = useState<Section | 'all'>('all');

  const selectAnswer = useCallback((q: number, choice: number) => {
    if (graded) return;
    setAnswers(prev => {
      if (prev[q] === choice) {
        const next = { ...prev };
        delete next[q];
        return next;
      }
      return { ...prev, [q]: choice };
    });
  }, [graded]);

  const resetAll = useCallback(() => {
    setAnswers({});
    setCorrectAnswers({});
    setGraded(false);
    setGradeInput('');
  }, []);

  const handleGrade = useCallback(() => {
    let parsed: number[] = [];

    if (gradeMode === 'eduwill') {
      const test = ANSWER_KEYS[selectedTest];
      if (selectedSection === 'all') {
        SEC_ORDER.forEach(sec => {
          const keys = test.sections[sec];
          if (keys) parsed.push(...keys);
        });
      } else {
        const keys = test.sections[selectedSection];
        if (keys) parsed = keys;
      }
    } else {
      parsed = gradeInput
        .split(/[,\s]+/)
        .map(s => parseInt(s.trim()))
        .filter(n => !isNaN(n) && n >= 1 && n <= 5);
    }

    const correct: Record<number, number> = {};
    parsed.forEach((ans, i) => {
      correct[i + 1] = ans;
    });
    setCorrectAnswers(correct);
    setGraded(true);
    setShowGradeModal(false);
  }, [gradeInput, gradeMode, selectedTest, selectedSection]);

  const answeredCount = Object.keys(answers).length;
  const correctCount = graded
    ? Object.entries(answers).filter(([q, a]) => correctAnswers[Number(q)] === a).length
    : 0;
  const totalGraded = Object.keys(correctAnswers).length;
  const pct = totalGraded > 0 ? Math.round((correctCount / totalGraded) * 100) : 0;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-3 py-2 border-b border-gray-200 shrink-0">
        <div className="font-bold text-gray-800 text-sm mb-1.5">OMR 답안지</div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setShowGradeModal(true)}
            className="px-3 py-1 bg-gray-700 text-white text-sm rounded-lg hover:bg-gray-600 transition-colors"
          >
            채점하기
          </button>
          <button
            onClick={resetAll}
            className="px-3 py-1 bg-gray-500 text-white text-sm rounded-lg hover:bg-gray-400 transition-colors"
          >
            답안 초기화
          </button>
        </div>
      </div>

      {/* Grade result banner */}
      {graded && (
        <div className="mx-4 mt-2 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-lg text-center">
          <span className="text-emerald-700 font-bold text-lg">
            {correctCount} / {totalGraded}
          </span>
          <span className="text-emerald-600 text-sm ml-2">({pct}%)</span>
        </div>
      )}

      {/* OMR Grid */}
      <div className="flex-1 overflow-y-auto px-2 py-1">
        <div className="space-y-0">
          {Array.from({ length: questionCount }, (_, i) => {
            const q = i + 1;
            const selected = answers[q];
            const correct = correctAnswers[q];
            const isCorrect = graded && selected !== undefined && selected === correct;
            const isWrong = graded && selected !== undefined && correct !== undefined && selected !== correct;
            const noAnswer = graded && selected === undefined && correct !== undefined;

            return (
              <div
                key={q}
                className={`flex items-center gap-1.5 py-1 px-1.5 rounded ${
                  isCorrect ? 'bg-green-50' : isWrong ? 'bg-red-50' : noAnswer ? 'bg-yellow-50' : ''
                }`}
              >
                <span className={`w-6 text-right font-bold text-xs ${
                  isWrong ? 'text-red-600' : isCorrect ? 'text-green-600' : 'text-gray-700'
                }`}>
                  {q}
                </span>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map(choice => {
                    const isSelected = selected === choice;
                    const isCorrectChoice = graded && correct === choice;
                    let circleClass = 'w-6 h-6 rounded-full border flex items-center justify-center text-[10px] font-medium transition-colors cursor-pointer ';

                    if (graded) {
                      if (isSelected && isCorrectChoice) {
                        circleClass += 'border-green-500 bg-green-500 text-white';
                      } else if (isSelected && !isCorrectChoice) {
                        circleClass += 'border-red-500 bg-red-500 text-white';
                      } else if (isCorrectChoice) {
                        circleClass += 'border-green-500 bg-green-100 text-green-700';
                      } else {
                        circleClass += 'border-gray-300 text-gray-400';
                      }
                    } else {
                      if (isSelected) {
                        circleClass += 'border-gray-700 bg-gray-700 text-white';
                      } else {
                        circleClass += 'border-gray-300 text-gray-500 hover:border-gray-400 hover:bg-gray-50';
                      }
                    }

                    return (
                      <button
                        key={choice}
                        onClick={() => selectAnswer(q, choice)}
                        className={circleClass}
                        disabled={graded}
                      >
                        {choice}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      <div className="px-3 py-1.5 border-t border-gray-200 text-xs text-gray-500 shrink-0">
        표시한 답안: {answeredCount} / {questionCount}
      </div>

      {/* Grade modal */}
      {showGradeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl">
            <h3 className="text-lg font-bold text-gray-800 mb-3">채점 방식 선택</h3>

            {/* Mode tabs */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setGradeMode('eduwill')}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                  gradeMode === 'eduwill'
                    ? 'bg-amber-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                에듀윌 정답표
              </button>
              <button
                onClick={() => setGradeMode('manual')}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                  gradeMode === 'manual'
                    ? 'bg-gray-700 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                직접 입력
              </button>
            </div>

            {gradeMode === 'eduwill' ? (
              <>
                <p className="text-xs text-gray-400 mb-3">{BOOK_SOURCE}</p>
                {/* Test select */}
                <div className="grid grid-cols-2 gap-2 mb-3">
                  {ANSWER_KEYS.map((ak, i) => (
                    <button
                      key={i}
                      onClick={() => setSelectedTest(i)}
                      className={`py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                        selectedTest === i
                          ? 'bg-amber-500 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {ak.testName}
                    </button>
                  ))}
                </div>
                {/* Section select */}
                <div className="flex flex-wrap gap-2 mb-4">
                  <button
                    onClick={() => setSelectedSection('all')}
                    className={`py-1.5 px-3 rounded-lg text-sm font-medium transition-colors ${
                      selectedSection === 'all'
                        ? 'bg-emerald-500 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    전체 (100)
                  </button>
                  {(Object.keys(ANSWER_KEYS[selectedTest].sections) as Section[]).map(sec => (
                    <button
                      key={sec}
                      onClick={() => setSelectedSection(sec)}
                      className={`py-1.5 px-3 rounded-lg text-sm transition-colors ${
                        selectedSection === sec
                          ? 'bg-emerald-500 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {SECTION_LABELS[sec]}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <>
                <p className="text-sm text-gray-500 mb-3">
                  정답을 순서대로 입력하세요 (쉼표 또는 공백으로 구분)
                </p>
                <textarea
                  value={gradeInput}
                  onChange={e => setGradeInput(e.target.value)}
                  placeholder="예: 3, 1, 4, 2, 5, 3, 1, 2, 4, 5 ..."
                  className="selectable w-full h-32 border border-gray-300 rounded-lg p-3 text-sm text-gray-800 placeholder-gray-400 resize-none focus:outline-none focus:border-gray-500 mb-4"
                />
              </>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setShowGradeModal(false)}
                className="flex-1 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-300"
              >
                취소
              </button>
              <button
                onClick={handleGrade}
                className="flex-1 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700"
              >
                채점하기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
