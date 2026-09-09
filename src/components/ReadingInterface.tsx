import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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
  Type,
  Bookmark as BookmarkIcon,
  List,
  Home,
  Check,
  ShieldCheck,
  BookOpen,
  Layers,
  ZoomIn,
  ZoomOut,
  RefreshCw,
  Sun,
  Moon,
  Columns,
  Square,
  Activity,
  Image as ImageIcon,
  Eye,
  EyeOff,
  RotateCcw,
  RotateCw,
  Highlighter,
  MessageSquare,
} from 'lucide-react';
import { pdfjsLib } from '../utils/pdfSetup';
import { getPdfFromStorage, getPdfBlobUrl } from '../utils/pdfStorage';
import { SAMPLE_BOOK_ILLUSTRATIONS, RenderIllustration, PageIllustrationData } from './PageIllustrations';
import { KindleAnnotationToolbar, SelectionRangeData, HIGHLIGHT_COLORS } from './KindleAnnotationToolbar';
import { NotesAndHighlightsModal } from './NotesAndHighlightsModal';

interface ReadingInterfaceProps {
  book: Book;
  onBackToDashboard: () => void;
  onUpdateProgress: (bookId: string, page: number, secondsRead: number) => void;
  onAddBookmark: (bookId: string, page: number) => void;
  onAddHighlight: (bookId: string, highlight: Highlight) => void;
  onUpdateHighlight?: (bookId: string, highlight: Highlight) => void;
  onDeleteHighlight?: (bookId: string, highlightId: string) => void;
  eyeProtection?: EyeProtectionSettings;
  onChangeEyeProtection?: (settings: EyeProtectionSettings) => void;
  onOpenThemeModal?: () => void;
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
    bg: '#ECEAE4',
    text: '#121212',
    secondaryText: '#5A5852',
    border: '#D0CEC6',
    footerBorder: '#D8D6CF',
    cardBg: '#F5F4EE',
    canvasFilter: 'none',
    isDark: false,
  },
  dark: {
    bg: '#121212',
    text: '#E5E4E0',
    secondaryText: '#8A8882',
    border: '#2C2B29',
    footerBorder: '#1A1A1A',
    cardBg: '#1A1A1A',
    canvasFilter: 'invert(0.92) hue-rotate(180deg) contrast(1.05)',
    isDark: true,
  },
  sepia: {
    bg: '#f4ecd8',
    text: '#3c2f1f',
    secondaryText: '#7d6b53',
    border: '#e2d5bd',
    footerBorder: '#ebdcc2',
    cardBg: '#eae1cc',
    canvasFilter: 'sepia(0.35) contrast(0.98)',
    isDark: false,
  },
  'warm-sepia': {
    bg: '#fcf7e9',
    text: '#2c2825',
    secondaryText: '#786e65',
    border: '#eedfce',
    footerBorder: '#f4e9db',
    cardBg: '#f3ede0',
    canvasFilter: 'sepia(0.2) contrast(0.98)',
    isDark: false,
  },
  'amber-glow': {
    bg: '#faeed2',
    text: '#302416',
    secondaryText: '#8c6b45',
    border: '#ebd3a5',
    footerBorder: '#f2dcaf',
    cardBg: '#f0e2c2',
    canvasFilter: 'sepia(0.45) saturate(1.2) contrast(0.95)',
    isDark: false,
  },
  'emerald-paper': {
    bg: '#edf5f0',
    text: '#192b20',
    secondaryText: '#547360',
    border: '#d1e6d8',
    footerBorder: '#dceee2',
    cardBg: '#e1ede5',
    canvasFilter: 'hue-rotate(30deg) sepia(0.15)',
    isDark: false,
  },
};

