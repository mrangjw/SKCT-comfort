import { useState } from 'react';
import type { AIConfig } from '../lib/ai';
import { loadAIConfig, saveAIConfig, getProviderDefaults } from '../lib/ai';

interface Props {
  onBack: () => void;
  onClearStats: () => void;
  onClearWrongNotes: () => void;
  onNavigateAdmin: () => void;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
}

export default function Settings({ onBack, onClearStats, onClearWrongNotes, onNavigateAdmin, theme, onToggleTheme }: Props) {
  const [aiConfig, setAiConfig] = useState<AIConfig>(() => loadAIConfig() || { provider: 'openai', apiUrl: 'https://api.openai.com/v1/chat/completions', apiKey: '', model: 'gpt-4o-mini' });
  const [saved, setSaved] = useState(false);
  const [nickname, setNickname] = useState(() => localStorage.getItem('skct-nickname') || '');

  const handleProviderChange = (provider: string) => {
    const defaults = getProviderDefaults(provider);
    setAiConfig(prev => ({ ...prev, provider: provider as AIConfig['provider'], apiUrl: defaults.url, model: defaults.model }));
  };

  const handleSave = () => {
    saveAIConfig(aiConfig);
    localStorage.setItem('skct-nickname', nickname);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="min-h-dvh px-4 pb-8">
      <div className="pt-4 pb-4 flex items-center gap-3">
        <button onClick={onBack} className="text-text-dim">&larr;</button>
        <h2 className="text-xl font-bold">설정</h2>
      </div>

      {/* Theme */}
      <div className="bg-bg-card rounded-2xl p-4 mb-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium">테마</h3>
            <p className="text-xs text-text-dim mt-0.5">{theme === 'dark' ? '다크 모드' : '라이트 모드'}</p>
          </div>
          <button
            onClick={onToggleTheme}
            className={`w-12 h-7 rounded-full transition-colors flex items-center px-1 ${theme === 'dark' ? 'bg-bg-hover' : 'bg-accent'}`}
          >
            <div className={`w-5 h-5 rounded-full bg-white transition-transform flex items-center justify-center text-xs ${theme === 'light' ? 'translate-x-5' : ''}`}>
              {theme === 'dark' ? '🌙' : '☀️'}
            </div>
          </button>
        </div>
      </div>

      {/* Nickname */}
      <div className="bg-bg-card rounded-2xl p-4 mb-4">
        <h3 className="text-sm font-medium mb-3">프로필</h3>
        <input
          value={nickname}
          onChange={e => setNickname(e.target.value)}
          placeholder="닉네임"
          className="w-full bg-bg border border-bg-hover/50 rounded-lg px-3 py-2 text-sm"
        />
      </div>

      {/* AI Config */}
      <div className="bg-bg-card rounded-2xl p-4 mb-4">
        <h3 className="text-sm font-medium mb-3">AI 설정 (PDF 문제 생성용)</h3>

        <div className="space-y-3">
          <div>
            <label className="text-xs text-text-dim block mb-1">제공자</label>
            <div className="flex gap-2">
              {['openai', 'claude', 'custom'].map(p => (
                <button
                  key={p}
                  onClick={() => handleProviderChange(p)}
                  className={`px-3 py-1.5 rounded-lg text-xs ${aiConfig.provider === p ? 'bg-primary-light text-white' : 'bg-bg text-text-dim'}`}
                >
                  {p === 'openai' ? 'OpenAI' : p === 'claude' ? 'Claude' : '커스텀'}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs text-text-dim block mb-1">API URL</label>
            <input
              value={aiConfig.apiUrl}
              onChange={e => setAiConfig(prev => ({ ...prev, apiUrl: e.target.value }))}
              className="w-full bg-bg border border-bg-hover/50 rounded-lg px-3 py-2 text-xs font-mono"
              placeholder="https://api.example.com/v1/chat/completions"
            />
          </div>

          <div>
            <label className="text-xs text-text-dim block mb-1">API Key</label>
            <input
              type="password"
              value={aiConfig.apiKey}
              onChange={e => setAiConfig(prev => ({ ...prev, apiKey: e.target.value }))}
              className="w-full bg-bg border border-bg-hover/50 rounded-lg px-3 py-2 text-xs font-mono"
              placeholder="sk-..."
            />
          </div>

          <div>
            <label className="text-xs text-text-dim block mb-1">모델</label>
            <input
              value={aiConfig.model}
              onChange={e => setAiConfig(prev => ({ ...prev, model: e.target.value }))}
              className="w-full bg-bg border border-bg-hover/50 rounded-lg px-3 py-2 text-xs font-mono"
              placeholder="gpt-4o-mini"
            />
          </div>
        </div>
      </div>

      <button
        onClick={handleSave}
        className={`w-full py-3 rounded-xl text-sm font-medium mb-6 ${saved ? 'bg-correct text-white' : 'bg-primary-light text-white'}`}
      >
        {saved ? '저장됨 ✓' : '저장'}
      </button>

      {/* Admin */}
      <button
        onClick={onNavigateAdmin}
        className="w-full py-3 bg-bg-card border border-bg-hover/50 rounded-xl text-sm mb-4"
      >
        관리자 페이지
      </button>

      {/* Data management */}
      <div className="bg-bg-card rounded-2xl p-4 space-y-2">
        <h3 className="text-sm font-medium mb-2">데이터 관리</h3>
        <button onClick={onClearStats} className="w-full py-2 bg-wrong/10 text-wrong rounded-lg text-sm">통계 초기화</button>
        <button onClick={onClearWrongNotes} className="w-full py-2 bg-wrong/10 text-wrong rounded-lg text-sm">오답노트 초기화</button>
      </div>
    </div>
  );
}
