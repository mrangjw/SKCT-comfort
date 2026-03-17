import { useState } from 'react';
import type { Question, Section, QuizConfig } from '../types';

interface AIQuestionGroup {
  section: Section;
  questions: Question[];
  createdAt: number; // earliest timestamp in the group
}

interface Props {
  aiQuestions: Question[];
  onBack: () => void;
  onStartQuiz: (config: QuizConfig, questions: Question[]) => void;
  onDelete: (ids: string[]) => void;
  onDeleteAll: () => void;
}

const SECTION_NAMES: Record<Section, string> = {
  language: '언어이해',
  'data-analysis': '자료해석',
  math: '창의수리',
  logic: '언어추리',
  sequence: '수열추리',
};

const SECTION_ICONS: Record<Section, string> = {
  language: '📖',
  'data-analysis': '📊',
  math: '🧮',
  logic: '🧩',
  sequence: '🔢',
};

function extractTimestamp(id: string): number {
  // id format: ai-{timestamp}-{index}
  const match = id.match(/^ai-(\d+)-/);
  return match ? Number(match[1]) : Date.now();
}

function groupBySection(questions: Question[]): AIQuestionGroup[] {
  const map = new Map<Section, Question[]>();
  for (const q of questions) {
    const list = map.get(q.section) || [];
    list.push(q);
    map.set(q.section, list);
  }
  return Array.from(map.entries()).map(([section, qs]) => ({
    section,
    questions: qs,
    createdAt: Math.min(...qs.map(q => extractTimestamp(q.id))),
  })).sort((a, b) => b.createdAt - a.createdAt);
}

function formatDate(ts: number): string {
  const d = new Date(ts);
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const hours = d.getHours().toString().padStart(2, '0');
  const mins = d.getMinutes().toString().padStart(2, '0');
  return `${month}/${day} ${hours}:${mins}`;
}

export default function AIQuestions({ aiQuestions, onBack, onStartQuiz, onDelete, onDeleteAll }: Props) {
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);
  const groups = groupBySection(aiQuestions);

  const handleStartGroup = (group: AIQuestionGroup) => {
    const config: QuizConfig = {
      section: group.section,
      mode: 'practice',
      timerEnabled: true,
      timerSeconds: 45,
    };
    onStartQuiz(config, group.questions);
  };

  const handleStartAll = () => {
    // Pick a random section for config (doesn't matter much, questions are passed directly)
    const config: QuizConfig = {
      section: aiQuestions[0]?.section || 'language',
      mode: 'random',
      timerEnabled: true,
      timerSeconds: 45,
    };
    // Shuffle
    const shuffled = [...aiQuestions].sort(() => Math.random() - 0.5);
    onStartQuiz(config, shuffled);
  };

  const handleDeleteGroup = (group: AIQuestionGroup) => {
    onDelete(group.questions.map(q => q.id));
  };

  return (
    <div className="min-h-dvh px-4 pb-8">
      <div className="pt-4 pb-4 flex items-center gap-3">
        <button onClick={onBack} className="text-text-dim">&larr;</button>
        <h2 className="text-xl font-bold">AI 문제</h2>
        <span className="text-sm text-text-dim ml-auto">{aiQuestions.length}문제</span>
      </div>

      {aiQuestions.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-4xl mb-4">📚</div>
          <p className="text-text-dim text-sm mb-2">생성된 AI 문제가 없습니다</p>
          <p className="text-text-dim text-xs">AI생성 탭에서 문제를 만들어보세요</p>
        </div>
      ) : (
        <>
          {/* Action buttons */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={handleStartAll}
              className="flex-1 py-3 bg-primary-light text-white rounded-xl text-sm font-medium"
            >
              전체 랜덤 퀴즈 ({aiQuestions.length}문제)
            </button>
            <button
              onClick={() => {
                if (confirmDeleteAll) {
                  onDeleteAll();
                  setConfirmDeleteAll(false);
                } else {
                  setConfirmDeleteAll(true);
                  setTimeout(() => setConfirmDeleteAll(false), 3000);
                }
              }}
              className={`px-4 py-3 rounded-xl text-sm font-medium ${
                confirmDeleteAll ? 'bg-wrong text-white' : 'bg-bg-card text-wrong'
              }`}
            >
              {confirmDeleteAll ? '확인' : '전체 삭제'}
            </button>
          </div>

          {/* Groups */}
          <div className="space-y-3">
            {groups.map(group => (
              <div key={group.section} className="bg-bg-card rounded-2xl p-4">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-2xl">{SECTION_ICONS[group.section]}</span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{SECTION_NAMES[group.section]}</span>
                      <span className="text-xs text-text-dim">{group.questions.length}문제</span>
                    </div>
                    <p className="text-xs text-text-dim mt-0.5">
                      생성: {formatDate(group.createdAt)}
                    </p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleStartGroup(group)}
                    className="flex-1 py-2.5 bg-primary-light/10 text-primary-light rounded-xl text-sm font-medium"
                  >
                    풀기
                  </button>
                  <button
                    onClick={() => handleDeleteGroup(group)}
                    className="px-4 py-2.5 bg-wrong/10 text-wrong rounded-xl text-sm font-medium"
                  >
                    삭제
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
