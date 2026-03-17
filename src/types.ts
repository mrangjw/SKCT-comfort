export type Section = 'language' | 'data-analysis' | 'math' | 'logic' | 'sequence';

export interface TableData {
  headers: string[];
  rows: (string | number)[][];
  unit?: string;
}

export interface ChartData {
  type: 'bar' | 'line';
  labels: string[];
  datasets: { label: string; data: number[]; color?: string }[];
  unit?: string;
}

export interface Question {
  id: string;
  section: Section;
  type: string;
  passage?: string;
  question: string;
  table?: TableData;
  chart?: ChartData;
  options: string[];
  answer: number;
  explanation: string;
  difficulty: 1 | 2 | 3;
}

export interface SectionInfo {
  id: Section;
  name: string;
  icon: string;
  types: string[];
  color: string;
}

export interface QuizConfig {
  section: Section;
  type?: string;
  mode: 'practice' | 'random' | 'mock';
  maxErrors?: number;
  timerEnabled: boolean;
  timerSeconds: number;
}

export interface QuizResult {
  questionId: string;
  selected: number;
  correct: boolean;
  timeSpent: number;
}

export interface SectionStats {
  section: Section;
  total: number;
  correct: number;
  byType: Record<string, { total: number; correct: number }>;
  history: { date: string; correct: number; total: number }[];
}

export type Page = 'home' | 'section' | 'quiz' | 'result' | 'stats' | 'settings' | 'pdf-generator' | 'ai-questions' | 'exam-simulator' | 'study-tips' | 'answer-grading';
