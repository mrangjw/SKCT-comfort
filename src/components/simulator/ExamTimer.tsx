import { useState, useEffect, useRef, useCallback } from 'react';

const PRESETS = [
  { label: '5분', value: 5 * 60 },
  { label: '15분', value: 15 * 60 },
  { label: '100분', value: 100 * 60 },
];

export default function ExamTimer() {
  const [totalSeconds, setTotalSeconds] = useState(100 * 60);
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval>>(undefined);

  const start = useCallback(() => {
    if (elapsed >= totalSeconds) setElapsed(0);
    setRunning(true);
  }, [elapsed, totalSeconds]);

  const reset = useCallback(() => {
    setRunning(false);
    setElapsed(0);
  }, []);

  useEffect(() => {
    if (!running) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    intervalRef.current = setInterval(() => {
      setElapsed(prev => {
        if (prev + 1 >= totalSeconds) {
          setRunning(false);
          return totalSeconds;
        }
        return prev + 1;
      });
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running, totalSeconds]);

  const mins = Math.floor(elapsed / 60);
  const secs = elapsed % 60;
  const totalMins = Math.floor(totalSeconds / 60);
  const pad = (n: number) => String(n).padStart(2, '0');
  const timeUp = elapsed >= totalSeconds && totalSeconds > 0;

  return (
    <div className="bg-white rounded-lg p-3">
      {/* Preset dropdown */}
      <div className="flex items-center justify-end mb-2">
        <select
          value={totalSeconds}
          onChange={e => {
            setTotalSeconds(Number(e.target.value));
            setElapsed(0);
            setRunning(false);
          }}
          className="bg-gray-100 border border-gray-300 rounded-lg px-2 py-1 text-sm text-gray-700 focus:outline-none"
        >
          {PRESETS.map(p => (
            <option key={p.value} value={p.value}>{p.label}</option>
          ))}
        </select>
      </div>

      {/* Timer display */}
      <div className={`text-center mb-3 ${timeUp ? 'text-red-600' : 'text-gray-800'}`}>
        <span className="text-3xl font-bold font-mono">
          {pad(mins)}분 {pad(secs)}초
        </span>
        <span className="text-lg text-gray-500 ml-1">/ {totalMins}분</span>
      </div>

      {/* Buttons */}
      <div className="flex gap-2 justify-center">
        <button
          onClick={running ? () => setRunning(false) : start}
          className={`px-5 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            running
              ? 'bg-amber-500 text-white hover:bg-amber-600'
              : 'bg-emerald-600 text-white hover:bg-emerald-700'
          }`}
        >
          {running ? '일시정지' : '시작'}
        </button>
        <button
          onClick={reset}
          className="px-5 py-1.5 bg-gray-500 text-white rounded-lg text-sm font-medium hover:bg-gray-600 transition-colors"
        >
          리셋
        </button>
      </div>
    </div>
  );
}
