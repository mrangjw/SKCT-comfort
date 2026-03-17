import { useState, useEffect, useCallback } from 'react';

function evaluate(expr: string): string {
  try {
    const sanitized = expr.replace(/×/g, '*').replace(/÷/g, '/');
    // eslint-disable-next-line no-new-func
    const result = new Function(`"use strict"; return (${sanitized})`)();
    if (typeof result === 'number' && isFinite(result)) {
      return String(Math.round(result * 1e12) / 1e12);
    }
    return 'Error';
  } catch {
    return 'Error';
  }
}

export default function Calculator() {
  const [expr, setExpr] = useState('');
  const [result, setResult] = useState('0');
  const [showResult, setShowResult] = useState(true);

  const handle = useCallback((btn: string) => {
    switch (btn) {
      case 'C':
        setExpr('');
        setResult('0');
        setShowResult(true);
        break;
      case 'AC': // backspace
        if (showResult) {
          setExpr('');
          setResult('0');
          setShowResult(true);
        } else {
          setExpr(prev => {
            const next = prev.slice(0, -1);
            if (!next) { setShowResult(true); setResult('0'); }
            return next;
          });
        }
        break;
      case '=': {
        const e = expr || result;
        const val = evaluate(e);
        setResult(val);
        setExpr(val === 'Error' ? '' : val);
        setShowResult(true);
        break;
      }
      case '+/-': {
        if (showResult && result !== '0' && result !== 'Error') {
          const neg = String(-parseFloat(result));
          setResult(neg);
          setExpr(neg);
        }
        break;
      }
      case '%': {
        const e = expr || result;
        const val = evaluate(e);
        if (val !== 'Error') {
          const pct = String(parseFloat(val) / 100);
          setResult(pct);
          setExpr(pct);
          setShowResult(true);
        }
        break;
      }
      default: {
        const isOp = ['+', '-', '×', '÷'].includes(btn);
        if (showResult) {
          if (isOp) {
            setExpr(result + btn);
          } else {
            setExpr(btn === '.' ? '0.' : btn);
          }
          setShowResult(false);
        } else {
          setExpr(prev => prev + btn);
        }
      }
    }
  }, [expr, result, showResult]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'TEXTAREA' || tag === 'INPUT') return;
      const k = e.key;
      if (k >= '0' && k <= '9') handle(k);
      else if (k === '.') handle('.');
      else if (k === '+') handle('+');
      else if (k === '-') handle('-');
      else if (k === '*') handle('×');
      else if (k === '/') { e.preventDefault(); handle('÷'); }
      else if (k === 'Enter' || k === '=') { e.preventDefault(); handle('='); }
      else if (k === 'Backspace') handle('AC');
      else if (k === 'Escape') handle('C');
      else if (k === '(') handle('(');
      else if (k === ')') handle(')');
      else if (k === '%') handle('%');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handle]);

  const display = showResult ? result : expr;

  const rows = [
    ['(', ')', '%', 'C'],
    ['AC', '+/-', '÷', '×'],
    ['7', '8', '9', '-'],
    ['4', '5', '6', '+'],
    ['1', '2', '3', '='],
  ];

  const btnClass = (btn: string) => {
    const isOp = ['÷', '×', '-', '+', '='].includes(btn);
    const isFunc = ['(', ')', '%', 'C', 'AC', '+/-'].includes(btn);
    if (isOp) return 'bg-gray-700 text-white hover:bg-gray-600 active:bg-gray-500';
    if (isFunc) return 'bg-gray-200 text-gray-700 hover:bg-gray-300 active:bg-gray-400';
    return 'bg-gray-100 text-gray-800 hover:bg-gray-200 active:bg-gray-300';
  };

  return (
    <div className="bg-white rounded-lg p-3 flex flex-col flex-1 min-h-0">
      <div className="text-gray-800 font-semibold text-sm mb-2">계산기</div>
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-2 text-right">
        <div className="text-2xl font-mono text-gray-800 truncate selectable min-h-[32px]">
          {display}
        </div>
      </div>
      <div className="space-y-1 flex-1 flex flex-col">
        {rows.map((row, ri) => (
          <div key={ri} className="grid grid-cols-4 gap-1 flex-1">
            {row.map(btn => (
              <button
                key={btn}
                onClick={() => handle(btn)}
                className={`rounded-lg text-sm font-medium transition-colors ${btnClass(btn)}`}
              >
                {btn}
              </button>
            ))}
          </div>
        ))}
        <div className="grid grid-cols-4 gap-1 flex-1">
          <button
            onClick={() => handle('0')}
            className="col-span-2 rounded-lg text-sm font-medium bg-gray-100 text-gray-800 hover:bg-gray-200 active:bg-gray-300"
          >0</button>
          <button
            onClick={() => handle('.')}
            className="rounded-lg text-sm font-medium bg-gray-100 text-gray-800 hover:bg-gray-200 active:bg-gray-300"
          >.</button>
          <div />
        </div>
      </div>
    </div>
  );
}
