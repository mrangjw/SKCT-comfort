import { useState } from 'react';

interface Props {
  onBack: () => void;
}

interface AccordionSectionProps {
  title: string;
  emoji: string;
  color: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

function AccordionSection({ title, emoji, color, defaultOpen = false, children }: AccordionSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="bg-bg-card rounded-2xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full p-4 text-left flex items-center gap-3 active:bg-bg-hover transition-colors"
      >
        <div
          className="text-xl w-9 h-9 flex items-center justify-center rounded-xl shrink-0"
          style={{ backgroundColor: color + '20' }}
        >
          {emoji}
        </div>
        <span className="font-medium flex-1">{title}</span>
        <span
          className="text-text-dim transition-transform duration-200"
          style={{ transform: open ? 'rotate(90deg)' : 'rotate(0deg)' }}
        >
          &rsaquo;
        </span>
      </button>
      {open && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
}

function Tip({ children, highlight }: { children: React.ReactNode; highlight?: boolean }) {
  return (
    <div
      className={`px-3 py-2 rounded-xl text-sm leading-relaxed ${
        highlight
          ? 'bg-accent/10 border border-accent/30 text-text'
          : 'bg-bg/60 text-text'
      }`}
    >
      {children}
    </div>
  );
}

function TypeBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-block px-2 py-0.5 bg-bg-hover/60 rounded-md text-xs text-text-dim mr-1.5 mb-1">
      {children}
    </span>
  );
}

