import { useState, useCallback, useEffect, useRef } from 'react';
import type { SectionInfo, QuizConfig, QuizResult, Page, Question } from './types';
import { SECTIONS } from './data/sections';
import { allQuestions as builtInQuestions } from './data';
import { useStats } from './hooks/useStats';
import { useWrongNotes } from './hooks/useWrongNotes';
import { useTheme } from './hooks/useTheme';
import { useAuth } from './hooks/useAuth';
import { api } from './lib/api';
import { saveAIConfig } from './lib/ai';
import type { AIConfig } from './lib/ai';
import Home from './components/Home';
import SectionMenu from './components/SectionMenu';
import Quiz from './components/Quiz';
import Result from './components/Result';
import Stats from './components/Stats';
import WrongNotes from './components/WrongNotes';
import Settings from './components/Settings';
import PDFGenerator from './components/PDFGenerator';
import AIQuestions from './components/AIQuestions';
import Admin from './components/Admin';
import Feedback from './components/Feedback';
import Login from './components/Login';
import ExamSimulator from './components/simulator/ExamSimulator';
import StudyTips from './components/StudyTips';
import AnswerGrading from './components/AnswerGrading';

const AI_QUESTIONS_KEY = 'skct-ai-questions';

function loadAIQuestions(): Question[] {
  try {
    const raw = localStorage.getItem(AI_QUESTIONS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveAIQuestionsLocal(questions: Question[]) {
  localStorage.setItem(AI_QUESTIONS_KEY, JSON.stringify(questions));
}

export default function App() {
  const [page, setPage] = useState<Page | 'wrong-notes' | 'admin' | 'feedback' | 'admin-feedback'>('home');
  const [selectedSection, setSelectedSection] = useState<SectionInfo | null>(null);
  const [quizConfig, setQuizConfig] = useState<QuizConfig | null>(null);
  const [lastResults, setLastResults] = useState<QuizResult[]>([]);
  const [lastQuestions, setLastQuestions] = useState<Question[]>([]);
  const [stoppedByErrors, setStoppedByErrors] = useState(false);
  const [aiQuestions, setAiQuestions] = useState<Question[]>(loadAIQuestions);
  const [aiQuizQuestions, setAiQuizQuestions] = useState<Question[] | null>(null);
  const [dataLoaded, setDataLoaded] = useState(false);

  const { user, login, logout } = useAuth();
  const { stats, record, clearAll: clearStats, setStats } = useStats();
  const wrongNotes = useWrongNotes();
  const { theme, toggle: toggleTheme, setTheme } = useTheme();

  const allQuestions = builtInQuestions;

  // Debounce timer for server sync
  const syncTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Load all data from server after login
  useEffect(() => {
    if (!user) {
      setDataLoaded(false);
      return;
    }
    let cancelled = false;
    (async () => {
      const data = await api.loadUserData();
      if (cancelled || !data) {
        setDataLoaded(true);
        return;
      }
      // Restore stats
      if (data.stats && Object.keys(data.stats).length > 0) {
        setStats(data.stats);
        localStorage.setItem('skct-stats', JSON.stringify(data.stats));
      }
      // Restore wrong notes
      if (data.wrongNotes && Array.isArray(data.wrongNotes) && data.wrongNotes.length > 0) {
        wrongNotes.setNotes(data.wrongNotes);
        localStorage.setItem('skct-wrong-notes', JSON.stringify(data.wrongNotes));
      }
      // Restore AI questions
      if (data.aiQuestions && Array.isArray(data.aiQuestions) && data.aiQuestions.length > 0) {
        setAiQuestions(data.aiQuestions as Question[]);
        saveAIQuestionsLocal(data.aiQuestions as Question[]);
      }
      // Restore AI config
      if (data.aiConfig) {
        saveAIConfig(data.aiConfig as AIConfig);
      }
      // Restore theme
      if (data.preferences && (data.preferences as Record<string, string>).theme) {
        const t = (data.preferences as Record<string, string>).theme as 'dark' | 'light';
        setTheme(t);
      }
      setDataLoaded(true);
    })();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Sync data to server (debounced)
  const syncToServer = useCallback(() => {
    if (!user) return;
    if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    syncTimerRef.current = setTimeout(() => {
      const currentStats = JSON.parse(localStorage.getItem('skct-stats') || '{}');
      const currentNotes = JSON.parse(localStorage.getItem('skct-wrong-notes') || '[]');
      const currentAiQ = JSON.parse(localStorage.getItem(AI_QUESTIONS_KEY) || '[]');
      const currentAiConfig = JSON.parse(localStorage.getItem('skct-ai-config') || 'null');
      const currentTheme = localStorage.getItem('skct-theme') || 'dark';

      api.saveUserData({
        name: user.name,
        stats: currentStats,
        wrongNotes: currentNotes,
        aiQuestions: currentAiQ,
        aiConfig: currentAiConfig,
        preferences: { theme: currentTheme },
      });
    }, 1000);
  }, [user]);

  const navigate = useCallback((p: Page | 'wrong-notes' | 'admin' | 'feedback' | 'admin-feedback') => setPage(p), []);

  const handleLogin = useCallback(async (name: string, className: string) => {
    const result = await api.login(name, className);
    if (!result || !result.userId) throw new Error('Login failed');
    login({ userId: result.userId, name: result.name, className: result.className });
  }, [login]);

  const handleLogout = useCallback(() => {
    logout();
    // Reset all state
    setAiQuestions([]);
    clearStats();
    wrongNotes.clearAll();
    setPage('home');
  }, [logout, clearStats, wrongNotes]);

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
    const isAiQuiz = aiQuizQuestions !== null;
    if (quizConfig) {
      const quizQs = isAiQuiz
        ? aiQuizQuestions
        : allQuestions.filter(q => q.section === quizConfig.section);
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
    setAiQuizQuestions(null);
    setPage('result');
    // Sync all data to server after quiz
    syncToServer();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quizConfig, record, wrongNotes.addNote, allQuestions, aiQuizQuestions, syncToServer]);

  const handleAddWrongNote = useCallback((questionId: string, wrongAnswer: number) => {
    wrongNotes.addNote(questionId, wrongAnswer);
    syncToServer();
  }, [wrongNotes, syncToServer]);

  const handleAiQuestions = useCallback((questions: Question[]) => {
    setAiQuestions(prev => {
      const next = [...prev, ...questions];
      saveAIQuestionsLocal(next);
      return next;
    });
    setPage('ai-questions');
    syncToServer();
  }, [syncToServer]);

  const handleDeleteAiQuestions = useCallback((ids: string[]) => {
    setAiQuestions(prev => {
      const idSet = new Set(ids);
      const next = prev.filter(q => !idSet.has(q.id));
      saveAIQuestionsLocal(next);
      return next;
    });
    syncToServer();
  }, [syncToServer]);

  const handleDeleteAllAiQuestions = useCallback(() => {
    setAiQuestions([]);
    saveAIQuestionsLocal([]);
    syncToServer();
  }, [syncToServer]);

  const handleStartAllQuiz = useCallback(() => {
    const shuffled = [...allQuestions].sort(() => Math.random() - 0.5);
    setAiQuizQuestions(shuffled);
    setQuizConfig({
      section: 'language', // dummy — useQuiz will skip filter since no match
      mode: 'random',
      timerEnabled: true,
      timerSeconds: 45,
    });
    setPage('quiz');
  }, [allQuestions]);

  const handleStartAiQuiz = useCallback((config: QuizConfig, questions: Question[]) => {
    setAiQuizQuestions(questions);
    setQuizConfig(config);
    setPage('quiz');
  }, []);

  // Count questions per type for section menu
  const getTypeCount = (section: SectionInfo) => {
    const counts: Record<string, number> = {};
    allQuestions.filter(q => q.section === section.id).forEach(q => {
      counts[q.type] = (counts[q.type] || 0) + 1;
    });
    return counts;
  };

  // Exam simulator - full screen, no wrapper
  if (page === 'exam-simulator') {
    return <ExamSimulator onBack={() => navigate('home')} />;
  }

  // Not logged in → show Login
  if (!user) {
    return (
      <div className="max-w-lg mx-auto">
        <Login onLogin={handleLogin} />
      </div>
    );
  }

  // Loading data from server
  if (!dataLoaded) {
    return (
      <div className="max-w-lg mx-auto min-h-dvh flex items-center justify-center">
        <div className="text-center">
          <div className="text-text-dim text-sm">데이터 로딩 중...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto">
      {page === 'home' && (
        <Home
          sections={SECTIONS}
          stats={stats}
          wrongNotesCount={wrongNotes.notes.filter(n => !n.reviewed).length}
          onSelectSection={handleSelectSection}
          onNavigate={navigate}
          onStartAllQuiz={handleStartAllQuiz}
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
          allQuestions={aiQuizQuestions || allQuestions}
          onFinish={handleFinishQuiz}
          onBack={() => { setAiQuizQuestions(null); navigate('home'); }}
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
          wrongQuestions={wrongNotes.getWrongQuestions([...allQuestions, ...aiQuestions])}
          onBack={() => navigate('home')}
          onUpdateMemo={(qid, memo) => { wrongNotes.updateMemo(qid, memo); syncToServer(); }}
          onMarkReviewed={(qid) => { wrongNotes.markReviewed(qid); syncToServer(); }}
          onRemove={(qid) => { wrongNotes.removeNote(qid); syncToServer(); }}
          onStartWrongQuiz={(config) => {
            handleStartQuiz(config);
          }}
        />
      )}

      {page === 'settings' && (
        <Settings
          onBack={() => navigate('home')}
          onClearStats={() => { clearStats(); syncToServer(); }}
          onClearWrongNotes={() => { wrongNotes.clearAll(); syncToServer(); }}
          onNavigateAdmin={() => navigate('admin')}
          theme={theme}
          onToggleTheme={() => { toggleTheme(); setTimeout(syncToServer, 100); }}
          onLogout={handleLogout}
          userName={user.name}
          userClassName={user.className}
          onSaveSettings={syncToServer}
        />
      )}

      {page === 'pdf-generator' && (
        <PDFGenerator
          onBack={() => navigate('home')}
          onQuestionsGenerated={handleAiQuestions}
        />
      )}

      {page === 'ai-questions' && (
        <AIQuestions
          aiQuestions={aiQuestions}
          onBack={() => navigate('home')}
          onStartQuiz={handleStartAiQuiz}
          onDelete={handleDeleteAiQuestions}
          onDeleteAll={handleDeleteAllAiQuestions}
        />
      )}

      {page === 'study-tips' && (
        <StudyTips onBack={() => navigate('home')} />
      )}

      {page === 'answer-grading' && (
        <AnswerGrading onBack={() => navigate('home')} />
      )}

      {page === 'admin' && (
        <Admin onBack={() => navigate('settings')} onNavigateFeedback={() => navigate('admin-feedback')} />
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
