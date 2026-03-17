import { useState } from 'react';

interface Props {
  onLogin: (name: string, className: string) => Promise<void>;
}

// 한글 이름: 2~5자, 한글만 허용
const NAME_REGEX = /^[가-힣]{2,5}$/;
// 반: 한글/영문/숫자/공백 포함, 2자 이상, 숫자 최소 1개 포함
const CLASS_REGEX = /^(?=.*\d)[가-힣a-zA-Z0-9\s]{2,20}$/;

function validateName(name: string): string | null {
  const trimmed = name.trim();
  if (!trimmed) return '이름을 입력해주세요';
  if (trimmed.length < 2) return '이름은 2자 이상이어야 합니다';
  if (trimmed.length > 5) return '이름은 5자 이하여야 합니다';
  if (!NAME_REGEX.test(trimmed)) return '한글 실명을 입력해주세요';
  return null;
}

function validateClass(className: string): string | null {
  const trimmed = className.trim();
  if (!trimmed) return '반을 입력해주세요';
  if (trimmed.length < 2) return '반 이름은 2자 이상이어야 합니다';
  if (!CLASS_REGEX.test(trimmed)) return '올바른 반 이름을 입력해주세요 (예: Cloud 1반)';
  return null;
}

export default function Login({ onLogin }: Props) {
  const [name, setName] = useState('');
  const [className, setClassName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [nameError, setNameError] = useState('');
  const [classError, setClassError] = useState('');

  const handleNameChange = (val: string) => {
    setName(val);
    if (nameError) setNameError('');
  };

  const handleClassChange = (val: string) => {
    setClassName(val);
    if (classError) setClassError('');
  };

  const handleSubmit = async () => {
    const nErr = validateName(name);
    const cErr = validateClass(className);
    setNameError(nErr || '');
    setClassError(cErr || '');
    if (nErr || cErr) return;

    setLoading(true);
    setError('');
    try {
      await onLogin(name.trim(), className.trim());
    } catch {
      setError('로그인에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        {/* Title */}
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold mb-2">
            <span className="text-primary-light">SKCT</span> 인지검사
          </h1>
          <p className="text-text-dim text-sm">SK 종합역량검사 연습</p>
        </div>

        {/* Form */}
        <div className="bg-bg-card rounded-2xl p-6 space-y-4">
          <div>
            <label className="text-xs text-text-dim block mb-1.5">이름 (한글 실명)</label>
            <input
              value={name}
              onChange={e => handleNameChange(e.target.value)}
              placeholder="홍길동"
              className={`w-full bg-bg border rounded-lg px-4 py-3 text-sm ${
                nameError ? 'border-wrong' : 'border-bg-hover/50'
              }`}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              autoFocus
              maxLength={5}
            />
            {nameError && <p className="text-wrong text-xs mt-1">{nameError}</p>}
          </div>

          <div>
            <label className="text-xs text-text-dim block mb-1.5">반</label>
            <input
              value={className}
              onChange={e => handleClassChange(e.target.value)}
              placeholder="Cloud 1반"
              className={`w-full bg-bg border rounded-lg px-4 py-3 text-sm ${
                classError ? 'border-wrong' : 'border-bg-hover/50'
              }`}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              maxLength={20}
            />
            {classError && <p className="text-wrong text-xs mt-1">{classError}</p>}
          </div>

          {error && (
            <p className="text-wrong text-xs text-center">{error}</p>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full py-3 bg-primary-light text-white rounded-xl text-sm font-medium disabled:opacity-50"
          >
            {loading ? '접속 중...' : '시작하기'}
          </button>
        </div>

        <p className="text-center text-text-dim text-xs mt-6">
          처음이면 자동으로 계정이 생성됩니다
        </p>
      </div>
    </div>
  );
}