export default function StudyTips({ onBack }: Props) {
  return (
    <div className="min-h-dvh px-4 pb-24">
      {/* Header */}
      <div className="pt-4 pb-4 flex items-center gap-3">
        <button onClick={onBack} className="text-text-dim">&larr;</button>
        <h2 className="text-xl font-bold">공부 전략 & 꿀팁</h2>
      </div>

      <div className="space-y-3">
        {/* 시험 개요 */}
        <AccordionSection title="시험 개요" emoji="📋" color="#6366f1" defaultOpen>
          <div className="space-y-2">
            <Tip highlight>
              <strong>인지역량검사</strong>: 5개 영역, 각 15분 20문항 (총 100문항)
            </Tip>
            <Tip>영역 간 쉬는 시간 1~2분</Tip>
            <Tip highlight>
              온라인 응시 — 웹캠 필요, <strong>메모지/필기구 사용 불가</strong>
            </Tip>
            <Tip highlight>
              <strong>이전 문제로 돌아갈 수 없음</strong> — 한 번 넘기면 끝
            </Tip>
          </div>
        </AccordionSection>

        {/* 응시 환경 팁 */}
        <AccordionSection title="응시 환경 팁" emoji="🖥️" color="#10b981">
          <div className="space-y-2">
            <Tip>화면 상단에서 남은 시간 및 문제 수 확인 가능</Tip>
            <Tip highlight>
              <strong>메모장 / 그림판 / 계산기</strong> 활용 가능 (문제 바뀌면 자동 초기화)
            </Tip>
            <Tip highlight>
              계산기: <strong>NumPad 사용 추천</strong>, C버튼으로 초기화
            </Tip>
            <Tip>선택지: 클릭해서 선택 및 취소 가능</Tip>
          </div>
        </AccordionSection>

        {/* 영역별 전략 */}
        <div className="bg-bg-card rounded-2xl p-4">
          <div className="flex items-center gap-3 mb-3">
            <div
              className="text-xl w-9 h-9 flex items-center justify-center rounded-xl shrink-0"
              style={{ backgroundColor: '#f59e0b20' }}
            >
              🎯
            </div>
            <span className="font-bold text-lg">영역별 전략</span>
          </div>
          <p className="text-xs text-text-dim mb-3">각 영역을 눌러 전략을 확인하세요</p>
        </div>

        {/* 1. 언어이해 */}
        <AccordionSection title="언어이해" emoji="📖" color="#8b5cf6">
          <div className="space-y-2">
            <Tip highlight>
              <strong>선지부터 읽기</strong> — 지문을 다 읽기 전에 무엇을 물어보는지 파악
            </Tip>
            <Tip highlight>긴 지문은 과감하게 PASS</Tip>
            <Tip>헷갈리면 찍고 다음으로 넘어가기</Tip>
            <div className="pt-1">
              <p className="text-xs text-text-dim mb-1.5">출제 유형</p>
              <div className="flex flex-wrap">
                <TypeBadge>주제파악</TypeBadge>
                <TypeBadge>일치/불일치</TypeBadge>
                <TypeBadge>추론</TypeBadge>
                <TypeBadge>빈칸채우기</TypeBadge>
                <TypeBadge>문단배열</TypeBadge>
                <TypeBadge>비판/평가</TypeBadge>
                <TypeBadge>사례판단</TypeBadge>
              </div>
            </div>
          </div>
        </AccordionSection>

        {/* 2. 자료해석 */}
        <AccordionSection title="자료해석" emoji="📊" color="#06b6d4">
          <div className="space-y-2">
            <Tip highlight>
              <strong>다 풀려고 하지 말기</strong> — 10개 풀어서 10개 맞히기 목표
            </Tip>
            <Tip>손(또는 마우스)으로 지문 가리면서 선지 하나씩 확인</Tip>
            <div className="pt-1">
              <p className="text-xs text-text-dim mb-1.5">출제 유형</p>
              <div className="flex flex-wrap">
                <TypeBadge>자료이해</TypeBadge>
                <TypeBadge>자료계산</TypeBadge>
              </div>
            </div>
          </div>
        </AccordionSection>

        {/* 3. 창의수리 */}
        <AccordionSection title="창의수리" emoji="🔢" color="#f59e0b">
          <div className="space-y-2">
            <Tip highlight>
              <strong>메모장 적극 활용</strong> — 식 세워서 풀기
            </Tip>
            <Tip highlight>
              계산기 <strong>NumPad 추천</strong> — 마우스 클릭보다 빠름
            </Tip>
            <Tip>식을 먼저 작성하고 계산은 나중에 (최적화)</Tip>
            <div className="pt-1">
              <p className="text-xs text-text-dim mb-1.5">출제 유형</p>
              <div className="flex flex-wrap">
                <TypeBadge>거속시</TypeBadge>
                <TypeBadge>농도/비율</TypeBadge>
                <TypeBadge>작업량</TypeBadge>
                <TypeBadge>비용</TypeBadge>
                <TypeBadge>경우의수/확률</TypeBadge>
              </div>
            </div>
          </div>
        </AccordionSection>

        {/* 4. 언어추리 */}
        <AccordionSection title="언어추리" emoji="🧩" color="#ec4899">
          <div className="space-y-2">
            <Tip highlight>
              어려우면 <strong>빨리 건너뛰기</strong> — 시간 잡아먹는 함정 문제 주의
            </Tip>
            <Tip highlight>
              "경우의 수 3가지" 종류의 선지는 <strong>PASS</strong> (시간 대비 효율 최악)
            </Tip>
            <div className="pt-1">
              <p className="text-xs text-text-dim mb-1.5">출제 유형</p>
              <div className="flex flex-wrap">
                <TypeBadge>명제추리</TypeBadge>
                <TypeBadge>삼단논법</TypeBadge>
                <TypeBadge>줄세우기</TypeBadge>
                <TypeBadge>테이블</TypeBadge>
                <TypeBadge>O/X</TypeBadge>
                <TypeBadge>진실게임</TypeBadge>
              </div>
            </div>
          </div>
        </AccordionSection>

        {/* 5. 수열추리 */}
        <AccordionSection title="수열추리" emoji="🔑" color="#22c55e">
          <div className="space-y-2">
            <Tip highlight>
              <strong>가장 빨리 점수 올릴 수 있는 영역</strong> — 반복 연습이 핵심
            </Tip>
            <Tip>패턴만 익히면 거의 모든 문제를 풀 수 있음</Tip>
            <div className="pt-1">
              <p className="text-xs text-text-dim mb-1.5">출제 유형</p>
              <div className="flex flex-wrap">
                <TypeBadge>등차/계차</TypeBadge>
                <TypeBadge>등비</TypeBadge>
                <TypeBadge>피보나치</TypeBadge>
                <TypeBadge>홀짝항 규칙</TypeBadge>
                <TypeBadge>군수열</TypeBadge>
              </div>
            </div>

            <div className="bg-accent/10 border border-accent/30 rounded-xl p-3 mt-2">
              <p className="text-xs font-medium text-accent-dark mb-2">사고 알고리즘 (순서대로 체크)</p>
              <div className="flex flex-wrap items-center gap-1 text-xs">
                <span className="bg-bg-hover/60 px-2 py-1 rounded-md">등차/계차?</span>
                <span className="text-text-dim">&rarr;</span>
                <span className="bg-bg-hover/60 px-2 py-1 rounded-md">피보나치?</span>
                <span className="text-text-dim">&rarr;</span>
                <span className="bg-bg-hover/60 px-2 py-1 rounded-md">홀짝항?</span>
                <span className="text-text-dim">&rarr;</span>
                <span className="bg-bg-hover/60 px-2 py-1 rounded-md">군수열?</span>
              </div>
            </div>
          </div>
        </AccordionSection>

        {/* 공부 꿀팁 */}
        <AccordionSection title="공부 꿀팁" emoji="💡" color="#facc15">
          <div className="space-y-2">
            <Tip highlight>
              <strong>오답 다시 풀기</strong> — 시간 재면서 반복
            </Tip>
            <Tip highlight>
              실전 모의고사는 반드시 <strong>시간 재고</strong> 풀기
            </Tip>
            <Tip>e북 + 메모장/그림판/계산기 켜놓고 실전처럼 연습</Tip>
            <Tip>일관된 환경에서 연습 (NumPad 키보드 추천)</Tip>
            <Tip highlight>
              안 풀리면 <strong>찍고 넘어가는 감</strong> 잡기 — 한 문제에 시간 낭비 금지
            </Tip>
            <Tip>
              <strong>배수판정법</strong> 활용 (창의수리 계산 속도 UP)
            </Tip>

            <div className="bg-bg/60 rounded-xl p-3 mt-2">
              <p className="text-xs font-medium mb-2">난이도 체감 비교</p>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <div className="flex items-center justify-between text-xs mb-0.5">
                      <span>해커스</span>
                      <span className="text-wrong">어려움</span>
                    </div>
                    <div className="h-2 bg-bg-hover rounded-full overflow-hidden">
                      <div className="h-full bg-wrong rounded-full" style={{ width: '95%' }} />
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <div className="flex items-center justify-between text-xs mb-0.5">
                      <span>에듀윌</span>
                      <span className="text-warning">보통+</span>
                    </div>
                    <div className="h-2 bg-bg-hover rounded-full overflow-hidden">
                      <div className="h-full bg-warning rounded-full" style={{ width: '80%' }} />
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <div className="flex items-center justify-between text-xs mb-0.5">
                      <span>렛유인</span>
                      <span className="text-text-dim">보통</span>
                    </div>
                    <div className="h-2 bg-bg-hover rounded-full overflow-hidden">
                      <div className="h-full bg-blue-400 rounded-full" style={{ width: '50%' }} />
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <div className="flex items-center justify-between text-xs mb-0.5">
                      <span>링커리어</span>
                      <span className="text-text-dim">쉬움</span>
                    </div>
                    <div className="h-2 bg-bg-hover rounded-full overflow-hidden">
                      <div className="h-full bg-blue-400 rounded-full" style={{ width: '30%' }} />
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <div className="flex items-center justify-between text-xs mb-0.5">
                      <span>본시험</span>
                      <span className="text-correct">체감 쉬움</span>
                    </div>
                    <div className="h-2 bg-bg-hover rounded-full overflow-hidden">
                      <div className="h-full bg-correct rounded-full" style={{ width: '40%' }} />
                    </div>
                  </div>
                </div>
              </div>
              <p className="text-[10px] text-text-dim mt-2">{'해커스 >= 에듀윌 >> 렛유인 >>> 링커리어 >> 본시험'}</p>
            </div>
          </div>
        </AccordionSection>

        {/* 멘탈 관리 */}
        <AccordionSection title="멘탈 관리" emoji="🧠" color="#f43f5e">
          <div className="space-y-2">
            <Tip highlight>
              못 푼 문제는 <strong>찍기</strong> — 빈 칸은 0점, 찍으면 20% 확률
            </Tip>
            <Tip highlight>
              <strong>한 문제라도 더 푸는 것</strong>이 중요
            </Tip>
            <div className="bg-primary-light/10 border border-primary-light/30 rounded-xl p-4 text-center mt-2">
              <p className="text-base font-bold">노력은 배신하지 않는다</p>
              <p className="text-xs text-text-dim mt-1">꾸준히 연습하면 반드시 결과가 나옵니다</p>
            </div>
          </div>
        </AccordionSection>
      </div>
    </div>
  );
}
