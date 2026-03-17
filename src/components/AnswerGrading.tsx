import { useState, useCallback } from 'react';
import type { Section } from '../types';
import { ANSWER_KEYS, SECTION_LABELS, BOOK_SOURCE } from '../data/answer-keys';

interface Props {
  onBack: () => void;
}

export default function AnswerGrading({ onBack }: Props) {
  const [testIdx, setTestIdx] = useState(0);
  const [sectionId, setSectionId] = useState<Section>('language');
  const [input, setInput] = useState('');
  const [result, setResult] = useState<{
    userAnswers: number[];
    correctAnswers: number[];
    score: number;
    total: number;
  } | null>(null);

  const test = ANSWER_KEYS[testIdx];
  const sections = Object.keys(test.sections) as Section[];

  const handleGrade = useCallback(() => {
    const correctAnswers = test.sections[sectionId];
    if (!correctAnswers) return;

    // 콤마, 공백, 점 등으로 분리
    const parsed = input
      .trim()
      .split(/[,\s.]+/)
      .map(s => parseInt(s.trim()))
      .filter(n => !isNaN(n));

    if (parsed.length === 0) return;

    // 정답 비교
    const total = Math.min(parsed.length, correctAnswers.length);
    let score = 0;
    for (let i = 0; i < total; i++) {
      if (parsed[i] === correctAnswers[i]) score++;
    }

    setResult({
      userAnswers: parsed.slice(0, correctAnswers.length),
      correctAnswers,
      score,
      total: correctAnswers.length,
    });
  }, [input, test, sectionId]);

  const handleReset = () => {
    setInput('');
    setResult(null);
  };

  const pct = result ? Math.round((result.score / result.total) * 100) : 0;
  const grade = pct >= 90 ? '탁월' : pct >= 70 ? '우수' : pct >= 50 ? '보통' : '노력 필요';
  const gradeColor = pct >= 90 ? 'text-correct' : pct >= 70 ? 'text-primary-light' : pct >= 50 ? 'text-warning' : 'text-wrong';

  return (
    <div className="min-h-dvh px-4 pb-8">
      {/* Header */}
      <div className="pt-6 pb-4 flex items-center gap-3">
        <button onClick={onBack} className="text-text-dim text-xl">&lsaquo;</button>
        <div>
          <h1 className="text-xl font-bold">정답 채점</h1>
          <p className="text-xs text-text-dim mt-0.5">{BOOK_SOURCE} 한정</p>
        </div>
      </div>

      {!result ? (
        <>
          {/* 시험 선택 */}
          <div className="bg-bg-card rounded-2xl p-4 mb-3">
            <label className="text-sm text-text-dim block mb-2">시험 선택</label>
            <div className="grid grid-cols-2 gap-2">
              {ANSWER_KEYS.map((ak, i) => (
                <button
                  key={i}
                  onClick={() => { setTestIdx(i); setSectionId(Object.keys(ak.sections)[0] as Section); }}
                  className={`py-2 px-3 rounded-xl text-sm font-medium transition-colors ${
                    testIdx === i
                      ? 'bg-primary-light text-white'
                      : 'bg-bg-hover text-text-dim'
                  }`}
                >
                  {ak.testName}
                </button>
              ))}
            </div>
          </div>

          {/* 영역 선택 */}
          <div className="bg-bg-card rounded-2xl p-4 mb-3">
            <label className="text-sm text-text-dim block mb-2">영역 선택</label>
            <div className="flex flex-wrap gap-2">
              {sections.map(sec => (
                <button
                  key={sec}
                  onClick={() => setSectionId(sec)}
                  className={`py-1.5 px-3 rounded-lg text-sm transition-colors ${
                    sectionId === sec
                      ? 'bg-accent text-white'
                      : 'bg-bg-hover text-text-dim'
                  }`}
                >
                  {SECTION_LABELS[sec]}
                </button>
              ))}
            </div>
          </div>

          {/* 답안 입력 */}
          <div className="bg-bg-card rounded-2xl p-4 mb-4">
            <label className="text-sm text-text-dim block mb-2">
              답안 입력 (1~5, 콤마 또는 공백으로 구분)
            </label>
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="예: 3,4,3,3,2,4,2,3,3,5,5,1,3,1,5,4,4,1,4,2"
              className="w-full bg-bg-hover rounded-xl p-3 text-sm resize-none h-24 outline-none focus:ring-2 focus:ring-primary-light/50"
            />
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs text-text-dim">
                {input.trim().split(/[,\s.]+/).filter(s => s && !isNaN(Number(s))).length}/20 문항 입력됨
              </span>
              <button
                onClick={handleGrade}
                disabled={!input.trim()}
                className="bg-primary-light text-white px-6 py-2 rounded-xl text-sm font-medium disabled:opacity-40 active:bg-primary-light/80 transition-colors"
              >
                채점하기
              </button>
            </div>
          </div>

          {/* 안내 */}
          <div className="bg-bg-card/50 rounded-xl p-3">
            <p className="text-xs text-text-dim leading-relaxed">
              교재의 실전모의고사를 풀고 정답 번호를 순서대로 입력하세요.
              20문항 전부 입력하지 않아도 입력한 만큼 채점됩니다.
            </p>
          </div>
        </>
      ) : (
        <>
          {/* 결과 */}
          <div className="bg-bg-card rounded-2xl p-6 mb-4 text-center">
            <div className="text-sm text-text-dim mb-1">
              {test.testName} · {SECTION_LABELS[sectionId]}
            </div>
            <div className={`text-5xl font-bold mb-2 ${gradeColor}`}>{pct}%</div>
            <div className={`text-lg font-medium ${gradeColor}`}>{grade}</div>
            <div className="text-sm text-text-dim mt-2">
              {result.score}/{result.total} 정답
              {result.userAnswers.length < result.total && (
                <span className="ml-2">({result.userAnswers.length}문항 응시)</span>
              )}
            </div>
          </div>

          {/* 문항별 결과 */}
          <div className="bg-bg-card rounded-2xl p-4 mb-4">
            <h3 className="text-sm font-medium mb-3">문항별 결과</h3>
            <div className="grid grid-cols-5 gap-2">
              {result.correctAnswers.map((correct, i) => {
                const user = result.userAnswers[i];
                const isCorrect = user === correct;
                const notAnswered = user === undefined;

                return (
                  <div
                    key={i}
                    className={`rounded-xl p-2 text-center text-xs ${
                      notAnswered
                        ? 'bg-bg-hover text-text-dim'
                        : isCorrect
                        ? 'bg-correct/20 text-correct'
                        : 'bg-wrong/20 text-wrong'
                    }`}
                  >
                    <div className="font-bold text-[10px] opacity-60 mb-0.5">Q{i + 1}</div>
                    {notAnswered ? (
                      <div>-</div>
                    ) : isCorrect ? (
                      <div className="font-bold">{correct}</div>
                    ) : (
                      <div>
                        <span className="line-through opacity-60">{user}</span>
                        <span className="font-bold ml-1">{correct}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* 틀린 문제 요약 */}
          {result.score < result.total && (
            <div className="bg-bg-card rounded-2xl p-4 mb-4">
              <h3 className="text-sm font-medium mb-2">틀린 문제</h3>
              <div className="text-sm text-text-dim space-y-1">
                {result.correctAnswers.map((correct, i) => {
                  const user = result.userAnswers[i];
                  if (user === undefined || user === correct) return null;
                  return (
                    <div key={i} className="flex items-center gap-2">
                      <span className="text-wrong font-medium w-8">Q{i + 1}</span>
                      <span>내 답: {user}번</span>
                      <span className="text-correct">정답: {correct}번</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 버튼 */}
          <div className="flex gap-3">
            <button
              onClick={handleReset}
              className="flex-1 bg-bg-card py-3 rounded-xl text-sm font-medium active:bg-bg-hover transition-colors"
            >
              다시 채점
            </button>
            <button
              onClick={onBack}
              className="flex-1 bg-primary-light text-white py-3 rounded-xl text-sm font-medium active:bg-primary-light/80 transition-colors"
            >
              홈으로
            </button>
          </div>
        </>
      )}
    </div>
  );
}
