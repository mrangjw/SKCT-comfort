import { useState, useRef, useCallback, useEffect, memo } from 'react';

const GAP = 8;
const BUFFER = 3;
const MAX_CONCURRENT = 2; // limit simultaneous renders for heavy PDFs

/* ---- Render semaphore: prevents memory blowup on high-DPI PDFs ---- */
let _active = 0;
const _waiters: (() => void)[] = [];
function acquireSlot(): Promise<void> {
  if (_active < MAX_CONCURRENT) { _active++; return Promise.resolve(); }
  return new Promise<void>(r => _waiters.push(r)).then(() => { _active++; });
}
function releaseSlot() {
  _active--;
  if (_waiters.length > 0) _waiters.shift()!();
}

/* ---- Per-page canvas ---- */
const MAX_RETRIES = 5;

async function renderPage(
  doc: any, pageNum: number, scale: number,
  canvas: HTMLCanvasElement, cancelled: () => boolean,
): Promise<boolean> {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (cancelled()) return false;
    try {
      await acquireSlot();
      if (cancelled()) { releaseSlot(); return false; }

      try {
        const page = await doc.getPage(pageNum);
        if (cancelled()) return false;
        const vp = page.getViewport({ scale });
        canvas.width = vp.width;
        canvas.height = vp.height;
        const ctx = canvas.getContext('2d');
        if (!ctx || cancelled()) return false;
        await page.render({ canvasContext: ctx, viewport: vp }).promise;
        return !cancelled();
      } finally {
        releaseSlot();
      }
    } catch (err) {
      if (cancelled()) return false;
      console.warn(`Page ${pageNum} attempt ${attempt + 1}/${MAX_RETRIES + 1} failed:`, err);
      if (attempt < MAX_RETRIES) {
        await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
      }
    }
  }
  return false;
}

const PageCanvas = memo(function PageCanvas({
  doc, pageNum, scale, width, height,
}: {
  doc: any; pageNum: number; scale: number; width: number; height: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !doc) return;

    setStatus('loading');
    let cancelled = false;

    renderPage(doc, pageNum, scale, canvas, () => cancelled).then(ok => {
      if (cancelled) return;
      setStatus(ok ? 'ok' : 'error');
    });

    return () => { cancelled = true; };
  }, [doc, pageNum, scale, attempt]);

  // Auto-retry on error
  useEffect(() => {
    if (status !== 'error') return;
    const timer = setTimeout(() => setAttempt(a => a + 1), 3000);
    return () => clearTimeout(timer);
  }, [status]);

  return (
    <>
      <canvas ref={canvasRef} className="block" style={{ width, height }} />
      {status !== 'ok' && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-50 text-gray-400 text-xs">
          페이지 {pageNum} 로딩...
        </div>
      )}
    </>
  );
});

