import { useState, useRef, useCallback, useEffect } from 'react';

type Mode = 'text' | 'draw';

export default function MemoPad() {
  const [mode, setMode] = useState<Mode>('text');
  const [text, setText] = useState('');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const drawingRef = useRef(false);
  const lastPosRef = useRef({ x: 0, y: 0 });

  // Setup canvas size
  useEffect(() => {
    if (mode !== 'draw') return;
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const rect = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.scale(dpr, dpr);
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, rect.width, rect.height);
    }
  }, [mode]);

  const getPos = useCallback((e: React.MouseEvent | MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }, []);

  const startDraw = useCallback((e: React.MouseEvent) => {
    drawingRef.current = true;
    lastPosRef.current = getPos(e);
  }, [getPos]);

  const draw = useCallback((e: React.MouseEvent) => {
    if (!drawingRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(lastPosRef.current.x, lastPosRef.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.stroke();
    lastPosRef.current = pos;
  }, [getPos]);

  const stopDraw = useCallback(() => {
    drawingRef.current = false;
  }, []);

  // Touch support for drawing
  const getTouchPos = useCallback((e: React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    return { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
  }, []);

  const startTouchDraw = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    drawingRef.current = true;
    lastPosRef.current = getTouchPos(e);
  }, [getTouchPos]);

  const touchDraw = useCallback((e: React.TouchEvent) => {
    if (!drawingRef.current) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const pos = getTouchPos(e);
    ctx.beginPath();
    ctx.moveTo(lastPosRef.current.x, lastPosRef.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.stroke();
    lastPosRef.current = pos;
  }, [getTouchPos]);

  const clearAll = useCallback(() => {
    if (mode === 'text') {
      setText('');
    } else {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const rect = canvas.getBoundingClientRect();
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, rect.width, rect.height);
    }
  }, [mode]);

  return (
    <div className="bg-white rounded-lg p-3 flex flex-col flex-1 min-h-0">
      {/* Tabs */}
      <div className="flex items-center gap-1 mb-2">
        <button
          onClick={() => setMode('text')}
          className={`flex-1 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            mode === 'text'
              ? 'bg-emerald-600 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          메모장
        </button>
        <button
          onClick={() => setMode('draw')}
          className={`flex-1 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            mode === 'draw'
              ? 'bg-emerald-600 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          그림판
        </button>
      </div>

      {/* Clear button */}
      <div className="flex justify-end mb-2">
        <button
          onClick={clearAll}
          className="px-3 py-1 bg-gray-700 text-white text-xs rounded-lg hover:bg-gray-600 transition-colors"
        >
          전체 지우기
        </button>
      </div>

      {/* Content */}
      <div ref={containerRef} className="flex-1 min-h-0 relative">
        {mode === 'text' ? (
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="메모를 입력하세요..."
            className="selectable w-full h-full bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm text-gray-800 placeholder-gray-400 resize-none focus:outline-none focus:border-gray-400"
          />
        ) : (
          <canvas
            ref={canvasRef}
            onMouseDown={startDraw}
            onMouseMove={draw}
            onMouseUp={stopDraw}
            onMouseLeave={stopDraw}
            onTouchStart={startTouchDraw}
            onTouchMove={touchDraw}
            onTouchEnd={stopDraw}
            className="w-full h-full border border-gray-200 rounded-lg cursor-crosshair"
            style={{ touchAction: 'none' }}
          />
        )}
      </div>
    </div>
  );
}
