import { useState } from 'react';
import { api } from '../lib/api';

interface Props {
  onBack: () => void;
  onNavigateFeedback?: () => void;
}

interface UserData {
  userId: string;
  nickname: string;
  totalSolved: number;
  lastActive: string;
}

interface UsageData {
  totalUsers: number;
  totalSessions: number;
  totalQuestions: number;
  bySection: Record<string, number>;
  recentSessions: { date: string; count: number }[];
}

export default function Admin({ onBack, onNavigateFeedback }: Props) {
  const [password, setPassword] = useState('');
  const [authenticated, setAuthenticated] = useState(false);
  const [users, setUsers] = useState<UserData[]>([]);
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    setError('');
    try {
      const [usersRes, usageRes] = await Promise.all([
        api.adminGetUsers(password),
        api.adminGetUsage(password),
      ]);
      if (!usersRes || !usageRes) {
        setError('API 연결 실패 또는 비밀번호 오류');
        return;
      }
      setUsers(usersRes.users || []);
      setUsage(usageRes);
      setAuthenticated(true);
    } catch {
      setError('인증 실패');
    } finally {
      setLoading(false);
    }
  };

  if (!authenticated) {
    return (
      <div className="min-h-dvh px-4 pb-8">
        <div className="pt-4 pb-4 flex items-center gap-3">
          <button onClick={onBack} className="text-text-dim">&larr;</button>
          <h2 className="text-xl font-bold">관리자</h2>
        </div>
        <div className="bg-bg-card rounded-2xl p-4 mt-10">
          <h3 className="text-sm font-medium mb-3">관리자 인증</h3>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="관리자 비밀번호"
            className="w-full bg-bg border border-bg-hover/50 rounded-lg px-3 py-2 text-sm mb-3"
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
          />
          {error && <p className="text-wrong text-xs mb-2">{error}</p>}
          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full py-2.5 bg-primary-light text-white rounded-lg text-sm font-medium"
          >
            {loading ? '확인 중...' : '로그인'}
          </button>
          <p className="text-xs text-text-dim mt-3 text-center">
            * 백엔드 API가 설정되어 있어야 합니다
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh px-4 pb-8">
      <div className="pt-4 pb-4 flex items-center gap-3">
        <button onClick={onBack} className="text-text-dim">&larr;</button>
        <h2 className="text-xl font-bold">관리자 대시보드</h2>
      </div>

      {/* Feedback Management — 최상단 */}
      {onNavigateFeedback && (
        <button
          onClick={onNavigateFeedback}
          className="w-full py-3 bg-primary-light text-white rounded-xl text-sm font-medium mb-4"
        >
          문의 관리
        </button>
      )}

      {/* Summary */}
      {usage && (
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="bg-bg-card rounded-xl p-3 text-center">
            <div className="text-2xl font-bold text-accent">{usage.totalUsers}</div>
            <div className="text-xs text-text-dim">사용자</div>
          </div>
          <div className="bg-bg-card rounded-xl p-3 text-center">
            <div className="text-2xl font-bold text-primary-light">{usage.totalSessions}</div>
            <div className="text-xs text-text-dim">세션</div>
          </div>
          <div className="bg-bg-card rounded-xl p-3 text-center">
            <div className="text-2xl font-bold">{usage.totalQuestions}</div>
            <div className="text-xs text-text-dim">문제 풀이</div>
          </div>
        </div>
      )}

      {/* Users */}
      <div className="bg-bg-card rounded-2xl p-4 mb-4">
        <h3 className="text-sm font-medium mb-3">사용자 목록 ({users.length}명)</h3>
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {users.map(u => (
            <div key={u.userId} className="flex items-center justify-between bg-bg rounded-lg p-2 text-sm">
              <div>
                <span className="font-medium">{u.nickname || '익명'}</span>
                <span className="text-xs text-text-dim ml-2">{u.userId.slice(0, 8)}...</span>
              </div>
              <div className="text-right text-xs text-text-dim">
                <div>{u.totalSolved}문제</div>
                <div>{u.lastActive}</div>
              </div>
            </div>
          ))}
          {users.length === 0 && <p className="text-sm text-text-dim">사용자 없음</p>}
        </div>
      </div>

      {/* Usage by section */}
      {usage && usage.bySection && (
        <div className="bg-bg-card rounded-2xl p-4">
          <h3 className="text-sm font-medium mb-3">영역별 풀이 수</h3>
          {Object.entries(usage.bySection).map(([section, count]) => (
            <div key={section} className="flex items-center justify-between text-sm py-1">
              <span>{section}</span>
              <span className="text-text-dim">{count}문제</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
