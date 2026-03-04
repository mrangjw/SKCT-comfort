import { useState, useRef } from 'react';
import type { Question, Section } from '../types';
import { loadAIConfig, generateQuestions } from '../lib/ai';

interface Props {
  onBack: () => void;
  onQuestionsGenerated: (questions: Question[]) => void;
}

export default function PDFGenerator({ onBack, onQuestionsGenerated }: Props) {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState('');
  const [section, setSection] = useState<Section | ''>('');
  const [count, setCount] = useState(5);
  const fileRef = useRef<HTMLInputElement>(null);

  const handlePDF = async (file: File) => {
    setLoading(true);
    setProgress('PDF 로딩 중...');
    setError('');

    try {
      const pdfjsLib = await import('pdfjs-dist');
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let fullText = '';

      for (let i = 1; i <= pdf.numPages; i++) {
        setProgress(`페이지 ${i}/${pdf.numPages} 읽는 중...`);
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        const pageText = content.items.map((item: any) => item.str).join(' ');
        fullText += pageText + '\n\n';

        // 텍스트가 충분하면 중단 (AI 컨텍스트 제한 고려)
        if (fullText.length > 50000) {
          setProgress(`텍스트 50,000자 수집 완료 (${i}/${pdf.numPages} 페이지)`);
          break;
        }
      }

      setText(fullText.trim());
      setProgress('PDF 텍스트 추출 완료');
    } catch (err) {
      setError('PDF 읽기 실패: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    const config = loadAIConfig();
    if (!config || !config.apiKey) {
      setError('설정에서 AI API 키를 먼저 입력해주세요');
      return;
    }
    if (!text.trim()) {
      setError('텍스트를 입력하거나 PDF를 업로드해주세요');
      return;
    }

    setLoading(true);
    setProgress('AI가 문제를 생성하는 중...');
    setError('');

    try {
      const raw = await generateQuestions(config, text, section || undefined, count);
      const questions: Question[] = (raw as any[]).map((q, i) => ({
        id: `ai-${Date.now()}-${i}`,
        section: (q.section || section || 'language') as Section,
        type: q.type || 'AI 생성',
        passage: q.passage,
        question: q.question,
        table: q.table,
        chart: q.chart,
        options: q.options,
        answer: q.answer,
        explanation: q.explanation,
        difficulty: q.difficulty || 2,
      }));

      onQuestionsGenerated(questions);
      setProgress(`${questions.length}개 문제 생성 완료!`);
    } catch (err) {
      setError('문제 생성 실패: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-dvh px-4 pb-8">
      <div className="pt-4 pb-4 flex items-center gap-3">
        <button onClick={onBack} className="text-text-dim">&larr;</button>
        <h2 className="text-xl font-bold">AI 문제 생성</h2>
      </div>

      {/* PDF Upload */}
      <div className="bg-bg-card rounded-2xl p-4 mb-4">
        <h3 className="text-sm font-medium mb-3">PDF 업로드</h3>
        <input
          ref={fileRef}
          type="file"
          accept=".pdf"
          onChange={e => {
            const f = e.target.files?.[0];
            if (f) handlePDF(f);
          }}
          className="hidden"
        />
        <button
          onClick={() => fileRef.current?.click()}
          disabled={loading}
          className="w-full py-8 border-2 border-dashed border-bg-hover rounded-xl text-center active:bg-bg-hover transition-colors"
        >
          <div className="text-2xl mb-2">📄</div>
          <p className="text-sm text-text-dim">PDF 파일 선택</p>
          <p className="text-xs text-text-dim mt-1">대용량 PDF도 지원 (텍스트 추출)</p>
        </button>
      </div>

      {/* Or text input */}
      <div className="bg-bg-card rounded-2xl p-4 mb-4">
        <h3 className="text-sm font-medium mb-3">또는 텍스트 직접 입력</h3>
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="문제를 만들 텍스트를 입력하세요..."
          className="w-full h-32 bg-bg border border-bg-hover/50 rounded-lg px-3 py-2 text-sm resize-none"
        />
        <p className="text-xs text-text-dim mt-1">{text.length.toLocaleString()}자</p>
      </div>

      {/* Options */}
      <div className="bg-bg-card rounded-2xl p-4 mb-4 space-y-3">
        <div>
          <label className="text-xs text-text-dim block mb-1">영역 (미선택 시 AI가 자동 분류)</label>
          <select
            value={section}
            onChange={e => setSection(e.target.value as Section | '')}
            className="w-full bg-bg border border-bg-hover/50 rounded-lg px-3 py-2 text-sm"
          >
            <option value="">자동 분류</option>
            <option value="language">언어이해</option>
            <option value="data-analysis">자료해석</option>
            <option value="math">창의수리</option>
            <option value="logic">언어추리</option>
            <option value="sequence">수열추리</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-text-dim block mb-1">생성 개수</label>
          <input
            type="range"
            min={1}
            max={20}
            value={count}
            onChange={e => setCount(Number(e.target.value))}
            className="w-full accent-primary-light"
          />
          <span className="text-sm">{count}문제</span>
        </div>
      </div>

      {/* Status */}
      {progress && <p className="text-sm text-primary-light mb-2">{progress}</p>}
      {error && <p className="text-sm text-wrong mb-2">{error}</p>}

      {/* Generate */}
      <button
        onClick={handleGenerate}
        disabled={loading || !text.trim()}
        className={`w-full py-3 rounded-xl text-sm font-medium ${loading ? 'bg-bg-hover text-text-dim' : 'bg-primary-light text-white'}`}
      >
        {loading ? '처리 중...' : '문제 생성'}
      </button>
    </div>
  );
}
