import { useState, useCallback } from 'react';
import PDFViewer from './PDFViewer';
import OMRSheet from './OMRSheet';
import ExamTimer from './ExamTimer';
import MemoPad from './MemoPad';
import Calculator from './Calculator';
import Tutorial, { resetTutorial } from './Tutorial';

interface Props {
  onBack: () => void;
}

export default function ExamSimulator({ onBack }: Props) {
  const [omrVisible, setOmrVisible] = useState(true);
  const [questionCount] = useState(100);

  const toggleOmr = useCallback(() => {
    setOmrVisible(prev => !prev);
  }, []);

  return (
    <div className="fixed inset-0 bg-[#1e293b] flex flex-col z-50">
      {/* Tutorial overlay */}
      <Tutorial onClose={() => {}} />

      {/* Top bar - minimal */}
      <div className="flex items-center justify-between px-4 py-1.5 bg-[#151d2b] shrink-0">
        <button
          onClick={onBack}
          className="text-gray-400 hover:text-white text-sm transition-colors flex items-center gap-1"
        >
          <span>←</span>
          <span>나가기</span>
        </button>
        <span className="text-gray-300 text-sm font-medium">SKCT 시험 시뮬레이션</span>
        <button
          onClick={() => {
            resetTutorial();
            window.location.reload();
          }}
          className="w-7 h-7 bg-red-500 text-white rounded-full text-sm font-bold hover:bg-red-600 transition-colors flex items-center justify-center"
        >
          ?
        </button>
      </div>

      {/* Main content - 3 columns */}
      <div className="flex-1 flex gap-3 p-3 min-h-0">
        {/* Left: PDF Viewer - largest */}
        <div
          className={`bg-white rounded-lg overflow-hidden flex flex-col shadow-lg transition-all ${
            omrVisible ? 'flex-[6]' : 'flex-[8]'
          }`}
        >
          <PDFViewer />
        </div>

        {/* Middle: OMR Sheet - compact */}
        {omrVisible && (
          <div className="flex-[2] bg-white rounded-lg overflow-hidden flex flex-col shadow-lg min-w-[220px]">
            <OMRSheet questionCount={questionCount} />
          </div>
        )}

        {/* OMR toggle button - between panels */}
        <button
          onClick={toggleOmr}
          className="bg-gray-600 text-white text-[10px] px-0.5 py-4 rounded hover:bg-gray-500 transition-colors self-center shrink-0"
          style={{ writingMode: 'vertical-rl' }}
        >
          {omrVisible ? '◀ OMR 숨기기' : '▶ OMR 보기'}
        </button>

        {/* Right: Tools */}
        <div className="flex-[3] flex flex-col gap-3 min-h-0">
          <ExamTimer />
          <MemoPad />
          <Calculator />
        </div>
      </div>

      {/* Mobile warning */}
      <div className="hidden max-lg:flex fixed inset-0 bg-[#1e293b] z-[70] items-center justify-center p-8">
        <div className="bg-white rounded-2xl p-8 max-w-sm text-center shadow-2xl">
          <div className="text-4xl mb-4">🖥️</div>
          <h2 className="text-lg font-bold text-gray-800 mb-2">PC에서 이용해주세요</h2>
          <p className="text-sm text-gray-500 mb-6">
            시험 시뮬레이션은 데스크톱 환경에 최적화되어 있습니다.
          </p>
          <button
            onClick={onBack}
            className="px-6 py-2 bg-gray-700 text-white rounded-lg text-sm font-medium hover:bg-gray-600 transition-colors"
          >
            돌아가기
          </button>
        </div>
      </div>
    </div>
  );
}
