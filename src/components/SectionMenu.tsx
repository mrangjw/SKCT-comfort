import { useState } from 'react';
import type { SectionInfo, QuizConfig, Section } from '../types';

interface Props {
  section: SectionInfo;
  totalQuestions: Record<string, number>;
  onStart: (config: QuizConfig) => void;
  onBack: () => void;
}

export default function SectionMenu({ section, totalQuestions, onStart, onBack }: Props) {
  const [timerEnabled, setTimerEnabled] = useState(true);
  const [timerSeconds, setTimerSeconds] = useState(45);
  const [maxErrors, setMaxErrors] = useState(0);

  const makeConfig = (type?: string, mode: 'practice' | 'random' | 'mock' = 'practice'): QuizConfig => ({
    section: section.id as Section,
    type,
    mode,
    maxErrors: maxErrors > 0 ? maxErrors : undefined,
    timerEnabled,
    timerSeconds,
  });

  return (
    <div className="min-h-dvh px-4 pb-8">
      <div className="pt-4 pb-4 flex items-center gap-3">
        <button onClick={onBack} className="text-text-dim">&larr;</button>
        <div className="text-2xl">{section.icon}</div>
        <h2 className="text-xl font-bold">{section.name}</h2>
      </div>

      {/* 모드 선택 */}
      <div className="space-y-2 mb-6">
        <button
          onClick={() => onStart(makeConfig(undefined, 'random'))}
          className="w-full bg-primary rounded-xl p-4 text-left text-white"
        >
          <div className="font-medium">🎲 전체 랜덤</div>
          <p className="text-sm opacity-80 mt-0.5">모든 유형 섞어서 풀기</p>
        </button>
        <button
          onClick={() => onStart(makeConfig(undefined, 'mock'))}
          className="w-full bg-bg-card rounded-xl p-4 text-left border border-bg-hover/50"
        >
          <div className="font-medium">⏱ 실전 모의고사</div>
          <p className="text-sm text-text-dim mt-0.5">20문항 15분 제한</p>
        </button>
      </div>

      {/* 유형별 */}
      <h3 className="text-sm text-text-dim mb-2">유형별 연습</h3>
      <div className="space-y-2 mb-6">
        {section.types.map(type => (
          <button
            key={type}
            onClick={() => onStart(makeConfig(type, 'practice'))}
            className="w-full bg-bg-card rounded-xl p-3 text-left active:bg-bg-hover transition-colors flex items-center justify-between"
          >
            <span className="text-sm">{type}</span>
            <span className="text-xs text-text-dim">{totalQuestions[type] || 0}문항</span>
          </button>
        ))}
      </div>

      {/* 설정 */}
      <div className="bg-bg-card rounded-2xl p-4 space-y-4">
        <h3 className="text-sm font-medium">퀴즈 설정</h3>

        {/* 타이머 */}
        <div className="flex items-center justify-between">
          <span className="text-sm">타이머</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setTimerEnabled(!timerEnabled)}
              className={`w-10 h-6 rounded-full transition-colors ${timerEnabled ? 'bg-primary-light' : 'bg-bg-hover'}`}
            >
              <div className={`w-4 h-4 bg-white rounded-full transition-transform mx-1 ${timerEnabled ? 'translate-x-4' : ''}`} />
            </button>
          </div>
        </div>
        {timerEnabled && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-text-dim w-16">문항당</span>
            <input
              type="range"
              min={15}
              max={120}
              step={15}
              value={timerSeconds}
              onChange={e => setTimerSeconds(Number(e.target.value))}
              className="flex-1 accent-primary-light"
            />
            <span className="text-sm font-mono w-10 text-right">{timerSeconds}s</span>
          </div>
        )}

        {/* 오답 제한 */}
        <div className="flex items-center justify-between">
          <span className="text-sm">오답 제한 (0=무제한)</span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setMaxErrors(Math.max(0, maxErrors - 1))}
              className="w-7 h-7 bg-bg-hover rounded text-sm"
            >-</button>
            <span className="text-sm font-mono w-6 text-center">{maxErrors}</span>
            <button
              onClick={() => setMaxErrors(maxErrors + 1)}
              className="w-7 h-7 bg-bg-hover rounded text-sm"
            >+</button>
          </div>
        </div>
      </div>
    </div>
  );
}
