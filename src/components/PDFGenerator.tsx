import { useState, useRef, useEffect } from 'react';
import type { Question, Section } from '../types';
import { loadAIConfig, generateQuestions, generateFromRAG } from '../lib/ai';
import type { RAGChunk } from '../lib/ai';
import { api } from '../lib/api';

interface Props {
  onBack: () => void;
  onQuestionsGenerated: (questions: Question[]) => void;
}

type Mode = 'pdf' | 'rag';

export default function PDFGenerator({ onBack, onQuestionsGenerated }: Props) {
  const [mode, setMode] = useState<Mode>('rag');
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState('');
  const [section, setSection] = useState<Section | ''>('');
  const [count, setCount] = useState(5);
  const fileRef = useRef<HTMLInputElement>(null);

  // RAG state
  const [ragAvailable, setRagAvailable] = useState<boolean | null>(null);
  const [ragTotalChunks, setRagTotalChunks] = useState(0);
  const [ragQuery, setRagQuery] = useState('');
  const [ragChunks, setRagChunks] = useState<RAGChunk[]>([]);
  const [showChunks, setShowChunks] = useState(false);

  useEffect(() => {
    api.ragStatus().then((data) => {
      if (data) {
        setRagAvailable(data.available);
        setRagTotalChunks(data.total_chunks || 0);
      } else {
        setRagAvailable(false);
      }
    });
  }, []);

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

        if (fullText.length > 50000) {
          setProgress(`텍스트 50,000자 수집 완료 (${i}/${pdf.numPages} 페이지)`);
          break;
        }
      }

      const extracted = fullText.trim();
      setText(extracted);
      if (!extracted) {
        setError('PDF에서 텍스트를 추출할 수 없습니다. 스캔/이미지 기반 PDF는 지원되지 않습니다. 텍스트가 포함된 PDF를 사용하거나, 텍스트를 직접 입력해주세요.');
        setProgress('');
      } else {
        setProgress(`PDF 텍스트 추출 완료 (${extracted.length.toLocaleString()}자)`);
      }
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
      const questions = mapToQuestions(raw);
      onQuestionsGenerated(questions);
      setProgress(`${questions.length}개 문제 생성 완료!`);
    } catch (err) {
      setError('문제 생성 실패: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setLoading(false);
    }
  };

  const handleRAGSearch = async () => {
    if (!ragQuery.trim()) {
      setError('검색할 주제/키워드를 입력해주세요');
      return;
    }

    setLoading(true);
    setProgress('교재에서 관련 내용 검색 중...');
    setError('');
    setRagChunks([]);

    try {
      const data = await api.ragSearch(ragQuery, section || undefined, 8);
      if (!data || !data.chunks) {
        setError('검색 결과가 없습니다');
        return;
      }
      setRagChunks(data.chunks);
      setProgress(`${data.chunks.length}개 관련 내용 발견`);
      if (data.chunks.length > 0) {
        setShowChunks(true);
      }
    } catch (err) {
      setError('검색 실패: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setLoading(false);
    }
  };

  const handleRAGGenerate = async () => {
    const config = loadAIConfig();
    if (!config || !config.apiKey) {
      setError('설정에서 AI API 키를 먼저 입력해주세요');
      return;
    }
    if (ragChunks.length === 0) {
      setError('먼저 교재에서 관련 내용을 검색해주세요');
      return;
    }

    setLoading(true);
    setProgress('교재 내용을 기반으로 문제 생성 중...');
    setError('');

    try {
      const raw = await generateFromRAG(config, ragChunks, ragQuery, section || undefined, count);
      const questions = mapToQuestions(raw);
      onQuestionsGenerated(questions);
      setProgress(`${questions.length}개 문제 생성 완료!`);
    } catch (err) {
      setError('문제 생성 실패: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setLoading(false);
    }
  };

  function resolveAnswer(answer: unknown, options: string[]): number {
    // 1) 텍스트 매칭: answer가 options 중 하나와 일치하면 그 인덱스
    if (typeof answer === 'string') {
      const idx = options.findIndex(o => o.trim() === answer.trim());
      if (idx !== -1) return idx;
    }
    // 2) 숫자인 경우 유효한 인덱스면 사용
    const num = Number(answer);
    if (!isNaN(num) && num >= 0 && num < options.length) return num;
    // 3) 1-indexed일 수 있으므로 -1 시도
    if (!isNaN(num) && num >= 1 && num <= options.length) return num - 1;
    return 0;
  }

  function mapToQuestions(raw: unknown[]): Question[] {
    return (raw as any[]).map((q, i) => ({
      id: `ai-${Date.now()}-${i}`,
      section: (q.section || section || 'language') as Section,
      type: q.type || 'AI 생성',
      passage: q.passage,
      question: q.question,
      table: q.table,
      chart: q.chart,
      options: q.options,
      answer: resolveAnswer(q.answer, q.options || []),
      explanation: q.explanation,
      difficulty: q.difficulty || 2,
    }));
  }

  const SECTION_NAMES: Record<string, string> = {
    language: '언어이해',
    'data-analysis': '자료해석',
    math: '창의수리',
    logic: '언어추리',
    sequence: '수열추리',
  };

  return (
    <div className="min-h-dvh px-4 pb-8">
      <div className="pt-4 pb-4 flex items-center gap-3">
        <button onClick={onBack} className="text-text-dim">&larr;</button>
        <h2 className="text-xl font-bold">AI 문제 생성</h2>
      </div>

      {/* Mode Tabs */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => { setMode('rag'); setError(''); }}
          className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors ${
            mode === 'rag' ? 'bg-primary-light text-white' : 'bg-bg-card text-text-dim'
          }`}
        >
          교재 기반
        </button>
        <button
          onClick={() => { setMode('pdf'); setError(''); }}
          className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors ${
            mode === 'pdf' ? 'bg-primary-light text-white' : 'bg-bg-card text-text-dim'
          }`}
        >
          PDF / 텍스트
        </button>
      </div>

      {mode === 'rag' ? (
        <>
          {/* RAG Mode */}
          <div className="bg-bg-card rounded-2xl p-4 mb-4">
            <div className="flex items-center gap-2 mb-3">
              <h3 className="text-sm font-medium">교재 기반 문제 생성</h3>
              {ragAvailable === true && (
                <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full">
                  {ragTotalChunks}개 청크 준비됨
                </span>
              )}
              {ragAvailable === false && (
                <span className="text-xs bg-wrong/20 text-wrong px-2 py-0.5 rounded-full">
                  데이터 없음
                </span>
              )}
              {ragAvailable === null && (
                <span className="text-xs bg-bg-hover text-text-dim px-2 py-0.5 rounded-full">
                  확인 중...
                </span>
              )}
            </div>
            <p className="text-xs text-text-dim mb-3">
              해커스 SKCT 교재에서 관련 내용을 검색하여 문제를 생성합니다
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={ragQuery}
                onChange={e => setRagQuery(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !loading) handleRAGSearch(); }}
                placeholder="주제/키워드 입력 (예: 슈링크플레이션, 명제 추리)"
                className="flex-1 bg-bg border border-bg-hover/50 rounded-lg px-3 py-2.5 text-sm"
                disabled={!ragAvailable || loading}
              />
              <button
                onClick={handleRAGSearch}
                disabled={!ragAvailable || loading || !ragQuery.trim()}
                className="px-4 py-2.5 bg-primary-light text-white rounded-lg text-sm font-medium disabled:opacity-40 shrink-0"
              >
                검색
              </button>
            </div>
          </div>

          {/* Search Results */}
          {ragChunks.length > 0 && (
            <div className="bg-bg-card rounded-2xl p-4 mb-4">
              <button
                onClick={() => setShowChunks(!showChunks)}
                className="flex items-center justify-between w-full text-sm font-medium"
              >
                <span>검색 결과 ({ragChunks.length}개)</span>
                <span className="text-text-dim text-xs">{showChunks ? '접기' : '펼치기'}</span>
              </button>
              {showChunks && (
                <div className="mt-3 space-y-2 max-h-60 overflow-y-auto">
                  {ragChunks.map((chunk, i) => (
                    <div key={i} className="bg-bg rounded-lg p-3 text-xs">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-text-dim">p.{chunk.page || '?'}</span>
                        {chunk.section && (
                          <span className="bg-primary-light/20 text-primary-light px-1.5 py-0.5 rounded">
                            {SECTION_NAMES[chunk.section] || chunk.section}
                          </span>
                        )}
                        <span className="text-text-dim ml-auto">점수: {chunk.score.toFixed(2)}</span>
                      </div>
                      <p className="text-text-dim leading-relaxed line-clamp-4">{chunk.text}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      ) : (
        <div className="bg-bg-card rounded-2xl p-6 mb-4 text-center">
          <div className="text-3xl mb-3">🚧</div>
          <h3 className="text-sm font-medium mb-1">개발 중입니다</h3>
          <p className="text-xs text-text-dim">PDF / 텍스트 기반 문제 생성은 준비 중입니다.<br/>교재 기반 모드를 이용해주세요.</p>
        </div>
      )}

      {/* Options (shared) */}
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

      {/* Generate Button */}
      {mode === 'rag' && (
        <button
          onClick={handleRAGGenerate}
          disabled={loading || ragChunks.length === 0}
          className={`w-full py-3 rounded-xl text-sm font-medium ${
            loading || ragChunks.length === 0 ? 'bg-bg-hover text-text-dim' : 'bg-primary-light text-white'
          }`}
        >
          {loading ? '처리 중...' : ragChunks.length === 0 ? '먼저 교재에서 검색하세요' : '교재 기반 문제 생성'}
        </button>
      )}
    </div>
  );
}
