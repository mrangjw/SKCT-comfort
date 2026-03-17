import { useState, useEffect } from 'react';

const STORAGE_KEY = 'skct-exam-tutorial-shown';

const STEPS = [
  {
    icon: '📄',
    title: 'PDF 업로드',
    desc: '왼쪽 패널에서 시험 문제 PDF를 업로드하세요.\nCtrl + / - 로 확대·축소, Ctrl + 0 으로 원본 크기로 복원할 수 있습니다.',
  },
  {
    icon: '📋',
    title: 'OMR 답안지',
    desc: '가운데 OMR에서 답을 마킹하세요.\n채점하기 버튼으로 정답을 입력하면 자동 채점됩니다.',
  },
  {
    icon: '⏱️',
    title: '타이머',
    desc: '5분 / 15분 / 100분 중 선택하여 시험 시간을 설정할 수 있습니다.',
  },
  {
    icon: '📝',
    title: '메모장 / 그림판',
    desc: '메모장에서 텍스트를 입력하거나,\n그림판에서 마우스로 메모를 작성할 수 있습니다.',
  },
  {
    icon: '🧮',
    title: '계산기',
    desc: '기본 연산과 괄호를 지원하는 계산기입니다.\n키보드 입력도 사용 가능합니다.',
  },
];

interface Props {
  onClose: () => void;
}

export default function Tutorial({ onClose }: Props) {
  const [step, setStep] = useState(0);
  const [show, setShow] = useState(false);

  useEffect(() => {
    const shown = localStorage.getItem(STORAGE_KEY);
    if (!shown) {
      setShow(true);
    }
  }, []);

  const handleClose = () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setShow(false);
    onClose();
  };

  if (!show) return null;

  const current = STEPS[step];

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60]">
      <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl">
        {/* Icon */}
        <div className="text-5xl text-center mb-4">{current.icon}</div>

        {/* Title */}
        <h2 className="text-xl font-bold text-gray-800 text-center mb-3">{current.title}</h2>

        {/* Description */}
        <p className="text-gray-600 text-center text-sm leading-relaxed whitespace-pre-line mb-6">
          {current.desc}
        </p>

        {/* Progress dots */}
        <div className="flex justify-center gap-1.5 mb-6">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full transition-colors ${
                i === step ? 'bg-emerald-600' : 'bg-gray-300'
              }`}
            />
          ))}
        </div>

        {/* Buttons */}
        <div className="flex gap-3">
          {step > 0 && (
            <button
              onClick={() => setStep(prev => prev - 1)}
              className="flex-1 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-300 transition-colors"
            >
              이전
            </button>
          )}
          {step < STEPS.length - 1 ? (
            <>
              <button
                onClick={handleClose}
                className="flex-1 py-2 bg-gray-100 text-gray-500 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
              >
                건너뛰기
              </button>
              <button
                onClick={() => setStep(prev => prev + 1)}
                className="flex-1 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors"
              >
                다음
              </button>
            </>
          ) : (
            <button
              onClick={handleClose}
              className="flex-1 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors"
            >
              시작하기
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function resetTutorial() {
  localStorage.removeItem(STORAGE_KEY);
}
