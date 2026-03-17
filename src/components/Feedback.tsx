import { useState, useEffect } from 'react';
import { api } from '../lib/api';

interface FeedbackItem {
  id: string;
  userId: string;
  nickname: string;
  questionId?: string;
  type: 'bug' | 'question' | 'suggestion' | 'error-report';
  message: string;
  adminReply?: string;
  status: 'open' | 'resolved';
  createdAt: string;
}

interface Props {
  onBack: () => void;
  isAdmin?: boolean;
}

export default function Feedback({ onBack, isAdmin }: Props) {
  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [type, setType] = useState<FeedbackItem['type']>('question');
  const [message, setMessage] = useState('');
  const [questionId, setQuestionId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');

  useEffect(() => {
    loadFeedback();
  }, []);

  const loadFeedback = async () => {
    setLoading(true);
    const data = await api.getFeedback(isAdmin);
    if (data) setItems(data);
    setLoading(false);
  };

  const handleSubmit = async () => {
    if (!message.trim()) return;
    setSubmitting(true);
    const ok = await api.submitFeedback({ type, message, questionId: questionId || undefined });
    if (ok) {
      setSuccess(true);
      setMessage('');
      setQuestionId('');
      setTimeout(() => setSuccess(false), 2000);
      loadFeedback();
    }
    setSubmitting(false);
  };

  const handleReply = async (feedbackId: string) => {
    if (!replyText.trim()) return;
    await api.replyFeedback(feedbackId, replyText);
    setReplyingTo(null);
    setReplyText('');
    loadFeedback();
  };

  const handleResolve = async (feedbackId: string) => {
    await api.resolveFeedback(feedbackId);
    loadFeedback();
  };

  const typeLabels: Record<string, string> = {
    bug: '버그 신고',
    question: '질문',
    suggestion: '제안',
    'error-report': '문제 오류',
  };

  const typeColors: Record<string, string> = {
    bug: 'bg-wrong/20 text-wrong',
    question: 'bg-primary-light/20 text-primary-light',
    suggestion: 'bg-accent/20 text-accent-dark',
    'error-report': 'bg-warning/20 text-warning',
  };

  return (
    <div className="min-h-dvh px-4 pb-8">
      <div className="pt-4 pb-4 flex items-center gap-3">
        <button onClick={onBack} className="text-text-dim">&larr;</button>
        <h2 className="text-xl font-bold">{isAdmin ? '문의 관리' : '문의하기'}</h2>
      </div>

      {/* Submit form (non-admin only) */}
      {!isAdmin && (
        <div className="bg-bg-card rounded-2xl p-4 mb-6">
          <h3 className="text-sm font-medium mb-3">새 문의</h3>
          <div className="flex gap-1.5 mb-3">
            {(['question', 'bug', 'error-report', 'suggestion'] as const).map(t => (
              <button
                key={t}
                onClick={() => setType(t)}
                className={`px-2.5 py-1 rounded-lg text-xs ${type === t ? typeColors[t] + ' font-medium' : 'bg-bg text-text-dim'}`}
              >
                {typeLabels[t]}
              </button>
            ))}
          </div>
          {type === 'error-report' && (
            <input
              value={questionId}
              onChange={e => setQuestionId(e.target.value)}
              placeholder="문제 ID (예: lang-01-001)"
              className="w-full bg-bg border border-bg-hover/50 rounded-lg px-3 py-2 text-sm mb-2"
            />
          )}
          <textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder="내용을 입력하세요..."
            className="w-full h-24 bg-bg border border-bg-hover/50 rounded-lg px-3 py-2 text-sm resize-none mb-2"
          />
          <button
            onClick={handleSubmit}
            disabled={submitting || !message.trim()}
            className={`w-full py-2.5 rounded-lg text-sm font-medium ${success ? 'bg-correct text-white' : 'bg-primary-light text-white'}`}
          >
            {success ? '전송 완료!' : submitting ? '전송 중...' : '보내기'}
          </button>
        </div>
      )}

      {/* List */}
      {!isAdmin && <h3 className="text-sm font-medium mb-2">내 문의 내역</h3>}
      <div className="space-y-2">
        {loading ? (
          <p className="text-center text-text-dim py-8">불러오는 중...</p>
        ) : items.length === 0 ? (
          <p className="text-center text-text-dim py-8">
            {isAdmin ? '접수된 문의가 없습니다' : '문의 내역이 없습니다'}
          </p>
        ) : items.map(item => (
          <div key={item.id} className="bg-bg-card rounded-xl p-3">
            <div className="flex items-center gap-2 mb-2">
              <span className={`text-[10px] px-1.5 py-0.5 rounded ${typeColors[item.type]}`}>{typeLabels[item.type]}</span>
              {item.adminReply ? (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-correct/20 text-correct">답변 완료</span>
              ) : (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-warning/20 text-warning">대기중</span>
              )}
              {isAdmin && <span className="text-xs text-text-dim ml-auto">{item.nickname || item.userId.slice(0, 8)}</span>}
              <span className={`text-xs text-text-dim ${!isAdmin ? 'ml-auto' : ''}`}>{item.createdAt.slice(0, 10)}</span>
            </div>
            {item.questionId && <p className="text-xs text-text-dim mb-1">문제: {item.questionId}</p>}
            <p className="text-sm">{item.message}</p>

            {/* Admin reply */}
            {item.adminReply && (
              <div className="mt-2 bg-bg rounded-lg p-2 border-l-2 border-primary-light">
                <p className="text-xs text-primary-light mb-0.5">관리자 답변</p>
                <p className="text-sm">{item.adminReply}</p>
              </div>
            )}

            {/* Admin actions */}
            {isAdmin && (
              <div className="mt-2 flex gap-1">
                {replyingTo === item.id ? (
                  <div className="flex-1 flex gap-1">
                    <input
                      value={replyText}
                      onChange={e => setReplyText(e.target.value)}
                      placeholder="답변 입력..."
                      className="flex-1 bg-bg border border-bg-hover/50 rounded px-2 py-1 text-xs"
                      autoFocus
                    />
                    <button onClick={() => handleReply(item.id)} className="px-2 py-1 bg-primary-light text-white rounded text-xs">답변</button>
                    <button onClick={() => setReplyingTo(null)} className="px-2 py-1 bg-bg-hover rounded text-xs">취소</button>
                  </div>
                ) : (
                  <>
                    <button onClick={() => { setReplyingTo(item.id); setReplyText(item.adminReply || ''); }} className="px-2 py-1 bg-bg-hover rounded text-xs">
                      {item.adminReply ? '답변 수정' : '답변'}
                    </button>
                    {item.status === 'open' && (
                      <button onClick={() => handleResolve(item.id)} className="px-2 py-1 bg-correct/20 text-correct rounded text-xs">해결</button>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
