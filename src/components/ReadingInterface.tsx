import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Book,
  Highlight,
  ThemeMode,
  FontOption,
  PdfReadingMode,
  EyeProtectionSettings,
} from '../types';
import {
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  Bookmark as BookmarkIcon,
  Check,
  ZoomIn,
  ZoomOut,
  RefreshCw,
  Columns,
  Square,
  RotateCw,
} from 'lucide-react';
import { pdfjsLib, loadPdfDocumentSafe } from '../utils/pdfSetup';
import { resolveBookPdfBytes, savePdfToStorage } from '../utils/pdfStorage';
import {
  extractPageForReflow,
  ChartBlockPayload,
  TableBlockPayload,
  PageMarginBlockPayload,
} from '../utils/pdfReflowEngine';
import { AnnotationToolbar, SelectionRangeData } from './AnnotationToolbar';
import { NotesAndHighlightsModal } from './NotesAndHighlightsModal';

interface ReadingInterfaceProps {
  book: Book;
  theme?: ThemeMode;
  onChangeTheme?: (theme: ThemeMode) => void;
  onBackToDashboard: () => void;
  onUpdateProgress: (bookId: string, page: number, secondsRead: number) => void;
  onUpdateBookTotalPages?: (bookId: string, totalPages: number) => void;
  onAddBookmark: (bookId: string, page: number) => void;
  onAddHighlight: (bookId: string, highlight: Highlight) => void;
  onUpdateHighlight?: (bookId: string, highlight: Highlight) => void;
  onDeleteHighlight?: (bookId: string, highlightId: string) => void;
  onChangeReadingMode?: (bookId: string, mode: PdfReadingMode) => void;
  eyeProtection?: EyeProtectionSettings;
  onChangeEyeProtection?: (settings: EyeProtectionSettings) => void;
  onSaveNotesPdfToLibrary?: (book: Book) => Promise<void> | void;
}

const THEME_CONFIGS: Record<
  ThemeMode,
  {
    bg: string;
    text: string;
    secondaryText: string;
    border: string;
    footerBorder: string;
    cardBg: string;
    canvasFilter: string;
    isDark: boolean;
  }
> = {
  light: {
    bg: '#F4F1EA',
    text: '#161514',
    secondaryText: '#524E48',
    border: '#DCD6CA',
    footerBorder: '#DCD6CA',
    cardBg: '#FAF8F4',
    canvasFilter: 'none',
    isDark: false,
  },
  dark: {
    bg: '#141413',
    text: '#E6E3DC',
    secondaryText: '#A09C94',
    border: '#2E2D2A',
    footerBorder: '#2E2D2A',
    cardBg: '#1C1C1A',
    canvasFilter: 'invert(0.91) hue-rotate(180deg) contrast(0.96)',
    isDark: true,
  },
  sepia: {
    bg: '#E8DEC8',
    text: '#231B12',
    secondaryText: '#5E4E3C',
    border: '#CBBCA0',
    footerBorder: '#CBBCA0',
    cardBg: '#F0E7D4',
    canvasFilter: 'sepia(0.28) contrast(0.96) brightness(0.96)',
    isDark: false,
  },
  'warm-sepia': {
    bg: '#EFE9DC',
    text: '#1E1A15',
    secondaryText: '#595043',
    border: '#D5CCB8',
    footerBorder: '#D5CCB8',
    cardBg: '#F6F2E8',
    canvasFilter: 'sepia(0.14) contrast(0.98) brightness(0.97)',
    isDark: false,
  },
  'amber-glow': {
    bg: '#E6D5B8',
    text: '#21170B',
    secondaryText: '#5C472C',
    border: '#C7B089',
    footerBorder: '#C7B089',
    cardBg: '#EFE1C6',
    canvasFilter: 'sepia(0.38) saturate(1.08) contrast(0.95) brightness(0.95)',
    isDark: false,
  },
  'emerald-paper': {
    bg: '#E6ECE8',
    text: '#131D17',
    secondaryText: '#43544A',
    border: '#C5D1C9',
    footerBorder: '#C5D1C9',
    cardBg: '#F0F5F1',
    canvasFilter: 'hue-rotate(30deg) sepia(0.10) contrast(0.98) brightness(0.97)',
    isDark: false,
  },
};

