import { useState, useCallback } from 'react';
import type { Section, QuizResult, SectionStats } from '../types';

const STORAGE_KEY = 'skct-stats';

function load(): Record<Section, SectionStats> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {} as Record<Section, SectionStats>;
}

function save(data: Record<Section, SectionStats>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function useStats() {
  const [stats, setStatsState] = useState<Record<string, SectionStats>>(load);

  const setStats = useCallback((data: Record<string, unknown>) => {
    const parsed = data as Record<string, SectionStats>;
    setStatsState(parsed);
    save(parsed as Record<Section, SectionStats>);
  }, []);

  const record = useCallback((section: Section, type: string, results: QuizResult[]) => {
    setStatsState(prev => {
      const s = prev[section] || { section, total: 0, correct: 0, byType: {}, history: [] };
      const correct = results.filter(r => r.correct).length;
      const total = results.length;

      const byType = { ...s.byType };
      if (!byType[type]) byType[type] = { total: 0, correct: 0 };
      byType[type] = { total: byType[type].total + total, correct: byType[type].correct + correct };

      const history = [...s.history, { date: new Date().toISOString().slice(0, 10), correct, total }].slice(-50);

      const next = {
        ...prev,
        [section]: { ...s, total: s.total + total, correct: s.correct + correct, byType, history },
      };
      save(next as Record<Section, SectionStats>);
      return next;
    });
  }, []);

  const clearAll = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setStatsState({});
  }, []);

  return { stats, record, clearAll, setStats };
}
