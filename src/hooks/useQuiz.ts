import { useState, useCallback } from 'react';
import type { Question, QuizConfig, QuizResult } from '../types';
import { shuffle } from '../utils/shuffle';

export function useQuiz() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [current, setCurrent] = useState(0);
  const [results, setResults] = useState<QuizResult[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [finished, setFinished] = useState(false);
  const [stoppedByErrors, setStoppedByErrors] = useState(false);
  const [startTime, setStartTime] = useState(Date.now());

  const start = useCallback((allQuestions: Question[], config: QuizConfig) => {
    let qs = allQuestions.filter(q => q.section === config.section);
    if (config.type) qs = qs.filter(q => q.type === config.type);
    qs = shuffle(qs);
    if (config.mode === 'mock') qs = qs.slice(0, 20);
    setQuestions(qs);
    setCurrent(0);
    setResults([]);
    setSelected(null);
    setShowAnswer(false);
    setFinished(false);
    setStoppedByErrors(false);
    setStartTime(Date.now());
  }, []);

  const answer = useCallback((idx: number, maxErrors?: number) => {
    if (showAnswer) return;
    const q = questions[current];
    const correct = idx === q.answer;
    const timeSpent = (Date.now() - startTime) / 1000;
    const result: QuizResult = { questionId: q.id, selected: idx, correct, timeSpent };
    const newResults = [...results, result];

    setSelected(idx);
    setShowAnswer(true);
    setResults(newResults);

    if (maxErrors !== undefined && maxErrors > 0) {
      const errorCount = newResults.filter(r => !r.correct).length;
      if (errorCount >= maxErrors) {
        setTimeout(() => {
          setStoppedByErrors(true);
          setFinished(true);
        }, 1500);
        return;
      }
    }
  }, [showAnswer, questions, current, startTime, results]);

  const next = useCallback(() => {
    if (current + 1 >= questions.length) {
      setFinished(true);
    } else {
      setCurrent(c => c + 1);
      setSelected(null);
      setShowAnswer(false);
      setStartTime(Date.now());
    }
  }, [current, questions.length]);

  const timeUp = useCallback(() => {
    if (!showAnswer) {
      const q = questions[current];
      const result: QuizResult = { questionId: q.id, selected: -1, correct: false, timeSpent: 0 };
      setResults(prev => [...prev, result]);
      setSelected(-1);
      setShowAnswer(true);
    }
  }, [showAnswer, questions, current]);

  return {
    questions, current, results, selected, showAnswer, finished, stoppedByErrors,
    start, answer, next, timeUp,
    currentQuestion: questions[current] || null,
    progress: questions.length > 0 ? { current: current + 1, total: questions.length } : null,
  };
}
