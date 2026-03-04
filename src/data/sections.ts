import type { SectionInfo } from '../types';

export const SECTIONS: SectionInfo[] = [
  {
    id: 'language',
    name: '언어이해',
    icon: '📖',
    types: ['중심 내용 파악', '세부 내용 파악', '글의 구조 파악', '비판/반론'],
    color: '#3b82f6',
  },
  {
    id: 'data-analysis',
    name: '자료해석',
    icon: '📊',
    types: ['자료이해', '자료계산', '자료추론', '자료변환'],
    color: '#22c55e',
  },
  {
    id: 'math',
    name: '창의수리',
    icon: '🔢',
    types: ['거리/속력/시간', '용액의 농도', '일의 양', '원가/정가', '방정식의 활용', '경우의 수/확률'],
    color: '#f59e0b',
  },
  {
    id: 'logic',
    name: '언어추리',
    icon: '🧩',
    types: ['명제추리', '조건추리_순서/순위', '조건추리_위치/배치', '조건추리_참/거짓'],
    color: '#a855f7',
  },
  {
    id: 'sequence',
    name: '수열추리',
    icon: '🔗',
    types: ['빈칸 숫자 추론', 'N번째 숫자 추론'],
    color: '#ef4444',
  },
];