/* ---- Main viewer ---- */
export default function PDFViewer() {
  const [numPages, setNumPages] = useState(0);
  const [scale, setScale] = useState(1.0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [pageW, setPageW] = useState(0);
  const [pageH, setPageH] = useState(0);
  const [visStart, setVisStart] = useState(1);
  const [visEnd, setVisEnd] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageInput, setPageInput] = useState('');
  const [pdfDoc, setPdfDoc] = useState<any>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scaleRef = useRef(scale);
  const rafRef = useRef(0);
  const anchorPageRef = useRef(0); // page to preserve on scale change
  scaleRef.current = scale;

  const totalH = numPages > 0 ? numPages * pageH + (numPages - 1) * GAP : 0;

  // --- Scroll → visible range + current page ---
  const calcRange = useCallback(() => {
    const c = containerRef.current;
    if (!c || pageH === 0 || numPages === 0) return;
    const unit = pageH + GAP;
    const s = Math.max(1, Math.floor(c.scrollTop / unit) + 1 - BUFFER);
    const e = Math.min(numPages, Math.ceil((c.scrollTop + c.clientHeight) / unit) + BUFFER);
    const cur = Math.max(1, Math.min(numPages, Math.floor((c.scrollTop + c.clientHeight / 2) / unit) + 1));
    setVisStart(prev => prev === s ? prev : s);
    setVisEnd(prev => prev === e ? prev : e);
    setCurrentPage(prev => prev === cur ? prev : cur);
  }, [pageH, numPages]);

  const onScroll = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(calcRange);
  }, [calcRange]);

  // --- Recalc visible range after layout changes, preserve page on zoom ---
  useEffect(() => {
    if (pageH > 0 && numPages > 0) {
      const c = containerRef.current;
      if (c && anchorPageRef.current > 0) {
        c.scrollTop = (anchorPageRef.current - 1) * (pageH + GAP);
        anchorPageRef.current = 0;
      }
      calcRange();
    }
  }, [pageH, numPages, calcRange]);

  // --- Jump to page ---
  const jumpToPage = useCallback((page: number) => {
    const c = containerRef.current;
    if (!c || pageH === 0 || numPages === 0) return;
    const target = Math.max(1, Math.min(numPages, page));
    c.scrollTop = (target - 1) * (pageH + GAP);
  }, [pageH, numPages]);

  const handlePageSubmit = useCallback(() => {
    const p = parseInt(pageInput);
    if (p >= 1 && p <= numPages) jumpToPage(p);
    setPageInput('');
  }, [pageInput, numPages, jumpToPage]);

  // --- Scale change → recalc dims ---
  useEffect(() => {
    if (!pdfDoc) return;
    (async () => {
      const page = await pdfDoc.getPage(1);
      const vp = page.getViewport({ scale });
      setPageW(vp.width);
      setPageH(vp.height);
    })();
  }, [scale, pdfDoc]);

  // --- File upload ---
  const handleUpload = useCallback(async (file: File) => {
    setLoading(true);
    setError('');
    try {
      const pdfjsLib = await import('pdfjs-dist');
      const cdnBase = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}`;
      pdfjsLib.GlobalWorkerOptions.workerSrc = `${cdnBase}/build/pdf.worker.min.mjs`;

      const url = URL.createObjectURL(file);
      const doc = await pdfjsLib.getDocument({
        url,
        cMapUrl: `${cdnBase}/cmaps/`,
        cMapPacked: true,
        standardFontDataUrl: `${cdnBase}/standard_fonts/`,
        wasmUrl: `${cdnBase}/wasm/`,
      }).promise;

      const page = await doc.getPage(1);
      const vp = page.getViewport({ scale: scaleRef.current });

      setPdfDoc(doc);
      setPageW(vp.width);
      setPageH(vp.height);
      setNumPages(doc.numPages);
      setCurrentPage(1);
      setVisStart(1);
      setVisEnd(Math.min(doc.numPages, 1 + BUFFER * 2));

      if (containerRef.current) containerRef.current.scrollTop = 0;
    } catch (err) {
      console.error('PDF load error:', err);
      setError('PDF 로드에 실패했습니다. 다른 파일을 시도해주세요.');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf') handleUpload(file);
  }, [handleUpload]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type === 'application/pdf') handleUpload(file);
  }, [handleUpload]);

  // --- Zoom helper: anchor current page before scale change ---
  const zoom = useCallback((updater: (prev: number) => number) => {
    anchorPageRef.current = currentPage;
    setScale(updater);
  }, [currentPage]);

  // --- Keyboard zoom ---
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      if (e.key === '=' || e.key === '+') {
        e.preventDefault();
        zoom(prev => Math.min(3, +(prev + 0.1).toFixed(1)));
      } else if (e.key === '-') {
        e.preventDefault();
        zoom(prev => Math.max(0.5, +(prev - 0.1).toFixed(1)));
      } else if (e.key === '0') {
        e.preventDefault();
        zoom(() => 1.0);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [zoom]);

  const zoomPct = Math.round(scale * 100);

  // --- Build visible page elements ---
  const pages: React.ReactNode[] = [];
  if (pdfDoc && pageH > 0) {
    for (let i = visStart; i <= visEnd; i++) {
      if (i < 1) continue;
      const top = (i - 1) * (pageH + GAP);
      pages.push(
        <div
          key={i}
          className="absolute left-1/2 -translate-x-1/2 bg-white shadow-md"
          style={{ top, width: pageW, height: pageH }}
        >
          <PageCanvas
            doc={pdfDoc}
            pageNum={i}
            scale={scale}
            width={pageW}
            height={pageH}
          />
        </div>,
      );
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-200 shrink-0">
        <span className="font-bold text-gray-800">문제</span>
        <div className="flex items-center gap-2">
          {numPages > 0 && (
            <>
              {/* Page navigator */}
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  inputMode="numeric"
                  value={pageInput}
                  onChange={e => setPageInput(e.target.value.replace(/\D/g, ''))}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handlePageSubmit();
                  }}
                  onBlur={handlePageSubmit}
                  placeholder={String(currentPage)}
                  className="selectable w-10 text-center text-xs bg-gray-100 border border-gray-200 rounded px-1 py-0.5 focus:outline-none focus:border-gray-400"
                />
                <span className="text-xs text-gray-400">/ {numPages}</span>
              </div>
              {/* Zoom controls */}
              <div className="flex items-center gap-1 ml-1">
                <button
                  onClick={() => zoom(prev => Math.max(0.5, +(prev - 0.1).toFixed(1)))}
                  className="px-2 py-0.5 bg-gray-100 rounded text-sm text-gray-600 hover:bg-gray-200"
                >-</button>
                <span className="text-xs text-gray-500 w-10 text-center">{zoomPct}%</span>
                <button
                  onClick={() => zoom(prev => Math.min(3, +(prev + 0.1).toFixed(1)))}
                  className="px-2 py-0.5 bg-gray-100 rounded text-sm text-gray-600 hover:bg-gray-200"
                >+</button>
              </div>
            </>
          )}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-1 bg-gray-700 text-white text-sm rounded-lg hover:bg-gray-600 transition-colors"
          >
            PDF 업로드
          </button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>

      {/* Content */}
      <div
        ref={containerRef}
        className="flex-1 overflow-auto"
        onScroll={onScroll}
        onDragOver={e => e.preventDefault()}
        onDrop={handleDrop}
      >
        {loading && (
          <div className="h-full flex items-center justify-center">
            <div className="text-sm text-gray-500">PDF 로딩 중...</div>
          </div>
        )}

        {error && !loading && (
          <div className="h-full flex items-center justify-center">
            <div className="text-sm text-red-500">{error}</div>
          </div>
        )}

        {!pdfDoc && !loading && !error ? (
          <div
            className="h-full flex flex-col items-center justify-center text-gray-400 cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="text-4xl mb-4">📄</div>
            <p className="text-sm">PDF 파일을 업로드해주세요</p>
            <p className="text-xs mt-1 text-gray-300">클릭하거나 파일을 드래그하세요</p>
          </div>
        ) : numPages > 0 ? (
          <div className="relative" style={{ height: totalH }}>
            {pages}
          </div>
        ) : null}
      </div>
    </div>
  );
}
