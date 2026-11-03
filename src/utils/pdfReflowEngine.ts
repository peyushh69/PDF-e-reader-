export interface ReflowBlock {
  type:
    | 'centered_heading'
    | 'heading'
    | 'subheading'
    | 'paragraph'
    | 'indent_paragraph'
    | 'blockquote'
    | 'list_item'
    | 'verse_line'
    | 'scene_break'
    | 'page_image';
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

interface LineGroup {
  items: RawTextItem[];
  y: number;
  startX: number;
  endX: number;
  width: number;
  plainText: string;
  richText: string;
  maxFontSize: number;
  avgFontSize: number;
  isCentered: boolean;
  isHeading: boolean;
  isSubheading: boolean;
  isAllBold: boolean;
  isAllItalic: boolean;
  isListItem: boolean;
  isSceneBreak: boolean;
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
 * Determines whether a hyphen at the end of a PDF line is a soft line-wrap hyphen
 * (which should be removed to rejoin the split word) or a real compound word hyphen
 * (which should be kept, e.g., "self-aware", "twenty-one").
 */
function shouldStripLineEndHyphen(prevPlainText: string, nextPlainText: string): boolean {
  const prevTrimmed = prevPlainText.trimEnd();
  // Match standard ASCII hyphen or Unicode hyphens at end of line, but not em/en-dashes or spaced hyphens
  if (
    !/[-‐‑‒]$/.test(prevTrimmed) ||
    /\s[-‐‑‒]$/.test(prevTrimmed) ||
    /--$/.test(prevTrimmed)
  ) {
    return false;
  }

  const nextTrimmed = nextPlainText.trimStart();
  // Rejoin if the continuation starts with a lowercase letter
  if (!/^[a-z]/.test(nextTrimmed)) {
    return false;
  }

  // Extract the word stem before the hyphen at the end of the previous line
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
 * If they do NOT overlap, two close-Y line fragments belong to the same visual line.
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

/**
 * Rebuilds a LineGroup's plainText, richText, startX, endX, width, and font metrics
 * from its `items` array (sorted left-to-right).
 */
function buildLineGroupText(line: LineGroup): void {
  line.items.sort((a, b) => a.x - b.x);

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

  // Detect if the entire line is kerning-split single characters (e.g., "C H A P T E R")
  const singleCharCount = line.items.filter((it) => it.str.trim().length === 1).length;
  const isLikelyKerningSplitLine =
    line.items.length >= 4 && singleCharCount / line.items.length >= 0.75;

  for (let i = 0; i < line.items.length; i++) {
    const it = line.items[i];
    minX = Math.min(minX, it.x);
    maxX = Math.max(maxX, it.x + it.width);
    maxFs = Math.max(maxFs, it.fontSize);

    const charWeight = Math.max(1, it.str.trim().length);
    weightedFsSum += it.fontSize * charWeight;
    totalCharWeight += charWeight;

    if (i > 0) {
      const prev = line.items[i - 1];
      const gap = it.x - (prev.x + prev.width);
      const refFs = Math.max(prev.fontSize, it.fontSize, 10);

      const spaceThreshold = isLikelyKerningSplitLine
        ? Math.max(2.6, refFs * 0.36)
        : Math.max(1.1, refFs * 0.14);

      const alreadyHasSpace =
        linePlainText.endsWith(' ') || prev.str.endsWith(' ') || it.str.startsWith(' ');
      const isClosingPunctuation = /^[.,:;!?)\]}'"”’»%]/.test(it.str.trim());
      const prevIsOpeningPunctuation = /[([{"“‘«—–-]$/.test(prev.str.trim());

      const needSpace =
        !alreadyHasSpace &&
        gap >= spaceThreshold &&
        !isClosingPunctuation &&
        !prevIsOpeningPunctuation;

      if (needSpace) {
        linePlainText += ' ';
        if (currentSpanText) {
          currentSpanText += ' ';
        } else {
          lineRichText += ' ';
        }
      }
    }

    if (it.isBold !== currentSpanBold || it.isItalic !== currentSpanItalic) {
      flushSpan();
      currentSpanBold = it.isBold;
      currentSpanItalic = it.isItalic;
    }

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
  }

  flushSpan();

  line.plainText = linePlainText.replace(/\s+/g, ' ').trim();
  line.richText = lineRichText.replace(/\s+/g, ' ').trim();
  line.startX = minX === Infinity ? 0 : minX;
  line.endX = maxX === -Infinity ? 0 : maxX;
  line.width = Math.max(0, line.endX - line.startX);
  line.maxFontSize = maxFs || 12;
  line.avgFontSize = totalCharWeight > 0 ? weightedFsSum / totalCharWeight : maxFs || 12;
  line.isAllBold = line.items.length > 0 && line.items.every((it) => it.isBold);
  line.isAllItalic = line.items.length > 0 && line.items.every((it) => it.isItalic);
}

/**
 * High-precision PDF Page to Smart Reflow extractor.
 * Reconstructs complete, unbroken paragraphs while preserving exact words,
 * punctuation, inline bold/italic emphasis, first-line book indentation,
 * lists, dialogues, blockquotes, headings, and scene breaks from the PDF page.
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
    const x = Number(tx[4]) || 0;
    const y = Number(tx[5]) || 0;

    // Ignore out-of-page crop marks or margin artifacts
    if (x < -15 || x > pageWidth + 15 || y < -15 || y > pageHeight + 15) {
      continue;
    }

    const scaleX = Math.hypot(Number(tx[0]) || 0, Number(tx[1]) || 0);
    const scaleY = Math.hypot(Number(tx[2]) || 0, Number(tx[3]) || 0);
    const fs = scaleY || scaleX || Number(it.height) || 12;
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

  // If the page is a scanned image or full-page illustration with no extractable text
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
      // Use Math.max so superscripts, subscripts, or punctuation never shrink the tolerance
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
        y: item.y,
        startX: item.x,
        endX: item.x + item.width,
        width: item.width,
        plainText: '',
        richText: '',
        maxFontSize: item.fontSize,
        avgFontSize: item.fontSize,
        isCentered: false,
        isHeading: false,
        isSubheading: false,
        isAllBold: false,
        isAllItalic: false,
        isListItem: false,
        isSceneBreak: false,
      };
      initialLines.push(bestLine);
    } else {
      bestLine.items.push(item);
      // Weight baseline Y by character count so a 1-char superscript doesn't pull the line baseline
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

  // Sort lines strictly from top of page to bottom of page
  initialLines.sort((a, b) => b.y - a.y);

  // Secondary Line-Merge Pass:
  // Merge adjacent LineGroups that share nearly the same baseline Y (e.g. superscripts, italic spans,
  // or drop-cap letters) and do not horizontally overlap.
  const lines: LineGroup[] = [];
  for (const line of initialLines) {
    if (lines.length === 0) {
      lines.push(line);
      continue;
    }
    const prev = lines[lines.length - 1];
    const refFs = Math.max(prev.avgFontSize, line.avgFontSize, dominantBodyFontSize);
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

  // Reconstruct words and inline rich formatting within each line
  for (const line of lines) {
    buildLineGroupText(line);
  }

  // Filter out empty lines and running headers / footers / standalone page numbers
  const nonEmptyLines = lines.filter((l) => l.plainText.length > 0);
  if (nonEmptyLines.length === 0) {
    const pageImgData = await extractPageAsImage(pdfPage, 1.6);
    return pageImgData ? `[PAGE_IMAGE:${pageImgData}]` : `Page ${pageNum}`;
  }

  const allFontSizes = nonEmptyLines.map((l) => l.avgFontSize).sort((a, b) => a - b);
  const medianFontSize =
    allFontSizes[Math.floor(allFontSizes.length / 2)] || dominantBodyFontSize || 12;

  const filteredLines = nonEmptyLines.filter((l, idx) => {
    const text = l.plainText.trim();
    const isFirstOrLast = idx === 0 || idx === nonEmptyLines.length - 1;
    if (!isFirstOrLast) return true;

    // Standalone page numbers ("12", "Page 12", "- 12 -", "12 / 240", roman numerals)
    if (
      /^(?:page\s+)?[-–—•\s]*\d+(?:\s*(?:\/|of)\s*\d+)?[-–—•\s]*$/i.test(text) ||
      /^[ivxlcdm]+$/i.test(text)
    ) {
      return false;
    }

    // Running header at very top of page or running footer at very bottom of page
    if (nonEmptyLines.length >= 4) {
      const isTopMargin = idx === 0 && l.y > pageHeight * 0.89;
      const isBottomMargin = idx === nonEmptyLines.length - 1 && l.y < pageHeight * 0.1;
      const neighbor = idx === 0 ? nonEmptyLines[1] : nonEmptyLines[nonEmptyLines.length - 2];
      const gapToNeighbor = Math.abs(l.y - neighbor.y);

      if (
        (isTopMargin || isBottomMargin) &&
        l.avgFontSize <= medianFontSize * 1.02 &&
        text.length < 70 &&
        gapToNeighbor > medianFontSize * 1.5 &&
        !/^(chapter|part|section|book|prologue|epilogue|introduction)\b/i.test(text)
      ) {
        return false;
      }
    }

    return true;
  });

  if (filteredLines.length === 0) {
    return `Page ${pageNum}`;
  }

  // Handle PDF Drop-Cap single letters that sit on their own baseline or between Line 1 and Line 2
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

  // Analyze page geometry: dominant left margin, 85th-percentile right margin, column width, and median line spacing
  const substantialLines = filteredLines.filter((l) => l.plainText.length >= 25);
  const marginSampleLines = substantialLines.length >= 3 ? substantialLines : filteredLines;

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

  // Use 85th percentile of endX across substantial lines so a single wide outlier line
  // never inflates dominantRightMargin in ragged-right or mixed pages.
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

  const verticalGaps: number[] = [];
  for (let i = 1; i < filteredLines.length; i++) {
    const gap = filteredLines[i - 1].y - filteredLines[i].y;
    if (gap > medianFontSize * 0.65 && gap < medianFontSize * 3.2) {
      verticalGaps.push(gap);
    }
  }
  verticalGaps.sort((a, b) => a - b);
  const medianLineGap =
    verticalGaps.length > 0
      ? verticalGaps[Math.floor(verticalGaps.length * 0.5)]
      : medianFontSize * 1.38;

  // Classify individual lines (headings, subheadings, centered lines, list items, scene breaks)
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

    // A line is truly centered only if BOTH left and right margins are substantial and roughly symmetric
    const isHorizontallyCentered =
      Math.abs(lineMidX - pageMidX) < pageWidth * 0.08 ||
      Math.abs(lineMidX - columnMidX) < columnWidth * 0.08;
    const hasSymmetricMargins =
      leftGap >= Math.max(18, medianFontSize * 1.5) &&
      rightGap >= Math.max(18, medianFontSize * 1.5) &&
      Math.abs(leftGap - rightGap) <= columnWidth * 0.16;
    const isNotFullWidth = line.width < typicalLineWidth * 0.82;

    line.isCentered = isHorizontallyCentered && hasSymmetricMargins && isNotFullWidth;

    // Scene break / ornamental divider (e.g. "* * *", "***", "---", "• • •")
    line.isSceneBreak = /^([*•·~—–\-]\s*){3,}$/.test(trimmed);

    // Bullet or numbered list item
    line.isListItem =
      /^(?:[•●○▪▫▸▹–—*]\s+|\(?[0-9]{1,3}[.)]\s+|\([a-zA-Z]\)\s+|[a-zA-Z]\)\s+|[IVXLCDM]{1,5}\.\s+)/.test(
        trimmed
      );

    const isExplicitChapter =
      /^(chapter|section|part|book|unit|act|scene|module)\s+([0-9ivxlcdm]+|[a-z0-9\s:—–\-]{1,45})$/i.test(
        trimmed
      ) && trimmed.length < 75;

    const isStandaloneMajorTitle =
      /^(prologue|epilogue|introduction|preface|foreword|afterword|acknowledgements|acknowledgments|about the author|table of contents|contents|appendix|bibliography|notes|index|dedication)$/i.test(
        trimmed
      );

    // Use avgFontSize (not maxFontSize) so a Drop Cap never turns a body line into a heading
    const isTrueLargeHeader =
      line.avgFontSize >= medianFontSize * 1.24 && isNotFullWidth && trimmed.length < 90;

    line.isHeading =
      !line.isSceneBreak && (isExplicitChapter || isStandaloneMajorTitle || isTrueLargeHeader);

    // A subheading must not be mid-sentence: previous line must have ended or had a vertical gap
    const prevAllowsHeading =
      !prevLine ||
      prevLine.isHeading ||
      prevLine.isSubheading ||
      prevLine.isSceneBreak ||
      gapFromPrev > medianLineGap * 1.22 ||
      /[.!?:”"']$/.test(prevLine.plainText.trim());

    line.isSubheading =
      !line.isHeading &&
      !line.isSceneBreak &&
      !line.isListItem &&
      prevAllowsHeading &&
      /^[A-Z0-9"“‘(]/.test(trimmed) &&
      ((line.isAllBold && isNotFullWidth && trimmed.length < 80 && !/[.,;]$/.test(trimmed)) ||
        (line.avgFontSize >= medianFontSize * 1.14 &&
          isNotFullWidth &&
          trimmed.length < 80 &&
          !/[.,;]$/.test(trimmed) &&
          gapToNext >= medianLineGap * 0.95));
  }

  // Detect whether this page uses traditional book first-line indentation
  let indentedLineCount = 0;
  for (const l of filteredLines) {
    if (l.isHeading || l.isSubheading || l.isCentered || l.isListItem) continue;
    const offset = l.startX - dominantLeftMargin;
    if (offset >= Math.max(8, medianFontSize * 0.75) && offset <= columnWidth * 0.25) {
      indentedLineCount++;
    }
  }
  const pageUsesFirstLineIndent = indentedLineCount >= 1;

  // Group lines into structured Reflow blocks
  const blocks: ReflowBlock[] = [];
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
    const line = filteredLines[i];
    if (!line.plainText) continue;

    const prevLine = i > 0 ? filteredLines[i - 1] : null;
    const gapFromPrev = prevLine ? prevLine.y - line.y : 0;

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

    // 2. Major Heading / Chapter Title
    if (line.isHeading) {
      flushCurrentBlock();
      const lastBlock = blocks[blocks.length - 1];
      if (
        lastBlock &&
        (lastBlock.type === 'heading' || lastBlock.type === 'centered_heading') &&
        prevLine &&
        prevLine.isHeading &&
        gapFromPrev < line.avgFontSize * 1.9 &&
        Math.abs(prevLine.avgFontSize - line.avgFontSize) < 2.5
      ) {
        lastBlock.plainText += ' ' + line.plainText;
        lastBlock.richText += ' ' + line.richText;
      } else {
        blocks.push({
          type: line.isCentered ? 'centered_heading' : 'heading',
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
        type: line.isCentered ? 'centered_heading' : 'subheading',
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

    // Check if previous line clearly did NOT finish a sentence
    const prevEndsWithHyphen = /[-‐‑‒]$/.test(prevTrimmed) && !/--$/.test(prevTrimmed);
    const prevEndsWithAbbreviation = COMMON_ABBREVIATIONS.test(prevTrimmed);
    const prevEndsWithSentencePunctuation =
      /[.!?:"”'’…)\]]$/.test(prevTrimmed) && !prevEndsWithAbbreviation;
    const currStartsWithLowercase = /^[a-z]/.test(currTrimmed);

    // Sentence continuation guard:
    // If the previous line ended with a hyphen, or did NOT end with terminal sentence punctuation,
    // or the current line starts with a lowercase letter, this line is a continuation of the same
    // sentence and MUST stay in the same paragraph unless separated by a major vertical gap.
    const isSentenceContinuation =
      gapFromPrev <= medianLineGap * 1.55 &&
      !isFirstLineIndented &&
      (prevEndsWithHyphen || !prevEndsWithSentencePunctuation || currStartsWithLowercase);

    // Evaluate paragraph boundary signals only when not a mid-sentence continuation:
    // Rule A: Significant vertical spacing between paragraphs
    const hasVerticalParagraphGap = gapFromPrev > medianLineGap * 1.35;
    const hasSceneBreakVerticalGap = gapFromPrev > medianLineGap * 2.3;

    // Rule B: First-line book indentation on the current line
    const hasFirstLineIndentBreak =
      isFirstLineIndented &&
      !isBlockquoteIndented &&
      prevLine !== null &&
      line.startX - prevLine.startX >= Math.max(6.5, medianFontSize * 0.6);

    // Rule C: Previous line ended a sentence AND ended significantly before the right margin
    const shortLineThreshold = pageUsesFirstLineIndent
      ? dominantLeftMargin + typicalLineWidth * 0.72
      : dominantRightMargin - Math.max(26, typicalLineWidth * 0.18);

    const prevEndedShort =
      !isSentenceContinuation &&
      prevLine !== null &&
      prevEndsWithSentencePunctuation &&
      prevLine.endX < shortLineThreshold &&
      /^[\p{Lu}0-9"“'‘—–([]/u.test(currTrimmed);

    // Rule D: Dialogue turn — new line starting with opening quote when previous line ended a sentence
    // and either the new line is indented or the previous line ended before the margin
    const startsWithQuoteOrDash = /^["“‘—]/.test(currTrimmed);
    const isDialogueBreak =
      !isSentenceContinuation &&
      startsWithQuoteOrDash &&
      prevEndsWithSentencePunctuation &&
      (hasFirstLineIndentBreak ||
        hasVerticalParagraphGap ||
        (prevLine !== null && prevLine.endX < dominantRightMargin - Math.max(14, typicalLineWidth * 0.08)));

    // Rule E: Centered verse / epigraph lines (only when both lines are genuinely centered)
    const isCenteredPair = prevLine !== null && prevLine.isCentered && line.isCentered;

    // Rule F: Transition into or out of a blockquote
    const blockquoteTransition =
      (currentBlock.type === 'blockquote') !== Boolean(isBlockquoteIndented);

    const isNewParagraph =
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
      // Join into the existing paragraph, rejoining soft line-wrap hyphens into full unbroken words
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

  if (blocks.length === 0) {
    const pageImgData = await extractPageAsImage(pdfPage, 1.6);
    return pageImgData ? `[PAGE_IMAGE:${pageImgData}]` : `Page ${pageNum}`;
  }

  const formattedBlocks = blocks.map((b) => {
    switch (b.type) {
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
