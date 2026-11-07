export interface ChartBlockPayload {
  img: string;
  caption?: string;
  plainCaption?: string;
}

export interface TableBlockPayload {
  titleRichText?: string;
  titlePlainText?: string;
  headers: string[][];
  rows: {
    cells: string[];
    isSubheader?: boolean;
    indentFirstCol?: boolean;
  }[];
  colAlignments: ('left' | 'right' | 'center')[];
}

export interface PageMarginBlockPayload {
  left?: string;
  center?: string;
  right?: string;
  plainText: string;
}

export interface ReflowBlock {
  type:
    | 'page_header'
    | 'page_footer'
    | 'right_heading'
    | 'chapter_title'
    | 'centered_heading'
    | 'heading'
    | 'subheading'
    | 'paragraph'
    | 'indent_paragraph'
    | 'blockquote'
    | 'list_item'
    | 'verse_line'
    | 'footnote'
    | 'scene_break'
    | 'page_image'
    | 'chart_block'
    | 'table_block';
  plainText: string;
  richText: string;
}

interface RawTextItem {
  str: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  isBold: boolean;
  isItalic: boolean;
  hasEOL: boolean;
}

interface RotatedTextBand {
  yMin: number;
  yMax: number;
  xMin: number;
  xMax: number;
  texts: string[];
}

interface LineSegment {
  plainText: string;
  richText: string;
  startX: number;
  endX: number;
  centerX: number;
  isNumeric: boolean;
}

interface LineGroup {
  items: RawTextItem[];
  segments: LineSegment[];
  y: number;
  startX: number;
  endX: number;
  width: number;
  plainText: string;
  richText: string;
  maxFontSize: number;
  avgFontSize: number;
  isCentered: boolean;
  isRightAligned: boolean;
  isHeading: boolean;
  isChapterTitle: boolean;
  isSubheading: boolean;
  isAllBold: boolean;
  isAllItalic: boolean;
  isListItem: boolean;
  isSceneBreak: boolean;
  startsWithSuperscriptNote: boolean;
}

const COMPOUND_HYPHEN_PREFIXES = new Set([
  'self',
  'well',
  'non',
  'pre',
  'post',
  'anti',
  'multi',
  'inter',
  'intra',
  'over',
  'under',
  'super',
  'sub',
  'semi',
  'quasi',
  'co',
  're',
  'ex',
  'all',
  'half',
  'high',
  'low',
  'full',
  'part',
  'cross',
  'counter',
  'mid',
  'neo',
  'pan',
  'pro',
  'ultra',
  'vice',
  'one',
  'two',
  'three',
  'four',
  'five',
  'six',
  'seven',
  'eight',
  'nine',
  'ten',
  'twenty',
  'thirty',
  'forty',
  'fifty',
  'sixty',
  'seventy',
  'eighty',
  'ninety',
]);

const COMMON_ABBREVIATIONS =
  /\b(?:Mr|Mrs|Ms|Dr|Prof|Sr|Jr|St|Mt|Gen|Col|Capt|Lt|Sgt|Rev|Hon|Pres|Gov|Sen|Rep|Inc|Ltd|Co|Corp|LLC|vs|v|etc|al|e\.g|i\.e|Fig|fig|No|no|Vol|vol|pp|p|ch|sec|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec|U\.S|U\.K|E\.U)\.$/;

/**
 * Normalizes PDF ligatures, soft hyphens, and non-standard whitespace
 * so words match original PDF text cleanly.
 */
function normalizePdfString(input: string): string {
  if (!input) return '';
  return input
    .normalize('NFKC')
    .replace(/\u00AD/g, '') // remove soft hyphens
    .replace(/[\u200B-\u200D\uFEFF]/g, '') // remove zero-width spaces
    .replace(/\u00A0/g, ' '); // convert non-breaking space to regular space
}

/**
 * Collapses letter-spaced structural titles such as "C H A P T E R 1" -> "CHAPTER 1"
 */
function normalizeSpacedStructuralWords(input: string): string {
  if (!input) return '';
  return input
    .replace(/\bC\s+H\s+A\s+P\s+T\s+E\s+R\b/gi, 'CHAPTER')
    .replace(/\bS\s+E\s+C\s+T\s+I\s+O\s+N\b/gi, 'SECTION')
    .replace(/\bP\s+A\s+R\s+T\b/gi, 'PART');
}

/**
 * Determines whether a hyphen at the end of a PDF line is a soft line-wrap hyphen
 * (which should be removed to rejoin the split word) or a real compound word hyphen
 * (which should be kept, e.g., "self-aware", "twenty-one").
 */
function shouldStripLineEndHyphen(prevPlainText: string, nextPlainText: string): boolean {
  const prevTrimmed = prevPlainText.trimEnd();
  if (
    !/[-‐‑‒]$/.test(prevTrimmed) ||
    /\s[-‐‑‒]$/.test(prevTrimmed) ||
    /--$/.test(prevTrimmed)
  ) {
    return false;
  }

  const nextTrimmed = nextPlainText.trimStart();
  if (!/^[a-z]/.test(nextTrimmed)) {
    return false;
  }

  const match = prevTrimmed.match(/([A-Za-z]+)[-‐‑‒]$/);
  if (!match) return false;

  const prefixWord = match[1].toLowerCase();
  if (COMPOUND_HYPHEN_PREFIXES.has(prefixWord)) {
    return false;
  }

  return true;
}

/**
 * Checks whether two horizontal X intervals overlap significantly.
 */
function horizontalIntervalsOverlap(
  aStart: number,
  aEnd: number,
  bStart: number,
  bEnd: number
): boolean {
  const overlap = Math.min(aEnd, bEnd) - Math.max(aStart, bStart);
  if (overlap <= 2) return false;
  const minWidth = Math.max(1, Math.min(aEnd - aStart, bEnd - bStart));
  return overlap / minWidth > 0.25;
}

function isNumericValueToken(str: string): boolean {
  const t = str.trim();
  if (!t) return false;
  return (
    /^[-+–—]?[$€£¥₹]?\s*\d[\d,.]*(?:\s*[%a-zA-Z]{0,3})?$/.test(t) ||
    /^\(\s*[-+]?\d[\d,.]*\s*%?\s*\)$/.test(t) ||
    /^(?:n\/a|na|nil|-|–|—)$/i.test(t)
  );
}

/**
 * Rebuilds a LineGroup's plainText, richText (including <sup> superscripts),
 * horizontal column segments, startX, endX, width, and font metrics from its `items` array.
 */