export const ReadingInterface: React.FC<ReadingInterfaceProps> = ({
  book,
  onBackToDashboard,
  onUpdateProgress,
  onAddBookmark,
  onAddHighlight,
  onUpdateHighlight,
  onDeleteHighlight,
  eyeProtection,
  onChangeEyeProtection,
  onOpenThemeModal,
}) => {
  const [currentPage, setCurrentPage] = useState<number>(book.currentPage || 1);
  const [totalPages, setTotalPages] = useState<number>(book.totalPages || 1);
  const [readingMode, setReadingMode] = useState<PdfReadingMode>(
    book.preferredReadingMode || 'reflow-ereader'
  );
  
  // Display layout mode: single page (standard mobile/tablet/PC) or two-page spread (tablet/desktop)
  const [layoutMode, setLayoutMode] = useState<'single' | 'dual'>('single');
  const [preserveChartColorsInDarkMode, setPreserveChartColorsInDarkMode] = useState<boolean>(true);
  
  // Google PDF Viewer style zoom & orientation settings
  const [pdfZoomMode, setPdfZoomMode] = useState<'fit-width' | 'fit-page' | 'custom' | '100%'>('fit-width');
  const [pdfCustomZoomScale, setPdfCustomZoomScale] = useState<number>(1.0);
  const [pdfRotation, setPdfRotation] = useState<number>(0);
  const [livePinchScale, setLivePinchScale] = useState<number>(1.0);
  const [isPinching, setIsPinching] = useState<boolean>(false);
  const [pageInputVal, setPageInputVal] = useState<string>(`${book.currentPage || 1}`);
  const [containerDimensions, setContainerDimensions] = useState<{ width: number; height: number }>({
    width: typeof window !== 'undefined' ? window.innerWidth : 800,
    height: typeof window !== 'undefined' ? window.innerHeight : 600,
  });

  // Typography & Themes: default to Kindle Dark Mode matching user's Kindle screenshot
  const [theme, setTheme] = useState<ThemeMode>('dark');
  const [fontSize, setFontSize] = useState<number>(14.5);
  const [fontFamily, setFontFamily] = useState<FontOption>('literata');
  const [lineHeight, setLineHeight] = useState<number>(1.6);
  const [margins, setMargins] = useState<'compact' | 'normal' | 'spacious'>('normal');
  const [activeMenu, setActiveMenu] = useState<'theme' | 'toc' | null>(null);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [zoomedFigure, setZoomedFigure] = useState<{
    title: string;
    desc: string;
    type: string;
    imageUrl?: string;
    isPdfPage?: boolean;
  } | null>(null);
  const [modalZoomScale, setModalZoomScale] = useState<number>(1.0);
  const [modalInvertColors, setModalInvertColors] = useState<boolean>(false);
  
  // Reflow Image Cache & Visual Toggles
  const [pdfPageImageCache, setPdfPageImageCache] = useState<Record<number, string>>({});
  const [showReflowVisuals, setShowReflowVisuals] = useState<boolean>(true);
  
  // PDF state
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [pdfLoading, setPdfLoading] = useState<boolean>(false);
  const [pdfRendering, setPdfRendering] = useState<boolean>(false);
  const [pdfRenderError, setPdfRenderError] = useState<string | null>(null);
  const [extractedTextCache, setExtractedTextCache] = useState<Record<number, string>>({});
  const [isExtractingText, setIsExtractingText] = useState<boolean>(false);
  const [slideDirection, setSlideDirection] = useState<'next' | 'prev'>('next');

  // Touch swipe coordinates
  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);
  const progressTimerRef = useRef<NodeJS.Timeout | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dualCanvasRef = useRef<HTMLCanvasElement>(null);
  const textLayerRef = useRef<HTMLDivElement>(null);
  const dualTextLayerRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const currentRenderTaskRef = useRef<any>(null);
  const dualRenderTaskRef = useRef<any>(null);

  // Kindle Highlights & Annotations Selection State
  const [activeSelection, setActiveSelection] = useState<SelectionRangeData | null>(null);
  const [isNotesModalOpen, setIsNotesModalOpen] = useState<boolean>(false);

  const currentTheme = THEME_CONFIGS[theme] || THEME_CONFIGS['dark'];
  const isPdf = book.format === 'pdf';

  // Responsive device classification
  const isMobile = containerDimensions.width < 640;
  const isTablet = containerDimensions.width >= 640 && containerDimensions.width < 1024;

  // Measure container dimensions for responsive auto-fit rendering
  useEffect(() => {
    if (!containerRef.current) return;

    const updateSize = () => {
      if (containerRef.current) {
        const { clientWidth, clientHeight } = containerRef.current;
        if (clientWidth > 0 && clientHeight > 0) {
          setContainerDimensions({ width: clientWidth, height: clientHeight });
        }
      }
    };

    updateSize();
    const observer = new ResizeObserver(() => {
      updateSize();
    });

    observer.observe(containerRef.current);
    window.addEventListener('resize', updateSize);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateSize);
    };
  }, []);

  // 1. Load PDF Document Instance once when opening a PDF book
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
        const rawBytes = await getPdfFromStorage(book.id);
        let source: any = null;

        if (rawBytes && rawBytes.length > 0) {
          source = { data: rawBytes.slice() };
        } else {
          const blobUrl = await getPdfBlobUrl(book.id);
          if (blobUrl) {
            source = blobUrl;
          }
        }

        if (!source) {
          if (!isCancelled) {
            setPdfLoading(false);
            setPdfRenderError('PDF document could not be loaded from storage.');
          }
          return;
        }

        const loadingTask = pdfjsLib.getDocument(source);
        const doc = await loadingTask.promise;

        if (!isCancelled) {
          setPdfDoc(doc);
          if (doc.numPages) {
            setTotalPages(doc.numPages);
          }
          setPdfLoading(false);
        }
      } catch (err: any) {
        console.warn('PDF document load notice:', err);
        if (!isCancelled) {
          setPdfLoading(false);
          setPdfRenderError('Unable to load PDF layout. You can read in Reflow mode.');
        }
      }
    }

    loadPdfDocument();

    return () => {
      isCancelled = true;
    };
  }, [book.id, isPdf]);

  // Sync state on book change
  useEffect(() => {
    const validInitial = Math.max(1, Math.min(book.currentPage || 1, book.totalPages || 1));
    setCurrentPage(validInitial);
    setTotalPages(book.totalPages || 1);
    if (book.preferredReadingMode) {
      setReadingMode(book.preferredReadingMode);
    }
  }, [book.id]);

  // Sync back progress to dashboard on page change
  useEffect(() => {
    onUpdateProgress(book.id, currentPage, 0);
  }, [currentPage, book.id]);

  // Real-time active reading timer: tracks true elapsed seconds while reading and updates telemetry
  const lastActiveTimestampRef = useRef<number>(Date.now());

  useEffect(() => {
    lastActiveTimestampRef.current = Date.now();
    const interval = setInterval(() => {
      const now = Date.now();
      const elapsedSec = Math.floor((now - lastActiveTimestampRef.current) / 1000);
      lastActiveTimestampRef.current = now;
      // Cap at 60s per tick to avoid runaway counts if tab is backgrounded for hours
      if (elapsedSec > 0 && elapsedSec <= 60) {
        onUpdateProgress(book.id, currentPage, elapsedSec);
      }
    }, 5000);

    return () => {
      clearInterval(interval);
      const now = Date.now();
      const elapsedSec = Math.floor((now - lastActiveTimestampRef.current) / 1000);
      if (elapsedSec > 0 && elapsedSec <= 60) {
        onUpdateProgress(book.id, currentPage, elapsedSec);
      }
    };
  }, [book.id, currentPage, onUpdateProgress]);

  // 2. Extract Text on-demand for Reflow Mode without blocking main thread
  useEffect(() => {
    let isCancelled = false;

    async function processPdfPageForReflow() {
      if (!isPdf || !pdfDoc) return;
      if (readingMode !== 'reflow-ereader') return;
      if (extractedTextCache[currentPage]) return;

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
          }).promise;
          return c.toDataURL('image/jpeg', 0.92);
        } catch (e) {
          console.error('Failed to extract PDF page as image', e);
          return '';
        }
      };

      try {
        setIsExtractingText(true);
        const page = await pdfDoc.getPage(currentPage);
        if (isCancelled) return;

        const textContent = await page.getTextContent();
        const styles = (textContent.styles as Record<string, any>) || {};
        const viewport = page.getViewport({ scale: 1.0 });
        const pageWidth = viewport.width || 600;
        const pageMidX = pageWidth / 2;

        // 1. Filter out empty items and extract bounding box coordinates + font styles (Bold / Italic)
        const rawItems = (textContent.items || [])
          .filter((it: any) => it.str && it.str.trim().length > 0)
          .map((it: any) => {
            const str = it.str;
            const x = it.transform[4];
            const y = it.transform[5];
            const fontSize = Math.abs(it.transform[0]) || Math.abs(it.transform[3]) || it.height || 12;
            const width = it.width || (str.length * fontSize * 0.52);
            const height = it.height || fontSize;

            // Extract Font Family & Weight/Style from PDF.js styles dictionary
            const fontName = it.fontName || '';
            const fontObj = styles[fontName] || {};
            const fontDescriptor = `${fontName} ${fontObj.fontFamily || ''}`.toLowerCase();

            const isBold =
              /\b(bold|black|heavy|demi|semibold|medium|cmbx|cmb|bf)\b|[-_+](b|bold|bd|black)\b/i.test(fontDescriptor) ||
              fontDescriptor.includes('bold') ||
              fontDescriptor.includes('black') ||
              fontDescriptor.includes('heavy') ||
              fontDescriptor.includes('semibold') ||
              fontDescriptor.includes('w7') ||
              fontDescriptor.includes('w8') ||
              fontDescriptor.includes('w9');

            const isItalic =
              /\b(italic|oblique|it|sl)\b|[-_+](i|italic|oblique)\b/i.test(fontDescriptor) ||
              fontDescriptor.includes('italic') ||
              fontDescriptor.includes('oblique');

            return { str, x, y, width, height, fontSize, isBold, isItalic };
          });

        if (rawItems.length === 0) {
          // Full image / visual cover page: Extract actual image from PDF
          const pageImgData = await extractPageAsImage(page, 1.6);
          if (!isCancelled) {
            if (pageImgData) {
              setPdfPageImageCache((prev) => ({ ...prev, [currentPage]: pageImgData }));
              setExtractedTextCache((prev) => ({
                ...prev,
                [currentPage]: `[PAGE_IMAGE:${pageImgData}]`,
              }));
            } else {
              setExtractedTextCache((prev) => ({
                ...prev,
                [currentPage]: `[Page ${currentPage}]`,
              }));
            }
          }
          return;
        }

        // 2. Group items into physical printed lines
        // Sort items from top of page to bottom of page (Y descending)
        rawItems.sort((a, b) => b.y - a.y);

        interface LineGroup {
          items: typeof rawItems;
          y: number;
          startX: number;
          endX: number;
          width: number;
          plainText: string;
          richText: string;
          maxFontSize: number;
          isCentered: boolean;
          isHeading: boolean;
          isAllBold: boolean;
          isAllItalic: boolean;
        }

        const lines: LineGroup[] = [];

        rawItems.forEach((item) => {
          let line = lines.find((l) => Math.abs(l.y - item.y) <= Math.max(3.2, item.fontSize * 0.35));
          if (!line) {
            line = {
              items: [],
              y: item.y,
              startX: item.x,
              endX: item.x + item.width,
              width: item.width,
              plainText: '',
              richText: '',
              maxFontSize: item.fontSize,
              isCentered: false,
              isHeading: false,
              isAllBold: false,
              isAllItalic: false,
            };
            lines.push(line);
          }
          line.items.push(item);
        });

        // Sort lines top to bottom (Y descending)
        lines.sort((a, b) => b.y - a.y);

        // 3. Assemble each line's text with rich formatting (Bold & Italic)
        lines.forEach((line) => {
          line.items.sort((a, b) => a.x - b.x);

          let linePlainText = '';
          let lineRichText = '';
          let currentSpanText = '';
          let currentSpanBold = false;
          let currentSpanItalic = false;
          let minX = Infinity;
          let maxX = -Infinity;
          let maxFs = 0;

          const flushSpan = () => {
            if (!currentSpanText) return;
            let formatted = currentSpanText;
            if (currentSpanBold && currentSpanItalic) {
              formatted = `<strong><em>${formatted}</em></strong>`;
            } else if (currentSpanBold) {
              formatted = `<strong>${formatted}</strong>`;
            } else if (currentSpanItalic) {
              formatted = `<em>${formatted}</em>`;
            }
            lineRichText += formatted;
            currentSpanText = '';
          };

          line.items.forEach((it, i) => {
            minX = Math.min(minX, it.x);
            maxX = Math.max(maxX, it.x + it.width);
            maxFs = Math.max(maxFs, it.fontSize);

            // Add space between words if there is a gap or word boundary
            let needSpace = false;
            if (i > 0) {
              const prev = line.items[i - 1];
              const gap = it.x - (prev.x + prev.width);
              if (
                gap >= 1.8 &&
                !linePlainText.endsWith(' ') &&
                !it.str.startsWith(' ') &&
                !/^[.,:;!?)\]'"”’]/.test(it.str)
              ) {
                needSpace = true;
              }
            }

            if (needSpace) {
              linePlainText += ' ';
              if (currentSpanText) {
                currentSpanText += ' ';
              } else {
                lineRichText += ' ';
              }
            }

            if (it.isBold !== currentSpanBold || it.isItalic !== currentSpanItalic) {
              flushSpan();
              currentSpanBold = it.isBold;
              currentSpanItalic = it.isItalic;
            }

            currentSpanText += it.str;
            linePlainText += it.str;
          });

          flushSpan();

          line.plainText = linePlainText.trim();
          line.richText = lineRichText.trim();
          line.startX = minX === Infinity ? 0 : minX;
          line.endX = maxX === -Infinity ? 0 : maxX;
          line.width = line.endX - line.startX;
          line.maxFontSize = maxFs || 12;
          line.isAllBold = line.items.every((it) => it.isBold);
          line.isAllItalic = line.items.every((it) => it.isItalic);
        });

        // 4. Compute Page Layout Statistics (Margins, Column Width, Median Line Gap)
        const substantialLines = lines.filter((l) => l.plainText.length > 20);
        const fontSizes = lines.map((l) => l.maxFontSize).sort((a, b) => a - b);
        const medianFontSize = fontSizes[Math.floor(fontSizes.length / 2)] || 12;

        // Find dominant body text left margin (mode of startX for substantial lines)
        const startXBins = new Map<number, number>();
        substantialLines.forEach((l) => {
          const bin = Math.round(l.startX / 4) * 4;
          startXBins.set(bin, (startXBins.get(bin) || 0) + 1);
        });

        let dominantLeftMargin = 40;
        let highestLeftBinCount = 0;
        startXBins.forEach((count, bin) => {
          if (count > highestLeftBinCount) {
            highestLeftBinCount = count;
            dominantLeftMargin = bin;
          }
        });

        // Dominant right margin
        const endXBins = new Map<number, number>();
        substantialLines.forEach((l) => {
          const bin = Math.round(l.endX / 4) * 4;
          endXBins.set(bin, (endXBins.get(bin) || 0) + 1);
        });

        let dominantRightMargin = pageWidth - 40;
        let highestRightBinCount = 0;
        endXBins.forEach((count, bin) => {
          if (count > highestRightBinCount) {
            highestRightBinCount = count;
            dominantRightMargin = bin;
          }
        });

        const columnWidth = Math.max(120, dominantRightMargin - dominantLeftMargin);

        const verticalGaps: number[] = [];
        for (let i = 1; i < lines.length; i++) {
          const gap = lines[i - 1].y - lines[i].y;
          if (gap > 4 && gap < 50) {
            verticalGaps.push(gap);
          }
        }
        verticalGaps.sort((a, b) => a - b);
        const medianLineGap = verticalGaps.length > 0 ? verticalGaps[Math.floor(verticalGaps.length / 2)] : 14;

        // Dynamic Document Profile Detection:
        // Text-Heavy / Fiction vs Graphic-Heavy / Academic
        const hasImagesOrDrawings = rawItems.length < 5;
        const averageLineLength = substantialLines.length > 0
          ? substantialLines.reduce((acc, l) => acc + l.plainText.length, 0) / substantialLines.length
          : 40;
        const isTextHeavyFiction = averageLineLength >= 35 && !hasImagesOrDrawings;

        // 5. Classify Lines: Headings, Centered
        lines.forEach((line) => {
          const lineMidX = line.startX + line.width / 2;
          const isHorizontallyCentered = Math.abs(lineMidX - pageMidX) < pageWidth * 0.12;
          const isNotFullWidth = line.width < columnWidth * 0.82;
          line.isCentered = isHorizontallyCentered && isNotFullWidth;

          const trimmed = line.plainText.trim();

          // Strict Chapter & Section patterns
          const isExplicitChapter =
            /^(chapter|section|part|book|unit|act|scene)\s+([0-9ivxlcdm]+|[a-z0-9\s:—–\-]{1,40})$/i.test(trimmed) &&
            trimmed.length < 60;
          const isStandaloneMajorTitle =
            /^(prologue|epilogue|introduction|preface|foreword|acknowledgements|about the author|table of contents|contents|appendix)$/i.test(trimmed);
          const isNumberedSectionTitle =
            /^([0-9]+|[ivxlcdm]+)\.\s+[A-Z0-9\s:—–\-]{2,50}$/i.test(trimmed) && trimmed.length < 60;

          // Significantly larger font size in the original PDF
          const isTrueLargeHeader = line.maxFontSize >= medianFontSize * 1.38 && isNotFullWidth && trimmed.length < 80;

          // Only lines with genuinely larger font size or strict standalone chapter markers are headings
          line.isHeading = isExplicitChapter || isStandaloneMajorTitle || isNumberedSectionTitle || isTrueLargeHeader;
        });

        // 6. Group Lines into Natural Flowing Paragraphs, Headings, and Blockquotes
        interface ContentBlock {
          type: 'paragraph' | 'blockquote' | 'heading' | 'centered_heading';
          plainText: string;
          richText: string;
        }

        const blocks: ContentBlock[] = [];
        let currentBlock: ContentBlock | null = null;

        const flushCurrentBlock = () => {
          if (currentBlock && currentBlock.richText.trim()) {
            blocks.push({
              ...currentBlock,
              plainText: currentBlock.plainText.trim(),
              richText: currentBlock.richText.trim(),
            });
            currentBlock = null;
          }
        };

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          if (!line.plainText) continue;

          const prevLine = i > 0 ? lines[i - 1] : null;
          const gapFromPrev = prevLine ? prevLine.y - line.y : 0;

          // 1. Explicit Heading line
          if (line.isHeading) {
            flushCurrentBlock();
            blocks.push({
              type: line.isCentered ? 'centered_heading' : 'heading',
              plainText: line.plainText,
              richText: line.richText,
            });
            continue;
          }

          // Check if previous line finished a sentence
          const prevFinishedSentence =
            !prevLine ||
            /[.!?:"”'’]$/.test(prevLine.plainText.trim()) ||
            prevLine.plainText.trim().endsWith('---');

          // Check if line starts with lowercase letter (continuation of sentence)
          const startsWithLowerCase = /^[a-z]/.test(line.plainText.trim());

          // 2. Genuine Blockquote Detection:
          // A blockquote is NOT a single line with paragraph indent.
          // In books, a true blockquote is an indented excerpt block where BOTH left and right
          // margins are inset from the main text body (e.g. +24px left AND -20px right),
          // OR it is formatted in markdown quote syntax '> '.
          const isExplicitQuoteMarkdown = line.plainText.trim().startsWith('> ');
          const isBothMarginsInset =
            !isTextHeavyFiction &&
            line.startX >= dominantLeftMargin + 24 &&
            line.endX <= dominantRightMargin - 20 &&
            line.width <= columnWidth * 0.85;

          const isGenuineBlockquoteLine = isExplicitQuoteMarkdown || (isBothMarginsInset && line.isAllItalic);

          if (isGenuineBlockquoteLine) {
            if (!currentBlock || currentBlock.type !== 'blockquote') {
              flushCurrentBlock();
              currentBlock = {
                type: 'blockquote',
                plainText: line.plainText.replace(/^>\s*/, ''),
                richText: line.richText.replace(/^>\s*/, ''),
              };
            } else {
              currentBlock.plainText += ' ' + line.plainText.replace(/^>\s*/, '');
              currentBlock.richText += ' ' + line.richText.replace(/^>\s*/, '');
            }
            continue;
          }

          // 3. Regular Narrative / Story Body Paragraph
          if (!currentBlock || currentBlock.type === 'blockquote') {
            flushCurrentBlock();
            currentBlock = {
              type: 'paragraph',
              plainText: line.plainText,
              richText: line.richText,
            };
          } else {
            // We already have an active body paragraph.
            // Check if we MUST continue merging (Broken Sentence prevention) or start a new paragraph.
            let isNewParagraph = false;

            // CRITICAL RULE: If previous line did NOT finish a sentence OR current line starts with lowercase,
            // they MUST be merged continuously into the same paragraph!
            if (!prevFinishedSentence || startsWithLowerCase) {
              isNewParagraph = false;
            } else {
              // Both prevFinishedSentence is TRUE and current line is uppercase:
              // Check for actual structural paragraph break:
              // a) Large vertical gap (at least 1.65x median line gap)
              const isLargeVerticalGap = gapFromPrev > medianLineGap * 1.65;
              // b) First-line indentation tab (12px to 32px inset) in multi-line flow
              const isFirstLineIndent =
                line.startX >= dominantLeftMargin + 12 &&
                line.startX <= dominantLeftMargin + 36 &&
                prevLine &&
                prevLine.width > columnWidth * 0.70;
              // c) Previous line was short and finished early
              const prevLineEndedEarly =
                prevLine &&
                prevLine.width < columnWidth * 0.65;

              isNewParagraph = isLargeVerticalGap || isFirstLineIndent || prevLineEndedEarly;
            }

            if (isNewParagraph) {
              flushCurrentBlock();
              currentBlock = {
                type: 'paragraph',
                plainText: line.plainText,
                richText: line.richText,
              };
            } else {
              // Merge into current paragraph cleanly without broken lines
              if (currentBlock.plainText.endsWith('-') && !currentBlock.plainText.endsWith(' -')) {
                currentBlock.plainText = currentBlock.plainText.slice(0, -1) + line.plainText;
                currentBlock.richText = currentBlock.richText.replace(/-<\/strong>$/, '</strong>').replace(/-<\/em>$/, '</em>').replace(/-$/, '') + line.richText;
              } else {
                currentBlock.plainText += ' ' + line.plainText;
                currentBlock.richText += ' ' + line.richText;
              }
            }
          }
        }

        flushCurrentBlock();

        if (blocks.length === 0) {
          const pageImgData = await extractPageAsImage(page, 1.6);
          if (!isCancelled) {
            if (pageImgData) {
              setPdfPageImageCache((prev) => ({ ...prev, [currentPage]: pageImgData }));
              setExtractedTextCache((prev) => ({ ...prev, [currentPage]: `[PAGE_IMAGE:${pageImgData}]` }));
            } else {
              setExtractedTextCache((prev) => ({ ...prev, [currentPage]: `[Page ${currentPage}]` }));
            }
          }
          return;
        }

        // Convert structured blocks into reflow markers
        const formattedBlocks = blocks.map((b) => {
          if (b.type === 'centered_heading') return `[CENTERED_HEADING]${b.richText}`;
          if (b.type === 'heading') return `[HEADING]${b.richText}`;
          if (b.type === 'blockquote') return `[BLOCKQUOTE]${b.richText}`;
          return b.richText;
        });

        const formatted = formattedBlocks.join('\n\n');

        if (!isCancelled) {
          setExtractedTextCache((prev) => ({ ...prev, [currentPage]: formatted }));
        }
      } catch (err) {
        console.warn('Text extraction notice on page', currentPage, err);
      } finally {
        if (!isCancelled) {
          setIsExtractingText(false);
        }
      }
    }

    processPdfPageForReflow();

    return () => {
      isCancelled = true;
    };
  }, [isPdf, pdfDoc, currentPage, readingMode]);

  // Helper to escape HTML characters in text layer markup
  const escapeHtml = (str: string) => {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  };

  // PDF TextLayer clean reset (Highlights are only active in Reflow mode)
  const applyPdfHighlights = useCallback(() => {
    if (!textLayerRef.current) return;
    const spans = Array.from(textLayerRef.current.querySelectorAll('span')) as HTMLSpanElement[];
    if (spans.length === 0) return;

    // Reset all spans to original clean text state
    spans.forEach((sp) => {
      if (sp.dataset.rawText !== undefined) {
        sp.textContent = sp.dataset.rawText;
      }
      sp.style.backgroundColor = '';
      sp.style.borderBottom = '';
      sp.style.borderRadius = '';
      sp.style.cursor = 'text';
      sp.title = '';
      sp.onclick = null;
    });
  }, []);

  // Ensure clean text layer in PDF mode
  useEffect(() => {
    if (readingMode === 'original-pdf') {
      applyPdfHighlights();
    }
  }, [applyPdfHighlights, readingMode, currentPage]);

  // Dismiss active selection when changing pages, modes, scale, or font size
  useEffect(() => {
    setActiveSelection(null);
    try {
      window.getSelection()?.removeAllRanges();
    } catch (e) {}
  }, [currentPage, readingMode, pdfCustomZoomScale, pdfZoomMode, fontSize, book.id]);

  // 3. Render Canvas in Original PDF Mode with Google PDF Viewer Vector Sharpness (Up to 500% Zoom)
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

        const canvas = canvasRef.current;
        if (!canvas) return;
        const context = canvas.getContext('2d', { alpha: false });
        if (!context) return;

        const unscaledViewport = page.getViewport({ scale: 1.0, rotation: pdfRotation });
        const isDual = layoutMode === 'dual' && !isMobile && currentPage < totalPages;

        // Calculate available viewport space
        const horizontalPadding = isMobile ? 12 : isTablet ? 32 : 48;
        const verticalPadding = isMobile ? 16 : 40;
        const maxAvailableWidth = Math.max(
          260,
          (containerDimensions.width - horizontalPadding) / (isDual ? 2.08 : 1)
        );
        const maxAvailableHeight = Math.max(320, containerDimensions.height - verticalPadding);

        // Auto-scale calculation matching standard Google PDF Viewer
        let targetScale = 1.0;
        if (pdfZoomMode === 'fit-width') {
          targetScale = maxAvailableWidth / unscaledViewport.width;
        } else if (pdfZoomMode === 'fit-page') {
          targetScale = Math.min(
            maxAvailableWidth / unscaledViewport.width,
            maxAvailableHeight / unscaledViewport.height
          );
        } else if (pdfZoomMode === '100%') {
          targetScale = 1.0;
        } else {
          // Custom zoom scale relative to fit width
          const fitBase = maxAvailableWidth / unscaledViewport.width;
          targetScale = fitBase * pdfCustomZoomScale;
        }

        // Support wide zoom range from 30% to 500% with pristine vector rasterization
        targetScale = Math.max(0.3, Math.min(5.0, targetScale));

        // High-DPI Vector Sharpness: backing store canvas buffer rendered at (targetScale * dpr)
        // This ensures zero pixel blur, pixelation, or fuzziness even when zoomed to 500%
        const dpr = Math.max(window.devicePixelRatio || 1, 2);
        const viewport = page.getViewport({ scale: targetScale * dpr, rotation: pdfRotation });

        canvas.width = Math.round(viewport.width);
        canvas.height = Math.round(viewport.height);
        canvas.style.width = `${Math.round(viewport.width / dpr)}px`;
        canvas.style.height = `${Math.round(viewport.height / dpr)}px`;

        const renderContext = {
          canvasContext: context,
          viewport: viewport,
          canvas: canvas,
        } as any;

        const renderTask = page.render(renderContext);
        currentRenderTaskRef.current = renderTask;
        await renderTask.promise;

        // Render transparent selectable text layer over PDF canvas for long-press & highlight selection
        if (textLayerRef.current) {
          textLayerRef.current.innerHTML = '';
          textLayerRef.current.style.width = `${Math.round(viewport.width / dpr)}px`;
          textLayerRef.current.style.height = `${Math.round(viewport.height / dpr)}px`;

          try {
            const textContent = await page.getTextContent();
            const textViewport = page.getViewport({ scale: targetScale, rotation: pdfRotation });

            if (typeof (pdfjsLib as any).TextLayer === 'function') {
              const textLayerInstance = new (pdfjsLib as any).TextLayer({
                textContentSource: textContent,
                container: textLayerRef.current,
                viewport: textViewport,
              });
              await textLayerInstance.render();
            } else if (typeof (pdfjsLib as any).renderTextLayer === 'function') {
              await (pdfjsLib as any).renderTextLayer({
                textContentSource: textContent,
                container: textLayerRef.current,
                viewport: textViewport,
                textDivs: [],
              }).promise;
            } else if (textContent && textContent.items && textContent.items.length > 0) {
              const fragment = document.createDocumentFragment();
              for (const item of textContent.items as any[]) {
                if (!item.str || item.str.length === 0) continue;
                const tx = pdfjsLib.Util.transform(textViewport.transform, item.transform);
                const fontHeight = Math.hypot(tx[2], tx[3]);
                const span = document.createElement('span');
                span.textContent = item.str;
                span.style.position = 'absolute';
                span.style.left = `${tx[4]}px`;
                span.style.top = `${tx[5] - fontHeight}px`;
                span.style.fontSize = `${fontHeight}px`;
                span.style.lineHeight = '1';
                span.style.transformOrigin = '0% 0%';
                fragment.appendChild(span);
              }
              textLayerRef.current.appendChild(fragment);
            }

            applyPdfHighlights();
          } catch (textErr) {
            console.warn('PDF text layer render note:', textErr);
          }
        }

        // Render secondary page if in Dual Spread Mode
        if (isDual && dualCanvasRef.current && currentPage + 1 <= totalPages) {
          const page2 = await pdfDoc.getPage(currentPage + 1);
          if (!isCancelled && dualCanvasRef.current) {
            const dualCtx = dualCanvasRef.current.getContext('2d', { alpha: false });
            if (dualCtx) {
              const viewport2 = page2.getViewport({ scale: targetScale * dpr, rotation: pdfRotation });
              dualCanvasRef.current.width = Math.round(viewport2.width);
              dualCanvasRef.current.height = Math.round(viewport2.height);
              dualCanvasRef.current.style.width = `${Math.round(viewport2.width / dpr)}px`;
              dualCanvasRef.current.style.height = `${Math.round(viewport2.height / dpr)}px`;
              const dualRender = page2.render({
                canvasContext: dualCtx,
                viewport: viewport2,
                canvas: dualCanvasRef.current,
              });
              dualRenderTaskRef.current = dualRender;
              await dualRender.promise;
            }
          }
        }
      } catch (err: any) {
        if (err?.name !== 'RenderingCancelledException') {
          console.warn('PDF canvas render notice:', err);
          setPdfRenderError('Unable to render page on canvas. You can read in Reflow mode.');
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
    containerDimensions,
    isMobile,
    isTablet,
    totalPages,
  ]);

  // Keep page input in sync
  useEffect(() => {
    setPageInputVal(`${currentPage}`);
  }, [currentPage]);

  // Page Turn Actions
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

  // Touch Swipe Gesture Handlers for mobile sliding
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

    // Do not turn pages if user has active text selected or toolbar is open
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

    // Check if horizontal swipe was intentional (higher threshold so text selection gestures aren't confused with page turns)
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

  // Pinch & Wheel Zoom Handlers for Google PDF Viewer
  const pinchStartDistRef = useRef<number | null>(null);
  const pinchStartScaleRef = useRef<number>(1.0);

  const handlePdfTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const t0 = e.touches[0];
      const t1 = e.touches[1];
      const dist = Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY);
      pinchStartDistRef.current = dist;
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
        const finalScale = Math.max(0.4, Math.min(5.0, Number((pinchStartScaleRef.current * livePinchScale).toFixed(2))));
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
      setPdfCustomZoomScale((prev) => Math.max(0.4, Math.min(5.0, Number((prev + delta).toFixed(2)))));
    }
  };

  // Direct Page Jump form submission
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
        } else if (zoomedFigure) {
          setZoomedFigure(null);
        } else {
          onBackToDashboard();
        }
      } else if (e.key === 'h' || e.key === 'H') {
        onBackToDashboard();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNextPage, handlePrevPage, activeMenu, zoomedFigure, onBackToDashboard]);

  // Compute text content for Reflow mode
  const pageIndex = currentPage - 1;
  let currentContent = '';

  if (isPdf && extractedTextCache[currentPage]) {
    currentContent = extractedTextCache[currentPage];
  } else if (book.contentPages && book.contentPages[pageIndex]) {
    currentContent = book.contentPages[pageIndex];
  } else if (extractedTextCache[currentPage]) {
    currentContent = extractedTextCache[currentPage];
  } else if (book.contentPages && book.contentPages.length > 0) {
    const fallbackIdx = pageIndex % book.contentPages.length;
    currentContent = book.contentPages[fallbackIdx];
  } else {
    currentContent = `Page ${currentPage}\n\nReading ${book.title}. Swipe or use navigation controls to change pages.`;
  }

  const paragraphs = currentContent.split('\n\n').filter(Boolean);
  const isBookmarked = book.bookmarks?.some((b) => b.pageNumber === currentPage);

  // Helper: auto-detect and render HTML tags (<strong>, <em>), Markdown (**bold**, *italic*), and URLs in text
  const renderRichContent = (text: string): React.ReactNode => {
    if (!text) return null;

    // 1. Normalize markdown bold and italics to HTML tags
    let normalized = text
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/__(.+?)__/g, '<strong>$1</strong>')
      .replace(/(^|[^\*])\*([^\*]+?)\*([^\*]|$)/g, '$1<em>$2</em>$3');

    // 2. Tokenize by tags (<strong>...</strong>, <em>...</em>, <b>...</b>, <i>...</i>) and URLs
    const tokenRegex = /(<strong>[\s\S]*?<\/strong>|<b>[\s\S]*?<\/b>|<em>[\s\S]*?<\/em>|<i>[\s\S]*?<\/i>|https?:\/\/[^\s]+|www\.[^\s]+|[a-zA-Z0-9.-]+\.(?:com|org|net|io|edu|in)(?:\/[^\s]*)?)/gi;

    const rawTokens = normalized.split(tokenRegex);

    return rawTokens.map((token, i) => {
      if (!token) return null;

      // Bold tag: <strong>...</strong> or <b>...</b>
      if (/^<(strong|b)\b[^>]*>([\s\S]*?)<\/(strong|b)>$/i.test(token)) {
        const match = token.match(/^<(?:strong|b)\b[^>]*>([\s\S]*?)<\/(?:strong|b)>$/i);
        const inner = match ? match[1] : token;
        return (
          <strong key={i} className="font-bold font-serif">
            {renderRichContent(inner)}
          </strong>
        );
      }

      // Italic tag: <em>...</em> or <i>...</i>
      if (/^<(em|i)\b[^>]*>([\s\S]*?)<\/(em|i)>$/i.test(token)) {
        const match = token.match(/^<(?:em|i)\b[^>]*>([\s\S]*?)<\/(?:em|i)>$/i);
        const inner = match ? match[1] : token;
        return (
          <em key={i} className="italic">
            {renderRichContent(inner)}
          </em>
        );
      }

      // URL link
      const urlPattern = /^(https?:\/\/[^\s]+|www\.[^\s]+|[a-zA-Z0-9.-]+\.(?:com|org|net|io|edu|in)(?:\/[^\s]*)?)$/i;
      if (urlPattern.test(token)) {
        const href = token.startsWith('http') ? token : `https://${token}`;
        return (
          <a
            key={i}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-sky-400 hover:text-sky-300 underline underline-offset-3 decoration-sky-500/60 font-sans text-[0.95em] transition inline cursor-pointer"
          >
            {token}
          </a>
        );
      }

      return <span key={i}>{token}</span>;
    });
  };

  const renderTextWithLinks = (text: string) => renderRichContent(text);

  // Helper interface for resolved non-overlapping highlight spans
  interface HighlightRange {
    start: number;
    end: number;
    highlight: Highlight;
  }

  // Precise Highlight-aware block renderer:
  // ONLY highlights the exact character range selected by the user, preventing all occurrences of the same word from lighting up
  const renderBlockWithHighlights = (rawText: string, blockIndex: number): React.ReactNode => {
    if (!rawText) return null;
    const pageHighlights = (book.highlights || []).filter((h) => h.pageNumber === currentPage);

    if (pageHighlights.length === 0) {
      return renderRichContent(rawText);
    }

    // 1. Gather all highlights applicable to this specific block
    const blockHighlights = pageHighlights.filter((h) => {
      if (typeof h.blockIndex === 'number') {
        return h.blockIndex === blockIndex;
      }
      // Fallback for legacy highlights created before blockIndex was stored
      return h.text && rawText.toLowerCase().includes(h.text.toLowerCase());
    });

    if (blockHighlights.length === 0) {
      return renderRichContent(rawText);
    }

    // 2. Resolve exact start/end character offsets within this block
    const candidateRanges: HighlightRange[] = [];

    for (const hl of blockHighlights) {
      if (
        typeof hl.startOffset === 'number' &&
        typeof hl.endOffset === 'number' &&
        hl.endOffset > hl.startOffset
      ) {
        const clampedStart = Math.max(0, Math.min(rawText.length, hl.startOffset));
        const clampedEnd = Math.max(clampedStart, Math.min(rawText.length, hl.endOffset));
        if (clampedEnd > clampedStart) {
          candidateRanges.push({
            start: clampedStart,
            end: clampedEnd,
            highlight: hl,
          });
          continue;
        }
      }

      // Positional fallback for legacy highlight: find FIRST occurrence of this highlight in this block
      if (hl.text && hl.text.trim()) {
        const targetWord = hl.text.trim().toLowerCase();
        const foundIdx = rawText.toLowerCase().indexOf(targetWord);
        if (foundIdx !== -1) {
          candidateRanges.push({
            start: foundIdx,
            end: foundIdx + hl.text.trim().length,
            highlight: hl,
          });
        }
      }
    }

    if (candidateRanges.length === 0) {
      return renderRichContent(rawText);
    }

    // 3. Sort ranges by start offset and sanitize against overlapping intervals
    candidateRanges.sort((a, b) => a.start - b.start || (b.end - b.start) - (a.end - a.start));

    const finalRanges: HighlightRange[] = [];
    let currentCursor = 0;

    for (const r of candidateRanges) {
      const safeStart = Math.max(currentCursor, r.start);
      const safeEnd = Math.max(safeStart, r.end);
      if (safeEnd > safeStart && safeStart < rawText.length) {
        finalRanges.push({
          start: safeStart,
          end: safeEnd,
          highlight: r.highlight,
        });
        currentCursor = safeEnd;
      }
    }

    if (finalRanges.length === 0) {
      return renderRichContent(rawText);
    }

    // 4. Build segmented nodes: unhighlighted text before/between/after and highlighted spans
    const nodes: React.ReactNode[] = [];
    let lastOffset = 0;

    finalRanges.forEach((range, rIdx) => {
      // Unhighlighted text segment before this highlight
      if (range.start > lastOffset) {
        const unhighlightedText = rawText.slice(lastOffset, range.start);
        nodes.push(
          <React.Fragment key={`uh-${blockIndex}-${rIdx}-${lastOffset}`}>
            {renderRichContent(unhighlightedText)}
          </React.Fragment>
        );
      }

      // Highlighted exact text slice
      const highlightedText = rawText.slice(range.start, range.end);
      const hl = range.highlight;

      nodes.push(
        <span
          key={`hl-${hl.id || rIdx}-${blockIndex}-${range.start}`}
          onClick={(e) => {
            e.stopPropagation();
            const target = e.currentTarget as HTMLElement;
            const rect = target.getBoundingClientRect();
            setActiveSelection({
              text: hl.text,
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
              blockIndex: hl.blockIndex,
              startOffset: hl.startOffset,
              endOffset: hl.endOffset,
            });
          }}
          className="rounded-xs px-0.5 py-0.2 cursor-pointer transition hover:opacity-90 inline relative select-text"
          style={{
            backgroundColor: `${hl.color}45`,
            borderBottom: `2.5px solid ${hl.color}`,
            color: 'inherit',
          }}
          title={hl.note ? `Note: "${hl.note}"` : 'Highlight (Click to edit or remove)'}
        >
          {renderRichContent(highlightedText)}
          {hl.note && (
            <span
              className="inline-flex items-center justify-center align-middle ml-1 -mt-0.5 px-1 py-0.2 rounded-full bg-stone-800 text-white border border-stone-600 text-[9px] font-sans font-bold shadow-xs cursor-pointer"
              title={`Note: "${hl.note}"`}
            >
              📝
            </span>
          )}
        </span>
      );

      lastOffset = range.end;
    });

    // Trailing unhighlighted text
    if (lastOffset < rawText.length) {
      const trailingText = rawText.slice(lastOffset);
      nodes.push(
        <React.Fragment key={`uh-tail-${blockIndex}-${lastOffset}`}>
          {renderRichContent(trailingText)}
        </React.Fragment>
      );
    }

    return nodes;
  };

  // Kindle Highlight Actions
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
      id: `hl-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
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

  // Selection and Long-Press Detection across reading container
  useEffect(() => {
    let checkTimeout: any = null;

    const checkSelection = () => {
      // Highlights & Selection Toolbar are exclusively active in Reflow mode
      if (readingMode !== 'reflow-ereader') {
        return;
      }

      const selection = window.getSelection();
      if (!selection || selection.isCollapsed) {
        return;
      }

      const text = selection.toString().trim();
      if (!text || text.length < 1) return;

      try {
        if (selection.rangeCount === 0) return;
        const range = selection.getRangeAt(0);
        
        // Ensure selection is within the reader container or reading root
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

        // Locate closest containing block with data-block-index
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

        let blockIndex: number | undefined = undefined;
        let startOffset: number | undefined = undefined;
        let endOffset: number | undefined = undefined;

        if (blockElement) {
          const parsedIdx = parseInt(blockElement.getAttribute('data-block-index') || '', 10);
          if (!isNaN(parsedIdx)) {
            blockIndex = parsedIdx;
            try {
              const preCaretRange = range.cloneRange();
              preCaretRange.selectNodeContents(blockElement);
              preCaretRange.setEnd(range.startContainer, range.startOffset);
              startOffset = preCaretRange.toString().length;
              endOffset = startOffset + text.length;
            } catch (err) {
              console.warn('Offset calculation note:', err);
            }
          }
        }

        // Check if there is an existing highlight at this specific block & location
        const existing = book.highlights?.find((h) => {
          if (h.pageNumber !== currentPage) return false;
          if (typeof blockIndex === 'number' && typeof h.blockIndex === 'number') {
            if (h.blockIndex !== blockIndex) return false;
            if (typeof startOffset === 'number' && typeof h.startOffset === 'number') {
              const hEnd = typeof h.endOffset === 'number' ? h.endOffset : h.startOffset + h.text.length;
              const sEnd = endOffset ?? (startOffset + text.length);
              return Math.max(startOffset, h.startOffset) < Math.min(sEnd, hEnd);
            }
          }
          return h.text.trim() === text;
        });

        setActiveSelection({
          text,
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
      }, 50);
    };

    const handleContextMenu = (e: MouseEvent) => {
      // Completely suppress the mobile/desktop default browser context menu in reflow mode
      if (readingMode === 'reflow-ereader') {
        e.preventDefault();
      }
    };

    const handleScrollOrResize = () => {
      const sel = window.getSelection();
      if (sel && !sel.isCollapsed && sel.rangeCount > 0) {
        try {
          const range = sel.getRangeAt(0);
          const rect = range.getBoundingClientRect();
          if (rect.width > 0 || rect.height > 0) {
            setActiveSelection((prev) => {
              if (!prev) return prev;
              return {
                ...prev,
                rect: {
                  top: rect.top,
                  left: rect.left,
                  bottom: rect.bottom,
                  right: rect.right,
                  width: rect.width,
                  height: rect.height,
                },
              };
            });
          }
        } catch (e) {}
      }
    };

    window.addEventListener('mouseup', handlePointerUp);
    window.addEventListener('touchend', handlePointerUp);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('keyup', handlePointerUp);
    window.addEventListener('contextmenu', handleContextMenu, { capture: true });
    document.addEventListener('selectionchange', handleSelectionChange);
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);

    return () => {
      clearTimeout(checkTimeout);
      window.removeEventListener('mouseup', handlePointerUp);
      window.removeEventListener('touchend', handlePointerUp);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('keyup', handlePointerUp);
      window.removeEventListener('contextmenu', handleContextMenu, { capture: true } as any);
      document.removeEventListener('selectionchange', handleSelectionChange);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [book.highlights, currentPage, readingMode]);

  // 1:1 Page mapping: 1 PDF / book page is strictly 1 Reflow page
  const kindleLocation = `${currentPage}`;
  const kindleTotalLocations = `${totalPages}`;
  const kindlePercent = totalPages > 0 ? Math.round((currentPage / totalPages) * 100) : 0;

  // Render Kindle Reflow Page with authentic layouts matching user's screenshots
  const renderKindleReflowContent = () => {
    // 0. Real Extracted PDF Page Image / Cover / Diagram (rendered cleanly directly on background)
    if (currentContent.startsWith('[PAGE_IMAGE:') || currentContent.startsWith('[IMAGE:')) {
      const imgSrc = currentContent.replace(/^\[(PAGE_)?IMAGE:/, '').replace(/\]$/, '').trim();
      return (
        <div className="w-full h-full flex flex-col items-center justify-center select-none my-auto">
          <img
            src={imgSrc}
            alt={`Page ${currentPage} Graphic`}
            className="max-w-full max-h-[85vh] w-auto h-auto object-contain block mx-auto shadow-none"
            loading="eager"
          />
        </div>
      );
    }

    // 1. Cover Page Layout (Screenshot 3)
    if (currentContent.includes('[COVER_IMAGE_PAGE]')) {
      if (book.coverUrl) {
        return (
          <div className="w-full h-full flex flex-col items-center justify-center select-none my-auto">
            <img
              src={book.coverUrl}
              alt={book.title}
              className="max-w-full max-h-[85vh] w-auto h-auto object-contain block mx-auto shadow-none"
              loading="eager"
            />
          </div>
        );
      }
      return (
        <div className="w-full h-full flex flex-col items-center justify-center py-2 sm:py-6 my-auto select-none">
          <div className="w-full max-w-[290px] sm:max-w-[340px] bg-[#f5b800] text-black rounded-xs p-6 sm:p-8 flex flex-col justify-between items-center text-center shadow-2xl min-h-[460px] border border-amber-400/40">
            <p className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider leading-snug text-black/90 px-1">
              OVERCOME PROCRASTINATION,<br />
              IMPROVE PRODUCTIVITY & ACHIEVE<br />
              MORE MEANINGFUL THINGS
            </p>
            
            <div className="text-black text-sm font-mono my-2 font-bold tracking-widest">
              • • •
            </div>

            <div className="my-auto space-y-1">
              <h1 className="text-4xl sm:text-5xl font-black font-sans tracking-tight text-white drop-shadow-sm leading-none">
                DO IT
              </h1>
              <h1 className="text-4xl sm:text-5xl font-black font-sans tracking-tight text-white drop-shadow-sm leading-none">
                TODAY
              </h1>
            </div>

            {/* Hourglass Icon */}
            <div className="w-16 h-20 border-[3.5px] border-black rounded-xs flex flex-col items-center justify-between p-1.5 my-3 bg-[#111111] shadow-lg">
              <div className="w-0 h-0 border-l-[20px] border-l-transparent border-r-[20px] border-r-transparent border-b-[24px] border-b-amber-400" />
              <div className="w-0 h-0 border-l-[20px] border-l-transparent border-r-[20px] border-r-transparent border-t-[24px] border-t-amber-400" />
            </div>

            <div className="text-black text-sm font-mono my-2 font-bold tracking-widest">
              • • •
            </div>

            <p className="text-base sm:text-lg font-bold font-sans tracking-wide text-white uppercase">
              DARIUS FOROUX
            </p>
          </div>
        </div>
      );
    }

    // 2. Title & Byline Page (Screenshot 2)
    if (currentContent.includes('[TITLE_PAGE]')) {
      return (
        <div className="w-full h-full flex flex-col justify-center items-center text-center py-10 my-auto space-y-8 max-w-lg mx-auto select-text">
          <h1
            className="text-4xl sm:text-5xl font-bold font-serif tracking-tight leading-tight"
            style={{ color: currentTheme.text }}
          >
            Do It Today
          </h1>
          <p
            className="text-base sm:text-lg font-serif leading-relaxed px-4 opacity-80"
            style={{ color: currentTheme.text }}
          >
            Overcome Procrastination,<br />
            Improve Productivity,<br />
            and Achieve More<br />
            Meaningful Things
          </p>
          <div className="pt-10 space-y-4">
            <p className="text-sm italic font-serif opacity-60" style={{ color: currentTheme.text }}>
              Written by
            </p>
            <p className="text-base font-serif font-medium" style={{ color: currentTheme.text }}>
              Darius Foroux
            </p>
          </div>
        </div>
      );
    }

    // 3. Structured Content Pages
    return (
      <div className="font-serif w-full max-w-full text-justify" style={{ color: currentTheme.text }}>
        {paragraphs.map((p, idx) => {
          // Paragraph containing an extracted image / diagram
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
                <div key={idx} className="my-3 flex flex-col items-center justify-center w-full select-none">
                  <img
                    src={imgSrc}
                    alt={`Page ${currentPage} Diagram`}
                    className="max-w-full max-h-[85vh] w-auto h-auto object-contain block mx-auto shadow-none"
                    loading="lazy"
                  />
                </div>
              );
            }
          }

          // Centered Heading / Chapter Title (detected from PDF or tag)
          if (p.includes('[CENTERED_HEADING]')) {
            const clean = p.replace('[CENTERED_HEADING]', '').trim();
            return (
              <div key={idx} data-block-index={idx} className="text-center py-2 sm:py-3 my-1">
                <h2
                  className="text-xl sm:text-2xl font-bold font-serif tracking-tight leading-snug"
                  style={{ color: currentTheme.text }}
                >
                  {renderBlockWithHighlights(clean, idx)}
                </h2>
              </div>
            );
          }

          // Left-aligned Heading
          if (p.includes('[HEADING]')) {
            const clean = p.replace('[HEADING]', '').trim();
            return (
              <div key={idx} data-block-index={idx} className="text-left py-2 sm:py-2.5 my-1">
                <h3
                  className="text-lg sm:text-xl font-bold font-serif tracking-tight leading-snug"
                  style={{ color: currentTheme.text }}
                >
                  {renderBlockWithHighlights(clean, idx)}
                </h3>
              </div>
            );
          }

          // Blockquote / Indented Callout block from PDF
          if (p.includes('[BLOCKQUOTE]')) {
            const clean = p.replace('[BLOCKQUOTE]', '').trim();
            return (
              <blockquote
                key={idx}
                data-block-index={idx}
                className="my-3.5 pl-4 border-l-2 border-stone-400 dark:border-stone-500 italic text-justify leading-relaxed opacity-95"
                style={{
                  color: currentTheme.text,
                  hyphens: 'auto',
                  lineHeight: lineHeight,
                }}
              >
                {renderBlockWithHighlights(clean, idx)}
              </blockquote>
            );
          }

          // Chapter / Section / Author Header with Divider Line
          if (p.includes('[CHAPTER_PAGE]') || p.includes('[AUTHOR_PAGE]')) {
            const clean = p.replace(/\[CHAPTER_PAGE\]|\[AUTHOR_PAGE\]/, '').trim();
            const lines = clean.split('\n').filter(Boolean);
            const title = lines[0] || 'Chapter';
            return (
              <div key={idx} data-block-index={idx} className="text-center pt-2 pb-2">
                <h2
                  className="text-2xl sm:text-3xl font-bold font-serif tracking-tight"
                  style={{ color: currentTheme.text }}
                >
                  {renderBlockWithHighlights(title, idx)}
                </h2>
                <hr className="my-4 w-full opacity-20" style={{ borderColor: currentTheme.text }} />
              </div>
            );
          }

          // Centered Book List / Subheading (Screenshot 6)
          if (p.includes('[CENTERED_SECTION]')) {
            const clean = p.replace('[CENTERED_SECTION]', '').trim();
            const lines = clean.split('\n').filter(Boolean);
            return (
              <div key={idx} className="text-center space-y-1.5 py-3 my-2">
                {lines.map((line, lIdx) => {
                  const lineBlockIdx = idx * 1000 + lIdx;
                  if (lIdx === 0) {
                    return (
                      <h3
                        key={lIdx}
                        data-block-index={lineBlockIdx}
                        className="font-bold text-base sm:text-lg mb-2 font-serif"
                        style={{ color: currentTheme.text }}
                      >
                        {renderBlockWithHighlights(line, lineBlockIdx)}
                      </h3>
                    );
                  }
                  const isItalic = line.startsWith('*') && line.endsWith('*');
                  const cleanLine = line.replace(/^\*|\*$/g, '');
                  return (
                    <p
                      key={lIdx}
                      data-block-index={lineBlockIdx}
                      className={`text-sm sm:text-base opacity-85 font-serif ${isItalic ? 'italic' : ''}`}
                      style={{ color: currentTheme.text }}
                    >
                      {renderBlockWithHighlights(cleanLine, lineBlockIdx)}
                    </p>
                  );
                })}
              </div>
            );
          }

          // Check if paragraph is a Figure or Clinical Chart
          const isFigureParagraph = p.includes('[Figure') || p.includes('[Chart');
          if (isFigureParagraph) {
            return (
              <div
                key={idx}
                onClick={() =>
                  setZoomedFigure({
                    title: p.match(/\[(.*?)\]/)?.[1] || 'Medical Figure / Diagnostic Chart',
                    desc: p,
                    type: p.toLowerCase().includes('ecg')
                      ? 'ecg'
                      : p.toLowerCase().includes('radiograph') || p.toLowerCase().includes('mri') || p.toLowerCase().includes('ct')
                      ? 'radiology'
                      : 'eink',
                  })
                }
                className="my-3 p-3 rounded-xl border border-stone-300 dark:border-stone-800 bg-stone-100/60 dark:bg-stone-900/60 hover:bg-stone-200/60 dark:hover:bg-stone-900 transition cursor-pointer flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 font-sans"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shrink-0">
                    <Activity size={16} className="text-emerald-400" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold truncate" style={{ color: currentTheme.text }}>
                      {p.match(/\[(.*?)\]/)?.[1] || 'Diagnostic Graphic / Chart'}
                    </div>
                    <div className="text-[10px] opacity-70 truncate" style={{ color: currentTheme.secondaryText }}>
                      Tap to inspect high-resolution vector diagram
                    </div>
                  </div>
                </div>
                <button className="px-2.5 py-1 bg-stone-800 dark:bg-stone-700 hover:bg-stone-900 text-white rounded text-[11px] font-bold shrink-0 shadow-xs">
                  Expand Chart
                </button>
              </div>
            );
          }

          // Standard Body Paragraph - Natural continuous flow in regular font size and weight
          return (
            <p
              key={idx}
              data-block-index={idx}
              className="mb-3 text-justify leading-relaxed"
              style={{
                color: currentTheme.text,
                hyphens: 'auto',
                lineHeight: lineHeight,
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
      : fontFamily === 'bookerly'
      ? 'font-bookerly'
      : fontFamily === 'newsreader'
      ? 'font-newsreader'
      : fontFamily === 'garamond'
      ? 'font-garamond'
      : fontFamily === 'lora'
      ? 'font-lora'
      : 'font-sans-ui';

  const marginClass =
    margins === 'compact'
      ? 'px-3 sm:px-6'
      : margins === 'spacious'
      ? 'px-6 sm:px-16'
      : 'px-4 sm:px-10';

  return (
    <div
      id="reading-root"
      className={`relative w-full h-full flex flex-col justify-between select-text transition-colors duration-300 ${fontClass}`}
      style={{
        backgroundColor: currentTheme.bg,
        color: currentTheme.text,
      }}
    >
      {/* ============================================================ */}
      {/* 1. Header Bar: Home / Mode Switch / Aa Themes / Pages / Full  */}
      {/* ============================================================ */}
      <header
        className="h-11 sm:h-12 px-2.5 sm:px-6 flex items-center justify-between border-b shrink-0 font-sans z-30 select-none shadow-xs transition-colors duration-300"
        style={{
          backgroundColor: currentTheme.bg,
          borderColor: currentTheme.border,
          color: currentTheme.text,
        }}
      >
        {/* Left: Home Button & Book Title */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <button
            onClick={onBackToDashboard}
            className="flex items-center gap-1.5 text-xs font-semibold px-2.5 sm:px-3 py-1 rounded-lg bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-950 hover:opacity-90 transition active:scale-95 shadow-xs shrink-0 cursor-pointer"
            title="Return to Dashboard"
          >
            <Home size={13} />
            <span>Home</span>
          </button>

          <div className="w-[1px] h-3.5 opacity-25 bg-current shrink-0" />

          <div className="flex flex-col min-w-0">
            <h1 className="text-xs font-bold truncate max-w-[120px] sm:max-w-[220px] md:max-w-[320px]">
              {book.title}
            </h1>
            <span className="text-[10px] opacity-60 truncate hidden md:inline">
              {book.author}
            </span>
          </div>
        </div>

        {/* Center: Dual Reading Mode Switcher for PDFs */}
        <div className="flex items-center bg-black/5 dark:bg-white/10 p-0.5 rounded-lg border border-black/10 dark:border-white/10 text-xs shrink-0 mx-1">
          {/* Mode 1: Reflow Reader Mode */}
          <button
            onClick={() => setReadingMode('reflow-ereader')}
            className={`flex items-center gap-1.5 px-2 sm:px-2.5 py-1 rounded-md text-[11px] font-semibold transition cursor-pointer ${
              readingMode === 'reflow-ereader'
                ? 'bg-white text-stone-900 shadow-xs font-bold dark:bg-stone-800 dark:text-white'
                : 'text-stone-600 dark:text-stone-300 hover:text-stone-900'
            }`}
            title="Reflow Mode: Custom fonts, text reflow, and embedded medical figures"
          >
            <BookOpen
              size={13}
              className={
                readingMode === 'reflow-ereader'
                  ? 'text-emerald-700 dark:text-emerald-400'
                  : ''
              }
            />
            <span className="hidden sm:inline">Reflow Mode</span>
            <span className="sm:hidden">Reflow</span>
          </button>

          {/* Mode 2: Original PDF Layout */}
          <button
            onClick={() => setReadingMode('original-pdf')}
            className={`flex items-center gap-1.5 px-2 sm:px-2.5 py-1 rounded-md text-[11px] font-semibold transition cursor-pointer ${
              readingMode === 'original-pdf'
                ? 'bg-white text-stone-900 shadow-xs font-bold dark:bg-stone-800 dark:text-white'
                : 'text-stone-600 dark:text-stone-300 hover:text-stone-900'
            }`}
            title="Kindle Document: Exact PDF charts, medical images, and original graphics"
          >
            <Layers
              size={13}
              className={
                readingMode === 'original-pdf'
                  ? 'text-blue-600 dark:text-blue-400'
                  : ''
              }
            />
            <span className="hidden sm:inline">Kindle Document</span>
            <span className="sm:hidden">PDF / Charts</span>
          </button>
        </div>

        {/* Right Tools: Dual Page / Zoom / Themes / Pages / Bookmark / Fullscreen */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          
          {/* Dual Page Spread Toggle (for Tablet & PC) */}
          {!isMobile && (
            <button
              onClick={() => setLayoutMode(layoutMode === 'single' ? 'dual' : 'single')}
              className={`p-1.5 rounded-md text-xs transition flex items-center gap-1 border cursor-pointer ${
                layoutMode === 'dual'
                  ? 'bg-black/10 dark:bg-white/20 border-stone-400 font-bold'
                  : 'border-transparent hover:bg-black/5 dark:hover:bg-white/10'
              }`}
              title={layoutMode === 'dual' ? 'Dual Page Book Spread' : 'Single Page View'}
            >
              {layoutMode === 'dual' ? <Columns size={13} /> : <Square size={13} />}
              <span className="text-[10px] hidden lg:inline">
                {layoutMode === 'dual' ? '2-Page' : '1-Page'}
              </span>
            </button>
          )}

          {/* Zoom controls if in Original PDF mode */}
          {readingMode === 'original-pdf' && isPdf && (
            <div className="hidden sm:flex items-center gap-0.5 bg-black/5 dark:bg-white/10 px-1 py-0.5 rounded-md text-xs">
              <button
                onClick={() => {
                  setPdfZoomMode('custom');
                  setPdfCustomZoomScale((z) => Math.max(0.6, Number((z - 0.15).toFixed(2))));
                }}
                className="p-1 hover:bg-black/10 dark:hover:bg-white/20 rounded cursor-pointer"
                title="Zoom Out"
              >
                <ZoomOut size={12} />
              </button>
              
              <button
                onClick={() => {
                  setPdfZoomMode('fit-width');
                  setPdfCustomZoomScale(1.0);
                }}
                className={`text-[10px] font-semibold px-1.5 py-0.5 rounded cursor-pointer ${
                  pdfZoomMode === 'fit-width'
                    ? 'bg-white text-black shadow-xs font-bold dark:bg-stone-800 dark:text-white'
                    : 'opacity-70 hover:opacity-100'
                }`}
                title="Auto Fit Width (Recommended)"
              >
                Fit
              </button>

              <button
                onClick={() => {
                  setPdfZoomMode('custom');
                  setPdfCustomZoomScale((z) => Math.min(2.5, Number((z + 0.15).toFixed(2))));
                }}
                className="p-1 hover:bg-black/10 dark:hover:bg-white/20 rounded cursor-pointer"
                title="Zoom In"
              >
                <ZoomIn size={12} />
              </button>
            </div>
          )}

          {/* Visuals / Images toggle for Reflow Mode */}
          {readingMode === 'reflow-ereader' && (
            <button
              onClick={() => setShowReflowVisuals(!showReflowVisuals)}
              className={`p-1.5 sm:px-2 sm:py-1 rounded-md text-xs transition flex items-center gap-1 border cursor-pointer ${
                showReflowVisuals
                  ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/40 font-bold shadow-xs'
                  : 'border-stone-300 dark:border-stone-700 opacity-60 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/10'
              }`}
              title={showReflowVisuals ? 'Page Figures & Visuals: ON' : 'Page Figures & Visuals: OFF'}
            >
              <ImageIcon size={13} className="text-emerald-500" />
              <span className="text-[10px] hidden sm:inline font-semibold">
                {showReflowVisuals ? 'Visuals: ON' : 'Visuals: OFF'}
              </span>
            </button>
          )}

          {/* Notes & Highlights Button with Counter */}
          <button
            onClick={() => setIsNotesModalOpen(true)}
            className={`p-1.5 sm:px-2 sm:py-1 rounded-md text-xs transition flex items-center gap-1.5 border cursor-pointer ${
              book.highlights && book.highlights.length > 0
                ? 'bg-amber-500/15 text-amber-500 dark:text-amber-400 border-amber-500/40 font-bold'
                : 'border-transparent hover:bg-black/5 dark:hover:bg-white/10'
            }`}
            title="Notes & Highlights"
          >
            <Highlighter size={13} />
            <span className="hidden sm:inline">Notes</span>
            {book.highlights && book.highlights.length > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-500 text-stone-950 font-bold font-mono">
                {book.highlights.length}
              </span>
            )}
          </button>

          {/* Bookmark Button */}
          <button
            onClick={handleToggleBookmark}
            className={`p-1.5 rounded-md text-xs transition flex items-center gap-1 border cursor-pointer ${
              isBookmarked
                ? 'bg-amber-100 border-amber-300 text-amber-950 font-bold'
                : 'border-transparent hover:bg-black/5 dark:hover:bg-white/10'
            }`}
            title={isBookmarked ? 'Bookmarked' : 'Add Bookmark'}
          >
            <BookmarkIcon size={14} className={isBookmarked ? 'fill-amber-600 text-amber-600' : ''} />
          </button>

          {/* Theme & Typography Switcher Trigger */}
          <button
            onClick={() => setActiveMenu(activeMenu === 'theme' ? null : 'theme')}
            className={`p-1.5 sm:px-2 sm:py-1 rounded-md text-xs font-semibold flex items-center gap-1 border transition cursor-pointer ${
              activeMenu === 'theme'
                ? 'bg-black/10 dark:bg-white/20 border-stone-400 font-bold'
                : 'border-transparent hover:bg-black/5 dark:hover:bg-white/10'
            }`}
            title="Themes and Typography"
          >
            <Type size={13} />
            <span className="hidden sm:inline">Aa</span>
          </button>

          {/* Table of Contents / Pages Navigator Trigger */}
          <button
            onClick={() => setActiveMenu(activeMenu === 'toc' ? null : 'toc')}
            className={`p-1.5 sm:px-2 sm:py-1 rounded-md text-xs transition flex items-center gap-1 border cursor-pointer ${
              activeMenu === 'toc'
                ? 'bg-black/10 dark:bg-white/20 border-stone-400 font-bold'
                : 'border-transparent hover:bg-black/5 dark:hover:bg-white/10'
            }`}
            title="Pages Navigator"
          >
            <List size={14} />
            <span className="hidden sm:inline">Pages</span>
          </button>

          {/* Fullscreen Toggle */}
          <button
            onClick={toggleFullscreen}
            className="p-1.5 rounded-md text-xs hover:bg-black/5 dark:hover:bg-white/10 transition cursor-pointer"
            title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
          >
            {isFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
          </button>
        </div>
      </header>

      {/* ============================================================ */}
      {/* 2. Theme & Typography Popup Panel                            */}
      {/* ============================================================ */}
      {activeMenu === 'theme' && (
        <div
          className="absolute top-13 right-3 sm:right-6 z-50 w-76 sm:w-80 rounded-xl shadow-2xl border p-4 font-sans space-y-4 text-xs animate-in fade-in slide-in-from-top-2 max-h-[82vh] overflow-y-auto"
          style={{
            backgroundColor: currentTheme.cardBg,
            borderColor: currentTheme.border,
            color: currentTheme.text,
          }}
        >
          <div>
            <div className="font-bold text-xs uppercase tracking-wider opacity-70 mb-2.5 flex items-center justify-between">
              <span>Reading Atmosphere</span>
              <span className="text-[10px] font-normal opacity-70">Kindle & E-Ink</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setTheme('dark')}
                className={`p-2.5 rounded-lg border text-left flex items-center justify-between transition cursor-pointer ${
                  theme === 'dark'
                    ? 'border-white ring-2 ring-white/20 bg-[#000000] text-white font-bold shadow-xs'
                    : 'border-stone-800 bg-[#000000] text-stone-200'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <Moon size={13} className="text-stone-400" />
                  <span>Kindle Dark</span>
                </div>
                {theme === 'dark' && <Check size={13} />}
              </button>

              <button
                onClick={() => setTheme('warm-sepia')}
                className={`p-2.5 rounded-lg border text-left flex items-center justify-between transition cursor-pointer ${
                  theme === 'warm-sepia'
                    ? 'border-[#2c2825] ring-2 ring-amber-800/20 bg-[#fcf7e9] text-[#2c2825] font-bold shadow-xs'
                    : 'border-[#eedfce] bg-[#fcf7e9] text-[#2c2825]'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#fcf7e9] border border-amber-300" />
                  <span>Paperwhite</span>
                </div>
                {theme === 'warm-sepia' && <Check size={13} />}
              </button>

              <button
                onClick={() => setTheme('light')}
                className={`p-2.5 rounded-lg border text-left flex items-center justify-between transition cursor-pointer ${
                  theme === 'light'
                    ? 'border-black ring-2 ring-black/10 bg-white text-black font-bold shadow-xs'
                    : 'border-stone-200 bg-white text-stone-900'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <Sun size={13} className="text-amber-500" />
                  <span>Daylight</span>
                </div>
                {theme === 'light' && <Check size={13} />}
              </button>

              <button
                onClick={() => setTheme('amber-glow')}
                className={`p-2.5 rounded-lg border text-left flex items-center justify-between transition cursor-pointer ${
                  theme === 'amber-glow'
                    ? 'border-amber-800 ring-2 ring-amber-500/30 bg-[#faeed2] text-[#302416] font-bold shadow-xs'
                    : 'border-amber-200 bg-[#faeed2] text-[#302416]'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400 border border-amber-600" />
                  <span>Amber Warm</span>
                </div>
                {theme === 'amber-glow' && <Check size={13} />}
              </button>

              <button
                onClick={() => setTheme('sepia')}
                className={`p-2.5 rounded-lg border text-left flex items-center justify-between transition cursor-pointer ${
                  theme === 'sepia'
                    ? 'border-[#3c2f1f] ring-2 ring-amber-700/20 bg-[#f4ecd8] text-[#3c2f1f] font-bold shadow-xs'
                    : 'border-amber-200 bg-[#f4ecd8] text-[#3c2f1f]'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#f4ecd8] border border-stone-400" />
                  <span>Vintage</span>
                </div>
                {theme === 'sepia' && <Check size={13} />}
              </button>

              <button
                onClick={() => setTheme('emerald-paper')}
                className={`p-2.5 rounded-lg border text-left flex items-center justify-between transition cursor-pointer ${
                  theme === 'emerald-paper'
                    ? 'border-emerald-800 ring-2 ring-emerald-500/30 bg-[#edf5f0] text-[#192b20] font-bold shadow-xs'
                    : 'border-emerald-200 bg-[#edf5f0] text-[#192b20]'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#edf5f0] border border-emerald-300" />
                  <span>Sage Mint</span>
                </div>
                {theme === 'emerald-paper' && <Check size={13} />}
              </button>
            </div>
          </div>

          {/* Chart Contrast Mode in Dark Mode */}
          {currentTheme.isDark && readingMode === 'original-pdf' && (
            <div className="pt-2.5 border-t" style={{ borderColor: currentTheme.border }}>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold opacity-85">Chart & Image Display:</span>
                <button
                  onClick={() => setPreserveChartColorsInDarkMode(!preserveChartColorsInDarkMode)}
                  className={`text-[10px] px-2 py-0.5 rounded font-bold transition cursor-pointer ${
                    preserveChartColorsInDarkMode
                      ? 'bg-blue-600 text-white'
                      : 'bg-stone-700 text-stone-200'
                  }`}
                >
                  {preserveChartColorsInDarkMode ? 'High-Contrast Dark' : 'Original Tone'}
                </button>
              </div>
            </div>
          )}

          {/* Eye Protection Warm Light Controls */}
          {eyeProtection && onChangeEyeProtection && (
            <div className="pt-3 border-t space-y-2.5" style={{ borderColor: currentTheme.border }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-bold text-amber-700 dark:text-amber-400">
                  <ShieldCheck size={14} />
                  <span>Eye Protection</span>
                </div>
                <button
                  onClick={() =>
                    onChangeEyeProtection({
                      ...eyeProtection,
                      enabled: !eyeProtection.enabled,
                    })
                  }
                  className={`text-[10px] px-2 py-0.5 rounded-full font-bold transition cursor-pointer ${
                    eyeProtection.enabled
                      ? 'bg-amber-500 text-stone-950'
                      : 'bg-stone-300 dark:bg-stone-700 text-stone-700 dark:text-stone-300'
                  }`}
                >
                  {eyeProtection.enabled ? 'ON' : 'OFF'}
                </button>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-[11px] opacity-75">
                  <span>Warm Light Temperature</span>
                  <span className="font-mono font-bold">{eyeProtection.warmth}/24</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="24"
                  value={eyeProtection.warmth}
                  onChange={(e) =>
                    onChangeEyeProtection({
                      ...eyeProtection,
                      enabled: true,
                      warmth: parseInt(e.target.value),
                    })
                  }
                  className="w-full h-1.5 rounded-lg appearance-none cursor-pointer accent-amber-500"
                  style={{
                    background: 'linear-gradient(to right, #e2e8f0 0%, #fef3c7 40%, #f59e0b 100%)',
                  }}
                />
              </div>
            </div>
          )}

          {/* Font Size & Typeface for Reflow Mode */}
          {readingMode === 'reflow-ereader' && (
            <>
              <div className="pt-3 border-t" style={{ borderColor: currentTheme.border }}>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-[10px] uppercase tracking-wider opacity-70">
                    Font Size
                  </span>
                  <span className="font-mono font-bold text-xs">{fontSize}px</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setFontSize((s) => Math.max(14, s - 1))}
                    className="flex-1 py-1.5 rounded-md border font-bold text-sm hover:bg-black/5 dark:hover:bg-white/10 transition cursor-pointer"
                    style={{ borderColor: currentTheme.border }}
                  >
                    A-
                  </button>
                  <button
                    onClick={() => setFontSize((s) => Math.min(28, s + 1))}
                    className="flex-1 py-1.5 rounded-md border font-bold text-sm hover:bg-black/5 dark:hover:bg-white/10 transition cursor-pointer"
                    style={{ borderColor: currentTheme.border }}
                  >
                    A+
                  </button>
                </div>
              </div>

              <div>
                <div className="font-bold text-[10px] uppercase tracking-wider text-stone-500 mb-2">
                  Typeface
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                  <button
                    onClick={() => setFontFamily('literata')}
                    className={`px-2.5 py-1.5 rounded text-left font-literata transition cursor-pointer text-xs ${
                      fontFamily === 'literata'
                        ? 'bg-black/10 dark:bg-white/20 font-bold'
                        : 'hover:bg-black/5'
                    }`}
                  >
                    Literata
                  </button>
                  <button
                    onClick={() => setFontFamily('bookerly')}
                    className={`px-2.5 py-1.5 rounded text-left font-bookerly transition cursor-pointer text-xs ${
                      fontFamily === 'bookerly'
                        ? 'bg-black/10 dark:bg-white/20 font-bold'
                        : 'hover:bg-black/5'
                    }`}
                  >
                    Bookerly
                  </button>
                  <button
                    onClick={() => setFontFamily('newsreader')}
                    className={`px-2.5 py-1.5 rounded text-left font-newsreader transition cursor-pointer text-xs ${
                      fontFamily === 'newsreader'
                        ? 'bg-black/10 dark:bg-white/20 font-bold'
                        : 'hover:bg-black/5'
                    }`}
                  >
                    Newsreader
                  </button>
                  <button
                    onClick={() => setFontFamily('garamond')}
                    className={`px-2.5 py-1.5 rounded text-left font-garamond transition cursor-pointer text-xs ${
                      fontFamily === 'garamond'
                        ? 'bg-black/10 dark:bg-white/20 font-bold'
                        : 'hover:bg-black/5'
                    }`}
                  >
                    EB Garamond
                  </button>
                  <button
                    onClick={() => setFontFamily('lora')}
                    className={`px-2.5 py-1.5 rounded text-left font-lora transition cursor-pointer text-xs ${
                      fontFamily === 'lora'
                        ? 'bg-black/10 dark:bg-white/20 font-bold'
                        : 'hover:bg-black/5'
                    }`}
                  >
                    Lora
                  </button>
                  <button
                    onClick={() => setFontFamily('sans')}
                    className={`px-2.5 py-1.5 rounded text-left font-sans-ui transition cursor-pointer text-xs ${
                      fontFamily === 'sans'
                        ? 'bg-black/10 dark:bg-white/20 font-bold'
                        : 'hover:bg-black/5'
                    }`}
                  >
                    Sans UI
                  </button>
                </div>
              </div>

              {/* Margins & Line Spacing */}
              <div className="pt-2 border-t space-y-2" style={{ borderColor: currentTheme.border }}>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[10px] uppercase tracking-wider text-stone-500">
                    Margins
                  </span>
                  <div className="flex gap-1">
                    {(['compact', 'normal', 'spacious'] as const).map((m) => (
                      <button
                        key={m}
                        onClick={() => setMargins(m)}
                        className={`px-2 py-0.5 text-[10px] capitalize rounded cursor-pointer ${
                          margins === m ? 'bg-black/10 dark:bg-white/20 font-bold' : 'hover:bg-black/5'
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="font-bold text-[10px] uppercase tracking-wider text-stone-500">
                    Line Spacing
                  </span>
                  <div className="flex gap-1">
                    {[
                      { label: 'Tight', val: 1.35 },
                      { label: 'Normal', val: 1.5 },
                      { label: 'Relaxed', val: 1.7 },
                    ].map((ls) => (
                      <button
                        key={ls.label}
                        onClick={() => setLineHeight(ls.val)}
                        className={`px-2 py-0.5 text-[10px] rounded cursor-pointer ${
                          lineHeight === ls.val ? 'bg-black/10 dark:bg-white/20 font-bold' : 'hover:bg-black/5'
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

      {/* ============================================================ */}
      {/* 3. Table of Contents / Pages Navigator Drawer                 */}
      {/* ============================================================ */}
      {activeMenu === 'toc' && (
        <div
          className="absolute top-13 right-3 sm:right-6 z-50 w-72 max-h-96 overflow-y-auto rounded-xl shadow-2xl border p-4 font-sans space-y-3 text-xs animate-in fade-in slide-in-from-top-2"
          style={{
            backgroundColor: currentTheme.cardBg,
            borderColor: currentTheme.border,
            color: currentTheme.text,
          }}
        >
          <div className="font-bold text-xs uppercase tracking-wider opacity-70 border-b pb-1">
            Page Navigator
          </div>
          
          <div className="space-y-1">
            <div className="text-[11px] font-semibold opacity-70">Jump to Page:</div>
            <div className="grid grid-cols-4 gap-1.5 max-h-48 overflow-y-auto pr-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pNum) => (
                <button
                  key={pNum}
                  onClick={() => {
                    setCurrentPage(pNum);
                    setActiveMenu(null);
                  }}
                  className={`p-1.5 rounded text-center font-mono text-xs transition cursor-pointer ${
                    currentPage === pNum
                      ? 'bg-stone-900 text-white dark:bg-white dark:text-stone-900 font-bold'
                      : 'hover:bg-black/5 dark:hover:bg-white/10'
                  }`}
                >
                  {pNum}
                </button>
              ))}
            </div>
          </div>

          {book.bookmarks && book.bookmarks.length > 0 && (
            <div className="pt-2 border-t space-y-1" style={{ borderColor: currentTheme.border }}>
              <div className="text-[11px] font-semibold opacity-70">Saved Bookmarks:</div>
              {book.bookmarks.map((bm) => (
                <button
                  key={bm.id}
                  onClick={() => {
                    setCurrentPage(bm.pageNumber);
                    setActiveMenu(null);
                  }}
                  className="w-full text-left p-1.5 rounded hover:bg-black/5 flex items-center justify-between text-xs cursor-pointer"
                >
                  <span>Page {bm.pageNumber}</span>
                  <span className="text-[10px] opacity-60">{bm.label || 'Bookmark'}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* 4. Chart / Medical Figure Zoom Lightbox Modal                */}
      {/* ============================================================ */}
      {zoomedFigure && (
        <div
          onClick={() => {
            setZoomedFigure(null);
            setModalZoomScale(1.0);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/90 backdrop-blur-md animate-in fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-4xl w-full bg-stone-900 border border-stone-700 rounded-2xl p-3 sm:p-5 text-white shadow-2xl space-y-3 max-h-[92vh] flex flex-col"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-stone-800 pb-2.5 shrink-0">
              <div className="flex items-center gap-2 min-w-0 pr-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                  {zoomedFigure.imageUrl ? <ImageIcon size={16} /> : <Activity size={16} />}
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-xs sm:text-sm truncate text-white">{zoomedFigure.title}</h3>
                  <p className="text-[10px] text-stone-400 truncate">High-Definition Visual Inspection</p>
                </div>
              </div>

              {/* Modal Controls: Zoom In/Out, Invert Contrast, Close */}
              <div className="flex items-center gap-1.5 shrink-0 font-sans">
                {zoomedFigure.imageUrl && (
                  <div className="flex items-center gap-0.5 bg-stone-800 p-0.5 rounded-lg border border-stone-700">
                    <button
                      onClick={() => setModalZoomScale((z) => Math.max(0.6, Number((z - 0.25).toFixed(2))))}
                      className="p-1 hover:bg-stone-700 rounded text-stone-300 hover:text-white cursor-pointer transition"
                      title="Zoom Out"
                    >
                      <ZoomOut size={13} />
                    </button>
                    <span className="text-[10px] font-mono font-bold px-1.5 text-stone-300">
                      {Math.round(modalZoomScale * 100)}%
                    </span>
                    <button
                      onClick={() => setModalZoomScale((z) => Math.min(3.0, Number((z + 0.25).toFixed(2))))}
                      className="p-1 hover:bg-stone-700 rounded text-stone-300 hover:text-white cursor-pointer transition"
                      title="Zoom In"
                    >
                      <ZoomIn size={13} />
                    </button>
                    <button
                      onClick={() => setModalZoomScale(1.0)}
                      className="p-1 hover:bg-stone-700 rounded text-stone-300 hover:text-white cursor-pointer transition text-[10px] px-1"
                      title="Reset Zoom"
                    >
                      <RotateCcw size={11} />
                    </button>
                    <button
                      onClick={() => setModalInvertColors(!modalInvertColors)}
                      className={`p-1 rounded cursor-pointer transition text-[10px] px-1.5 font-bold ${
                        modalInvertColors ? 'bg-amber-500 text-stone-950' : 'hover:bg-stone-700 text-stone-300'
                      }`}
                      title="Invert Colors (Dark/Light Filter)"
                    >
                      Invert
                    </button>
                  </div>
                )}

                <button
                  onClick={() => {
                    setZoomedFigure(null);
                    setModalZoomScale(1.0);
                  }}
                  className="px-2.5 py-1 bg-stone-800 hover:bg-stone-700 text-xs font-semibold rounded-lg transition cursor-pointer"
                >
                  Close (Esc)
                </button>
              </div>
            </div>

            {/* Visual Viewport */}
            <div className="w-full flex-1 bg-stone-950 rounded-xl border border-stone-800 p-2 flex items-center justify-center min-h-[220px] max-h-[65vh] overflow-auto select-none">
              {zoomedFigure.imageUrl ? (
                <div className="w-full h-full flex items-center justify-center overflow-auto p-2">
                  <img
                    src={zoomedFigure.imageUrl}
                    alt={zoomedFigure.title}
                    className="max-w-full h-auto object-contain transition-transform duration-150 rounded"
                    style={{
                      transform: `scale(${modalZoomScale})`,
                      transformOrigin: 'center center',
                      filter: modalInvertColors ? 'invert(0.92) hue-rotate(180deg)' : 'none',
                    }}
                  />
                </div>
              ) : zoomedFigure.type === 'ecg' ? (
                <div className="w-full space-y-3 font-mono text-xs p-2">
                  <div className="text-emerald-400 font-semibold flex items-center justify-between">
                    <span>12-LEAD RHYTHM STRIP (Lead II @ 25mm/s, 10mm/mV)</span>
                    <span className="text-stone-400 text-[10px]">HR: 74 BPM | PR: 160ms | QRS: 88ms</span>
                  </div>
                  <div className="w-full h-44 bg-[#061a12] rounded-lg border border-emerald-800/60 p-2 relative flex items-center justify-center overflow-hidden">
                    <svg className="w-full h-full" viewBox="0 0 600 120" preserveAspectRatio="none">
                      <defs>
                        <pattern id="ecgGrid" width="20" height="20" patternUnits="userSpaceOnUse">
                          <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#0a3322" strokeWidth="0.5" />
                        </pattern>
                      </defs>
                      <rect width="100%" height="100%" fill="url(#ecgGrid)" />
                      <path
                        d="M 0,60 L 40,60 Q 45,55 50,60 L 60,60 L 65,65 L 70,10 L 75,100 L 80,60 L 100,60 Q 115,40 130,60 L 180,60 Q 185,55 190,60 L 200,60 L 205,65 L 210,10 L 215,100 L 220,60 L 240,60 Q 255,40 270,60 L 320,60 Q 325,55 330,60 L 340,60 L 345,65 L 350,10 L 355,100 L 360,60 L 380,60 Q 395,40 410,60 L 460,60 Q 465,55 470,60 L 480,60 L 485,65 L 490,10 L 495,100 L 500,60 L 520,60 Q 535,40 550,60 L 600,60"
                        fill="none"
                        stroke="#34d399"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                </div>
              ) : zoomedFigure.type === 'radiology' ? (
                <div className="w-full space-y-3 font-sans text-xs p-2">
                  <div className="text-sky-400 font-semibold flex items-center justify-between">
                    <span>POSTEROANTERIOR CHEST RADIOGRAPH (ABCDEF Systematic Grid)</span>
                    <span className="text-stone-400 text-[10px]">CTR: 0.44 | Apices Clear</span>
                  </div>
                  <div className="w-full h-56 bg-stone-900 rounded-lg border border-sky-800/60 p-4 relative flex items-center justify-center">
                    <svg className="w-full h-full" viewBox="0 0 400 240">
                      <path d="M 170,10 L 230,10 L 230,50 L 170,50 Z" fill="#262626" stroke="#525252" />
                      <text x="200" y="32" textAnchor="middle" fill="#a3a3a3" fontSize="9">Trachea</text>
                      <path d="M 80,60 Q 140,50 180,90 Q 170,210 110,210 Q 60,180 80,60 Z" fill="#171717" stroke="#38bdf8" strokeWidth="1.5" />
                      <path d="M 320,60 Q 260,50 220,90 Q 230,210 290,210 Q 340,180 320,60 Z" fill="#171717" stroke="#38bdf8" strokeWidth="1.5" />
                      <path d="M 175,110 Q 140,150 160,195 Q 230,195 220,130 Q 200,110 175,110 Z" fill="#404040" stroke="#f87171" strokeWidth="1.5" />
                      <text x="180" y="160" textAnchor="middle" fill="#fca5a5" fontSize="10" fontWeight="bold">Heart (CTR: 44%)</text>
                      <circle cx="105" cy="205" r="4" fill="#34d399" />
                      <circle cx="295" cy="205" r="4" fill="#34d399" />
                      <text x="105" y="225" textAnchor="middle" fill="#86efac" fontSize="8">Costophrenic Angle (Sharp)</text>
                      <text x="295" y="225" textAnchor="middle" fill="#86efac" fontSize="8">Costophrenic Angle (Sharp)</text>
                    </svg>
                  </div>
                </div>
              ) : (
                <div className="w-full space-y-3 font-sans text-xs p-2">
                  <div className="text-amber-400 font-semibold">
                    ELECTROPHORETIC MICROCAPSULE SCHEMATIC
                  </div>
                  <div className="w-full h-44 bg-stone-900 rounded-lg border border-amber-800/60 p-4 flex items-center justify-center">
                    <svg className="w-full h-full" viewBox="0 0 400 160">
                      <rect x="30" y="15" width="340" height="12" fill="#38bdf8" opacity="0.4" />
                      <text x="200" y="24" textAnchor="middle" fill="#bae6fd" fontSize="8">Transparent Top Electrode (+)</text>
                      <circle cx="90" cy="80" r="35" fill="#1c1917" stroke="#d97706" strokeWidth="2" />
                      <circle cx="200" cy="80" r="35" fill="#1c1917" stroke="#d97706" strokeWidth="2" />
                      <circle cx="310" cy="80" r="35" fill="#1c1917" stroke="#d97706" strokeWidth="2" />
                      <circle cx="90" cy="60" r="5" fill="#ffffff" />
                      <circle cx="80" cy="65" r="5" fill="#ffffff" />
                      <circle cx="100" cy="65" r="5" fill="#ffffff" />
                      <circle cx="90" cy="95" r="5" fill="#525252" />
                      <text x="200" y="84" textAnchor="middle" fill="#fde68a" fontSize="9">Charged Pigments</text>
                      <rect x="30" y="130" width="340" height="12" fill="#78716c" />
                      <text x="200" y="139" textAnchor="middle" fill="#e7e5e4" fontSize="8">Bottom Electrode Grid (-)</text>
                    </svg>
                  </div>
                </div>
              )}
            </div>

            <p className="text-xs text-stone-300 leading-relaxed font-sans shrink-0 border-t border-stone-800 pt-2">
              {zoomedFigure.desc}
            </p>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 5. Reading Viewport with Touch Swipe & Auto-Fit Sizing        */}
      {/* ============================================================ */}
      <main
        ref={containerRef}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className="relative flex-1 w-full h-full flex items-center justify-center overflow-hidden touch-pan-y"
      >
        {/* Floating Left Page Turn Button */}
        <button
          onClick={handlePrevPage}
          disabled={currentPage <= 1}
          className={`absolute left-1 sm:left-3 z-30 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white/90 dark:bg-stone-900/90 shadow-md border border-stone-200 dark:border-stone-800 flex items-center justify-center transition active:scale-95 cursor-pointer ${
            currentPage <= 1
              ? 'opacity-0 pointer-events-none'
              : 'opacity-70 hover:opacity-100 hover:scale-105'
          }`}
          title="Previous Page (Swipe Right / Left Arrow)"
        >
          <ChevronLeft size={18} className="text-stone-800 dark:text-stone-200" />
        </button>

        {/* Floating Right Page Turn Button */}
        <button
          onClick={handleNextPage}
          disabled={currentPage >= totalPages}
          className={`absolute right-1 sm:right-3 z-30 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white/90 dark:bg-stone-900/90 shadow-md border border-stone-200 dark:border-stone-800 flex items-center justify-center transition active:scale-95 cursor-pointer ${
            currentPage >= totalPages
              ? 'opacity-0 pointer-events-none'
              : 'opacity-70 hover:opacity-100 hover:scale-105'
          }`}
          title="Next Page (Swipe Left / Right Arrow)"
        >
          <ChevronRight size={18} className="text-stone-800 dark:text-stone-200" />
        </button>

        {/* ========================================================== */}
        {/* MODE 1: GOOGLE PDF VIEWER HIGH-FIDELITY VECTOR CANVAS VIEW */}
        {/* ========================================================== */}
        {readingMode === 'original-pdf' && isPdf ? (
          <div
            onWheel={handlePdfWheel}
            onTouchStart={handlePdfTouchStart}
            onTouchMove={handlePdfTouchMove}
            onTouchEnd={handlePdfTouchEnd}
            className="w-full h-full flex flex-col items-center justify-start p-2 sm:p-6 overflow-auto relative z-10 cursor-default no-scrollbar touch-pan-x touch-pan-y reader-selectable"
            style={{
              backgroundColor: currentTheme.isDark ? '#141414' : '#525659',
            }}
          >
            {/* Centered Document Sheet with Native Aspect Ratio & Ultra-Crisp Vector Render */}
            <div
              className={`my-auto flex items-center justify-center max-w-full transition-transform duration-100 ${
                layoutMode === 'dual' && !isMobile ? 'flex-row gap-3 sm:gap-6' : 'flex-col'
              }`}
              style={{
                transform: `scale(${livePinchScale})`,
                transformOrigin: 'center center',
              }}
            >
              {/* Primary Page Canvas */}
              <div
                className="relative shadow-2xl rounded-xs overflow-hidden border border-black/20 dark:border-white/15 transition-shadow select-text reader-selectable"
                style={{
                  backgroundColor: currentTheme.bg,
                }}
              >
                <canvas
                  ref={canvasRef}
                  className="max-w-none h-auto block select-none pointer-events-none"
                  style={{
                    filter: currentTheme.canvasFilter,
                    display: 'block',
                  }}
                />
                <div
                  ref={textLayerRef}
                  className="pdf-text-layer absolute inset-0 overflow-hidden pointer-events-auto select-text reader-selectable z-10"
                />

                {/* PDF Page Highlights overlay badges */}
                {book.highlights
                  ?.filter((h) => h.pageNumber === currentPage)
                  .map((hl) => (
                    <div
                      key={hl.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                        setActiveSelection({
                          text: hl.text,
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
                        });
                      }}
                      className="absolute bottom-2 right-2 z-20 flex items-center gap-1.5 px-2.5 py-1 rounded-full shadow-lg border backdrop-blur-md cursor-pointer transition hover:scale-105"
                      style={{
                        backgroundColor: `${hl.color}35`,
                        borderColor: hl.color,
                        color: currentTheme.text,
                      }}
                      title={`Highlight: "${hl.text}"${hl.note ? `\nNote: ${hl.note}` : ''}`}
                    >
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: hl.color }} />
                      <span className="text-[10px] font-medium font-sans truncate max-w-[140px]">
                        {hl.note || hl.text}
                      </span>
                      {hl.note && <span className="text-[10px]">📝</span>}
                    </div>
                  ))}
              </div>

              {/* Secondary Page Canvas if Dual Spread Mode */}
              {layoutMode === 'dual' && !isMobile && currentPage + 1 <= totalPages && (
                <div
                  className="relative shadow-2xl rounded-xs overflow-hidden border border-black/20 dark:border-white/15 transition-shadow select-text"
                  style={{
                    backgroundColor: currentTheme.bg,
                  }}
                >
                  <canvas
                    ref={dualCanvasRef}
                    className="max-w-none h-auto block"
                    style={{
                      filter: currentTheme.canvasFilter,
                      display: 'block',
                    }}
                  />
                  <div
                    ref={dualTextLayerRef}
                    className="pdf-text-layer absolute inset-0 overflow-hidden pointer-events-auto select-text z-10"
                  />
                </div>
              )}

              {(pdfRendering || pdfLoading) && (
                <div className="fixed inset-0 flex items-center justify-center bg-black/40 backdrop-blur-xs text-xs font-sans text-white font-semibold gap-2 z-30 pointer-events-none">
                  <RefreshCw size={16} className="animate-spin text-white" />
                  <span>Rendering page {currentPage} of {totalPages} at ultra-HD resolution...</span>
                </div>
              )}

              {pdfRenderError && !pdfRendering && (
                <div className="p-6 text-center space-y-3 bg-stone-900/90 text-white rounded-xl shadow-xl border border-red-500/30 max-w-md">
                  <p className="text-xs text-red-400 font-medium">{pdfRenderError}</p>
                  <button
                    onClick={() => setReadingMode('reflow-ereader')}
                    className="px-4 py-2 bg-white text-black rounded-lg text-xs font-bold hover:bg-stone-200 transition cursor-pointer"
                  >
                    Switch to Reflow Mode
                  </button>
                </div>
              )}
            </div>

            {/* Google PDF Viewer Floating Control Dock */}
            <div className="fixed bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-1 sm:gap-2 px-3 py-1.5 bg-stone-950/90 hover:bg-stone-950 text-white backdrop-blur-md rounded-full shadow-2xl border border-white/15 text-xs transition">
              {/* Page navigation with direct input */}
              <button
                onClick={handlePrevPage}
                disabled={currentPage <= 1}
                className="p-1 hover:bg-white/15 disabled:opacity-30 disabled:hover:bg-transparent rounded-full transition cursor-pointer"
                title="Previous Page"
              >
                <ChevronLeft size={16} />
              </button>

              <form onSubmit={handlePageJumpSubmit} className="flex items-center gap-1 text-[11px] font-mono">
                <input
                  type="text"
                  value={pageInputVal}
                  onChange={(e) => setPageInputVal(e.target.value)}
                  onBlur={handlePageJumpSubmit}
                  className="w-10 text-center bg-white/10 hover:bg-white/20 focus:bg-white/25 focus:outline-none rounded py-0.5 text-white font-bold"
                  title="Type page number and press Enter"
                />
                <span className="opacity-60 text-[10px]">/ {totalPages}</span>
              </form>

              <button
                onClick={handleNextPage}
                disabled={currentPage >= totalPages}
                className="p-1 hover:bg-white/15 disabled:opacity-30 disabled:hover:bg-transparent rounded-full transition cursor-pointer"
                title="Next Page"
              >
                <ChevronRight size={16} />
              </button>

              <div className="w-px h-4 bg-white/20 mx-0.5" />

              {/* Zoom Out */}
              <button
                onClick={() => {
                  setPdfZoomMode('custom');
                  setPdfCustomZoomScale((z) => Math.max(0.4, Number((z - 0.2).toFixed(2))));
                }}
                className="p-1 hover:bg-white/15 rounded-full transition cursor-pointer"
                title="Zoom Out (-)"
              >
                <ZoomOut size={15} />
              </button>

              {/* Zoom % label */}
              <button
                onClick={() => {
                  setPdfZoomMode('fit-width');
                  setPdfCustomZoomScale(1.0);
                }}
                className="text-[10px] font-semibold font-mono px-1.5 py-0.5 hover:bg-white/15 rounded transition cursor-pointer"
                title="Click to Fit Width"
              >
                {pdfZoomMode === 'fit-width'
                  ? 'Fit Width'
                  : pdfZoomMode === 'fit-page'
                  ? 'Fit Page'
                  : pdfZoomMode === '100%'
                  ? '100%'
                  : `${Math.round(pdfCustomZoomScale * 100)}%`}
              </button>

              {/* Zoom In */}
              <button
                onClick={() => {
                  setPdfZoomMode('custom');
                  setPdfCustomZoomScale((z) => Math.min(5.0, Number((z + 0.2).toFixed(2))));
                }}
                className="p-1 hover:bg-white/15 rounded-full transition cursor-pointer"
                title="Zoom In (+) - Razor sharp vector"
              >
                <ZoomIn size={15} />
              </button>

              <div className="w-px h-4 bg-white/20 mx-0.5" />

              {/* Fit Width */}
              <button
                onClick={() => {
                  setPdfZoomMode('fit-width');
                  setPdfCustomZoomScale(1.0);
                }}
                className={`p-1 rounded-full transition cursor-pointer ${
                  pdfZoomMode === 'fit-width' ? 'bg-white/25 text-white' : 'hover:bg-white/15 text-white/80'
                }`}
                title="Fit to Width"
              >
                <Maximize2 size={14} />
              </button>

              {/* Fit Page */}
              <button
                onClick={() => {
                  setPdfZoomMode('fit-page');
                  setPdfCustomZoomScale(1.0);
                }}
                className={`p-1 rounded-full transition cursor-pointer ${
                  pdfZoomMode === 'fit-page' ? 'bg-white/25 text-white' : 'hover:bg-white/15 text-white/80'
                }`}
                title="Fit Entire Page"
              >
                <Minimize2 size={14} />
              </button>

              {/* Rotate Clockwise 90 deg */}
              <button
                onClick={() => setPdfRotation((r) => (r + 90) % 360)}
                className="p-1 hover:bg-white/15 rounded-full transition cursor-pointer text-white/80 hover:text-white"
                title="Rotate 90° Clockwise"
              >
                <RotateCw size={14} />
              </button>

              {/* Dual Spread (desktop/tablet) */}
              {!isMobile && totalPages > 1 && (
                <button
                  onClick={() => setLayoutMode(layoutMode === 'single' ? 'dual' : 'single')}
                  className={`p-1 rounded-full transition cursor-pointer ${
                    layoutMode === 'dual' ? 'bg-white/25 text-white' : 'hover:bg-white/15 text-white/80'
                  }`}
                  title={layoutMode === 'dual' ? 'Switch to Single Page' : 'Two-Page Spread'}
                >
                  {layoutMode === 'dual' ? <Square size={14} /> : <Columns size={14} />}
                </button>
              )}
            </div>
          </div>
        ) : (
          /* ========================================================== */
          /* MODE 2: KINDLE REFLOW WITH EMBEDDED CHARTS & SLIDE MOTION  */
          /* ========================================================== */
          <div
            className={`w-full max-w-2xl h-full flex flex-col justify-between py-3 sm:py-5 ${marginClass} select-text reflow-reader-content relative z-10 overflow-hidden`}
          >
            {isExtractingText && (
              <div className="text-[11px] text-amber-700 dark:text-amber-400 font-sans flex items-center gap-1.5 mb-2 bg-amber-50 dark:bg-amber-950/40 px-3 py-1.5 rounded-lg border border-amber-200 dark:border-amber-900 animate-pulse">
                <RefreshCw size={12} className="animate-spin" />
                <span>Formatting page {currentPage} for reading...</span>
              </div>
            )}

            {/* Reading Content Area with Smooth Horizontal Slide & Drag Gestures */}
            <div className="w-full flex-1 relative overflow-hidden flex flex-col justify-start reflow-reader-content">
              <AnimatePresence initial={false} custom={slideDirection} mode="wait">
                <motion.div
                  key={currentPage}
                  custom={slideDirection}
                  variants={{
                    enter: (dir: 'next' | 'prev') => ({
                      x: dir === 'next' ? 45 : -45,
                      opacity: 0,
                    }),
                    center: {
                      x: 0,
                      opacity: 1,
                      transition: {
                        x: { type: 'spring', stiffness: 420, damping: 34 },
                        opacity: { duration: 0.15 },
                      },
                    },
                    exit: (dir: 'next' | 'prev') => ({
                      x: dir === 'next' ? -45 : 45,
                      opacity: 0,
                      transition: {
                        x: { type: 'spring', stiffness: 420, damping: 34 },
                        opacity: { duration: 0.12 },
                      },
                    }),
                  }}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  className="w-full flex-1 flex flex-col justify-start leading-relaxed text-justify tracking-normal select-text reflow-reader-content no-scrollbar overflow-y-auto cursor-text touch-pan-y"
                  style={{
                    fontSize: `${fontSize}px`,
                    lineHeight: lineHeight,
                    color: currentTheme.text,
                  }}
                >
                  {/* If this sample book has interactive vector illustrations on this page, render it */}
                  {showReflowVisuals && SAMPLE_BOOK_ILLUSTRATIONS[book.id]?.[currentPage] && (
                    <RenderIllustration
                      illustration={SAMPLE_BOOK_ILLUSTRATIONS[book.id][currentPage]}
                      isDark={currentTheme.isDark}
                      onExpand={() => {
                        const ill = SAMPLE_BOOK_ILLUSTRATIONS[book.id][currentPage];
                        setZoomedFigure({
                          title: ill.title,
                          desc: ill.description,
                          type: ill.type,
                        });
                      }}
                    />
                  )}

                  {/* Render Reflow structured content */}
                  {renderKindleReflowContent()}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        )}
      </main>

      {/* ============================================================ */}
      {/* 6. Kindle-Style Footer Status Bar (Matches User's Screenshot) */}
      {/* ============================================================ */}
      <footer
        className="h-8 sm:h-9 px-4 sm:px-8 flex items-center justify-between font-sans text-xs select-none tracking-normal transition-colors duration-300 shrink-0 z-30 opacity-75 hover:opacity-100"
        style={{
          color: currentTheme.secondaryText,
          backgroundColor: currentTheme.bg,
        }}
      >
        {/* Left: Kindle "Location X of Y" Indicator */}
        <div className="flex items-center gap-2 font-mono text-[11px] sm:text-xs">
          <span>
            Location {kindleLocation} of {kindleTotalLocations}
          </span>
          {isBookmarked && (
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" title="Bookmark saved" />
          )}
        </div>

        {/* Center: Quick Page Navigation Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrevPage}
            disabled={currentPage <= 1}
            className="p-1 rounded text-stone-400 hover:text-stone-200 disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer transition"
            title="Previous Page"
          >
            <ChevronLeft size={13} />
          </button>

          {/* Page Slider */}
          <div className="flex items-center px-1">
            <input
              type="range"
              min="1"
              max={totalPages}
              value={currentPage}
              onChange={(e) => setCurrentPage(parseInt(e.target.value))}
              className="kindle-slider w-16 sm:w-24 md:w-32 cursor-pointer"
            />
          </div>

          <button
            onClick={handleNextPage}
            disabled={currentPage >= totalPages}
            className="p-1 rounded text-stone-400 hover:text-stone-200 disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer transition"
            title="Next Page"
          >
            <ChevronRight size={13} />
          </button>
        </div>

        {/* Right: Kindle Reading Progress Percentage */}
        <div className="flex items-center gap-2 font-mono text-[11px] sm:text-xs font-semibold">
          <span>{kindlePercent}%</span>
        </div>
      </footer>

      {/* ============================================================ */}
      {/* 7. Kindle Floating Annotation & Highlighting Toolbar        */}
      {/* ============================================================ */}
      {activeSelection && readingMode === 'reflow-ereader' && (
        <KindleAnnotationToolbar
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

      {/* ============================================================ */}
      {/* 8. Kindle Notes & Highlights Manager Modal                   */}
      {/* ============================================================ */}
      <NotesAndHighlightsModal
        isOpen={isNotesModalOpen}
        onClose={() => setIsNotesModalOpen(false)}
        book={book}
        bookTitle={book.title}
        highlights={book.highlights || []}
        onJumpToPage={(pageNum) => {
          setCurrentPage(pageNum);
          setIsNotesModalOpen(false);
        }}
        onDeleteHighlight={handleDeleteHighlightInternal}
        onEditHighlight={handleUpdateHighlightInternal}
      />
    </div>
  );
};
