import { useState, useCallback } from 'react';
import type { SectionInfo, QuizConfig, QuizResult, Page, Question } from './types';
import { SECTIONS } from './data/sections';
import { allQuestions as builtInQuestions } from './data';
import { useStats } from './hooks/useStats';
import { useWrongNotes } from './hooks/useWrongNotes';
import { useTheme } from './hooks/useTheme';
import { api } from './lib/api';
import Home from './components/Home';
import SectionMenu from './components/SectionMenu';
import Quiz from './components/Quiz';
import Result from './components/Result';
import Stats from './components/Stats';
import WrongNotes from './components/WrongNotes';
import Settings from './components/Settings';
import PDFGenerator from './components/PDFGenerator';
import Admin from './components/Admin';
import Feedback from './components/Feedback';

export default function App() {
  const [page, setPage] = useState<Page | 'wrong-notes' | 'admin' | 'feedback' | 'admin-feedback'>('home');
  const [selectedSection, setSelectedSection] = useState<SectionInfo | null>(null);
  const [quizConfig, setQuizConfig] = useState<QuizConfig | null>(null);
  const [lastResults, setLastResults] = useState<QuizResult[]>([]);
  const [lastQuestions, setLastQuestions] = useState<Question[]>([]);
  const [stoppedByErrors, setStoppedByErrors] = useState(false);
  const [aiQuestions, setAiQuestions] = useState<Question[]>([]);

  const { stats, record, clearAll: clearStats } = useStats();
  const wrongNotes = useWrongNotes();
  const { theme, toggle: toggleTheme } = useTheme();

  const allQuestions = [...builtInQuestions, ...aiQuestions];

  const navigate = useCallback((p: Page | 'wrong-notes' | 'admin' | 'feedback' | 'admin-feedback') => setPage(p), []);

  const handleSelectSection = useCallback((sec: SectionInfo) => {
    setSelectedSection(sec);
    setPage('section');
  }, []);

  const handleStartQuiz = useCallback((config: QuizConfig) => {
    setQuizConfig(config);
    setPage('quiz');
  }, []);

  const handleFinishQuiz = useCallback((results: QuizResult[]) => {
    setLastResults(results);
    if (quizConfig) {
      const quizQs = allQuestions.filter(q => q.section === quizConfig.section);
      setLastQuestions(quizQs);
      record(quizConfig.section, quizConfig.type || '전체', results);

      // Auto-add wrong notes
      results.filter(r => !r.correct).forEach(r => {
        wrongNotes.addNote(r.questionId, r.selected);
      });

      // Sync to backend
      api.recordSession({
        section: quizConfig.section,
        type: quizConfig.type || '전체',
        correct: results.filter(r => r.correct).length,
        total: results.length,
        duration: results.reduce((s, r) => s + r.timeSpent, 0),
      });

      setStoppedByErrors(results.length < quizQs.length && (quizConfig.maxErrors ?? 0) > 0);
    }
    setPage('result');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quizConfig, record, wrongNotes.addNote, allQuestions]);

  const handleAddWrongNote = useCallback((questionId: string, wrongAnswer: number) => {
    wrongNotes.addNote(questionId, wrongAnswer);
  }, [wrongNotes]);

  const handleAiQuestions = useCallback((questions: Question[]) => {
    setAiQuestions(prev => [...prev, ...questions]);
  }, []);

  // Count questions per type for section menu
  const getTypeCount = (section: SectionInfo) => {
    const counts: Record<string, number> = {};
    allQuestions.filter(q => q.section === section.id).forEach(q => {
      counts[q.type] = (counts[q.type] || 0) + 1;
    });
    return counts;
  };

  return (
    <div className="max-w-lg mx-auto">
      {page === 'home' && (
        <Home
          sections={SECTIONS}
          stats={stats}
          wrongNotesCount={wrongNotes.notes.filter(n => !n.reviewed).length}
          onSelectSection={handleSelectSection}
          onNavigate={navigate}
        />
      )}

      {page === 'section' && selectedSection && (
        <SectionMenu
          section={selectedSection}
          totalQuestions={getTypeCount(selectedSection)}
          onStart={handleStartQuiz}
          onBack={() => navigate('home')}
        />
      )}

      {page === 'quiz' && quizConfig && (
        <Quiz
          config={quizConfig}
          allQuestions={allQuestions}
          onFinish={handleFinishQuiz}
          onBack={() => navigate('home')}
          onAddWrongNote={handleAddWrongNote}
        />
      )}

      {page === 'result' && (
        <Result
          results={lastResults}
          questions={lastQuestions}
          section={quizConfig?.section || 'language'}
          stoppedByErrors={stoppedByErrors}
          onRetry={() => quizConfig && handleStartQuiz(quizConfig)}
          onHome={() => navigate('home')}
        />
      )}

      {page === 'stats' && (
        <Stats stats={stats} onBack={() => navigate('home')} onNavigate={navigate} />
      )}

      {page === 'wrong-notes' && (
        <WrongNotes
          wrongQuestions={wrongNotes.getWrongQuestions(allQuestions)}
          onBack={() => navigate('home')}
          onUpdateMemo={wrongNotes.updateMemo}
          onMarkReviewed={wrongNotes.markReviewed}
          onRemove={wrongNotes.removeNote}
          onStartWrongQuiz={(config) => {
            // Start quiz with only wrong note questions
            handleStartQuiz(config);
          }}
        />
      )}

      {page === 'settings' && (
        <Settings
          onBack={() => navigate('home')}
          onClearStats={clearStats}
          onClearWrongNotes={wrongNotes.clearAll}
          onNavigateAdmin={() => navigate('admin')}
          theme={theme}
          onToggleTheme={toggleTheme}
        />
      )}

      {page === 'pdf-generator' && (
        <PDFGenerator
          onBack={() => navigate('home')}
          onQuestionsGenerated={handleAiQuestions}
        />
      )}

      {page === 'admin' && (
        <Admin onBack={() => navigate('settings')} />
      )}

      {page === 'feedback' && (
        <Feedback onBack={() => navigate('home')} />
      )}

      {page === 'admin-feedback' && (
        <Feedback onBack={() => navigate('admin')} isAdmin />
      )}
    </div>
  );
}