function buildLineGroupText(line: LineGroup): void {
  line.items.sort((a, b) => a.x - b.x);

  // Deduplicate overlapping identical PDF text items (e.g. faux-bold or drop-shadow text operators)
  const dedupedItems: RawTextItem[] = [];
  for (const item of line.items) {
    const prev = dedupedItems[dedupedItems.length - 1];
    if (
      prev &&
      prev.str.trim() === item.str.trim() &&
      Math.abs(item.x - prev.x) <= Math.max(2.5, item.fontSize * 0.25)
    ) {
      prev.isBold = true;
      continue;
    }
    dedupedItems.push(item);
  }
  line.items = dedupedItems;

  // Determine the dominant baseline Y and font size among main (non-superscript) items on this line
  const lineMaxFs = line.items.reduce((m, it) => Math.max(m, it.fontSize), 0) || 12;
  const mainItems = line.items.filter((it) => it.fontSize >= lineMaxFs * 0.8);
  const dominantLineY =
    mainItems.length > 0
      ? mainItems.reduce((sum, it) => sum + it.y * Math.max(1, it.str.trim().length), 0) /
        mainItems.reduce((sum, it) => sum + Math.max(1, it.str.trim().length), 0)
      : line.y;
  const dominantLineFs =
    mainItems.length > 0
      ? mainItems.reduce((sum, it) => sum + it.fontSize * Math.max(1, it.str.trim().length), 0) /
        mainItems.reduce((sum, it) => sum + Math.max(1, it.str.trim().length), 0)
      : lineMaxFs;

  let linePlainText = '';
  let lineRichText = '';
  let currentSpanText = '';
  let currentSpanBold = false;
  let currentSpanItalic = false;
  let minX = Infinity;
  let maxX = -Infinity;
  let maxFs = 0;
  let weightedFsSum = 0;
  let totalCharWeight = 0;
  let startsWithSuperscriptNote = false;

  // Track multi-column segments on this line (for tables, financial sheets, running headers, and axis ticks)
  const segments: LineSegment[] = [];
  let segPlain = '';
  let segRich = '';
  let segSpanText = '';
  let segSpanBold = false;
  let segSpanItalic = false;
  let segStartX = Infinity;
  let segEndX = -Infinity;

  const flushSegSpan = () => {
    if (!segSpanText) return;
    let formatted = normalizeSpacedStructuralWords(segSpanText);
    if (segSpanBold && segSpanItalic) {
      formatted = `<strong><em>${formatted}</em></strong>`;
    } else if (segSpanBold) {
      formatted = `<strong>${formatted}</strong>`;
    } else if (segSpanItalic) {
      formatted = `<em>${formatted}</em>`;
    }
    segRich += formatted;
    segSpanText = '';
  };

  const flushSegment = () => {
    flushSegSpan();
    const cleanP = normalizeSpacedStructuralWords(segPlain.replace(/\s+/g, ' ').trim());
    const cleanR = segRich.replace(/\s+/g, ' ').trim();
    if (cleanP.length > 0) {
      const sX = segStartX === Infinity ? 0 : segStartX;
      const eX = segEndX === -Infinity ? sX : segEndX;
      segments.push({
        plainText: cleanP,
        richText: cleanR,
        startX: sX,
        endX: eX,
        centerX: (sX + eX) / 2,
        isNumeric: isNumericValueToken(cleanP),
      });
    }
    segPlain = '';
    segRich = '';
    segStartX = Infinity;
    segEndX = -Infinity;
  };

  const flushSpan = () => {
    if (!currentSpanText) return;
    let formatted = normalizeSpacedStructuralWords(currentSpanText);
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

  const singleCharCount = line.items.filter((it) => it.str.trim().length === 1).length;
  const isLikelyKerningSplitLine =
    line.items.length >= 4 && singleCharCount / line.items.length >= 0.7;

  for (let i = 0; i < line.items.length; i++) {
    const it = line.items[i];
    const trimmedItemStr = it.str.trim();

    // Check if this item is a raised superscript footnote reference (e.g. "costs.10", "(JNPT)11", or footnote lead "10See...")
    const isSuperscriptItem =
      line.items.length > 1 &&
      /^[0-9*†‡§]{1,3}$/.test(trimmedItemStr) &&
      it.fontSize <= dominantLineFs * 0.79 &&
      it.y - dominantLineY >= dominantLineFs * 0.08;

    if (i === 0 && isSuperscriptItem) {
      startsWithSuperscriptNote = true;
    }

    minX = Math.min(minX, it.x);
    maxX = Math.max(maxX, it.x + it.width);
    maxFs = Math.max(maxFs, it.fontSize);

    if (!isSuperscriptItem) {
      const charWeight = Math.max(1, trimmedItemStr.length);
      weightedFsSum += it.fontSize * charWeight;
      totalCharWeight += charWeight;
    }

    let isColumnGap = false;

    if (i > 0) {
      const prev = line.items[i - 1];
      const prevTrimmed = prev.str.trim();
      const prevWasSuperscript =
        line.items.length > 1 &&
        /^[0-9*†‡§]{1,3}$/.test(prevTrimmed) &&
        prev.fontSize <= dominantLineFs * 0.79 &&
        prev.y - dominantLineY >= dominantLineFs * 0.08;

      const gap = it.x - (prev.x + prev.width);
      const refFs = Math.max(prev.fontSize, it.fontSize, 10);

      const spaceThreshold = isLikelyKerningSplitLine
        ? Math.max(3.2, refFs * 0.42)
        : Math.max(1.1, refFs * 0.14);

      const columnGapThreshold = Math.max(8.5, refFs * 0.92);
      if (!isLikelyKerningSplitLine && !isSuperscriptItem && !prevWasSuperscript && gap >= columnGapThreshold) {
        isColumnGap = true;
      }

      const alreadyHasSpace =
        linePlainText.endsWith(' ') || prev.str.endsWith(' ') || it.str.startsWith(' ');
      const isClosingPunctuation = /^[.,:;!?)\]}'"”’»%]/.test(trimmedItemStr);
      const prevIsOpeningPunctuation = /[([{"“‘«—–-]$/.test(prevTrimmed);

      // Do not insert space before an attached trailing superscript (e.g. "costs.10" or "(JNPT)11"),
      // but DO insert a space after a superscript when followed by a word (e.g. "(JNPT)11 where" or "10 See")
      const needSpace =
        !isSuperscriptItem &&
        !alreadyHasSpace &&
        ((prevWasSuperscript && /^[A-Za-z"“‘(]/.test(trimmedItemStr)) ||
          (gap >= spaceThreshold && !isClosingPunctuation && !prevIsOpeningPunctuation));

      if (needSpace) {
        linePlainText += ' ';
        if (currentSpanText) {
          currentSpanText += ' ';
        } else {
          lineRichText += ' ';
        }
      }

      if (isColumnGap) {
        flushSegment();
      } else if (needSpace) {
        segPlain += ' ';
        if (segSpanText) {
          segSpanText += ' ';
        } else {
          segRich += ' ';
        }
      }
    }

    if (isSuperscriptItem) {
      flushSpan();
      flushSegSpan();
      segStartX = Math.min(segStartX, it.x);
      segEndX = Math.max(segEndX, it.x + it.width);
      linePlainText += trimmedItemStr;
      lineRichText += `<sup>${trimmedItemStr}</sup>`;
      segPlain += trimmedItemStr;
      segRich += `<sup>${trimmedItemStr}</sup>`;
      continue;
    }

    if (it.isBold !== currentSpanBold || it.isItalic !== currentSpanItalic) {
      flushSpan();
      currentSpanBold = it.isBold;
      currentSpanItalic = it.isItalic;
    }

    if (it.isBold !== segSpanBold || it.isItalic !== segSpanItalic) {
      flushSegSpan();
      segSpanBold = it.isBold;
      segSpanItalic = it.isItalic;
    }

    segStartX = Math.min(segStartX, it.x);
    segEndX = Math.max(segEndX, it.x + it.width);

    const cleanedPiece = it.str.replace(/\s+/g, ' ');
    if (
      linePlainText.endsWith(' ') &&
      cleanedPiece.startsWith(' ') &&
      cleanedPiece.length > 1
    ) {
      currentSpanText += cleanedPiece.slice(1);
      linePlainText += cleanedPiece.slice(1);
    } else {
      currentSpanText += cleanedPiece;
      linePlainText += cleanedPiece;
    }

    if (segPlain.endsWith(' ') && cleanedPiece.startsWith(' ') && cleanedPiece.length > 1) {
      segSpanText += cleanedPiece.slice(1);
      segPlain += cleanedPiece.slice(1);
    } else {
      segSpanText += cleanedPiece;
      segPlain += cleanedPiece;
    }
  }

  flushSpan();
  flushSegment();

  line.plainText = normalizeSpacedStructuralWords(linePlainText.replace(/\s+/g, ' ').trim());
  line.richText = normalizeSpacedStructuralWords(lineRichText.replace(/\s+/g, ' ').trim());
  line.startX = minX === Infinity ? 0 : minX;
  line.endX = maxX === -Infinity ? 0 : maxX;
  line.width = Math.max(0, line.endX - line.startX);
  line.maxFontSize = maxFs || 12;
  line.avgFontSize = totalCharWeight > 0 ? weightedFsSum / totalCharWeight : maxFs || 12;
  line.isAllBold = line.items.length > 0 && line.items.every((it) => it.isBold);
  line.isAllItalic = line.items.length > 0 && line.items.every((it) => it.isItalic);
  line.segments = segments;
  line.startsWithSuperscriptNote = startsWithSuperscriptNote;
}

/**
 * Checks if a line is an axis tick sequence (e.g. "2003 2004 2005 2006 2007 2008" or "0 20 40 60 80 100")
 */
function isAxisTickSequenceLine(line: LineGroup): boolean {
  const text = line.plainText.trim();
  if (!text) return false;
  const tokens = text.split(/\s+/);
  if (tokens.length < 2 || tokens.length > 16) return false;

  const isTickToken = (tok: string) =>
    /^[-+]?\d{1,4}(?:[.,]\d{1,2})?%?$/.test(tok) ||
    /^(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec|Q[1-4]|FY\d{2,4})$/i.test(tok);

  if (tokens.every(isTickToken)) {
    if (tokens.length >= 3) return true;
    if (line.segments.length >= 2 && line.width >= line.avgFontSize * 5) return true;
  }
  return false;
}

/**
 * Distinguishes a genuine FIGURE / CHART caption (e.g. "FIGURE 1.1 GDP Growth in Recent Years")
 * from a body prose sentence that starts with "Figure 1.1 shows quarterly GDP growth data..."
 */
function isFigureCaptionText(text: string): boolean {
  const trimmed = text.trim();
  const match = trimmed.match(
    /^(?:figure|fig\.?|chart|graph|diagram|illustration|plate)\s+[0-9a-z.\-]+(.*)$/i
  );
  if (!match) return false;

  const rest = (match[1] || '').trim();
  if (rest.length > 0 && /^[a-z,]/.test(rest)) {
    return false;
  }
  return true;
}

/**
 * Distinguishes a genuine TABLE / SHEET caption (e.g. "TABLE 1.1 How GDP Growth Accelerated")
 * from a body prose sentence that starts with "Table 1.2 shows the change in the structure of GDP..."
 */
function isTableCaptionText(text: string): boolean {
  const trimmed = text.trim();
  const match = trimmed.match(/^(?:table|exhibit|schedule|sheet)\s+[0-9a-z.\-]+(.*)$/i);
  if (!match) return false;

  const rest = (match[1] || '').trim();
  if (rest.length > 0 && /^[a-z,]/.test(rest)) {
    return false;
  }
  return true;
}

/**
 * Crops a PDF vertical band [yBottomPdf, yTopPdf] from a rendered high-DPI page canvas,
 * automatically trimming excess paper whitespace around the chart/figure graphics.
 */
function cropChartRegionFromCanvas(
  fullCanvas: HTMLCanvasElement,
  viewport: any,
  yTopPdf: number,
  yBottomPdf: number
): string {
  try {
    const [, py1] = viewport.convertToViewportPoint(0, yTopPdf);
    const [, py2] = viewport.convertToViewportPoint(0, yBottomPdf);

    const rawTop = Math.max(0, Math.floor(Math.min(py1, py2)));
    const rawBottom = Math.min(fullCanvas.height, Math.ceil(Math.max(py1, py2)));
    const sliceHeight = rawBottom - rawTop;
    if (sliceHeight < 24 || fullCanvas.width < 24) return '';

    const ctx = fullCanvas.getContext('2d');
    if (!ctx) return '';

    const imgData = ctx.getImageData(0, rawTop, fullCanvas.width, sliceHeight);
    const data = imgData.data;
    const w = fullCanvas.width;
    const h = sliceHeight;

    let minX = w;
    let maxX = 0;
    let minY = h;
    let maxY = 0;
    let inkPixelCount = 0;

    for (let y = 0; y < h; y++) {
      const rowOffset = y * w * 4;
      for (let x = 0; x < w; x++) {
        const idx = rowOffset + x * 4;
        const a = data[idx + 3];
        if (a < 32) continue;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        if (r < 244 || g < 244 || b < 244) {
          inkPixelCount++;
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }

    if (inkPixelCount < 80 || maxX <= minX + 16 || maxY <= minY + 12) {
      return '';
    }

    const pad = 16;
    const cropX = Math.max(0, minX - pad);
    const cropY = Math.max(0, minY - pad);
    const cropW = Math.min(w - cropX, maxX - minX + pad * 2);
    const cropH = Math.min(h - cropY, maxY - minY + pad * 2);

    const outCanvas = document.createElement('canvas');
    outCanvas.width = cropW;
    outCanvas.height = cropH;
    const outCtx = outCanvas.getContext('2d');
    if (!outCtx) return '';

    outCtx.fillStyle = '#FFFFFF';
    outCtx.fillRect(0, 0, cropW, cropH);
    outCtx.drawImage(
      fullCanvas,
      cropX,
      rawTop + cropY,
      cropW,
      cropH,
      0,
      0,
      cropW,
      cropH
    );

    return outCanvas.toDataURL('image/jpeg', 0.92);
  } catch (e) {
    return '';
  }
}

/**
 * Builds a structured TableBlockPayload from a sequence of table LineGroups,
 * clustering horizontal segment coordinates so missing cells stay in their proper column.
 */
function buildStructuredTablePayload(
  tableLines: LineGroup[],
  dominantLeftMargin: number,
  typicalLineWidth: number
): TableBlockPayload | null {
  if (tableLines.length === 0) return null;

  let startIndex = 0;
  let titleRichText: string | undefined;
  let titlePlainText: string | undefined;

  if (isTableCaptionText(tableLines[0].plainText)) {
    titleRichText = tableLines[0].richText;
    titlePlainText = tableLines[0].plainText;
    startIndex = 1;
    if (
      startIndex < tableLines.length &&
      tableLines[startIndex].segments.length === 1 &&
      startIndex + 1 < tableLines.length &&
      tableLines[startIndex + 1].segments.length >= 2 &&
      tableLines[startIndex].y - tableLines[startIndex + 1].y >
        (tableLines[0].y - tableLines[startIndex].y) * 1.15
    ) {
      titleRichText += ' ' + tableLines[startIndex].richText;
      titlePlainText += ' ' + tableLines[startIndex].plainText;
      startIndex++;
    }
  }

  const contentLines = tableLines.slice(startIndex);
  if (contentLines.length === 0) {
    return null;
  }

  const multiSegLines = contentLines.filter((l) => l.segments.length >= 2);
  if (multiSegLines.length === 0) {
    return null;
  }

  const maxSegmentsInRow = Math.max(...multiSegLines.map((l) => l.segments.length));

  interface ColAnchor {
    startX: number;
    endX: number;
    centerX: number;
    count: number;
  }

  const anchors: ColAnchor[] = [];
  const sortedForAnchors = [...multiSegLines].sort(
    (a, b) => b.segments.length - a.segments.length
  );

  for (const row of sortedForAnchors) {
    for (const seg of row.segments) {
      let matched: ColAnchor | null = null;
      let bestScore = Infinity;

      for (const col of anchors) {
        const overlap = Math.min(col.endX, seg.endX) - Math.max(col.startX, seg.startX);
        const rightEdgeDist = Math.abs(col.endX - seg.endX);
        const leftEdgeDist = Math.abs(col.startX - seg.startX);
        const centerDist = Math.abs(col.centerX - seg.centerX);
        const minEdgeDist = Math.min(leftEdgeDist, rightEdgeDist, centerDist);

        if (overlap > -6 || minEdgeDist <= 18) {
          const score = overlap > 0 ? -overlap : minEdgeDist;
          if (score < bestScore) {
            bestScore = score;
            matched = col;
          }
        }
      }

      if (!matched) {
        anchors.push({
          startX: seg.startX,
          endX: seg.endX,
          centerX: seg.centerX,
          count: 1,
        });
      } else {
        matched.startX = Math.min(matched.startX, seg.startX);
        matched.endX = Math.max(matched.endX, seg.endX);
        matched.centerX =
          (matched.centerX * matched.count + seg.centerX) / (matched.count + 1);
        matched.count++;
      }
    }
  }

  anchors.sort((a, b) => a.startX - b.startX);

  const targetMaxCols = Math.max(maxSegmentsInRow, 2);
  while (anchors.length > targetMaxCols && anchors.length > 2) {
    let bestPairIdx = 0;
    let smallestGap = Infinity;
    for (let i = 0; i < anchors.length - 1; i++) {
      const gap = anchors[i + 1].startX - anchors[i].endX;
      if (gap < smallestGap) {
        smallestGap = gap;
        bestPairIdx = i;
      }
    }
    const a = anchors[bestPairIdx];
    const b = anchors[bestPairIdx + 1];
    a.startX = Math.min(a.startX, b.startX);
    a.endX = Math.max(a.endX, b.endX);
    a.centerX = (a.centerX * a.count + b.centerX * b.count) / (a.count + b.count);
    a.count += b.count;
    anchors.splice(bestPairIdx + 1, 1);
  }

  const numCols = Math.max(2, anchors.length);
  const tableMinLeftX = Math.min(...contentLines.map((l) => l.startX));

  const mappedRows: {
    cells: string[];
    isSubheader?: boolean;
    indentFirstCol?: boolean;
    hasNumericCell: boolean;
  }[] = [];

  for (const line of contentLines) {
    if (line.segments.length === 1) {
      const seg = line.segments[0];
      const cells = Array(numCols).fill('');
      const isLeftAlignedSubheader = seg.startX - tableMinLeftX <= 28;
      if (isLeftAlignedSubheader) {
        cells[0] = seg.richText;
        mappedRows.push({
          cells,
          isSubheader: true,
          indentFirstCol: false,
          hasNumericCell: false,
        });
      } else {
        let bestCol = 0;
        let bestDist = Infinity;
        anchors.forEach((col, cIdx) => {
          const dist = Math.abs(col.centerX - seg.centerX);
          if (dist < bestDist) {
            bestDist = dist;
            bestCol = cIdx;
          }
        });
        cells[bestCol] = seg.richText;
        mappedRows.push({
          cells,
          isSubheader: true,
          indentFirstCol: false,
          hasNumericCell: false,
        });
      }
      continue;
    }

    const cells = Array(numCols).fill('');
    let hasNumericCell = false;

    for (const seg of line.segments) {
      if (seg.isNumeric) hasNumericCell = true;
      let bestCol = 0;
      let bestScore = Infinity;

      anchors.forEach((col, cIdx) => {
        const overlap = Math.min(col.endX, seg.endX) - Math.max(col.startX, seg.startX);
        const dist = Math.min(
          Math.abs(col.startX - seg.startX),
          Math.abs(col.endX - seg.endX),
          Math.abs(col.centerX - seg.centerX)
        );
        const score = overlap > 0 ? -overlap * 2 + dist * 0.25 : dist;
        if (score < bestScore) {
          bestScore = score;
          bestCol = cIdx;
        }
      });

      if (cells[bestCol]) {
        cells[bestCol] += ' ' + seg.richText;
      } else {
        cells[bestCol] = seg.richText;
      }
    }

    const firstSegIndent = line.segments[0].startX - tableMinLeftX;
    mappedRows.push({
      cells,
      isSubheader: false,
      indentFirstCol: firstSegIndent >= 5 && firstSegIndent <= 28,
      hasNumericCell,
    });
  }

  const headers: string[][] = [];
  let bodyStartIdx = 0;

  while (bodyStartIdx < Math.min(2, mappedRows.length)) {
    const candidate = mappedRows[bodyStartIdx];
    const nonEmptyCells = candidate.cells.filter((c) => c.trim().length > 0);
    const pureNumberCells = nonEmptyCells.filter((c) =>
      isNumericValueToken(c.replace(/<[^>]+>/g, ''))
    );
    if (pureNumberCells.length === 0 && mappedRows.length > bodyStartIdx + 1) {
      headers.push(candidate.cells);
      bodyStartIdx++;
    } else {
      break;
    }
  }

  const bodyRows = mappedRows.slice(bodyStartIdx).map((r) => ({
    cells: r.cells,
    isSubheader: r.isSubheader,
    indentFirstCol: r.indentFirstCol,
  }));

  const colAlignments: ('left' | 'right' | 'center')[] = [];
  for (let c = 0; c < numCols; c++) {
    if (c === 0) {
      colAlignments.push('left');
      continue;
    }
    let numCount = 0;
    let totalNonEmpty = 0;
    for (const r of bodyRows) {
      const plainCell = (r.cells[c] || '').replace(/<[^>]+>/g, '').trim();
      if (!plainCell) continue;
      totalNonEmpty++;
      if (isNumericValueToken(plainCell)) {
        numCount++;
      }
    }
    if (totalNonEmpty > 0 && numCount / totalNonEmpty >= 0.55) {
      colAlignments.push('right');
    } else {
      colAlignments.push('left');
    }
  }

  return {
    titleRichText,
    titlePlainText,
    headers,
    rows: bodyRows.length > 0 ? bodyRows : headers.map((h) => ({ cells: h })),
    colAlignments,
  };
}

/**
 * Splits a running header or footer LineGroup into Left / Center / Right slots
 * matching the exact horizontal side where each item sits on the PDF page.
 */
function buildPageMarginPayload(
  line: LineGroup,
  dominantLeftMargin: number,
  dominantRightMargin: number,
  columnWidth: number
): PageMarginBlockPayload {
  const colMid = dominantLeftMargin + columnWidth / 2;
  const leftParts: string[] = [];
  const centerParts: string[] = [];
  const rightParts: string[] = [];

  if (line.segments.length >= 2) {
    line.segments.forEach((seg, idx) => {
      if (idx === 0 && seg.startX <= dominantLeftMargin + columnWidth * 0.38) {
        leftParts.push(seg.richText);
      } else if (
        idx === line.segments.length - 1 &&
        seg.endX >= dominantRightMargin - columnWidth * 0.38
      ) {
        rightParts.push(seg.richText);
      } else if (seg.centerX < colMid - columnWidth * 0.1) {
        leftParts.push(seg.richText);
      } else if (seg.centerX > colMid + columnWidth * 0.1) {
        rightParts.push(seg.richText);
      } else {
        centerParts.push(seg.richText);
      }
    });
  } else {
    // Fallback if PDF.js combined a "16 India's Financial Markets" or "The Economy 7" header into 1 segment
    const trimmedPlain = line.plainText.trim();
    const leftNumMatch = trimmedPlain.match(/^(\d{1,4})\s+(.+)$/);
    const rightNumMatch = trimmedPlain.match(/^(.+?)\s+(\d{1,4})$/);

    if (leftNumMatch && line.width >= columnWidth * 0.45) {
      leftParts.push(leftNumMatch[1]);
      rightParts.push(leftNumMatch[2]);
    } else if (rightNumMatch && line.width >= columnWidth * 0.45) {
      leftParts.push(rightNumMatch[1]);
      rightParts.push(rightNumMatch[2]);
    } else {
      const lineCenter = line.startX + line.width / 2;
      if (
        line.startX > dominantLeftMargin + columnWidth * 0.42 ||
        lineCenter > colMid + columnWidth * 0.14
      ) {
        rightParts.push(line.richText);
      } else if (
        line.endX < dominantRightMargin - columnWidth * 0.42 ||
        lineCenter < colMid - columnWidth * 0.14
      ) {
        leftParts.push(line.richText);
      } else {
        centerParts.push(line.richText);
      }
    }
  }

  return {
    left: leftParts.join(' ').trim() || undefined,
    center: centerParts.join(' ').trim() || undefined,
    right: rightParts.join(' ').trim() || undefined,
    plainText: line.plainText,
  };
}

/**
 * High-precision PDF Page to Smart Reflow extractor.
 * Reconstructs complete, unbroken paragraphs while preserving exact words,
 * punctuation, inline bold/italic/superscript emphasis, first-line book indentation,
 * running page headers/footers on their exact left/right side,
 * chapter titles (e.g. CHAPTER 1, The Economy), footnotes in smaller font size,
 * visual Charts/Figures, and structured multi-column Tables/Sheets.
 */
export async function extractPageForReflow(
  pdfPage: any,
  pageNum: number,
  extractPageAsImage: (pdfPage: any, scale?: number) => Promise<string>
): Promise<string> {
  const textContent = await pdfPage.getTextContent({
    includeMarkedContent: false,
    disableCombineTextItems: false,
  });

  const styles = (textContent.styles as Record<string, any>) || {};
  const viewport = pdfPage.getViewport({ scale: 1.0 });
  const pageWidth = viewport.width || 600;
  const pageHeight = viewport.height || 800;
  const pageMidX = pageWidth / 2;

  const rawItems: RawTextItem[] = [];
  const rawRotatedItems: { x: number; yMin: number; yMax: number; str: string }[] = [];

  for (const it of textContent.items || []) {
    if (typeof it.str !== 'string') continue;
    const normalizedStr = normalizePdfString(it.str);

    if (normalizedStr.trim().length === 0) {
      if (normalizedStr.length > 0 && rawItems.length > 0) {
        const lastItem = rawItems[rawItems.length - 1];
        if (!lastItem.str.endsWith(' ')) {
          lastItem.str += ' ';
        }
      }
      continue;
    }

    const tx = Array.isArray(it.transform) ? it.transform : [12, 0, 0, 12, 0, 0];
    const a = Number(tx[0]) || 0;
    const b = Number(tx[1]) || 0;
    const c = Number(tx[2]) || 0;
    const d = Number(tx[3]) || 0;
    const x = Number(tx[4]) || 0;
    const y = Number(tx[5]) || 0;

    if (x < -15 || x > pageWidth + 15 || y < -15 || y > pageHeight + 15) {
      continue;
    }

    const scaleX = Math.hypot(a, b);
    const scaleY = Math.hypot(c, d);
    const fs = scaleY || scaleX || Number(it.height) || 12;

    const isRotated =
      Math.abs(b) > Math.max(0.08, Math.abs(a) * 0.25) ||
      Math.abs(c) > Math.max(0.08, Math.abs(d) * 0.25);

    if (isRotated) {
      const spanLen =
        typeof it.width === 'number' && it.width > 0
          ? it.width
          : normalizedStr.trim().length * fs * 0.52;
      const yEnd = b >= 0 ? y + spanLen : y - spanLen;
      rawRotatedItems.push({
        x,
        yMin: Math.min(y, yEnd) - fs * 0.6,
        yMax: Math.max(y, yEnd) + fs * 0.6,
        str: normalizedStr.trim(),
      });
      continue;
    }

    const width =
      typeof it.width === 'number' && it.width > 0
        ? it.width
        : normalizedStr.trim().length * fs * 0.5;
    const height = typeof it.height === 'number' && it.height > 0 ? it.height : fs;

    const fontName = String(it.fontName || '');
    const fontObj = styles[fontName] || {};
    const fontDescriptor = `${fontName} ${fontObj.fontFamily || ''}`.toLowerCase();

    const isBold =
      /\b(bold|black|heavy|demi|semibold|medium|cmbx|cmb|bf)\b|[-_+](b|bold|bd|black|med|semi)\b/i.test(
        fontDescriptor
      ) ||
      fontDescriptor.includes('bold') ||
      fontDescriptor.includes('black') ||
      fontDescriptor.includes('semibold') ||
      fontDescriptor.includes('demi');

    const isItalic =
      /\b(italic|oblique|it|sl|slanted|cmti|cmsl)\b|[-_+](i|italic|oblique|it)\b/i.test(
        fontDescriptor
      ) ||
      fontDescriptor.includes('italic') ||
      fontDescriptor.includes('oblique');

    rawItems.push({
      str: normalizedStr,
      x,
      y,
      width,
      height,
      fontSize: fs,
      isBold,
      isItalic,
      hasEOL: Boolean(it.hasEOL),
    });
  }

  // Merge nearby rotated text items into vertical chart bands
  const rotatedBands: RotatedTextBand[] = [];
  const sortedRotated = [...rawRotatedItems].sort((a, b) => b.yMax - a.yMax);
  for (const rot of sortedRotated) {
    const existing = rotatedBands.find(
      (band) => rot.yMax >= band.yMin - 26 && rot.yMin <= band.yMax + 26
    );
    if (existing) {
      existing.yMin = Math.min(existing.yMin, rot.yMin);
      existing.yMax = Math.max(existing.yMax, rot.yMax);
      existing.xMin = Math.min(existing.xMin, rot.x);
      existing.xMax = Math.max(existing.xMax, rot.x);
      existing.texts.push(rot.str);
    } else {
      rotatedBands.push({
        yMin: rot.yMin,
        yMax: rot.yMax,
        xMin: rot.x,
        xMax: rot.x,
        texts: [rot.str],
      });
    }
  }

  if (rawItems.length === 0) {
    const pageImgData = await extractPageAsImage(pdfPage, 1.6);
    return pageImgData ? `[PAGE_IMAGE:${pageImgData}]` : `Page ${pageNum}`;
  }

  // Determine dominant body font size weighted by character length
  const fontSizeCounts = new Map<number, number>();
  for (const item of rawItems) {
    const roundedFs = Math.round(item.fontSize * 2) / 2;
    fontSizeCounts.set(
      roundedFs,
      (fontSizeCounts.get(roundedFs) || 0) + Math.max(1, item.str.trim().length)
    );
  }
  let dominantBodyFontSize = 11.5;
  let maxFsWeight = 0;
  fontSizeCounts.forEach((weight, fs) => {
    if (weight > maxFsWeight) {
      maxFsWeight = weight;
      dominantBodyFontSize = fs;
    }
  });

  // Sort items top-to-bottom, left-to-right
  const sortedByY = [...rawItems].sort((a, b) => {
    const yDiff = b.y - a.y;
    if (Math.abs(yDiff) > 2.5) return yDiff;
    return a.x - b.x;
  });

  const initialLines: LineGroup[] = [];

  for (const item of sortedByY) {
    let bestLine: LineGroup | null = null;
    let bestDy = Infinity;

    for (const candidate of initialLines) {
      const refFs = Math.max(candidate.avgFontSize, item.fontSize, dominantBodyFontSize);
      const tolerance = Math.max(4.0, refFs * 0.52);
      const dy = Math.abs(candidate.y - item.y);
      if (dy <= tolerance && dy < bestDy) {
        bestDy = dy;
        bestLine = candidate;
      }
    }

    if (!bestLine) {
      bestLine = {
        items: [item],
        segments: [],
        y: item.y,
        startX: item.x,
        endX: item.x + item.width,
        width: item.width,
        plainText: '',
        richText: '',
        maxFontSize: item.fontSize,
        avgFontSize: item.fontSize,
        isCentered: false,
        isRightAligned: false,
        isHeading: false,
        isChapterTitle: false,
        isSubheading: false,
        isAllBold: false,
        isAllItalic: false,
        isListItem: false,
        isSceneBreak: false,
        startsWithSuperscriptNote: false,
      };
      initialLines.push(bestLine);
    } else {
      bestLine.items.push(item);
      const itemWeight = Math.max(1, item.str.trim().length);
      const prevWeight = Math.max(
        1,
        bestLine.items
          .slice(0, -1)
          .reduce((sum, it) => sum + Math.max(1, it.str.trim().length), 0)
      );
      bestLine.y = (bestLine.y * prevWeight + item.y * itemWeight) / (prevWeight + itemWeight);
      bestLine.avgFontSize =
        (bestLine.avgFontSize * prevWeight + item.fontSize * itemWeight) /
        (prevWeight + itemWeight);
      bestLine.maxFontSize = Math.max(bestLine.maxFontSize, item.fontSize);
      bestLine.startX = Math.min(bestLine.startX, item.x);
      bestLine.endX = Math.max(bestLine.endX, item.x + item.width);
      bestLine.width = bestLine.endX - bestLine.startX;
    }
  }

  initialLines.sort((a, b) => b.y - a.y);

  const lines: LineGroup[] = [];
  for (const line of initialLines) {
    if (lines.length === 0) {
      lines.push(line);
      continue;
    }
    const prev = lines[lines.length - 1];
    const refFs = Math.max(prev.maxFontSize, line.maxFontSize, dominantBodyFontSize);
    const dy = Math.abs(prev.y - line.y);
    const nonOverlapping = !horizontalIntervalsOverlap(
      prev.startX,
      prev.endX,
      line.startX,
      line.endX
    );

    if (dy <= Math.max(4.8, refFs * 0.62) && nonOverlapping) {
      prev.items.push(...line.items);
      prev.startX = Math.min(prev.startX, line.startX);
      prev.endX = Math.max(prev.endX, line.endX);
      prev.width = prev.endX - prev.startX;
      prev.maxFontSize = Math.max(prev.maxFontSize, line.maxFontSize);
    } else {
      lines.push(line);
    }
  }

  for (const line of lines) {
    buildLineGroupText(line);
  }

  const rawNonEmptyLines = lines.filter((l) => l.plainText.length > 0);
  if (rawNonEmptyLines.length === 0) {
    const pageImgData = await extractPageAsImage(pdfPage, 1.6);
    return pageImgData ? `[PAGE_IMAGE:${pageImgData}]` : `Page ${pageNum}`;
  }

  // Merge split "CHAPTER" + "1" lines when the large numeral sits on a slightly offset baseline
  const nonEmptyLines: LineGroup[] = [];
  for (let i = 0; i < rawNonEmptyLines.length; i++) {
    const curr = rawNonEmptyLines[i];
    const next = i + 1 < rawNonEmptyLines.length ? rawNonEmptyLines[i + 1] : null;
    if (next && Math.abs(curr.y - next.y) <= 28) {
      const cText = curr.plainText.trim();
      const nText = next.plainText.trim();
      const currIsChapWord = /^(?:chapter|part|section)$/i.test(cText);
      const nextIsNum = /^[0-9ivxlcdm]+$/i.test(nText);
      const currIsNum = /^[0-9ivxlcdm]+$/i.test(cText);
      const nextIsChapWord = /^(?:chapter|part|section)$/i.test(nText);

      if ((currIsChapWord && nextIsNum) || (currIsNum && nextIsChapWord)) {
        curr.items.push(...next.items);
        buildLineGroupText(curr);
        nonEmptyLines.push(curr);
        i++;
        continue;
      }
    }
    nonEmptyLines.push(curr);
  }

  // Compute body prose font size from single-column prose lines first
  const proseCandidateLines = nonEmptyLines.filter(
    (l) =>
      l.segments.length === 1 &&
      l.plainText.length >= 38 &&
      !isTableCaptionText(l.plainText) &&
      !isFigureCaptionText(l.plainText)
  );
  const fontSampleSource =
    proseCandidateLines.length >= 2 ? proseCandidateLines : nonEmptyLines;
  const allFontSizes = fontSampleSource.map((l) => l.avgFontSize).sort((a, b) => a - b);
  const medianFontSize =
    allFontSizes[Math.floor(allFontSizes.length * 0.6)] || dominantBodyFontSize || 12;

  // Analyze page geometry from prose lines first so we know exact left/right margins
  const proseGeometryLines = nonEmptyLines.filter(
    (l) => l.segments.length === 1 && l.plainText.length >= 40
  );
  const substantialLines = nonEmptyLines.filter((l) => l.plainText.length >= 25);
  const marginSampleLines =
    proseGeometryLines.length >= 3
      ? proseGeometryLines
      : substantialLines.length >= 3
      ? substantialLines
      : nonEmptyLines;

  const startXBins = new Map<number, number>();
  marginSampleLines.forEach((l) => {
    const bin = Math.round(l.startX / 3) * 3;
    startXBins.set(bin, (startXBins.get(bin) || 0) + 1);
  });

  const sortedStartX = marginSampleLines.map((l) => l.startX).sort((a, b) => a - b);
  let dominantLeftMargin = sortedStartX[Math.floor(sortedStartX.length * 0.15)] ?? 0;
  let highestLeftCount = 0;
  startXBins.forEach((count, bin) => {
    if (count > highestLeftCount || (count === highestLeftCount && bin < dominantLeftMargin)) {
      highestLeftCount = count;
      dominantLeftMargin = bin;
    }
  });

  const sortedEndX = marginSampleLines.map((l) => l.endX).sort((a, b) => a - b);
  const percentile85Right =
    sortedEndX[Math.min(sortedEndX.length - 1, Math.floor(sortedEndX.length * 0.85))] ||
    pageWidth * 0.85;
  const dominantRightMargin = Math.max(dominantLeftMargin + 140, percentile85Right);

  const columnWidth = Math.max(140, dominantRightMargin - dominantLeftMargin);
  const columnMidX = dominantLeftMargin + columnWidth / 2;

  const sortedWidths = marginSampleLines.map((l) => l.width).sort((a, b) => a - b);
  const typicalLineWidth =
    sortedWidths[Math.min(sortedWidths.length - 1, Math.floor(sortedWidths.length * 0.75))] ||
    columnWidth;

  // Extract Top Running Header (`[PAGE_HEADER]`) and Bottom Page Footer (`[PAGE_FOOTER]`)
  // preserving their exact Left / Right positions and keeping them out of chart crops!
  let extractedPageHeader: PageMarginBlockPayload | null = null;
  let extractedPageFooter: PageMarginBlockPayload | null = null;
  let topContentCeilingY = pageHeight - 16;

  let bodyStartLineIdx = 0;
  let bodyEndLineIdx = nonEmptyLines.length - 1;

  if (nonEmptyLines.length >= 2) {
    const firstLine = nonEmptyLines[0];
    const firstText = firstLine.plainText.trim();
    const secondLine = nonEmptyLines[1];
    const gapToSecond = firstLine.y - secondLine.y;

    const isStructuralTitle =
      /^(?:chapter|part|section|book|prologue|epilogue|introduction|preface|foreword)\b/i.test(
        firstText
      ) ||
      /^\d+(?:\.\d+)+\s+[A-Z]/.test(firstText) ||
      isTableCaptionText(firstText) ||
      isFigureCaptionText(firstText);

    const isStandalonePageNumTop =
      /^(?:page\s+)?[-–—•\s]*\d+(?:\s*(?:\/|of)\s*\d+)?[-–—•\s]*$/i.test(firstText) ||
      /^[ivxlcdm]+$/i.test(firstText);

    // Match classic book running header patterns:
    // - Even page: "16 India's Financial Markets" (number on left, book/chapter title on right)
    // - Odd page: "The Economy 7" (chapter title on left, number on right)
    const hasRunningHeaderNumPattern =
      /^\d{1,4}\s+[A-Z"“‘(]/.test(firstText) ||
      /[A-Za-z”’"')]+\s+\d{1,4}$/.test(firstText);

    const isTopRunningHeader =
      !isStructuralTitle &&
      firstLine.y > pageHeight * 0.55 &&
      firstLine.avgFontSize <= medianFontSize * 1.12 &&
      firstText.length < 85 &&
      (isStandalonePageNumTop ||
        hasRunningHeaderNumPattern ||
        firstLine.segments.length >= 2 ||
        (gapToSecond > medianFontSize * 1.15 && firstLine.width < typicalLineWidth * 0.72));

    if (isTopRunningHeader) {
      extractedPageHeader = buildPageMarginPayload(
        firstLine,
        dominantLeftMargin,
        dominantRightMargin,
        columnWidth
      );
      // Set ceiling below the running header so a top-of-page Chart never crops the running header inside its image
      topContentCeilingY = firstLine.y - firstLine.maxFontSize * 0.55;
      bodyStartLineIdx = 1;
    }
  }

  if (bodyEndLineIdx >= bodyStartLineIdx + 1) {
    const lastLine = nonEmptyLines[bodyEndLineIdx];
    const lastText = lastLine.plainText.trim();
    const prevLine = nonEmptyLines[bodyEndLineIdx - 1];
    const gapFromPrev = prevLine.y - lastLine.y;

    const isStandalonePageNumBottom =
      /^(?:page\s+)?[-–—•\s]*\d+(?:\s*(?:\/|of)\s*\d+)?[-–—•\s]*$/i.test(lastText) ||
      /^[ivxlcdm]+$/i.test(lastText);

    const isBottomRunningFooter =
      isStandalonePageNumBottom ||
      (lastLine.y < pageHeight * 0.14 &&
        lastLine.avgFontSize <= medianFontSize * 1.05 &&
        lastText.length < 75 &&
        gapFromPrev > medianFontSize * 1.35 &&
        !/[.!?]$/.test(lastText));

    if (isBottomRunningFooter) {
      extractedPageFooter = buildPageMarginPayload(
        lastLine,
        dominantLeftMargin,
        dominantRightMargin,
        columnWidth
      );
      bodyEndLineIdx--;
    }
  }

  const filteredLines = nonEmptyLines.slice(bodyStartLineIdx, bodyEndLineIdx + 1);

  if (filteredLines.length === 0) {
    const fallbackBlocks: string[] = [];
    if (extractedPageHeader) {
      fallbackBlocks.push(`[PAGE_HEADER]${JSON.stringify(extractedPageHeader)}`);
    }
    if (extractedPageFooter) {
      fallbackBlocks.push(`[PAGE_FOOTER]${JSON.stringify(extractedPageFooter)}`);
    }
    return fallbackBlocks.length > 0 ? fallbackBlocks.join('\n\n') : `Page ${pageNum}`;
  }

  // Handle PDF Drop-Cap single letters
  if (
    filteredLines.length >= 2 &&
    /^[A-Z"“‘']?[A-Z]$/.test(filteredLines[0].plainText.trim()) &&
    filteredLines[0].maxFontSize >= medianFontSize * 1.5
  ) {
    const dropCap = filteredLines[0].plainText.trim();
    filteredLines[1].plainText = dropCap + filteredLines[1].plainText;
    filteredLines[1].richText = `<strong>${dropCap}</strong>` + filteredLines[1].richText;
    filteredLines.shift();
  }

  const proseVerticalGaps: number[] = [];
  for (let i = 1; i < filteredLines.length; i++) {
    const prev = filteredLines[i - 1];
    const curr = filteredLines[i];
    const gap = prev.y - curr.y;
    if (
      prev.segments.length === 1 &&
      curr.segments.length === 1 &&
      prev.plainText.length >= 35 &&
      gap > medianFontSize * 0.75 &&
      gap < medianFontSize * 2.8
    ) {
      proseVerticalGaps.push(gap);
    }
  }

  const verticalGaps: number[] = [];
  for (let i = 1; i < filteredLines.length; i++) {
    const gap = filteredLines[i - 1].y - filteredLines[i].y;
    if (gap > medianFontSize * 0.65 && gap < medianFontSize * 3.2) {
      verticalGaps.push(gap);
    }
  }
  proseVerticalGaps.sort((a, b) => a - b);
  verticalGaps.sort((a, b) => a - b);
  const medianLineGap =
    proseVerticalGaps.length >= 2
      ? proseVerticalGaps[Math.floor(proseVerticalGaps.length * 0.5)]
      : verticalGaps.length > 0
      ? verticalGaps[Math.floor(verticalGaps.length * 0.5)]
      : medianFontSize * 1.38;

  // Classify individual lines (headings, chapter titles, subheadings, alignment, list items, scene breaks)
  for (let idx = 0; idx < filteredLines.length; idx++) {
    const line = filteredLines[idx];
    const prevLine = idx > 0 ? filteredLines[idx - 1] : null;
    const nextLine = idx + 1 < filteredLines.length ? filteredLines[idx + 1] : null;
    const gapFromPrev = prevLine ? prevLine.y - line.y : medianLineGap * 2;
    const gapToNext = nextLine ? line.y - nextLine.y : medianLineGap * 2;

    const trimmed = line.plainText.trim();
    const leftGap = line.startX - dominantLeftMargin;
    const rightGap = dominantRightMargin - line.endX;
    const lineMidX = line.startX + line.width / 2;

    const isHorizontallyCentered =
      Math.abs(lineMidX - pageMidX) < pageWidth * 0.08 ||
      Math.abs(lineMidX - columnMidX) < columnWidth * 0.08;
    const hasSymmetricMargins =
      leftGap >= Math.max(18, medianFontSize * 1.5) &&
      rightGap >= Math.max(18, medianFontSize * 1.5) &&
      Math.abs(leftGap - rightGap) <= columnWidth * 0.16;
    const isNotFullWidth = line.width < typicalLineWidth * 0.82;

    line.isCentered = isHorizontallyCentered && hasSymmetricMargins && isNotFullWidth;
    line.isRightAligned =
      !line.isCentered &&
      isNotFullWidth &&
      leftGap >= columnWidth * 0.35 &&
      rightGap <= Math.max(36, columnWidth * 0.18);

    line.isSceneBreak = /^([*•·~—–\-]\s*){3,}$/.test(trimmed);

    line.isListItem =
      /^(?:[•●○▪▫▸▹–—*]\s+|\(?[0-9]{1,3}[.)]\s+|\([a-zA-Z]\)\s+|[a-zA-Z]\)\s+|[IVXLCDM]{1,5}\.\s+)/.test(
        trimmed
      ) &&
      !/^\d+(?:\.\d+)+\s+\S/.test(trimmed) &&
      !line.startsWithSuperscriptNote;

    const startsWithLowercase = /^[a-z]/.test(trimmed);
    const prevTrimmedForHeading = prevLine ? prevLine.plainText.trim() : '';
    const prevEndedSentenceOrBlock =
      !prevLine ||
      prevLine.isHeading ||
      prevLine.isSubheading ||
      prevLine.isSceneBreak ||
      /[.!?:”"'\])]$/.test(prevTrimmedForHeading);

    const prevAllowsHeading =
      !startsWithLowercase &&
      !line.startsWithSuperscriptNote &&
      (prevEndedSentenceOrBlock || gapFromPrev > medianLineGap * 1.45);

    const isExplicitChapter =
      !startsWithLowercase &&
      /^(chapter|section|part|book|unit|act|scene|module)\s+([0-9ivxlcdm]+|[a-z0-9\s:—–\-]{1,45})$/i.test(
        trimmed
      ) &&
      trimmed.length < 75;

    const isNumberedSectionHeading =
      !startsWithLowercase &&
      /^\d+(?:\.\d+)+\s+[A-Z]/.test(trimmed) &&
      isNotFullWidth &&
      trimmed.length < 95 &&
      !/[.,;]$/.test(trimmed);

    const isStandaloneMajorTitle =
      prevAllowsHeading &&
      /^(prologue|epilogue|introduction|preface|foreword|afterword|acknowledgements|acknowledgments|about the author|table of contents|contents|appendix|bibliography|notes|index|dedication)$/i.test(
        trimmed
      );

    const isTrueLargeHeader =
      prevAllowsHeading &&
      line.avgFontSize >= medianFontSize * 1.24 &&
      isNotFullWidth &&
      trimmed.length < 90 &&
      !/[.,;]$/.test(trimmed);

    line.isHeading =
      !line.isSceneBreak &&
      !isFigureCaptionText(trimmed) &&
      !isTableCaptionText(trimmed) &&
      (isExplicitChapter ||
        isStandaloneMajorTitle ||
        isTrueLargeHeader ||
        isNumberedSectionHeading);

    line.isChapterTitle =
      line.isHeading &&
      !isExplicitChapter &&
      !isNumberedSectionHeading &&
      line.avgFontSize >= medianFontSize * 1.38;

    line.isSubheading =
      !line.isHeading &&
      !line.isSceneBreak &&
      !line.isListItem &&
      !isFigureCaptionText(trimmed) &&
      !isTableCaptionText(trimmed) &&
      prevAllowsHeading &&
      /^[A-Z0-9"“‘(]/.test(trimmed) &&
      ((line.isAllBold && isNotFullWidth && trimmed.length < 80 && !/[.,;]$/.test(trimmed)) ||
        (line.avgFontSize >= medianFontSize * 1.14 &&
          isNotFullWidth &&
          trimmed.length < 80 &&
          !/[.,;]$/.test(trimmed) &&
          gapToNext >= medianLineGap * 0.95));
  }

  // ============================================================================
  // STEP 1: Detect Multi-Column Tables / Sheets FIRST
  // ============================================================================
  const lineOverlapsRotatedBand = (line: LineGroup): boolean =>
    rotatedBands.some((b) => line.y >= b.yMin - 18 && line.y <= b.yMax + 18);

  interface DetectedTableRegion {
    startLineIdx: number;
    endLineIdx: number;
    payload: TableBlockPayload;
  }

  const tableRegionsByStartLine = new Map<number, DetectedTableRegion>();
  const claimedByTable = new Set<number>();

  const isCandidateTableDataLine = (idx: number): boolean => {
    if (idx < 0 || idx >= filteredLines.length) return false;
    if (claimedByTable.has(idx)) return false;
    const l = filteredLines[idx];
    if (l.isHeading || isFigureCaptionText(l.plainText)) return false;
    if (lineOverlapsRotatedBand(l) || isAxisTickSequenceLine(l)) return false;
    if (l.segments.length >= 2) return true;
    return false;
  };

  for (let i = 0; i < filteredLines.length; i++) {
    if (claimedByTable.has(i)) continue;
    const line = filteredLines[i];
    if (lineOverlapsRotatedBand(line) || isAxisTickSequenceLine(line)) continue;

    const isExplicitTableStart = isTableCaptionText(line.plainText);

    const isImplicitTableStart =
      !isExplicitTableStart &&
      isCandidateTableDataLine(i) &&
      (isCandidateTableDataLine(i + 1) ||
        (i + 2 < filteredLines.length &&
          filteredLines[i + 1].width < typicalLineWidth * 0.68 &&
          isCandidateTableDataLine(i + 2)));

    if (!isExplicitTableStart && !isImplicitTableStart) continue;

    let endIdx = i;
    for (let k = i + 1; k < filteredLines.length; k++) {
      if (claimedByTable.has(k)) break;
      const cand = filteredLines[k];
      if (isTableCaptionText(cand.plainText) || isFigureCaptionText(cand.plainText)) break;
      if (cand.isHeading) break;
      if (lineOverlapsRotatedBand(cand) || isAxisTickSequenceLine(cand)) break;

      const gapFromPrev = filteredLines[k - 1].y - cand.y;
      if (gapFromPrev > medianLineGap * 2.0 && k > i + 1) break;

      if (cand.segments.length >= 2) {
        endIdx = k;
        continue;
      }

      const isNarrowSubheader = cand.width < typicalLineWidth * 0.72;
      const hasUpcomingMultiSeg =
        isCandidateTableDataLine(k + 1) ||
        (k + 2 < filteredLines.length &&
          filteredLines[k + 1]?.width < typicalLineWidth * 0.72 &&
          isCandidateTableDataLine(k + 2));

      if (isNarrowSubheader && hasUpcomingMultiSeg) {
        endIdx = k;
        continue;
      }

      break;
    }

    const slice = filteredLines.slice(i, endIdx + 1);
    const payload = buildStructuredTablePayload(slice, dominantLeftMargin, typicalLineWidth);
    if (payload && (payload.rows.length > 0 || payload.headers.length > 0)) {
      for (let k = i; k <= endIdx; k++) {
        claimedByTable.add(k);
      }
      tableRegionsByStartLine.set(i, {
        startLineIdx: i,
        endLineIdx: endIdx,
        payload,
      });
      i = endIdx;
    }
  }

  // ============================================================================
  // STEP 2: Identify Chart / Figure Regions (stopping cleanly at topContentCeilingY, Table, or Prose line)
  // ============================================================================
  const isNormalBodyProseLine = (idx: number): boolean => {
    const l = filteredLines[idx];
    if (!l) return false;
    if (claimedByTable.has(idx)) return true;
    const text = l.plainText.trim();
    if (isFigureCaptionText(text) || isTableCaptionText(text)) return false;
    if (isAxisTickSequenceLine(l)) return false;
    if (lineOverlapsRotatedBand(l)) return false;
    if (/^[-+]?[\d,.]+%?$/.test(text)) return false;
    if (l.isHeading || l.isSubheading) return true;

    if (l.segments.length >= 2 && l.segments.some((s) => s.isNumeric)) {
      return false;
    }

    if (l.avgFontSize < medianFontSize * 0.84 && l.width < typicalLineWidth * 0.72) {
      return false;
    }

    if (l.width >= typicalLineWidth * 0.66) {
      return true;
    }

    if (idx > 0) {
      const prev = filteredLines[idx - 1];
      if (
        prev.width >= typicalLineWidth * 0.68 &&
        prev.y - l.y <= medianLineGap * 1.55 &&
        l.segments.length === 1 &&
        l.avgFontSize >= medianFontSize * 0.84
      ) {
        return true;
      }
    }

    return false;
  };

  interface DetectedChartRegion {
    startLineIdx: number;
    endLineIdx: number;
    yTopPdf: number;
    yBottomPdf: number;
    captionRichText?: string;
    captionPlainText?: string;
  }

  const chartRegionsByStartLine = new Map<number, DetectedChartRegion>();
  const claimedByChart = new Set<number>();
  const usedRotatedBands = new Set<number>();

  // 2A. Detect Captioned Figures (e.g. "FIGURE 1.1 ...", "FIGURE 1.4 ...", "FIGURE 1.5 ...")
  for (let i = 0; i < filteredLines.length; i++) {
    if (claimedByChart.has(i) || claimedByTable.has(i)) continue;
    const line = filteredLines[i];
    if (!isFigureCaptionText(line.plainText)) continue;

    let j = i - 1;
    while (
      j >= 0 &&
      !claimedByChart.has(j) &&
      !claimedByTable.has(j) &&
      !isFigureCaptionText(filteredLines[j].plainText) &&
      !isTableCaptionText(filteredLines[j].plainText) &&
      !isNormalBodyProseLine(j)
    ) {
      j--;
    }

    const firstChartIdx = j + 1;
    const prevOutsideLine = j >= 0 ? filteredLines[j] : null;
    // Use topContentCeilingY when at the top of the page so the running header is NEVER cropped inside the chart!
    const yUpperBound = prevOutsideLine
      ? prevOutsideLine.y - prevOutsideLine.avgFontSize * 0.38
      : topContentCeilingY;
    const yLowerBound = line.y + line.maxFontSize * 0.96;

    const matchingRotBandIdx = rotatedBands.findIndex(
      (b) => b.yMax <= yUpperBound + 20 && b.yMin >= line.y - 20
    );

    const hasChartElementsAbove =
      firstChartIdx < i ||
      matchingRotBandIdx !== -1 ||
      yUpperBound - yLowerBound >= Math.max(55, medianLineGap * 3.0);

    if (hasChartElementsAbove) {
      for (let k = firstChartIdx; k <= i; k++) {
        claimedByChart.add(k);
      }
      rotatedBands.forEach((b, bIdx) => {
        if (b.yMax <= yUpperBound + 24 && b.yMin >= line.y - 24) {
          usedRotatedBands.add(bIdx);
        }
      });

      chartRegionsByStartLine.set(firstChartIdx, {
        startLineIdx: firstChartIdx,
        endLineIdx: i,
        yTopPdf: yUpperBound,
        yBottomPdf: yLowerBound,
        captionRichText: line.richText,
        captionPlainText: line.plainText,
      });
    } else {
      let k = i + 1;
      while (
        k < filteredLines.length &&
        !claimedByChart.has(k) &&
        !claimedByTable.has(k) &&
        !isFigureCaptionText(filteredLines[k].plainText) &&
        !isTableCaptionText(filteredLines[k].plainText) &&
        !isNormalBodyProseLine(k)
      ) {
        k++;
      }
      const lastChartIdx = k - 1;
      const nextOutsideLine = k < filteredLines.length ? filteredLines[k] : null;
      const topBelowCaption = line.y - line.avgFontSize * 0.38;
      const bottomAboveNext = nextOutsideLine
        ? nextOutsideLine.y + nextOutsideLine.maxFontSize * 0.96
        : 24;

      for (let m = i; m <= lastChartIdx; m++) {
        claimedByChart.add(m);
      }
      chartRegionsByStartLine.set(i, {
        startLineIdx: i,
        endLineIdx: lastChartIdx,
        yTopPdf: topBelowCaption,
        yBottomPdf: bottomAboveNext,
        captionRichText: line.richText,
        captionPlainText: line.plainText,
      });
    }
  }

  // 2B. Detect Uncaptioned Charts that have rotated Y-axis bands
  rotatedBands.forEach((band, bIdx) => {
    if (usedRotatedBands.has(bIdx)) return;

    let firstIdx = -1;
    let lastIdx = -1;
    for (let i = 0; i < filteredLines.length; i++) {
      if (claimedByChart.has(i) || claimedByTable.has(i)) continue;
      const l = filteredLines[i];
      if (l.y <= band.yMax + 28 && l.y >= band.yMin - 28 && !isNormalBodyProseLine(i)) {
        if (firstIdx === -1) firstIdx = i;
        lastIdx = i;
      }
    }

    if (firstIdx !== -1 && lastIdx !== -1) {
      const prevLine = firstIdx > 0 ? filteredLines[firstIdx - 1] : null;
      const nextLine =
        lastIdx + 1 < filteredLines.length ? filteredLines[lastIdx + 1] : null;
      const yTop = prevLine
        ? prevLine.y - prevLine.avgFontSize * 0.38
        : Math.min(topContentCeilingY, band.yMax + 30);
      const yBottom = nextLine
        ? nextLine.y + nextLine.maxFontSize * 0.96
        : Math.max(20, band.yMin - 30);

      for (let k = firstIdx; k <= lastIdx; k++) {
        claimedByChart.add(k);
      }
      usedRotatedBands.add(bIdx);
      chartRegionsByStartLine.set(firstIdx, {
        startLineIdx: firstIdx,
        endLineIdx: lastIdx,
        yTopPdf: yTop,
        yBottomPdf: yBottom,
      });
    }
  });

  // Render the page canvas ONCE at 2.0x scale if any Chart Region was detected
  let cachedPageCanvas: HTMLCanvasElement | null = null;
  let cachedPageViewport: any = null;

  if (chartRegionsByStartLine.size > 0) {
    try {
      cachedPageViewport = pdfPage.getViewport({ scale: 2.0 });
      cachedPageCanvas = document.createElement('canvas');
      cachedPageCanvas.width = Math.floor(cachedPageViewport.width);
      cachedPageCanvas.height = Math.floor(cachedPageViewport.height);
      const ctx = cachedPageCanvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, cachedPageCanvas.width, cachedPageCanvas.height);
        await pdfPage.render({
          canvasContext: ctx,
          viewport: cachedPageViewport,
          canvas: cachedPageCanvas,
        } as any).promise;
      }
    } catch (e) {
      cachedPageCanvas = null;
    }
  }

  // Detect whether this page uses traditional book first-line indentation
  let indentedLineCount = 0;
  for (let i = 0; i < filteredLines.length; i++) {
    if (claimedByChart.has(i) || claimedByTable.has(i)) continue;
    const l = filteredLines[i];
    if (l.isHeading || l.isSubheading || l.isCentered || l.isListItem) continue;
    const offset = l.startX - dominantLeftMargin;
    if (offset >= Math.max(8, medianFontSize * 0.75) && offset <= columnWidth * 0.25) {
      indentedLineCount++;
    }
  }
  const pageUsesFirstLineIndent = indentedLineCount >= 1;

  // Group lines into structured Reflow blocks
  const blocks: ReflowBlock[] = [];

  if (extractedPageHeader) {
    blocks.push({
      type: 'page_header',
      plainText: extractedPageHeader.plainText,
      richText: JSON.stringify(extractedPageHeader),
    });
  }

  let currentBlock: ReflowBlock | null = null;

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

  for (let i = 0; i < filteredLines.length; i++) {
    // 0A. Check if line `i` starts a Chart / Figure region
    const chartRegion = chartRegionsByStartLine.get(i);
    if (chartRegion) {
      flushCurrentBlock();
      let croppedImg = '';
      if (cachedPageCanvas && cachedPageViewport) {
        croppedImg = cropChartRegionFromCanvas(
          cachedPageCanvas,
          cachedPageViewport,
          chartRegion.yTopPdf,
          chartRegion.yBottomPdf
        );
      }
      if (croppedImg) {
        const payload: ChartBlockPayload = {
          img: croppedImg,
          caption: chartRegion.captionRichText,
          plainCaption: chartRegion.captionPlainText,
        };
        blocks.push({
          type: 'chart_block',
          plainText: chartRegion.captionPlainText || 'Figure',
          richText: JSON.stringify(payload),
        });
      } else if (chartRegion.captionRichText) {
        blocks.push({
          type: 'subheading',
          plainText: chartRegion.captionPlainText || '',
          richText: chartRegion.captionRichText,
        });
      }
      i = chartRegion.endLineIdx;
      continue;
    }

    if (claimedByChart.has(i)) {
      continue;
    }

    // 0B. Check if line `i` starts a Multi-Column Table / Sheet region
    const tableRegion = tableRegionsByStartLine.get(i);
    if (tableRegion) {
      flushCurrentBlock();
      blocks.push({
        type: 'table_block',
        plainText: tableRegion.payload.titlePlainText || 'Table',
        richText: JSON.stringify(tableRegion.payload),
      });
      i = tableRegion.endLineIdx;
      continue;
    }

    if (claimedByTable.has(i)) {
      continue;
    }

    const line = filteredLines[i];
    if (!line.plainText) continue;

    const prevLine =
      i > 0 && !claimedByChart.has(i - 1) && !claimedByTable.has(i - 1)
        ? filteredLines[i - 1]
        : null;
    const gapFromPrev = prevLine ? prevLine.y - line.y : 0;

    // 0C. Check if this line is a bottom-of-page Footnote (`10See http://...`, `11JNPT is near Bombay.`)
    const isFootnoteLine =
      line.startsWithSuperscriptNote ||
      (currentBlock?.type === 'footnote' &&
        line.avgFontSize <= medianFontSize * 0.9 &&
        gapFromPrev <= medianLineGap * 1.45);

    if (isFootnoteLine) {
      if (line.startsWithSuperscriptNote || currentBlock?.type !== 'footnote') {
        flushCurrentBlock();
        currentBlock = {
          type: 'footnote',
          plainText: line.plainText,
          richText: line.richText,
        };
      } else {
        if (shouldStripLineEndHyphen(currentBlock.plainText, line.plainText)) {
          currentBlock.plainText = currentBlock.plainText.replace(/[-‐‑‒]$/, '') + line.plainText;
          currentBlock.richText =
            currentBlock.richText.replace(/[-‐‑‒]$/, '') + line.richText;
        } else {
          currentBlock.plainText += ' ' + line.plainText;
          currentBlock.richText += ' ' + line.richText;
        }
      }
      continue;
    }

    // 1. Scene break
    if (line.isSceneBreak) {
      flushCurrentBlock();
      blocks.push({
        type: 'scene_break',
        plainText: '* * *',
        richText: '* * *',
      });
      continue;
    }

    // 2. Major Heading / Chapter Title / Right-Aligned Chapter Label
    if (line.isHeading) {
      flushCurrentBlock();
      const targetHeadingType: ReflowBlock['type'] = line.isRightAligned
        ? 'right_heading'
        : line.isChapterTitle
        ? 'chapter_title'
        : line.isCentered
        ? 'centered_heading'
        : 'heading';

      const lastBlock = blocks[blocks.length - 1];
      if (
        lastBlock &&
        lastBlock.type === targetHeadingType &&
        prevLine &&
        prevLine.isHeading &&
        gapFromPrev < line.avgFontSize * 1.9 &&
        Math.abs(prevLine.avgFontSize - line.avgFontSize) < 2.5
      ) {
        lastBlock.plainText += ' ' + line.plainText;
        lastBlock.richText += ' ' + line.richText;
      } else {
        blocks.push({
          type: targetHeadingType,
          plainText: line.plainText,
          richText: line.richText,
        });
      }
      continue;
    }

    // 3. Subheading
    if (line.isSubheading) {
      flushCurrentBlock();
      blocks.push({
        type: line.isRightAligned
          ? 'right_heading'
          : line.isCentered
          ? 'centered_heading'
          : 'subheading',
        plainText: line.plainText,
        richText: line.richText,
      });
      continue;
    }

    // 4. Bullet / Numbered List Item
    if (line.isListItem) {
      flushCurrentBlock();
      currentBlock = {
        type: 'list_item',
        plainText: line.plainText,
        richText: line.richText,
      };
      continue;
    }

    const indentOffset = line.startX - dominantLeftMargin;
    const isFirstLineIndented =
      indentOffset >= Math.max(8, medianFontSize * 0.75) && indentOffset <= columnWidth * 0.26;

    const isBlockquoteIndented =
      indentOffset > Math.max(15, medianFontSize * 1.25) &&
      line.width < columnWidth * 0.86 &&
      !isFirstLineIndented &&
      ((prevLine && prevLine.startX - dominantLeftMargin > Math.max(15, medianFontSize * 1.25)) ||
        (i + 1 < filteredLines.length &&
          !claimedByChart.has(i + 1) &&
          !claimedByTable.has(i + 1) &&
          filteredLines[i + 1].startX - dominantLeftMargin > Math.max(15, medianFontSize * 1.25)));

    // 5. If no block is currently open, start one
    if (!currentBlock) {
      currentBlock = {
        type: isBlockquoteIndented
          ? 'blockquote'
          : isFirstLineIndented
          ? 'indent_paragraph'
          : 'paragraph',
        plainText: line.plainText,
        richText: line.richText,
      };
      continue;
    }

    const prevTrimmed = prevLine ? prevLine.plainText.trim() : '';
    const currTrimmed = line.plainText.trim();

    const prevEndsWithHyphen = /[-‐‑‒]$/.test(prevTrimmed) && !/--$/.test(prevTrimmed);
    const prevEndsWithAbbreviation = COMMON_ABBREVIATIONS.test(prevTrimmed);
    const prevEndsWithSentencePunctuation =
      /[.!?:"”'’…)\]]$/.test(prevTrimmed) && !prevEndsWithAbbreviation;
    const currStartsWithLowercase = /^[a-z]/.test(currTrimmed);

    const isSentenceContinuation =
      prevLine !== null &&
      gapFromPrev <= medianLineGap * 1.75 &&
      !isFirstLineIndented &&
      (prevEndsWithHyphen || !prevEndsWithSentencePunctuation || currStartsWithLowercase);

    const hasVerticalParagraphGap =
      !isSentenceContinuation && gapFromPrev > medianLineGap * 1.38;
    const hasSceneBreakVerticalGap =
      !isSentenceContinuation && gapFromPrev > medianLineGap * 2.3;

    const hasFirstLineIndentBreak =
      !isSentenceContinuation &&
      isFirstLineIndented &&
      !isBlockquoteIndented &&
      prevLine !== null &&
      line.startX - prevLine.startX >= Math.max(6.5, medianFontSize * 0.6);

    const shortLineThreshold = pageUsesFirstLineIndent
      ? dominantLeftMargin + typicalLineWidth * 0.72
      : dominantRightMargin - Math.max(26, typicalLineWidth * 0.18);

    const prevEndedShort =
      !isSentenceContinuation &&
      prevLine !== null &&
      prevEndsWithSentencePunctuation &&
      prevLine.endX < shortLineThreshold &&
      /^[\p{Lu}0-9"“'‘—–([]/u.test(currTrimmed);

    const startsWithQuoteOrDash = /^["“‘—]/.test(currTrimmed);
    const isDialogueBreak =
      !isSentenceContinuation &&
      startsWithQuoteOrDash &&
      prevEndsWithSentencePunctuation &&
      (hasFirstLineIndentBreak ||
        hasVerticalParagraphGap ||
        (prevLine !== null &&
          prevLine.endX < dominantRightMargin - Math.max(14, typicalLineWidth * 0.08)));

    const isCenteredPair =
      !isSentenceContinuation && prevLine !== null && prevLine.isCentered && line.isCentered;

    const blockquoteTransition =
      !isSentenceContinuation &&
      (currentBlock.type === 'blockquote') !== Boolean(isBlockquoteIndented);

    const isNewParagraph =
      currentBlock.type === 'footnote' ||
      hasVerticalParagraphGap ||
      hasFirstLineIndentBreak ||
      prevEndedShort ||
      isDialogueBreak ||
      isCenteredPair ||
      blockquoteTransition;

    if (isNewParagraph) {
      flushCurrentBlock();
      if (hasSceneBreakVerticalGap && blocks.length > 0) {
        blocks.push({
          type: 'scene_break',
          plainText: '* * *',
          richText: '* * *',
        });
      }
      currentBlock = {
        type: isBlockquoteIndented
          ? 'blockquote'
          : isCenteredPair
          ? 'verse_line'
          : isFirstLineIndented
          ? 'indent_paragraph'
          : 'paragraph',
        plainText: line.plainText,
        richText: line.richText,
      };
    } else {
      if (shouldStripLineEndHyphen(currentBlock.plainText, line.plainText)) {
        currentBlock.plainText = currentBlock.plainText.replace(/[-‐‑‒]$/, '') + line.plainText;
        currentBlock.richText =
          currentBlock.richText
            .replace(/[-‐‑‒]<\/strong><\/em>$/, '</strong></em>')
            .replace(/[-‐‑‒]<\/em><\/strong>$/, '</em></strong>')
            .replace(/[-‐‑‒]<\/strong>$/, '</strong>')
            .replace(/[-‐‑‒]<\/em>$/, '</em>')
            .replace(/[-‐‑‒]$/, '') + line.richText;
      } else {
        currentBlock.plainText += ' ' + line.plainText;
        currentBlock.richText += ' ' + line.richText;
      }
    }
  }

  flushCurrentBlock();

  if (extractedPageFooter) {
    blocks.push({
      type: 'page_footer',
      plainText: extractedPageFooter.plainText,
      richText: JSON.stringify(extractedPageFooter),
    });
  }

  if (blocks.length === 0) {
    const pageImgData = await extractPageAsImage(pdfPage, 1.6);
    return pageImgData ? `[PAGE_IMAGE:${pageImgData}]` : `Page ${pageNum}`;
  }

  const formattedBlocks = blocks.map((b) => {
    switch (b.type) {
      case 'page_header':
        return `[PAGE_HEADER]${b.richText}`;
      case 'page_footer':
        return `[PAGE_FOOTER]${b.richText}`;
      case 'right_heading':
        return `[RIGHT_HEADING]${b.richText}`;
      case 'chapter_title':
        return `[CHAPTER_TITLE]${b.richText}`;
      case 'chart_block':
        return `[CHART_BLOCK]${b.richText}`;
      case 'table_block':
        return `[TABLE_BLOCK]${b.richText}`;
      case 'centered_heading':
        return `[CENTERED_HEADING]${b.richText}`;
      case 'heading':
        return `[HEADING]${b.richText}`;
      case 'subheading':
        return `[SUBHEADING]${b.richText}`;
      case 'blockquote':
        return `[BLOCKQUOTE]${b.richText}`;
      case 'list_item':
        return `[LIST_ITEM]${b.richText}`;
      case 'verse_line':
        return `[VERSE_LINE]${b.richText}`;
      case 'footnote':
        return `[FOOTNOTE]${b.richText}`;
      case 'scene_break':
        return `[SCENE_BREAK]${b.richText}`;
      case 'indent_paragraph':
        return `[INDENT_PARAGRAPH]${b.richText}`;
      default:
        return b.richText;
    }
  });

  return formattedBlocks.join('\n\n');
}
