import { useState, useCallback } from 'react';
import type { Question } from '../types';

const STORAGE_KEY = 'skct-wrong-notes';

export interface WrongNote {
  questionId: string;
  wrongAnswer: number;
  date: string;
  memo: string;
  reviewed: boolean;
}

function load(): WrongNote[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

function save(notes: WrongNote[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
}

export function useWrongNotes() {
  const [notes, setNotes] = useState<WrongNote[]>(load);

  const addNote = useCallback((questionId: string, wrongAnswer: number) => {
    setNotes(prev => {
      const exists = prev.find(n => n.questionId === questionId);
      if (exists) return prev;
      const next = [...prev, { questionId, wrongAnswer, date: new Date().toISOString().slice(0, 10), memo: '', reviewed: false }];
      save(next);
      return next;
    });
  }, []);

  const updateMemo = useCallback((questionId: string, memo: string) => {
    setNotes(prev => {
      const next = prev.map(n => n.questionId === questionId ? { ...n, memo } : n);
      save(next);
      return next;
    });
  }, []);

  const markReviewed = useCallback((questionId: string) => {
    setNotes(prev => {
      const next = prev.map(n => n.questionId === questionId ? { ...n, reviewed: true } : n);
      save(next);
      return next;
    });
  }, []);

  const removeNote = useCallback((questionId: string) => {
    setNotes(prev => {
      const next = prev.filter(n => n.questionId !== questionId);
      save(next);
      return next;
    });
  }, []);

  const getWrongQuestions = useCallback((allQuestions: Question[], reviewedOnly?: boolean) => {
    const filtered = reviewedOnly === undefined ? notes : notes.filter(n => n.reviewed === reviewedOnly);
    return filtered.map(n => {
      const q = allQuestions.find(q => q.id === n.questionId);
      return q ? { question: q, note: n } : null;
    }).filter(Boolean) as { question: Question; note: WrongNote }[];
  }, [notes]);

  const clearAll = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setNotes([]);
  }, []);

  return { notes, addNote, updateMemo, markReviewed, removeNote, getWrongQuestions, clearAll };
}