export const ReadingInterface: React.FC<ReadingInterfaceProps> = ({
  book,
  theme: propTheme,
  onChangeTheme,
  onBackToDashboard,
  onUpdateProgress,
  onUpdateBookTotalPages,
  onAddBookmark,
  onAddHighlight,
  onUpdateHighlight,
  onDeleteHighlight,
  onChangeReadingMode,
  eyeProtection,
  onChangeEyeProtection,
  onSaveNotesPdfToLibrary,
}) => {
  const [currentPage, setCurrentPage] = useState<number>(book.currentPage || 1);
  const [totalPages, setTotalPages] = useState<number>(Math.max(1, book.totalPages || 1));
  const [readingMode, setReadingMode] = useState<PdfReadingMode>(
    book.preferredReadingMode || 'reflow-ereader'
  );

  const handleSelectReadingMode = (mode: PdfReadingMode) => {
    setReadingMode(mode);
    onChangeReadingMode?.(book.id, mode);
  };

  const [layoutMode, setLayoutMode] = useState<'single' | 'dual'>('single');
  const [pdfZoomMode, setPdfZoomMode] = useState<'fit-width' | 'fit-page' | 'custom' | '100%'>('fit-width');
  const [pdfCustomZoomScale, setPdfCustomZoomScale] = useState<number>(1.0);
  const [pdfRotation, setPdfRotation] = useState<number>(0);
  const [livePinchScale, setLivePinchScale] = useState<number>(1.0);
  const [isPinching, setIsPinching] = useState<boolean>(false);
  const [pageInputVal, setPageInputVal] = useState<string>(`${book.currentPage || 1}`);
  const [containerDimensions, setContainerDimensions] = useState<{ width: number; height: number }>({
    width: typeof window !== 'undefined' ? window.innerWidth : 1024,
    height: typeof window !== 'undefined' ? window.innerHeight : 768,
  });

  const [localTheme, setLocalTheme] = useState<ThemeMode>(propTheme || 'light');
  const theme = propTheme ?? localTheme;
  const setTheme = (nextTheme: ThemeMode) => {
    setLocalTheme(nextTheme);
    onChangeTheme?.(nextTheme);
  };

  const [fontSize, setFontSize] = useState<number>(17);
  const [fontFamily, setFontFamily] = useState<FontOption>('classic-serif');
  const [lineHeight, setLineHeight] = useState<number>(1.65);
  const [margins, setMargins] = useState<'compact' | 'normal' | 'spacious'>('normal');
  const [activeMenu, setActiveMenu] = useState<'theme' | 'toc' | null>(null);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [pdfLoading, setPdfLoading] = useState<boolean>(false);
  const [pdfRendering, setPdfRendering] = useState<boolean>(false);
  const [pdfRenderError, setPdfRenderError] = useState<string | null>(null);
  const [pdfReloadTrigger, setPdfReloadTrigger] = useState<number>(0);
  const [extractedTextCache, setExtractedTextCache] = useState<Record<number, string>>({});
  const [isExtractingText, setIsExtractingText] = useState<boolean>(false);
  const [slideDirection, setSlideDirection] = useState<'next' | 'prev'>('next');

  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);
  const initialMountRef = useRef<boolean>(true);
  const reattachInputRef = useRef<HTMLInputElement>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dualCanvasRef = useRef<HTMLCanvasElement>(null);
  const textLayerRef = useRef<HTMLDivElement>(null);
  const dualTextLayerRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const currentRenderTaskRef = useRef<any>(null);
  const dualRenderTaskRef = useRef<any>(null);

  const [activeSelection, setActiveSelection] = useState<SelectionRangeData | null>(null);
  const [isNotesModalOpen, setIsNotesModalOpen] = useState<boolean>(false);

  const currentTheme = THEME_CONFIGS[theme] || THEME_CONFIGS['light'];
  const isPdf = book.format === 'pdf';

  const isMobile = containerDimensions.width < 640;
  const isTablet = containerDimensions.width >= 640 && containerDimensions.width < 1024;

  const handleReattachPdfFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setPdfLoading(true);
      setPdfRenderError(null);
      const buf = await file.arrayBuffer();
      const uint8 = new Uint8Array(buf);
      await savePdfToStorage(book.id, uint8, book.uid);
      setExtractedTextCache({});
      setPdfReloadTrigger((n) => n + 1);
    } catch (err) {
      console.warn('Reattach PDF error:', err);
      setPdfLoading(false);
    } finally {
      e.target.value = '';
    }
  };

  // Measure container dimensions for responsive rendering (ignoring minor mobile toolbar jitter)
  useEffect(() => {
    if (!containerRef.current) return;

    const updateSize = () => {
      if (containerRef.current) {
        const { clientWidth, clientHeight } = containerRef.current;
        if (clientWidth > 0 && clientHeight > 0) {
          setContainerDimensions((prev) => {
            if (
              Math.abs(prev.width - clientWidth) <= 2 &&
              Math.abs(prev.height - clientHeight) <= 18
            ) {
              return prev;
            }
            return { width: clientWidth, height: clientHeight };
          });
        }
      }
    };

    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(containerRef.current);
    window.addEventListener('resize', updateSize);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateSize);
    };
  }, []);

  // 1. Load PDF Document Instance (works for Sample, Drive, Cloud-Synced, and Uploaded Local PDFs)
  useEffect(() => {
    let isCancelled = false;

    async function loadPdfDocument() {
      if (!isPdf) {
        setPdfDoc(null);
        return;
      }

      setPdfLoading(true);
      setPdfRenderError(null);

      try {
        const rawBytes = await resolveBookPdfBytes(book);

        if (!rawBytes || rawBytes.length === 0) {
          if (!isCancelled) {
            setPdfLoading(false);
            setPdfRenderError(
              'This book was uploaded on another device before Cloud PDF Sync was enabled. Select the PDF file once to open and sync across all your devices.'
            );
          }
          return;
        }

        const doc = await loadPdfDocumentSafe(rawBytes);

        if (!isCancelled) {
          setPdfDoc(doc);
          if (doc.numPages && doc.numPages > 0) {
            setTotalPages(doc.numPages);
            if (doc.numPages !== book.totalPages) {
              onUpdateBookTotalPages?.(book.id, doc.numPages);
            }
          }
          setPdfLoading(false);
        }
      } catch (err: any) {
        console.warn('PDF document load notice:', err);
        if (!isCancelled) {
          setPdfLoading(false);
          setPdfRenderError('Unable to render original PDF layout. Select PDF file or switch to Reflow.');
        }
      }
    }

    loadPdfDocument();

    return () => {
      isCancelled = true;
    };
  }, [book.id, isPdf, pdfReloadTrigger]);

  // Sync state when switching books
  useEffect(() => {
    initialMountRef.current = true;
    const validInitial = Math.max(1, Math.min(book.currentPage || 1, Math.max(1, book.totalPages || 1)));
    setCurrentPage(validInitial);
    setTotalPages(Math.max(1, book.totalPages || 1));
    setExtractedTextCache({});
    if (book.preferredReadingMode) {
      setReadingMode(book.preferredReadingMode);
    }
  }, [book.id]);

  // Sync progress back to App when page turns (skipping initial mount overwrite)
  useEffect(() => {
    if (initialMountRef.current) {
      initialMountRef.current = false;
      return;
    }
    onUpdateProgress(book.id, currentPage, 0);
  }, [currentPage, book.id]);

  // Active reading time tracker (coalesced every 15s when tab is visible)
  const lastActiveTimestampRef = useRef<number>(Date.now());
  useEffect(() => {
    lastActiveTimestampRef.current = Date.now();
    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') {
        lastActiveTimestampRef.current = Date.now();
        return;
      }
      const now = Date.now();
      const elapsedSec = Math.floor((now - lastActiveTimestampRef.current) / 1000);
      lastActiveTimestampRef.current = now;
      if (elapsedSec > 0 && elapsedSec <= 60) {
        onUpdateProgress(book.id, currentPage, elapsedSec);
      }
    }, 15000);

    return () => {
      clearInterval(interval);
      const now = Date.now();
      const elapsedSec = Math.floor((now - lastActiveTimestampRef.current) / 1000);
      if (elapsedSec > 0 && elapsedSec <= 60) {
        onUpdateProgress(book.id, currentPage, elapsedSec);
      }
    };
  }, [book.id, currentPage, onUpdateProgress]);

  // 2. Extract Reflow Text On-Demand for Uploaded PDFs using High-Precision LibreFlow Engine
  useEffect(() => {
    let isCancelled = false;

    async function extractSinglePageForReflow(pageNum: number) {
      if (!isPdf || !pdfDoc) return;
      if (pageNum < 1 || pageNum > totalPages) return;
      if (extractedTextCache[pageNum]) return;
      if (book.contentPages && book.contentPages[pageNum - 1]) return;

      const extractPageAsImage = async (pdfPage: any, scale = 1.6): Promise<string> => {
        try {
          const v = pdfPage.getViewport({ scale });
          const c = document.createElement('canvas');
          c.width = Math.floor(v.width);
          c.height = Math.floor(v.height);
          const ctx = c.getContext('2d');
          if (!ctx) return '';
          await pdfPage.render({
            canvasContext: ctx,
            viewport: v,
            canvas: c,
          } as any).promise;
          return c.toDataURL('image/jpeg', 0.9);
        } catch (e) {
          return '';
        }
      };

      try {
        if (pageNum === currentPage) {
          setIsExtractingText(true);
        }
        const page = await pdfDoc.getPage(pageNum);
        if (isCancelled) return;

        const formattedPageText = await extractPageForReflow(
          page,
          pageNum,
          extractPageAsImage
        );

        if (!isCancelled) {
          setExtractedTextCache((prev) => ({
            ...prev,
            [pageNum]: formattedPageText,
          }));
        }
      } catch (err) {
        console.warn('Text extraction notice on page', pageNum, err);
      } finally {
        if (!isCancelled && pageNum === currentPage) {
          setIsExtractingText(false);
        }
      }
    }

    if (readingMode === 'reflow-ereader' && isPdf && pdfDoc) {
      extractSinglePageForReflow(currentPage).then(() => {
        if (!isCancelled && currentPage + 1 <= totalPages) {
          extractSinglePageForReflow(currentPage + 1);
        }
        if (!isCancelled && currentPage - 1 >= 1) {
          extractSinglePageForReflow(currentPage - 1);
        }
      });
    }

    return () => {
      isCancelled = true;
    };
  }, [isPdf, pdfDoc, currentPage, totalPages, readingMode, book.contentPages, extractedTextCache]);

  const isReaderWordChar = useCallback(
    (ch: string | undefined): boolean => Boolean(ch && /[\p{L}\p{N}'’]/u.test(ch)),
    []
  );

  const buildAlnumMap = useCallback((input: string): { norm: string; indices: number[] } => {
    const chars: string[] = [];
    const indices: number[] = [];
    for (let i = 0; i < input.length; i++) {
      const ch = input[i];
      if (ch === 'ﬁ') {
        chars.push('f', 'i');
        indices.push(i, i);
      } else if (ch === 'ﬂ') {
        chars.push('f', 'l');
        indices.push(i, i);
      } else if (ch === 'ﬀ') {
        chars.push('f', 'f');
        indices.push(i, i);
      } else if (/[\p{L}\p{N}]/u.test(ch)) {
        chars.push(ch.toLowerCase());
        indices.push(i);
      }
    }
    return { norm: chars.join(''), indices };
  }, []);

  const findUnifiedMatchRange = useCallback(
    (haystack: string, needle: string): { start: number; end: number } | null => {
      if (!haystack || !needle) return null;
      const cleanNeedle = needle.replace(/\s+/g, ' ').trim();
      if (!cleanNeedle) return null;

      // 1. Direct case-insensitive substring match
      const directIdx = haystack.toLowerCase().indexOf(cleanNeedle.toLowerCase());
      if (directIdx !== -1) {
        let s = directIdx;
        let e = directIdx + cleanNeedle.length;
        while (s > 0 && isReaderWordChar(haystack[s]) && isReaderWordChar(haystack[s - 1])) s--;
        while (
          e < haystack.length &&
          isReaderWordChar(haystack[e - 1]) &&
          isReaderWordChar(haystack[e])
        ) {
          e++;
        }
        return { start: s, end: e };
      }

      // 2. Alphanumeric normalized match (handles PDF line-break hyphens like "entre- preneurship",
      //    whitespace differences, smart quotes, and ligatures seamlessly between Reflow & PDF)
      const hayMap = buildAlnumMap(haystack);
      const needleMap = buildAlnumMap(cleanNeedle);
      if (!hayMap.norm || !needleMap.norm) return null;

      const normIdx = hayMap.norm.indexOf(needleMap.norm);
      if (normIdx !== -1) {
        let s = hayMap.indices[normIdx];
        let e = hayMap.indices[normIdx + needleMap.norm.length - 1] + 1;
        while (s > 0 && isReaderWordChar(haystack[s]) && isReaderWordChar(haystack[s - 1])) s--;
        while (
          e < haystack.length &&
          isReaderWordChar(haystack[e - 1]) &&
          isReaderWordChar(haystack[e])
        ) {
          e++;
        }
        return { start: s, end: e };
      }

      // 3. Multi-block boundary overlap (when a highlight selected in PDF spans across 2 Reflow blocks)
      if (needleMap.norm.length >= 14 && hayMap.norm.length >= 10) {
        const maxOverlap = Math.min(hayMap.norm.length, needleMap.norm.length);
        for (let len = maxOverlap; len >= 10; len--) {
          if (hayMap.norm.endsWith(needleMap.norm.slice(0, len))) {
            const startNormIdx = hayMap.norm.length - len;
            let s = hayMap.indices[startNormIdx];
            while (s > 0 && isReaderWordChar(haystack[s]) && isReaderWordChar(haystack[s - 1])) s--;
            return { start: s, end: haystack.length };
          }
          if (hayMap.norm.startsWith(needleMap.norm.slice(needleMap.norm.length - len))) {
            let e = hayMap.indices[len - 1] + 1;
            while (
              e < haystack.length &&
              isReaderWordChar(haystack[e - 1]) &&
              isReaderWordChar(haystack[e])
            ) {
              e++;
            }
            return { start: 0, end: e };
          }
        }
      }

      return null;
    },
    [buildAlnumMap, isReaderWordChar]
  );

  const applyPdfHighlights = useCallback(() => {
    if (!textLayerRef.current) return;
    const spans = Array.from(
      textLayerRef.current.querySelectorAll(':scope > span')
    ) as HTMLSpanElement[];

    spans.forEach((sp) => {
      if (sp.dataset.rawText === undefined) {
        sp.dataset.rawText = sp.textContent || '';
      } else {
        sp.textContent = sp.dataset.rawText;
      }
      sp.style.backgroundColor = '';
      sp.style.borderBottom = '';
      sp.style.borderRadius = '';
      sp.style.cursor = 'text';
      sp.title = '';
      sp.onclick = null;
    });

    const pageHighlights = (book.highlights || []).filter(
      (h) => h.pageNumber === currentPage && h.text && h.text.trim().length > 0
    );
    if (pageHighlights.length === 0 || spans.length === 0) return;

    // Build a normalized character index across all spans on the page
    let joinedPageText = '';
    const spanRanges: {
      span: HTMLSpanElement;
      start: number;
      end: number;
      rawText: string;
    }[] = [];

    for (const sp of spans) {
      const rawText = sp.dataset.rawText ?? sp.textContent ?? '';
      if (!rawText) continue;
      if (
        joinedPageText.length > 0 &&
        !joinedPageText.endsWith(' ') &&
        !rawText.startsWith(' ')
      ) {
        joinedPageText += ' ';
      }
      const start = joinedPageText.length;
      joinedPageText += rawText;
      const end = joinedPageText.length;
      spanRanges.push({ span: sp, start, end, rawText });
    }

    const perSpanSlices = new Map<
      HTMLSpanElement,
      { start: number; end: number; highlight: Highlight }[]
    >();

    for (const hl of pageHighlights) {
      const matched = findUnifiedMatchRange(joinedPageText, hl.text);
      if (!matched) continue;

      const { start: matchStart, end: matchEnd } = matched;

      for (const item of spanRanges) {
        if (item.end > matchStart && item.start < matchEnd) {
          const localStart = Math.max(0, matchStart - item.start);
          const localEnd = Math.min(item.rawText.length, matchEnd - item.start);
          if (localEnd > localStart) {
            const list = perSpanSlices.get(item.span) || [];
            list.push({ start: localStart, end: localEnd, highlight: hl });
            perSpanSlices.set(item.span, list);
          }
        }
      }
    }

    // Render exact word/character-level <mark> tags inside each matched PDF span (identical to Reflow)
    perSpanSlices.forEach((slices, sp) => {
      const rawText = sp.dataset.rawText ?? '';
      if (!rawText || slices.length === 0) return;

      slices.sort((a, b) => a.start - b.start || b.end - b.start - (a.end - a.start));

      const merged: { start: number; end: number; highlight: Highlight }[] = [];
      let cursor = 0;
      for (const s of slices) {
        const safeStart = Math.max(cursor, s.start);
        const safeEnd = Math.max(safeStart, Math.min(rawText.length, s.end));
        if (safeEnd > safeStart) {
          merged.push({ start: safeStart, end: safeEnd, highlight: s.highlight });
          cursor = safeEnd;
        }
      }

      if (merged.length === 0) return;

      sp.textContent = '';
      let lastIdx = 0;

      for (const seg of merged) {
        if (seg.start > lastIdx) {
          sp.appendChild(document.createTextNode(rawText.slice(lastIdx, seg.start)));
        }

        const mark = document.createElement('mark');
        mark.className = 'pdf-highlight-mark';
        mark.textContent = rawText.slice(seg.start, seg.end);
        mark.style.backgroundColor = `${seg.highlight.color}45`;
        mark.style.borderBottom = `2px solid ${seg.highlight.color}`;
        mark.style.borderRadius = '2px';
        mark.style.color = 'transparent';
        mark.style.cursor = 'pointer';
        mark.title = seg.highlight.note
          ? `Note: "${seg.highlight.note}"`
          : 'Tap to edit or remove highlight';

        mark.onclick = (e) => {
          e.stopPropagation();
          try {
            window.getSelection()?.removeAllRanges();
          } catch (err) {}
          const rect = mark.getBoundingClientRect();
          setActiveSelection({
            text: seg.highlight.text,
            pageNumber: seg.highlight.pageNumber,
            rect: {
              top: rect.top,
              left: rect.left,
              bottom: rect.bottom,
              right: rect.right,
              width: rect.width,
              height: rect.height,
            },
            existingHighlight: seg.highlight,
          });
        };

        sp.appendChild(mark);
        lastIdx = seg.end;
      }

      if (lastIdx < rawText.length) {
        sp.appendChild(document.createTextNode(rawText.slice(lastIdx)));
      }
    });
  }, [book.highlights, currentPage, findUnifiedMatchRange]);

  const applyPdfHighlightsRef = useRef(applyPdfHighlights);
  useEffect(() => {
    applyPdfHighlightsRef.current = applyPdfHighlights;
  }, [applyPdfHighlights]);

  useEffect(() => {
    if (readingMode === 'original-pdf') {
      applyPdfHighlights();
    }
  }, [applyPdfHighlights, readingMode, currentPage]);

  // Dismiss active selection when changing pages, modes, or font size
  useEffect(() => {
    setActiveSelection(null);
    try {
      window.getSelection()?.removeAllRanges();
    } catch (e) {}
  }, [currentPage, readingMode, pdfCustomZoomScale, pdfZoomMode, fontSize, book.id]);

  const effectiveViewportHeightForPdf =
    pdfZoomMode === 'fit-page' ? containerDimensions.height : 0;

  // 3. Render Canvas in Original PDF Mode (Double-Buffered Offscreen Render for Zero Flicker)
  useEffect(() => {
    let isCancelled = false;

    async function renderCanvasPage() {
      if (readingMode !== 'original-pdf' || !isPdf || !pdfDoc || !canvasRef.current) {
        return;
      }

      if (currentRenderTaskRef.current) {
        try {
          currentRenderTaskRef.current.cancel();
        } catch (e) {}
        currentRenderTaskRef.current = null;
      }

      setPdfRendering(true);
      setPdfRenderError(null);

      try {
        const page = await pdfDoc.getPage(currentPage);
        if (isCancelled) return;

        const unscaledViewport = page.getViewport({ scale: 1.0, rotation: pdfRotation });
        const isDual = layoutMode === 'dual' && !isMobile && currentPage < totalPages;

        const horizontalPadding = isMobile ? 16 : isTablet ? 36 : 56;
        const verticalPadding = isMobile ? 20 : 48;
        const maxAvailableWidth = Math.max(
          260,
          (containerDimensions.width - horizontalPadding) / (isDual ? 2.08 : 1)
        );
        const maxAvailableHeight = Math.max(320, containerDimensions.height - verticalPadding);

        let targetScale = 1.0;
        if (pdfZoomMode === 'fit-width') {
          targetScale = Math.min(1.6, maxAvailableWidth / unscaledViewport.width);
        } else if (pdfZoomMode === 'fit-page') {
          targetScale = Math.min(
            maxAvailableWidth / unscaledViewport.width,
            maxAvailableHeight / unscaledViewport.height
          );
        } else if (pdfZoomMode === '100%') {
          targetScale = 1.0;
        } else {
          const fitBase = Math.min(1.6, maxAvailableWidth / unscaledViewport.width);
          targetScale = fitBase * pdfCustomZoomScale;
        }

        targetScale = Math.max(0.35, Math.min(4.0, targetScale));

        const dpr = Math.min(2.25, Math.max(window.devicePixelRatio || 1, 1.75));
        const viewport = page.getViewport({ scale: targetScale * dpr, rotation: pdfRotation });
        const pixelWidth = Math.round(viewport.width);
        const pixelHeight = Math.round(viewport.height);
        const cssWidth = Math.round(viewport.width / dpr);
        const cssHeight = Math.round(viewport.height / dpr);

        // Render onto an offscreen buffer first so the visible canvas never flashes blank white
        const offscreenCanvas = document.createElement('canvas');
        offscreenCanvas.width = pixelWidth;
        offscreenCanvas.height = pixelHeight;
        const offscreenCtx = offscreenCanvas.getContext('2d', { alpha: false });
        if (!offscreenCtx) return;

        const renderTask = page.render({
          canvasContext: offscreenCtx,
          viewport,
          canvas: offscreenCanvas,
        } as any);
        currentRenderTaskRef.current = renderTask;
        await renderTask.promise;

        if (isCancelled || !canvasRef.current) return;

        // Atomically swap completed bitmap onto the visible canvas (zero blank frame)
        const visibleCanvas = canvasRef.current;
        visibleCanvas.width = pixelWidth;
        visibleCanvas.height = pixelHeight;
        visibleCanvas.style.width = `${cssWidth}px`;
        visibleCanvas.style.height = `${cssHeight}px`;
        const visibleCtx = visibleCanvas.getContext('2d', { alpha: false });
        if (visibleCtx) {
          visibleCtx.drawImage(offscreenCanvas, 0, 0);
        }

        if (textLayerRef.current) {
          textLayerRef.current.innerHTML = '';
          textLayerRef.current.style.width = `${cssWidth}px`;
          textLayerRef.current.style.height = `${cssHeight}px`;

          try {
            const textContent = await page.getTextContent();
            if (isCancelled || !textLayerRef.current) return;
            const textViewport = page.getViewport({ scale: targetScale, rotation: pdfRotation });

            if (textContent && textContent.items && textContent.items.length > 0) {
              interface PdfLineRun {
                str: string;
                left: number;
                top: number;
                right: number;
                baselineY: number;
                fontHeight: number;
              }

              const rawRuns: PdfLineRun[] = [];

              for (const item of textContent.items as any[]) {
                if (!item.str || item.str.length === 0) continue;
                const tx = pdfjsLib.Util.transform(textViewport.transform, item.transform);
                const fontHeight = Math.hypot(tx[2], tx[3]);
                if (!fontHeight || fontHeight <= 0) continue;

                const left = tx[4];
                const baselineY = tx[5];
                const top = baselineY - fontHeight * 0.86;
                const itemWidth =
                  typeof item.width === 'number' && item.width > 0
                    ? item.width * textViewport.scale
                    : item.str.length * fontHeight * 0.52;
                const right = left + itemWidth;

                rawRuns.push({
                  str: item.str,
                  left,
                  top,
                  right,
                  baselineY,
                  fontHeight,
                });
              }

              // Sort in strict top-to-bottom, left-to-right reading order
              rawRuns.sort((a, b) => {
                if (Math.abs(a.baselineY - b.baselineY) > Math.min(a.fontHeight, b.fontHeight) * 0.38) {
                  return a.baselineY - b.baselineY;
                }
                return a.left - b.left;
              });

              // Merge adjacent runs on the same baseline into continuous line spans (eliminating intra-line gaps)
              const mergedLines: PdfLineRun[] = [];
              for (const run of rawRuns) {
                const prev = mergedLines[mergedLines.length - 1];
                if (
                  prev &&
                  Math.abs(run.baselineY - prev.baselineY) <= prev.fontHeight * 0.38 &&
                  run.left >= prev.left - 2 &&
                  run.left - prev.right <= prev.fontHeight * 2.2
                ) {
                  const gap = run.left - prev.right;
                  if (
                    gap > prev.fontHeight * 0.08 &&
                    !prev.str.endsWith(' ') &&
                    !run.str.startsWith(' ')
                  ) {
                    prev.str += ' ';
                  }
                  prev.str += run.str;
                  prev.right = Math.max(prev.right, run.right);
                } else {
                  mergedLines.push({ ...run });
                }
              }

              const fragment = document.createDocumentFragment();
              for (const line of mergedLines) {
                const span = document.createElement('span');
                span.textContent = line.str;
                span.dataset.rawText = line.str;
                span.dataset.targetWidth = String(Math.max(1, line.right - line.left));
                span.style.position = 'absolute';
                span.style.left = `${line.left.toFixed(2)}px`;
                span.style.top = `${line.top.toFixed(2)}px`;
                span.style.fontSize = `${line.fontHeight.toFixed(2)}px`;
                span.style.lineHeight = '1.15';
                span.style.padding = '2px 0';
                span.style.fontFamily = "'Times New Roman', Georgia, serif";
                span.style.whiteSpace = 'pre';
                span.style.transformOrigin = '0% 0%';
                fragment.appendChild(span);
              }

              textLayerRef.current.appendChild(fragment);

              // Calibrate horizontal scaleX on each line span so its width matches the PDF canvas line 100%
              const renderedSpans = Array.from(
                textLayerRef.current.querySelectorAll(':scope > span')
              ) as HTMLSpanElement[];
              const measureCanvas = document.createElement('canvas');
              const measureCtx = measureCanvas.getContext('2d');

              for (const sp of renderedSpans) {
                const targetW = parseFloat(sp.dataset.targetWidth || '0');
                const rawTxt = sp.dataset.rawText || '';
                const fSize = parseFloat(sp.style.fontSize || '14');
                let naturalW = sp.offsetWidth;
                if ((!naturalW || naturalW <= 0) && measureCtx) {
                  measureCtx.font = `${fSize}px "Times New Roman", Georgia, serif`;
                  naturalW = measureCtx.measureText(rawTxt).width;
                }
                if (targetW > 2 && naturalW > 2) {
                  const scaleX = Math.max(0.65, Math.min(1.65, targetW / naturalW));
                  sp.style.transform = `scaleX(${scaleX.toFixed(4)})`;
                }
              }
            }

            applyPdfHighlightsRef.current();
          } catch (textErr) {}
        }

        if (isDual && dualCanvasRef.current && currentPage + 1 <= totalPages) {
          const page2 = await pdfDoc.getPage(currentPage + 1);
          if (!isCancelled && dualCanvasRef.current) {
            const viewport2 = page2.getViewport({ scale: targetScale * dpr, rotation: pdfRotation });
            const offscreenDual = document.createElement('canvas');
            offscreenDual.width = Math.round(viewport2.width);
            offscreenDual.height = Math.round(viewport2.height);
            const offscreenDualCtx = offscreenDual.getContext('2d', { alpha: false });
            if (offscreenDualCtx) {
              const dualRender = page2.render({
                canvasContext: offscreenDualCtx,
                viewport: viewport2,
                canvas: offscreenDual,
              } as any);
              dualRenderTaskRef.current = dualRender;
              await dualRender.promise;
              if (!isCancelled && dualCanvasRef.current) {
                dualCanvasRef.current.width = offscreenDual.width;
                dualCanvasRef.current.height = offscreenDual.height;
                dualCanvasRef.current.style.width = `${Math.round(viewport2.width / dpr)}px`;
                dualCanvasRef.current.style.height = `${Math.round(viewport2.height / dpr)}px`;
                const dualVisibleCtx = dualCanvasRef.current.getContext('2d', { alpha: false });
                dualVisibleCtx?.drawImage(offscreenDual, 0, 0);
              }
            }
          }
        }
      } catch (err: any) {
        if (err?.name !== 'RenderingCancelledException') {
          console.warn('PDF canvas render notice:', err);
          setPdfRenderError('Unable to render page on canvas. Switch to Reflow mode.');
        }
      } finally {
        if (!isCancelled) {
          setPdfRendering(false);
          currentRenderTaskRef.current = null;
          dualRenderTaskRef.current = null;
        }
      }
    }

    renderCanvasPage();

    return () => {
      isCancelled = true;
      if (currentRenderTaskRef.current) {
        try {
          currentRenderTaskRef.current.cancel();
        } catch (e) {}
      }
      if (dualRenderTaskRef.current) {
        try {
          dualRenderTaskRef.current.cancel();
        } catch (e) {}
      }
    };
  }, [
    isPdf,
    pdfDoc,
    currentPage,
    readingMode,
    layoutMode,
    pdfZoomMode,
    pdfCustomZoomScale,
    pdfRotation,
    containerDimensions.width,
    effectiveViewportHeightForPdf,
    isMobile,
    isTablet,
    totalPages,
  ]);

  useEffect(() => {
    setPageInputVal(`${currentPage}`);
  }, [currentPage]);

  const handleNextPage = useCallback(() => {
    const step = layoutMode === 'dual' && !isMobile ? 2 : 1;
    if (currentPage < totalPages) {
      setSlideDirection('next');
      setCurrentPage((p) => Math.min(totalPages, p + step));
    }
  }, [currentPage, totalPages, layoutMode, isMobile]);

  const handlePrevPage = useCallback(() => {
    const step = layoutMode === 'dual' && !isMobile ? 2 : 1;
    if (currentPage > 1) {
      setSlideDirection('prev');
      setCurrentPage((p) => Math.max(1, p - step));
    }
  }, [currentPage, layoutMode, isMobile]);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      touchStartXRef.current = e.touches[0].clientX;
      touchStartYRef.current = e.touches[0].clientY;
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartXRef.current === null || touchStartYRef.current === null) {
      return;
    }

    const currentSel = window.getSelection();
    if (
      (currentSel && !currentSel.isCollapsed && currentSel.toString().trim().length > 0) ||
      activeSelection !== null
    ) {
      touchStartXRef.current = null;
      touchStartYRef.current = null;
      return;
    }

    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    const deltaX = touchEndX - touchStartXRef.current;
    const deltaY = touchEndY - touchStartYRef.current;

    if (Math.abs(deltaX) > 60 && Math.abs(deltaX) > Math.abs(deltaY) * 1.6) {
      if (deltaX < 0) {
        handleNextPage();
      } else {
        handlePrevPage();
      }
    }

    touchStartXRef.current = null;
    touchStartYRef.current = null;
  };

  const pinchStartDistRef = useRef<number | null>(null);
  const pinchStartScaleRef = useRef<number>(1.0);

  const handlePdfTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const t0 = e.touches[0];
      const t1 = e.touches[1];
      pinchStartDistRef.current = Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY);
      pinchStartScaleRef.current = pdfCustomZoomScale;
      setIsPinching(true);
    } else if (e.touches.length === 1) {
      handleTouchStart(e);
    }
  };

  const handlePdfTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && pinchStartDistRef.current !== null) {
      const t0 = e.touches[0];
      const t1 = e.touches[1];
      const currentDist = Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY);
      const ratio = currentDist / pinchStartDistRef.current;
      setLivePinchScale(Math.max(0.5, Math.min(3.5, ratio)));
    }
  };

  const handlePdfTouchEnd = (e: React.TouchEvent) => {
    if (isPinching) {
      if (pinchStartDistRef.current !== null && livePinchScale !== 1.0) {
        const finalScale = Math.max(
          0.4,
          Math.min(4.0, Number((pinchStartScaleRef.current * livePinchScale).toFixed(2)))
        );
        setPdfCustomZoomScale(finalScale);
        setPdfZoomMode('custom');
      }
      setLivePinchScale(1.0);
      setIsPinching(false);
      pinchStartDistRef.current = null;
    } else {
      handleTouchEnd(e);
    }
  };

  const handlePdfWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY < 0 ? 0.15 : -0.15;
      setPdfZoomMode('custom');
      setPdfCustomZoomScale((prev) => Math.max(0.4, Math.min(4.0, Number((prev + delta).toFixed(2)))));
    }
  };

  const handlePageJumpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseInt(pageInputVal, 10);
    if (!isNaN(parsed) && parsed >= 1 && parsed <= totalPages) {
      setCurrentPage(parsed);
    } else {
      setPageInputVal(`${currentPage}`);
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  const handleToggleBookmark = () => {
    onAddBookmark(book.id, currentPage);
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') {
        e.preventDefault();
        handleNextPage();
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        handlePrevPage();
      } else if (e.key === 'Escape') {
        if (activeMenu) {
          setActiveMenu(null);
        } else {
          onBackToDashboard();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNextPage, handlePrevPage, activeMenu, onBackToDashboard]);

  // Resolve current page reflow content: prefer clean pre-formatted book.contentPages, then on-demand PDF extraction
  const pageIndex = currentPage - 1;
  let currentContent = '';

  if (book.contentPages && book.contentPages[pageIndex]) {
    currentContent = book.contentPages[pageIndex];
  } else if (extractedTextCache[currentPage]) {
    currentContent = extractedTextCache[currentPage];
  } else if (book.contentPages && book.contentPages.length > 0) {
    currentContent = book.contentPages[pageIndex % book.contentPages.length];
  } else {
    currentContent = `Page ${currentPage} of ${totalPages}`;
  }

  const paragraphs = currentContent.split('\n\n').filter(Boolean);
  const isBookmarked = book.bookmarks?.some((b) => b.pageNumber === currentPage);

  const renderRichContent = (text: string): React.ReactNode => {
    if (!text) return null;

    const normalized = text
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/__(.+?)__/g, '<strong>$1</strong>')
      .replace(/(^|[^\*])\*([^\*]+?)\*([^\*]|$)/g, '$1<em>$2</em>$3');

    const tokenRegex =
      /(<strong>[\s\S]*?<\/strong>|<b>[\s\S]*?<\/b>|<em>[\s\S]*?<\/em>|<i>[\s\S]*?<\/i>|<sup>[\s\S]*?<\/sup>|https?:\/\/[^\s]+|www\.[^\s]+)/gi;
    const rawTokens = normalized.split(tokenRegex);

    return rawTokens.map((token, i) => {
      if (!token) return null;

      if (/^<(strong|b)\b[^>]*>([\s\S]*?)<\/(strong|b)>$/i.test(token)) {
        const match = token.match(/^<(?:strong|b)\b[^>]*>([\s\S]*?)<\/(?:strong|b)>$/i);
        const inner = match ? match[1] : token;
        return (
          <strong key={i} className="font-bold">
            {renderRichContent(inner)}
          </strong>
        );
      }

      if (/^<(em|i)\b[^>]*>([\s\S]*?)<\/(em|i)>$/i.test(token)) {
        const match = token.match(/^<(?:em|i)\b[^>]*>([\s\S]*?)<\/(?:em|i)>$/i);
        const inner = match ? match[1] : token;
        return (
          <em key={i} className="italic">
            {renderRichContent(inner)}
          </em>
        );
      }

      if (/^<sup\b[^>]*>([\s\S]*?)<\/sup>$/i.test(token)) {
        const match = token.match(/^<sup\b[^>]*>([\s\S]*?)<\/sup>$/i);
        const inner = match ? match[1] : token;
        return (
          <sup key={i} className="text-[0.72em] leading-none font-normal align-super ml-[1px]">
            {renderRichContent(inner)}
          </sup>
        );
      }

      if (/^(https?:\/\/[^\s]+|www\.[^\s]+)$/i.test(token)) {
        const href = token.startsWith('http') ? token : `https://${token}`;
        return (
          <a
            key={i}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="underline underline-offset-2 opacity-90 hover:opacity-100 cursor-pointer"
          >
            {token}
          </a>
        );
      }

      return <span key={i}>{token}</span>;
    });
  };

  interface HighlightRange {
    start: number;
    end: number;
    highlight: Highlight;
  }

  // Strip inline HTML formatting tags to get exact visible plain text for highlight offset matching
  const stripHtmlTags = (html: string): string =>
    html
      .replace(/\*\*(.+?)\*\*/g, '$1')
      .replace(/__(.+?)__/g, '$1')
      .replace(/(^|[^\*])\*([^\*]+?)\*([^\*]|$)/g, '$1$2$3')
      .replace(/<\/?(?:strong|b|em|i|sup)\b[^>]*>/gi, '');

  const renderBlockWithHighlights = (rawText: string, blockIndex: number): React.ReactNode => {
    if (!rawText) return null;
    const pageHighlights = (book.highlights || []).filter(
      (h) => h.pageNumber === currentPage && h.text && h.text.trim().length > 0
    );

    if (pageHighlights.length === 0) {
      return renderRichContent(rawText);
    }

    const plainBlockText = stripHtmlTags(rawText);
    const candidateRanges: HighlightRange[] = [];

    for (const hl of pageHighlights) {
      // 1. If highlight has explicit Reflow blockIndex + offsets for this block, try exact offset first
      if (
        typeof hl.blockIndex === 'number' &&
        hl.blockIndex === blockIndex &&
        typeof hl.startOffset === 'number' &&
        typeof hl.endOffset === 'number' &&
        hl.endOffset > hl.startOffset
      ) {
        let clampedStart = Math.max(0, Math.min(plainBlockText.length, hl.startOffset));
        let clampedEnd = Math.max(clampedStart, Math.min(plainBlockText.length, hl.endOffset));

        while (
          clampedStart > 0 &&
          isReaderWordChar(plainBlockText[clampedStart]) &&
          isReaderWordChar(plainBlockText[clampedStart - 1])
        ) {
          clampedStart--;
        }
        while (
          clampedEnd < plainBlockText.length &&
          isReaderWordChar(plainBlockText[clampedEnd - 1]) &&
          isReaderWordChar(plainBlockText[clampedEnd])
        ) {
          clampedEnd++;
        }

        const sliceNorm = buildAlnumMap(plainBlockText.slice(clampedStart, clampedEnd)).norm;
        const hlNorm = buildAlnumMap(hl.text).norm;
        if (
          clampedEnd > clampedStart &&
          sliceNorm &&
          hlNorm &&
          (sliceNorm === hlNorm || sliceNorm.includes(hlNorm) || hlNorm.includes(sliceNorm))
        ) {
          candidateRanges.push({ start: clampedStart, end: clampedEnd, highlight: hl });
          continue;
        }
      }

      // 2. Unified cross-mode match (matches highlights created in PDF view OR Reflow view, including inside tables & captions)
      const unifiedMatch = findUnifiedMatchRange(plainBlockText, hl.text);
      if (unifiedMatch && unifiedMatch.end > unifiedMatch.start) {
        candidateRanges.push({
          start: unifiedMatch.start,
          end: unifiedMatch.end,
          highlight: hl,
        });
      }
    }

    if (candidateRanges.length === 0) {
      return renderRichContent(rawText);
    }

    candidateRanges.sort((a, b) => a.start - b.start || b.end - b.start - (a.end - a.start));

    const finalRanges: HighlightRange[] = [];
    let currentCursor = 0;

    for (const r of candidateRanges) {
      const safeStart = Math.max(currentCursor, r.start);
      const safeEnd = Math.max(safeStart, r.end);
      if (safeEnd > safeStart && safeStart < plainBlockText.length) {
        finalRanges.push({ start: safeStart, end: safeEnd, highlight: r.highlight });
        currentCursor = safeEnd;
      }
    }

    if (finalRanges.length === 0) {
      return renderRichContent(rawText);
    }

    const nodes: React.ReactNode[] = [];
    let lastOffset = 0;

    finalRanges.forEach((range, rIdx) => {
      if (range.start > lastOffset) {
        nodes.push(
          <React.Fragment key={`uh-${blockIndex}-${rIdx}-${lastOffset}`}>
            {plainBlockText.slice(lastOffset, range.start)}
          </React.Fragment>
        );
      }

      const highlightedText = plainBlockText.slice(range.start, range.end);
      const hl = range.highlight;

      nodes.push(
        <span
          key={`hl-${hl.id || rIdx}-${blockIndex}-${range.start}`}
          onClick={(e) => {
            e.stopPropagation();
            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
            setActiveSelection({
              text: hl.text || highlightedText,
              pageNumber: hl.pageNumber,
              rect: {
                top: rect.top,
                left: rect.left,
                bottom: rect.bottom,
                right: rect.right,
                width: rect.width,
                height: rect.height,
              },
              existingHighlight: hl,
              blockIndex: hl.blockIndex ?? blockIndex,
              startOffset: range.start,
              endOffset: range.end,
            });
          }}
          className="rounded-[2px] py-[1px] cursor-pointer transition hover:opacity-90 inline relative select-text"
          style={{
            backgroundColor: `${hl.color}45`,
            borderBottom: `2px solid ${hl.color}`,
            color: 'inherit',
            boxDecorationBreak: 'clone',
            WebkitBoxDecorationBreak: 'clone',
          }}
          title={hl.note ? `Note: "${hl.note}"` : 'Click to edit or remove highlight'}
        >
          {highlightedText}
        </span>
      );

      lastOffset = range.end;
    });

    if (lastOffset < plainBlockText.length) {
      nodes.push(
        <React.Fragment key={`uh-tail-${blockIndex}-${lastOffset}`}>
          {plainBlockText.slice(lastOffset)}
        </React.Fragment>
      );
    }

    return nodes;
  };

  const handleApplyHighlight = (
    text: string,
    pageNumber: number,
    colorHex: string,
    note?: string,
    blockIndex?: number,
    startOffset?: number,
    endOffset?: number
  ) => {
    const cleanText = text.replace(/\s+/g, ' ').trim();
    if (!cleanText) return;
    const newHighlight: Highlight = {
      id: `hl-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      pageNumber,
      text: cleanText,
      color: colorHex,
      note,
      createdAt: new Date().toISOString(),
      blockIndex,
      startOffset,
      endOffset,
    };
    onAddHighlight(book.id, newHighlight);
    setActiveSelection(null);
    try {
      window.getSelection()?.removeAllRanges();
    } catch (e) {}
  };

  const handleUpdateHighlightInternal = (highlight: Highlight) => {
    if (onUpdateHighlight) {
      onUpdateHighlight(book.id, highlight);
    } else {
      onAddHighlight(book.id, highlight);
    }
    setActiveSelection(null);
  };

  const handleDeleteHighlightInternal = (highlightId: string) => {
    if (onDeleteHighlight) {
      onDeleteHighlight(book.id, highlightId);
    }
    setActiveSelection(null);
  };

  // Unified text selection listener for both Reflow & PDF modes
  useEffect(() => {
    let checkTimeout: any = null;

    const checkSelection = () => {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed) return;

      const rawSelectionText = selection.toString().replace(/\s+/g, ' ').trim();
      if (!rawSelectionText || rawSelectionText.length < 1) return;

      try {
        if (selection.rangeCount === 0) return;
        const range = selection.getRangeAt(0);
        const commonNode = range.commonAncestorContainer;
        const targetElement =
          commonNode.nodeType === Node.ELEMENT_NODE
            ? (commonNode as HTMLElement)
            : commonNode.parentElement;

        if (containerRef.current && targetElement && !containerRef.current.contains(targetElement)) {
          return;
        }

        const rect = range.getBoundingClientRect();
        if (rect.width === 0 && rect.height === 0) return;

        let blockElement: HTMLElement | null = null;
        let scanNode: Node | null = range.startContainer;
        while (scanNode && scanNode !== containerRef.current) {
          if (scanNode.nodeType === Node.ELEMENT_NODE) {
            const el = scanNode as HTMLElement;
            if (el.hasAttribute('data-block-index')) {
              blockElement = el;
              break;
            }
          }
          scanNode = scanNode.parentNode;
        }

        let blockIndex: number | undefined;
        let startOffset: number | undefined;
        let endOffset: number | undefined;
        let resolvedText = rawSelectionText;

        if (blockElement) {
          // Reflow Mode: snap selection to complete word boundaries inside block
          const parsedIdx = parseInt(blockElement.getAttribute('data-block-index') || '', 10);
          if (!isNaN(parsedIdx)) {
            blockIndex = parsedIdx;
            try {
              const fullBlockDomText = blockElement.textContent || '';

              const preStartRange = range.cloneRange();
              preStartRange.selectNodeContents(blockElement);
              preStartRange.setEnd(range.startContainer, range.startOffset);
              let sOff = preStartRange.toString().length;

              let eOff: number;
              if (blockElement.contains(range.endContainer)) {
                const preEndRange = range.cloneRange();
                preEndRange.selectNodeContents(blockElement);
                preEndRange.setEnd(range.endContainer, range.endOffset);
                eOff = preEndRange.toString().length;
              } else {
                eOff = fullBlockDomText.length;
              }

              if (eOff < sOff) {
                const tmp = sOff;
                sOff = eOff;
                eOff = tmp;
              }

              while (sOff < eOff && /\s/.test(fullBlockDomText[sOff])) {
                sOff++;
              }
              while (eOff > sOff && /\s/.test(fullBlockDomText[eOff - 1])) {
                eOff--;
              }

              while (
                sOff > 0 &&
                isReaderWordChar(fullBlockDomText[sOff]) &&
                isReaderWordChar(fullBlockDomText[sOff - 1])
              ) {
                sOff--;
              }
              while (
                eOff < fullBlockDomText.length &&
                isReaderWordChar(fullBlockDomText[eOff - 1]) &&
                isReaderWordChar(fullBlockDomText[eOff])
              ) {
                eOff++;
              }

              if (eOff > sOff) {
                startOffset = sOff;
                endOffset = eOff;
                resolvedText = fullBlockDomText.slice(sOff, eOff).replace(/\s+/g, ' ').trim();
              }
            } catch (err) {}
          }
        } else {
          // PDF Mode: snap selection to complete word boundaries inside PDF text layer spans
          try {
            const expandedRange = range.cloneRange();
            if (expandedRange.startContainer.nodeType === Node.TEXT_NODE) {
              const startText = expandedRange.startContainer.textContent || '';
              let sOff = expandedRange.startOffset;
              while (
                sOff > 0 &&
                isReaderWordChar(startText[sOff]) &&
                isReaderWordChar(startText[sOff - 1])
              ) {
                sOff--;
              }
              expandedRange.setStart(expandedRange.startContainer, sOff);
            }
            if (expandedRange.endContainer.nodeType === Node.TEXT_NODE) {
              const endText = expandedRange.endContainer.textContent || '';
              let eOff = expandedRange.endOffset;
              while (
                eOff < endText.length &&
                isReaderWordChar(endText[eOff - 1]) &&
                isReaderWordChar(endText[eOff])
              ) {
                eOff++;
              }
              expandedRange.setEnd(expandedRange.endContainer, eOff);
            }
            const expandedStr = expandedRange
              .toString()
              .replace(/([\p{L}])-\s+([\p{L}])/gu, '$1$2')
              .replace(/\s+/g, ' ')
              .trim();
            if (expandedStr.length > 0) {
              resolvedText = expandedStr;
            }
          } catch (err) {}
        }

        const resolvedNorm = buildAlnumMap(resolvedText).norm;

        const existing = book.highlights?.find((h) => {
          if (h.pageNumber !== currentPage) return false;
          if (typeof blockIndex === 'number' && typeof h.blockIndex === 'number') {
            if (h.blockIndex !== blockIndex) return false;
            if (typeof startOffset === 'number' && typeof h.startOffset === 'number') {
              const hEnd =
                typeof h.endOffset === 'number' ? h.endOffset : h.startOffset + h.text.length;
              const sEnd = endOffset ?? startOffset + resolvedText.length;
              return Math.max(startOffset, h.startOffset) < Math.min(sEnd, hEnd);
            }
          }
          const hNorm = buildAlnumMap(h.text || '').norm;
          if (resolvedNorm && hNorm) {
            return resolvedNorm === hNorm || hNorm.includes(resolvedNorm) || resolvedNorm.includes(hNorm);
          }
          return h.text.trim() === resolvedText;
        });

        setActiveSelection({
          text: resolvedText,
          pageNumber: currentPage,
          rect: {
            top: rect.top,
            left: rect.left,
            bottom: rect.bottom,
            right: rect.right,
            width: rect.width,
            height: rect.height,
          },
          existingHighlight: existing,
          blockIndex,
          startOffset,
          endOffset,
        });
      } catch (err) {}
    };

    const handlePointerUp = () => {
      clearTimeout(checkTimeout);
      checkTimeout = setTimeout(checkSelection, 30);
    };

    const handleSelectionChange = () => {
      clearTimeout(checkTimeout);
      checkTimeout = setTimeout(() => {
        const sel = window.getSelection();
        if (sel && !sel.isCollapsed && sel.toString().trim().length > 0) {
          checkSelection();
        }
      }, 60);
    };

    const handleContextMenu = (e: MouseEvent) => {
      const target = e.target as Node | null;
      const isInReader = containerRef.current && target && containerRef.current.contains(target);
      const sel = window.getSelection();
      if (isInReader || (sel && !sel.isCollapsed && sel.toString().trim().length > 0)) {
        e.preventDefault();
        if (sel && !sel.isCollapsed && sel.toString().trim().length > 0) {
          checkSelection();
        }
      }
    };

    window.addEventListener('mouseup', handlePointerUp);
    window.addEventListener('touchend', handlePointerUp);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('keyup', handlePointerUp);
    window.addEventListener('contextmenu', handleContextMenu, { capture: true });
    document.addEventListener('selectionchange', handleSelectionChange);

    return () => {
      clearTimeout(checkTimeout);
      window.removeEventListener('mouseup', handlePointerUp);
      window.removeEventListener('touchend', handlePointerUp);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('keyup', handlePointerUp);
      window.removeEventListener('contextmenu', handleContextMenu, { capture: true } as any);
      document.removeEventListener('selectionchange', handleSelectionChange);
    };
  }, [book.highlights, currentPage, readingMode]);

  const progressPercent = totalPages > 0 ? Math.round((currentPage / totalPages) * 100) : 0;

  const renderReflowContent = () => {
    if (currentContent.startsWith('[PAGE_IMAGE:') || currentContent.startsWith('[IMAGE:')) {
      const imgSrc = currentContent.replace(/^\[(PAGE_)?IMAGE:/, '').replace(/\]$/, '').trim();
      return (
        <div className="w-full h-full flex flex-col items-center justify-center select-none my-auto">
          <img
            src={imgSrc}
            alt={`Page ${currentPage}`}
            className="max-w-full max-h-[82vh] w-auto h-auto object-contain block mx-auto"
          />
        </div>
      );
    }

    return (
      <div className="w-full max-w-[66ch] mx-auto text-justify pb-6" style={{ color: currentTheme.text }}>
        {paragraphs.map((p, idx) => {
          if (p.startsWith('[PAGE_IMAGE:') || p.startsWith('[IMAGE:') || p.startsWith('data:image/')) {
            let imgSrc = '';
            if (p.includes('[PAGE_IMAGE:')) {
              imgSrc = p.match(/\[PAGE_IMAGE:(.*?)\]/)?.[1] || '';
            } else if (p.includes('[IMAGE:')) {
              imgSrc = p.match(/\[IMAGE:(.*?)\]/)?.[1] || '';
            } else if (p.startsWith('data:image/')) {
              imgSrc = p.trim();
            }

            if (imgSrc) {
              return (
                <div key={idx} className="my-4 flex flex-col items-center justify-center w-full select-none">
                  <img
                    src={imgSrc}
                    alt={`Page ${currentPage}`}
                    className="max-w-full max-h-[80vh] w-auto h-auto object-contain block mx-auto"
                  />
                </div>
              );
            }
          }

          if (p.startsWith('[CHART_BLOCK]')) {
            const rawJson = p.replace('[CHART_BLOCK]', '').trim();
            try {
              const chartData = JSON.parse(rawJson) as ChartBlockPayload;
              if (chartData && chartData.img) {
                return (
                  <figure
                    key={idx}
                    data-block-index={idx}
                    className="my-5 rounded-xl border p-2.5 sm:p-4 flex flex-col items-center justify-center w-full shadow-xs"
                    style={{
                      backgroundColor: currentTheme.cardBg,
                      borderColor: currentTheme.border,
                    }}
                  >
                    <div className="w-full overflow-hidden rounded-lg flex items-center justify-center bg-white">
                      <img
                        src={chartData.img}
                        alt={chartData.plainCaption || `Chart on page ${currentPage}`}
                        className="w-full h-auto max-h-[68vh] object-contain block mx-auto select-none"
                        style={{
                          filter: currentTheme.canvasFilter,
                        }}
                      />
                    </div>
                    {chartData.caption && (
                      <figcaption
                        className="mt-2.5 pt-2 border-t w-full text-center text-[0.88em] leading-snug tracking-tight font-medium select-text"
                        style={{
                          color: currentTheme.text,
                          borderColor: currentTheme.border,
                        }}
                      >
                        {renderBlockWithHighlights(chartData.caption, idx)}
                      </figcaption>
                    )}
                  </figure>
                );
              }
            } catch (e) {
              // Fallback if JSON parse fails
            }
          }

          if (p.startsWith('[TABLE_BLOCK]')) {
            const rawJson = p.replace('[TABLE_BLOCK]', '').trim();
            try {
              const tableData = JSON.parse(rawJson) as TableBlockPayload;
              if (tableData && (tableData.rows?.length > 0 || tableData.headers?.length > 0)) {
                return (
                  <div
                    key={idx}
                    data-block-index={idx}
                    className="my-5 rounded-xl border p-3 sm:p-4 w-full shadow-xs text-left"
                    style={{
                      backgroundColor: currentTheme.cardBg,
                      borderColor: currentTheme.border,
                    }}
                  >
                    {tableData.titleRichText && (
                      <div
                        className="text-[0.92em] font-semibold tracking-tight leading-snug pb-2.5 mb-2 border-b"
                        style={{
                          color: currentTheme.text,
                          borderColor: currentTheme.border,
                        }}
                      >
                        {renderBlockWithHighlights(tableData.titleRichText, idx)}
                      </div>
                    )}
                    <div className="w-full overflow-x-auto">
                      <table
                        className="w-full border-collapse text-[0.86em] sm:text-[0.9em] leading-snug"
                        style={{ color: currentTheme.text }}
                      >
                        {tableData.headers && tableData.headers.length > 0 && (
                          <thead>
                            {tableData.headers.map((hRow, hIdx) => (
                              <tr
                                key={`th-row-${hIdx}`}
                                className={
                                  hIdx === tableData.headers.length - 1
                                    ? 'border-b-2'
                                    : 'border-b'
                                }
                                style={{ borderColor: currentTheme.border }}
                              >
                                {hRow.map((cell, cIdx) => {
                                  const align = tableData.colAlignments?.[cIdx] || 'left';
                                  return (
                                    <th
                                      key={`th-${hIdx}-${cIdx}`}
                                      className={`py-1.5 px-2 font-semibold ${
                                        align === 'right'
                                          ? 'text-right tabular-nums'
                                          : align === 'center'
                                          ? 'text-center'
                                          : 'text-left'
                                      }`}
                                    >
                                      {renderBlockWithHighlights(cell, idx)}
                                    </th>
                                  );
                                })}
                              </tr>
                            ))}
                          </thead>
                        )}
                        <tbody>
                          {tableData.rows.map((row, rIdx) => {
                            const nonEmptyCount = row.cells.filter((c) => c.trim().length > 0).length;
                            const isSingleSpanSubheader =
                              row.isSubheader && nonEmptyCount === 1 && row.cells[0]?.trim().length > 0;

                            if (isSingleSpanSubheader) {
                              return (
                                <tr
                                  key={`tr-${rIdx}`}
                                  className="border-b"
                                  style={{ borderColor: `${currentTheme.border}80` }}
                                >
                                  <td
                                    colSpan={Math.max(1, row.cells.length)}
                                    className="pt-2.5 pb-1 px-2 font-semibold text-left"
                                  >
                                    {renderBlockWithHighlights(row.cells[0], idx)}
                                  </td>
                                </tr>
                              );
                            }

                            return (
                              <tr
                                key={`tr-${rIdx}`}
                                className={
                                  rIdx === tableData.rows.length - 1 ? 'border-b-2' : 'border-b'
                                }
                                style={{
                                  borderColor:
                                    rIdx === tableData.rows.length - 1
                                      ? currentTheme.border
                                      : `${currentTheme.border}66`,
                                }}
                              >
                                {row.cells.map((cell, cIdx) => {
                                  const align = tableData.colAlignments?.[cIdx] || 'left';
                                  const indentClass =
                                    cIdx === 0 && row.indentFirstCol ? 'pl-5' : 'px-2';
                                  return (
                                    <td
                                      key={`td-${rIdx}-${cIdx}`}
                                      className={`py-1.5 ${indentClass} ${
                                        align === 'right'
                                          ? 'text-right tabular-nums whitespace-nowrap'
                                          : align === 'center'
                                          ? 'text-center'
                                          : 'text-left'
                                      } ${row.isSubheader ? 'font-semibold' : ''}`}
                                    >
                                      {renderBlockWithHighlights(cell, idx)}
                                    </td>
                                  );
                                })}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              }
            } catch (e) {
              // Fallback if JSON parse fails
            }
          }

          if (p.startsWith('[PAGE_HEADER]')) {
            const rawJson = p.replace('[PAGE_HEADER]', '').trim();
            try {
              const headerData = JSON.parse(rawJson) as PageMarginBlockPayload;
              return (
                <div
                  key={idx}
                  data-block-index={idx}
                  className="w-full flex items-baseline justify-between gap-4 pb-2.5 mb-5 border-b text-[0.82em] sm:text-[0.85em] tracking-wide opacity-90"
                  style={{
                    color: currentTheme.text,
                    borderColor: `${currentTheme.border}99`,
                  }}
                >
                  <div className="text-left font-medium min-w-[2ch]">
                    {headerData.left ? renderBlockWithHighlights(headerData.left, idx) : null}
                  </div>
                  {headerData.center && (
                    <div className="text-center font-medium">
                      {renderBlockWithHighlights(headerData.center, idx)}
                    </div>
                  )}
                  <div className="text-right font-medium min-w-[2ch]">
                    {headerData.right ? renderBlockWithHighlights(headerData.right, idx) : null}
                  </div>
                </div>
              );
            } catch (e) {}
          }

          if (p.startsWith('[PAGE_FOOTER]')) {
            const rawJson = p.replace('[PAGE_FOOTER]', '').trim();
            try {
              const footerData = JSON.parse(rawJson) as PageMarginBlockPayload;
              return (
                <div
                  key={idx}
                  data-block-index={idx}
                  className="w-full flex items-baseline justify-between gap-4 pt-3 mt-6 border-t text-[0.86em] tabular-nums"
                  style={{
                    color: currentTheme.secondaryText,
                    borderColor: `${currentTheme.border}80`,
                  }}
                >
                  <div className="text-left min-w-[2ch]">
                    {footerData.left ? renderBlockWithHighlights(footerData.left, idx) : null}
                  </div>
                  {footerData.center && (
                    <div className="text-center">
                      {renderBlockWithHighlights(footerData.center, idx)}
                    </div>
                  )}
                  <div className="text-right min-w-[2ch]">
                    {footerData.right ? renderBlockWithHighlights(footerData.right, idx) : null}
                  </div>
                </div>
              );
            } catch (e) {}
          }

          if (p.startsWith('[SCENE_BREAK]')) {
            return (
              <div
                key={idx}
                data-block-index={idx}
                className="text-center py-3 my-2 tracking-[0.35em] text-sm opacity-75 select-none"
                style={{ color: currentTheme.secondaryText }}
              >
                * * *
              </div>
            );
          }

          if (p.includes('[RIGHT_HEADING]')) {
            const clean = p.replace('[RIGHT_HEADING]', '').trim();
            return (
              <div key={idx} data-block-index={idx} className="w-full flex justify-end pt-3 pb-2 my-1">
                <div
                  className="inline-block text-right pb-1 border-b-2 tracking-[0.14em] uppercase text-[1.05em] sm:text-[1.12em] font-semibold"
                  style={{
                    color: currentTheme.text,
                    borderColor: currentTheme.text,
                  }}
                >
                  {renderBlockWithHighlights(clean, idx)}
                </div>
              </div>
            );
          }

          if (p.includes('[CHAPTER_TITLE]')) {
            const clean = p.replace('[CHAPTER_TITLE]', '').trim();
            return (
              <div key={idx} data-block-index={idx} className="text-left pt-3 pb-4 mb-3">
                <h2
                  className="inline-block min-w-[55%] pb-2 border-b-2 text-[1.45em] sm:text-[1.62em] font-bold tracking-tight leading-snug"
                  style={{
                    color: currentTheme.text,
                    borderColor: currentTheme.text,
                  }}
                >
                  {renderBlockWithHighlights(clean, idx)}
                </h2>
              </div>
            );
          }

          if (p.includes('[CENTERED_HEADING]')) {
            const clean = p.replace('[CENTERED_HEADING]', '').trim();
            return (
              <div key={idx} data-block-index={idx} className="text-center pt-4 pb-3 my-1">
                <h2
                  className="text-[1.28em] sm:text-[1.38em] font-bold tracking-tight leading-snug"
                  style={{ color: currentTheme.text }}
                >
                  {renderBlockWithHighlights(clean, idx)}
                </h2>
              </div>
            );
          }

          if (p.includes('[HEADING]')) {
            const clean = p.replace('[HEADING]', '').trim();
            return (
              <div key={idx} data-block-index={idx} className="text-left pt-4 pb-2.5">
                <h3
                  className="text-[1.18em] sm:text-[1.26em] font-bold tracking-tight leading-snug"
                  style={{ color: currentTheme.text }}
                >
                  {renderBlockWithHighlights(clean, idx)}
                </h3>
              </div>
            );
          }

          if (p.includes('[SUBHEADING]')) {
            const clean = p.replace('[SUBHEADING]', '').trim();
            return (
              <div key={idx} data-block-index={idx} className="text-left pt-3 pb-1.5">
                <h4
                  className="text-[1.06em] font-semibold tracking-tight leading-snug"
                  style={{ color: currentTheme.text }}
                >
                  {renderBlockWithHighlights(clean, idx)}
                </h4>
              </div>
            );
          }

          if (p.includes('[BLOCKQUOTE]')) {
            const clean = p.replace('[BLOCKQUOTE]', '').trim();
            return (
              <blockquote
                key={idx}
                data-block-index={idx}
                className="my-3.5 pl-4 pr-2 border-l-2 italic text-justify leading-relaxed opacity-95"
                style={{
                  color: currentTheme.text,
                  borderColor: currentTheme.border,
                  lineHeight,
                }}
              >
                {renderBlockWithHighlights(clean, idx)}
              </blockquote>
            );
          }

          if (p.includes('[LIST_ITEM]')) {
            const clean = p.replace('[LIST_ITEM]', '').trim();
            return (
              <div
                key={idx}
                data-block-index={idx}
                className="mb-2 pl-5 -indent-3.5 text-left leading-relaxed"
                style={{
                  color: currentTheme.text,
                  lineHeight,
                }}
              >
                {renderBlockWithHighlights(clean, idx)}
              </div>
            );
          }

          if (p.includes('[VERSE_LINE]')) {
            const clean = p.replace('[VERSE_LINE]', '').trim();
            return (
              <div
                key={idx}
                data-block-index={idx}
                className="mb-1.5 px-4 text-center italic leading-relaxed"
                style={{
                  color: currentTheme.text,
                  lineHeight,
                }}
              >
                {renderBlockWithHighlights(clean, idx)}
              </div>
            );
          }

          if (p.includes('[FOOTNOTE]')) {
            const clean = p.replace('[FOOTNOTE]', '').trim();
            const prevP = paragraphs[idx - 1] || '';
            const isFirstFootnote = !prevP.includes('[FOOTNOTE]');
            return (
              <div
                key={idx}
                data-block-index={idx}
                className={`${isFirstFootnote ? 'mt-6 pt-3 border-t' : 'mt-1.5'} mb-1.5 text-[0.80em] sm:text-[0.83em] text-left leading-snug opacity-90`}
                style={{
                  color: currentTheme.text,
                  borderColor: `${currentTheme.border}99`,
                }}
              >
                {renderBlockWithHighlights(clean, idx)}
              </div>
            );
          }

          if (p.includes('[INDENT_PARAGRAPH]')) {
            const clean = p.replace('[INDENT_PARAGRAPH]', '').trim();
            const nextP = paragraphs[idx + 1] || '';
            const nextIsIndented = nextP.includes('[INDENT_PARAGRAPH]');
            return (
              <p
                key={idx}
                data-block-index={idx}
                className={`${nextIsIndented ? 'mb-2' : 'mb-3.5'} indent-6 sm:indent-8 text-justify leading-relaxed`}
                style={{
                  color: currentTheme.text,
                  hyphens: 'none',
                  WebkitHyphens: 'none',
                  lineHeight,
                }}
              >
                {renderBlockWithHighlights(clean, idx)}
              </p>
            );
          }

          return (
            <p
              key={idx}
              data-block-index={idx}
              className="mb-3.5 text-justify leading-relaxed"
              style={{
                color: currentTheme.text,
                hyphens: 'none',
                WebkitHyphens: 'none',
                lineHeight,
              }}
            >
              {renderBlockWithHighlights(p, idx)}
            </p>
          );
        })}
      </div>
    );
  };

  const fontClass =
    fontFamily === 'literata'
      ? 'font-literata'
      : fontFamily === 'classic-serif'
      ? 'font-classic-serif'
      : fontFamily === 'newsreader'
      ? 'font-newsreader'
      : fontFamily === 'garamond'
      ? 'font-garamond'
      : fontFamily === 'lora'
      ? 'font-lora'
      : 'font-sans-ui';

  const marginClass =
    margins === 'compact'
      ? 'px-4 sm:px-6'
      : margins === 'spacious'
      ? 'px-6 sm:px-16'
      : 'px-5 sm:px-10';

  return (
    <div
      id="reading-root"
      className={`relative w-full h-full flex flex-col justify-between select-text transition-colors duration-200 ${fontClass}`}
      style={{
        backgroundColor: currentTheme.bg,
        color: currentTheme.text,
      }}
    >
      {/* Top Bar */}
      <header
        className="h-11 sm:h-12 px-2.5 sm:px-6 flex items-center justify-between gap-1.5 sm:gap-3 border-b shrink-0 font-sans z-30 select-none"
        style={{
          backgroundColor: currentTheme.bg,
          borderColor: currentTheme.border,
          color: currentTheme.text,
        }}
      >
        {/* Left: Library Return + Title */}
        <div className="flex items-center gap-2.5 shrink-0 lg:shrink lg:min-w-0">
          <button
            onClick={onBackToDashboard}
            className="text-[11px] sm:text-xs font-medium px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg bg-[#383633] text-[#EAE8E2] border border-[#2B2A27] hover:opacity-90 transition cursor-pointer whitespace-nowrap shrink-0"
          >
            Library
          </button>

          <h1 className="hidden lg:block text-xs sm:text-sm font-medium truncate max-w-[220px] xl:max-w-[340px]">
            {book.title}
          </h1>
        </div>

        {/* Center: Mode Switcher */}
        <div className="flex items-center bg-black/10 p-0.5 rounded-lg text-xs shrink-0 border border-current/20">
          <button
            onClick={() => handleSelectReadingMode('reflow-ereader')}
            className={`px-2.5 sm:px-3 py-1 rounded-md text-[11px] font-medium transition cursor-pointer whitespace-nowrap ${
              readingMode === 'reflow-ereader'
                ? 'bg-[#383633] text-[#EAE8E2]'
                : 'opacity-75 hover:opacity-100'
            }`}
          >
            Reflow
          </button>

          <button
            onClick={() => handleSelectReadingMode('original-pdf')}
            className={`px-2.5 sm:px-3 py-1 rounded-md text-[11px] font-medium transition cursor-pointer whitespace-nowrap ${
              readingMode === 'original-pdf'
                ? 'bg-[#383633] text-[#EAE8E2]'
                : 'opacity-75 hover:opacity-100'
            }`}
          >
            <span className="sm:hidden">PDF</span>
            <span className="hidden sm:inline">Original PDF</span>
          </button>
        </div>

        {/* Right: Essential Reading Tools */}
        <div className="flex items-center gap-0.5 sm:gap-1.5 shrink-0">
          <button
            onClick={() => setIsNotesModalOpen(true)}
            className="px-2 sm:px-2.5 py-1 rounded-md text-[11px] sm:text-xs font-medium hover:bg-black/5 dark:hover:bg-white/10 transition cursor-pointer whitespace-nowrap"
          >
            Notes{book.highlights && book.highlights.length > 0 ? ` (${book.highlights.length})` : ''}
          </button>

          <button
            onClick={handleToggleBookmark}
            className={`p-1.5 rounded-md text-xs transition cursor-pointer ${
              isBookmarked
                ? 'text-amber-500 font-semibold'
                : 'opacity-75 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/10'
            }`}
            title={isBookmarked ? 'Bookmarked' : 'Bookmark Page'}
          >
            <BookmarkIcon size={14} className={isBookmarked ? 'fill-current' : ''} />
          </button>

          <button
            onClick={() => setActiveMenu(activeMenu === 'theme' ? null : 'theme')}
            className={`px-2 sm:px-2.5 py-1 rounded-md text-[11px] sm:text-xs font-semibold transition cursor-pointer ${
              activeMenu === 'theme'
                ? 'bg-black/10 dark:bg-white/20'
                : 'hover:bg-black/5 dark:hover:bg-white/10'
            }`}
            title="Typography & Theme"
          >
            Aa
          </button>

          <button
            onClick={() => setActiveMenu(activeMenu === 'toc' ? null : 'toc')}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition cursor-pointer hidden md:inline-flex ${
              activeMenu === 'toc'
                ? 'bg-black/10 dark:bg-white/20 font-semibold'
                : 'hover:bg-black/5 dark:hover:bg-white/10'
            }`}
          >
            Pages
          </button>

          <button
            onClick={toggleFullscreen}
            className="p-1.5 rounded-md text-xs opacity-75 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/10 transition cursor-pointer"
            title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
          >
            {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>
        </div>
      </header>

      {/* Typography & Theme Popover */}
      {activeMenu === 'theme' && (
        <div
          className="absolute top-12 right-3 sm:right-6 z-50 w-72 sm:w-80 rounded-lg shadow-xl border p-4 font-sans space-y-4 text-xs max-h-[82vh] overflow-y-auto"
          style={{
            backgroundColor: currentTheme.cardBg,
            borderColor: currentTheme.border,
            color: currentTheme.text,
          }}
        >
          <div>
            <div className="font-semibold text-xs mb-2">Page Theme</div>
            <div className="grid grid-cols-2 gap-1.5">
              {(
                [
                  { id: 'dark', label: 'Dark' },
                  { id: 'light', label: 'Daylight' },
                  { id: 'warm-sepia', label: 'Warm Cream' },
                  { id: 'sepia', label: 'Sepia' },
                  { id: 'amber-glow', label: 'Amber' },
                  { id: 'emerald-paper', label: 'Sage' },
                ] as const
              ).map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTheme(t.id)}
                  className={`px-3 py-2 rounded border text-left flex items-center justify-between transition cursor-pointer ${
                    theme === t.id ? 'border-current font-semibold' : 'border-transparent bg-black/5 dark:bg-white/5'
                  }`}
                >
                  <span>{t.label}</span>
                  {theme === t.id && <Check size={12} />}
                </button>
              ))}
            </div>
          </div>

          {eyeProtection && onChangeEyeProtection && (
            <div className="pt-3 border-t space-y-2" style={{ borderColor: currentTheme.border }}>
              <div className="flex items-center justify-between">
                <span className="font-semibold">Warm Light</span>
                <span className="font-mono tabular-nums">{eyeProtection.warmth}/24</span>
              </div>
              <input
                type="range"
                min="0"
                max="24"
                value={eyeProtection.warmth}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  onChangeEyeProtection({
                    ...eyeProtection,
                    enabled: val > 0,
                    warmth: val,
                  });
                }}
                className="w-full h-1.5 rounded-lg appearance-none cursor-pointer accent-current bg-black/15 dark:bg-white/20"
              />
            </div>
          )}

          {readingMode === 'reflow-ereader' && (
            <>
              <div className="pt-3 border-t" style={{ borderColor: currentTheme.border }}>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold">Font Size</span>
                  <span className="font-mono tabular-nums">{fontSize}px</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setFontSize((s) => Math.max(13, s - 1))}
                    className="flex-1 py-1.5 rounded border font-semibold text-xs hover:bg-black/5 dark:hover:bg-white/10 transition cursor-pointer"
                    style={{ borderColor: currentTheme.border }}
                  >
                    A-
                  </button>
                  <button
                    onClick={() => setFontSize((s) => Math.min(28, s + 1))}
                    className="flex-1 py-1.5 rounded border font-semibold text-xs hover:bg-black/5 dark:hover:bg-white/10 transition cursor-pointer"
                    style={{ borderColor: currentTheme.border }}
                  >
                    A+
                  </button>
                </div>
              </div>

              <div className="pt-3 border-t" style={{ borderColor: currentTheme.border }}>
                <div className="font-semibold mb-2">Typeface</div>
                <div className="grid grid-cols-2 gap-1.5">
                  {(
                    [
                      { id: 'literata', label: 'Literata' },
                      { id: 'classic-serif', label: 'Classic Serif' },
                      { id: 'newsreader', label: 'Newsreader' },
                      { id: 'garamond', label: 'Garamond' },
                      { id: 'lora', label: 'Lora' },
                      { id: 'sans', label: 'Sans' },
                    ] as const
                  ).map((f) => (
                    <button
                      key={f.id}
                      onClick={() => setFontFamily(f.id)}
                      className={`px-2.5 py-1.5 rounded text-left transition cursor-pointer text-xs ${
                        fontFamily === f.id
                          ? 'bg-black/10 dark:bg-white/20 font-semibold'
                          : 'hover:bg-black/5 dark:hover:bg-white/5'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t space-y-2" style={{ borderColor: currentTheme.border }}>
                <div className="flex items-center justify-between">
                  <span className="font-semibold">Margins</span>
                  <div className="flex gap-1">
                    {(['compact', 'normal', 'spacious'] as const).map((m) => (
                      <button
                        key={m}
                        onClick={() => setMargins(m)}
                        className={`px-2 py-0.5 text-[11px] capitalize rounded cursor-pointer ${
                          margins === m ? 'bg-black/10 dark:bg-white/20 font-semibold' : 'opacity-70'
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="font-semibold">Line Spacing</span>
                  <div className="flex gap-1">
                    {[
                      { label: 'Tight', val: 1.4 },
                      { label: 'Normal', val: 1.65 },
                      { label: 'Relaxed', val: 1.85 },
                    ].map((ls) => (
                      <button
                        key={ls.label}
                        onClick={() => setLineHeight(ls.val)}
                        className={`px-2 py-0.5 text-[11px] rounded cursor-pointer ${
                          lineHeight === ls.val ? 'bg-black/10 dark:bg-white/20 font-semibold' : 'opacity-70'
                        }`}
                      >
                        {ls.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Pages & Bookmarks Popover */}
      {activeMenu === 'toc' && (
        <div
          className="absolute top-12 right-3 sm:right-6 z-50 w-68 max-h-96 overflow-y-auto rounded-lg shadow-xl border p-4 font-sans space-y-3 text-xs"
          style={{
            backgroundColor: currentTheme.cardBg,
            borderColor: currentTheme.border,
            color: currentTheme.text,
          }}
        >
          <div className="font-semibold border-b pb-1.5" style={{ borderColor: currentTheme.border }}>
            Jump to Page
          </div>

          <div className="grid grid-cols-5 gap-1.5 max-h-48 overflow-y-auto pr-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((pNum) => (
              <button
                key={pNum}
                onClick={() => {
                  setCurrentPage(pNum);
                  setActiveMenu(null);
                }}
                className={`p-1.5 rounded text-center font-mono tabular-nums text-xs transition cursor-pointer ${
                  currentPage === pNum
                    ? 'bg-stone-900 text-white dark:bg-white dark:text-stone-900 font-semibold'
                    : 'hover:bg-black/5 dark:hover:bg-white/10'
                }`}
              >
                {pNum}
              </button>
            ))}
          </div>

          {book.bookmarks && book.bookmarks.length > 0 && (
            <div className="pt-2 border-t space-y-1" style={{ borderColor: currentTheme.border }}>
              <div className="text-[11px] font-semibold opacity-75">Bookmarks</div>
              {book.bookmarks.map((bm) => (
                <button
                  key={bm.id}
                  onClick={() => {
                    setCurrentPage(bm.pageNumber);
                    setActiveMenu(null);
                  }}
                  className="w-full text-left p-1.5 rounded hover:bg-black/5 dark:hover:bg-white/10 flex items-center justify-between text-xs cursor-pointer"
                >
                  <span>Page {bm.pageNumber}</span>
                  <span className="text-[10px] opacity-60">{bm.label || 'Saved'}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Reading Viewport */}
      <main
        ref={containerRef}
        onClick={() => {
          if (activeMenu) setActiveMenu(null);
        }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className="relative flex-1 w-full h-full flex items-center justify-center overflow-hidden touch-pan-y"
      >
        {readingMode === 'original-pdf' && isPdf ? (
          <div
            onWheel={handlePdfWheel}
            onTouchStart={handlePdfTouchStart}
            onTouchMove={handlePdfTouchMove}
            onTouchEnd={handlePdfTouchEnd}
            className="w-full h-full flex flex-col items-center justify-start p-3 sm:p-6 overflow-auto relative z-10 no-scrollbar touch-pan-x touch-pan-y reader-selectable"
            style={{
              backgroundColor: currentTheme.bg,
            }}
          >
            <div
              className={`my-auto flex items-center justify-center max-w-full ${
                layoutMode === 'dual' && !isMobile ? 'flex-row gap-4 sm:gap-6' : 'flex-col'
              }`}
              style={
                isPinching && livePinchScale !== 1
                  ? {
                      transform: `scale(${livePinchScale})`,
                      transformOrigin: 'center center',
                    }
                  : undefined
              }
            >
              <div
                className="relative shadow-md rounded-xs overflow-hidden border select-text reader-selectable"
                style={{
                  backgroundColor: currentTheme.cardBg,
                  borderColor: currentTheme.border,
                }}
              >
                <canvas
                  ref={canvasRef}
                  className="max-w-none h-auto block select-none pointer-events-none"
                  style={{
                    filter: currentTheme.canvasFilter !== 'none' ? currentTheme.canvasFilter : undefined,
                    display: 'block',
                  }}
                />
                <div
                  ref={textLayerRef}
                  onContextMenu={(e) => e.preventDefault()}
                  className="pdf-text-layer absolute inset-0 overflow-hidden pointer-events-auto select-text reader-selectable z-10"
                />
              </div>

              {layoutMode === 'dual' && !isMobile && currentPage + 1 <= totalPages && (
                <div
                  className="relative shadow-lg rounded-xs overflow-hidden border border-black/15 dark:border-white/15 select-text"
                  style={{ backgroundColor: currentTheme.bg }}
                >
                  <canvas
                    ref={dualCanvasRef}
                    className="max-w-none h-auto block"
                    style={{
                      filter: currentTheme.canvasFilter !== 'none' ? currentTheme.canvasFilter : undefined,
                      display: 'block',
                    }}
                  />
                  <div
                    ref={dualTextLayerRef}
                    onContextMenu={(e) => e.preventDefault()}
                    className="pdf-text-layer absolute inset-0 overflow-hidden pointer-events-auto select-text z-10"
                  />
                </div>
              )}

              {pdfLoading && !pdfDoc && (
                <div className="fixed inset-0 flex items-center justify-center bg-black/25 text-xs font-sans text-white font-medium gap-2 z-30 pointer-events-none">
                  <RefreshCw size={15} className="animate-spin text-white" />
                  <span>Loading PDF...</span>
                </div>
              )}

              {pdfRenderError && !pdfRendering && !pdfLoading && (
                <div className="p-6 text-center space-y-3.5 bg-stone-900 text-white rounded-xl shadow-lg border border-stone-700 max-w-sm">
                  <p className="text-xs text-stone-300 leading-relaxed">{pdfRenderError}</p>
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => reattachInputRef.current?.click()}
                      className="w-full sm:w-auto px-4 py-2 bg-white text-black rounded-md text-xs font-semibold hover:bg-stone-200 transition cursor-pointer"
                    >
                      Select PDF File
                    </button>
                    <button
                      type="button"
                      onClick={() => setReadingMode('reflow-ereader')}
                      className="w-full sm:w-auto px-3.5 py-2 bg-stone-800 text-stone-200 border border-stone-600 rounded-md text-xs font-medium hover:bg-stone-700 transition cursor-pointer"
                    >
                      Switch to Reflow
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* PDF Zoom & Layout Control Bar (Single-purpose, no duplicate page counter) */}
            <div className="fixed bottom-11 left-1/2 -translate-x-1/2 z-40 flex items-center gap-1.5 px-3 py-1.5 bg-stone-900/95 text-white rounded-md shadow-lg border border-white/15 text-xs font-sans">
              <button
                onClick={() => {
                  setPdfZoomMode('custom');
                  setPdfCustomZoomScale((z) => Math.max(0.4, Number((z - 0.2).toFixed(2))));
                }}
                className="p-1 hover:bg-white/15 rounded transition cursor-pointer"
                title="Zoom Out"
              >
                <ZoomOut size={14} />
              </button>

              <button
                onClick={() => {
                  setPdfZoomMode(pdfZoomMode === 'fit-width' ? 'fit-page' : 'fit-width');
                  setPdfCustomZoomScale(1.0);
                }}
                className="text-[10px] font-mono px-1.5 py-0.5 hover:bg-white/15 rounded transition cursor-pointer whitespace-nowrap"
              >
                {pdfZoomMode === 'fit-width'
                  ? 'Fit Width'
                  : pdfZoomMode === 'fit-page'
                  ? 'Fit Page'
                  : `${Math.round(pdfCustomZoomScale * 100)}%`}
              </button>

              <button
                onClick={() => {
                  setPdfZoomMode('custom');
                  setPdfCustomZoomScale((z) => Math.min(4.0, Number((z + 0.2).toFixed(2))));
                }}
                className="p-1 hover:bg-white/15 rounded transition cursor-pointer"
                title="Zoom In"
              >
                <ZoomIn size={14} />
              </button>

              <button
                onClick={() => setPdfRotation((r) => (r + 90) % 360)}
                className="p-1 hover:bg-white/15 rounded transition cursor-pointer"
                title="Rotate 90°"
              >
                <RotateCw size={13} />
              </button>

              {!isMobile && totalPages > 1 && (
                <button
                  onClick={() => setLayoutMode(layoutMode === 'single' ? 'dual' : 'single')}
                  className={`p-1 rounded transition cursor-pointer ${
                    layoutMode === 'dual' ? 'bg-white/25' : 'hover:bg-white/15'
                  }`}
                  title={layoutMode === 'dual' ? 'Single Page' : 'Two-Page Spread'}
                >
                  {layoutMode === 'dual' ? <Square size={13} /> : <Columns size={13} />}
                </button>
              )}
            </div>
            <input
              ref={reattachInputRef}
              type="file"
              accept=".pdf,application/pdf"
              className="hidden"
              onChange={handleReattachPdfFile}
            />
          </div>
        ) : (
          /* Reflow Paper-Ink Sheet Mode */
          <div
            className={`w-full max-w-[760px] h-full flex flex-col justify-between py-5 sm:py-8 ${marginClass} sm:border-x select-text reflow-reader-content relative z-10 overflow-hidden transition-colors duration-200`}
            style={{
              backgroundColor: currentTheme.cardBg,
              borderColor: currentTheme.border,
            }}
          >
            <input
              ref={reattachInputRef}
              type="file"
              accept=".pdf,application/pdf"
              className="hidden"
              onChange={handleReattachPdfFile}
            />

            {(isExtractingText || pdfLoading) && (
              <div className="text-xs opacity-70 font-sans flex items-center gap-1.5 mb-2">
                <RefreshCw size={12} className="animate-spin" />
                <span>{pdfLoading ? 'Syncing PDF document...' : `Formatting page ${currentPage}...`}</span>
              </div>
            )}

            {pdfRenderError && !pdfDoc && !pdfLoading && (!book.contentPages || book.contentPages.length === 0) && (
              <div className="my-auto mx-auto p-6 text-center space-y-3 bg-stone-900 text-white rounded-xl shadow-lg border border-stone-700 max-w-sm font-sans">
                <p className="text-xs text-stone-300 leading-relaxed">{pdfRenderError}</p>
                <button
                  type="button"
                  onClick={() => reattachInputRef.current?.click()}
                  className="px-4 py-2 bg-white text-black rounded-md text-xs font-semibold hover:bg-stone-200 transition cursor-pointer"
                >
                  Select PDF File
                </button>
              </div>
            )}

            <div className="w-full flex-1 relative overflow-hidden flex flex-col justify-start reflow-reader-content">
              <AnimatePresence initial={false} custom={slideDirection} mode="wait">
                <motion.div
                  key={currentPage}
                  custom={slideDirection}
                  variants={{
                    enter: (dir: 'next' | 'prev') => ({
                      x: dir === 'next' ? 36 : -36,
                      opacity: 0,
                    }),
                    center: {
                      x: 0,
                      opacity: 1,
                      transition: {
                        x: { type: 'spring', stiffness: 450, damping: 36 },
                        opacity: { duration: 0.14 },
                      },
                    },
                    exit: (dir: 'next' | 'prev') => ({
                      x: dir === 'next' ? -36 : 36,
                      opacity: 0,
                      transition: {
                        x: { type: 'spring', stiffness: 450, damping: 36 },
                        opacity: { duration: 0.1 },
                      },
                    }),
                  }}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  className="w-full flex-1 flex flex-col justify-start leading-relaxed text-justify select-text reflow-reader-content no-scrollbar overflow-y-auto cursor-text touch-pan-y"
                  style={{
                    fontSize: `${fontSize}px`,
                    lineHeight,
                    color: currentTheme.text,
                  }}
                >
                  {renderReflowContent()}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        )}
      </main>

      {/* Footer Status Bar */}
      <footer
        className="h-9 px-4 sm:px-8 flex items-center justify-between font-sans text-xs select-none shrink-0 z-30 border-t"
        style={{
          color: currentTheme.secondaryText,
          backgroundColor: currentTheme.bg,
          borderColor: currentTheme.footerBorder,
        }}
      >
        <div className="font-mono text-[11px] tabular-nums">
          Page {currentPage} of {totalPages}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handlePrevPage}
            disabled={currentPage <= 1}
            className="p-1 rounded opacity-70 hover:opacity-100 disabled:opacity-20 cursor-pointer transition"
          >
            <ChevronLeft size={13} />
          </button>

          <input
            type="range"
            min="1"
            max={totalPages}
            value={currentPage}
            onChange={(e) => setCurrentPage(parseInt(e.target.value, 10))}
            className="reader-slider w-20 sm:w-32 cursor-pointer"
          />

          <button
            onClick={handleNextPage}
            disabled={currentPage >= totalPages}
            className="p-1 rounded opacity-70 hover:opacity-100 disabled:opacity-20 cursor-pointer transition"
          >
            <ChevronRight size={13} />
          </button>
        </div>

        <div className="font-mono text-[11px] font-semibold tabular-nums">
          {progressPercent}%
        </div>
      </footer>

      {activeSelection && (
        <AnnotationToolbar
          selection={activeSelection}
          onHighlight={handleApplyHighlight}
          onApplyHighlight={handleApplyHighlight}
          onUpdateHighlight={handleUpdateHighlightInternal}
          onDeleteHighlight={handleDeleteHighlightInternal}
          onClose={() => {
            setActiveSelection(null);
            try {
              window.getSelection()?.removeAllRanges();
            } catch (e) {}
          }}
        />
      )}

      <NotesAndHighlightsModal
        isOpen={isNotesModalOpen}
        onClose={() => setIsNotesModalOpen(false)}
        book={book}
        bookTitle={book.title}
        currentPage={currentPage}
        highlights={book.highlights || []}
        onJumpToPage={(pageNum) => {
          setCurrentPage(pageNum);
          setIsNotesModalOpen(false);
        }}
        onDeleteHighlight={handleDeleteHighlightInternal}
        onEditHighlight={handleUpdateHighlightInternal}
        onAddStandaloneNote={(pageNum, noteText) => {
          const newHl: Highlight = {
            id: `hl-note-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            pageNumber: pageNum,
            text: '',
            color: '#facc15',
            note: noteText,
            createdAt: new Date().toISOString(),
          };
          onAddHighlight(book.id, newHl);
        }}
        onSaveNotesPdfToLibrary={onSaveNotesPdfToLibrary}
      />
    </div>
  );
};
