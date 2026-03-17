import { useState, useCallback } from 'react';
import type { Section } from '../types';
import { ANSWER_KEYS, SECTION_LABELS, BOOK_SOURCE } from '../data/answer-keys';

const SEC_ORDER: Section[] = ['language', 'data-analysis', 'math', 'logic', 'sequence'];

interface Props {
  onBack: () => void;
}

type SectionOrAll = Section | 'all';

interface GradeResult {
  userAnswers: number[];
  correctAnswers: number[];
  score: number;
  total: number;
  // 전체 채점 시 영역별 결과
  sectionResults?: {
    section: Section;
    label: string;
    score: number;
    total: number;
    userAnswers: number[];
    correctAnswers: number[];
  }[];
}

export default function AnswerGrading({ onBack }: Props) {
  const [testIdx, setTestIdx] = useState(0);
  const [sectionId, setSectionId] = useState<SectionOrAll>('all');
  const [input, setInput] = useState('');
  const [result, setResult] = useState<GradeResult | null>(null);

  const test = ANSWER_KEYS[testIdx];
  const sections = Object.keys(test.sections) as Section[];
  const isAll = sectionId === 'all';
  const expectedCount = isAll ? sections.length * 20 : 20;

  const parsedCount = input.trim()
    .split(/[,\s.]+/)
    .filter(s => s && !isNaN(Number(s))).length;

  const handleGrade = useCallback(() => {
    const parsed = input
      .trim()
      .split(/[,\s.]+/)
      .map(s => parseInt(s.trim()))
      .filter(n => !isNaN(n));

    if (parsed.length === 0) return;

    if (isAll) {
      // 전체 채점: 100문항을 20문항씩 5영역으로 분할
      const allCorrect: number[] = [];
      const sectionResults: GradeResult['sectionResults'] = [];

      SEC_ORDER.forEach(sec => {
        const keys = test.sections[sec];
        if (keys) allCorrect.push(...keys);
      });

      let totalScore = 0;
      let offset = 0;

      SEC_ORDER.forEach(sec => {
        const keys = test.sections[sec];
        if (!keys) return;
        const userSlice = parsed.slice(offset, offset + keys.length);
        let secScore = 0;
        for (let i = 0; i < keys.length; i++) {
          if (userSlice[i] === keys[i]) secScore++;
        }
        sectionResults.push({
          section: sec,
          label: SECTION_LABELS[sec],
          score: secScore,
          total: keys.length,
          userAnswers: userSlice,
          correctAnswers: keys,
        });
        totalScore += secScore;
        offset += keys.length;
      });

      setResult({
        userAnswers: parsed.slice(0, allCorrect.length),
        correctAnswers: allCorrect,
        score: totalScore,
        total: allCorrect.length,
        sectionResults,
      });
    } else {
      // 영역별 채점
      const correctAnswers = test.sections[sectionId as Section];
      if (!correctAnswers) return;

      let score = 0;
      for (let i = 0; i < Math.min(parsed.length, correctAnswers.length); i++) {
        if (parsed[i] === correctAnswers[i]) score++;
      }

      setResult({
        userAnswers: parsed.slice(0, correctAnswers.length),
        correctAnswers,
        score,
        total: correctAnswers.length,
      });
    }
  }, [input, test, sectionId, isAll]);

  const handleReset = () => {
    setInput('');
    setResult(null);
  };

  const pct = result ? Math.round((result.score / result.total) * 100) : 0;
  const grade = pct >= 90 ? '탁월' : pct >= 70 ? '우수' : pct >= 50 ? '보통' : '노력 필요';
  const gradeColor = pct >= 90 ? 'text-correct' : pct >= 70 ? 'text-primary-light' : pct >= 50 ? 'text-warning' : 'text-wrong';

  const resultLabel = isAll
    ? test.testName + ' · 전체'
    : test.testName + ' · ' + SECTION_LABELS[sectionId as Section];

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
                  onClick={() => { setTestIdx(i); }}
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
              <button
                onClick={() => setSectionId('all')}
                className={`py-1.5 px-3 rounded-lg text-sm font-medium transition-colors ${
                  sectionId === 'all'
                    ? 'bg-primary-light text-white'
                    : 'bg-bg-hover text-text-dim'
                }`}
              >
                전체 (100문항)
              </button>
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
              placeholder={isAll
                ? '언어이해 20문항 → 자료해석 20문항 → 창의수리 20문항 → 언어추리 20문항 → 수열추리 20문항 순서로 입력'
                : '예: 3,4,3,3,2,4,2,3,3,5,5,1,3,1,5,4,4,1,4,2'}
              className="w-full bg-bg-hover rounded-xl p-3 text-sm resize-none h-28 outline-none focus:ring-2 focus:ring-primary-light/50"
            />
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs text-text-dim">
                {parsedCount}/{expectedCount} 문항 입력됨
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
              {isAll
                ? '전체 선택 시 언어이해 → 자료해석 → 창의수리 → 언어추리 → 수열추리 순으로 100문항을 이어서 입력하세요.'
                : '교재의 실전모의고사를 풀고 정답 번호를 순서대로 입력하세요. 20문항 전부 입력하지 않아도 입력한 만큼 채점됩니다.'}
            </p>
          </div>
        </>
      ) : (
        <>
          {/* 전체 결과 */}
          <div className="bg-bg-card rounded-2xl p-6 mb-4 text-center">
            <div className="text-sm text-text-dim mb-1">{resultLabel}</div>
            <div className={`text-5xl font-bold mb-2 ${gradeColor}`}>{pct}%</div>
            <div className={`text-lg font-medium ${gradeColor}`}>{grade}</div>
            <div className="text-sm text-text-dim mt-2">
              {result.score}/{result.total} 정답
            </div>
          </div>

          {/* 영역별 결과 (전체 채점 시) */}
          {result.sectionResults && (
            <div className="bg-bg-card rounded-2xl p-4 mb-4">
              <h3 className="text-sm font-medium mb-3">영역별 성적</h3>
              <div className="space-y-2">
                {result.sectionResults.map(sr => {
                  const sp = Math.round((sr.score / sr.total) * 100);
                  const sc = sp >= 90 ? 'text-correct' : sp >= 70 ? 'text-primary-light' : sp >= 50 ? 'text-warning' : 'text-wrong';
                  const bc = sp >= 90 ? 'bg-correct' : sp >= 70 ? 'bg-primary-light' : sp >= 50 ? 'bg-warning' : 'bg-wrong';
                  return (
                    <div key={sr.section}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span>{sr.label}</span>
                        <span className={`font-bold ${sc}`}>{sr.score}/{sr.total} ({sp}%)</span>
                      </div>
                      <div className="h-2 bg-bg-hover rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${bc}`} style={{ width: `${sp}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 문항별 결과 */}
          {result.sectionResults ? (
            // 전체: 영역별로 나눠서 표시
            result.sectionResults.map(sr => (
              <div key={sr.section} className="bg-bg-card rounded-2xl p-4 mb-3">
                <h3 className="text-sm font-medium mb-2">{sr.label}</h3>
                <div className="grid grid-cols-5 gap-1.5">
                  {sr.correctAnswers.map((correct, i) => {
                    const user = sr.userAnswers[i];
                    const isCorrect = user === correct;
                    const notAnswered = user === undefined;
                    return (
                      <div
                        key={i}
                        className={`rounded-lg p-1.5 text-center text-xs ${
                          notAnswered ? 'bg-bg-hover text-text-dim'
                            : isCorrect ? 'bg-correct/20 text-correct'
                            : 'bg-wrong/20 text-wrong'
                        }`}
                      >
                        <div className="font-bold text-[10px] opacity-60">Q{i + 1}</div>
                        {notAnswered ? '-' : isCorrect ? (
                          <span className="font-bold">{correct}</span>
                        ) : (
                          <span><span className="line-through opacity-60">{user}</span> <span className="font-bold">{correct}</span></span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          ) : (
            // 단일 영역
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
                        notAnswered ? 'bg-bg-hover text-text-dim'
                          : isCorrect ? 'bg-correct/20 text-correct'
                          : 'bg-wrong/20 text-wrong'
                      }`}
                    >
                      <div className="font-bold text-[10px] opacity-60 mb-0.5">Q{i + 1}</div>
                      {notAnswered ? '-' : isCorrect ? (
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
