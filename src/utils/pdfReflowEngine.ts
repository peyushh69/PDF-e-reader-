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
  if (!prevTrimmed.endsWith('-') || prevTrimmed.endsWith(' -') || prevTrimmed.endsWith('--')) {
    return false;
  }

  const nextTrimmed = nextPlainText.trimStart();
  // Only rejoin if the continuation starts with a lowercase letter
  if (!/^[a-z]/.test(nextTrimmed)) {
    return false;
  }

  // Extract the word stem before the hyphen at the end of the previous line
  const match = prevTrimmed.match(/([A-Za-z]+)-$/);
  if (!match) return false;

  const prefixWord = match[1].toLowerCase();
  if (COMPOUND_HYPHEN_PREFIXES.has(prefixWord)) {
    return false;
  }

  return true;
}

/**
 * High-precision PDF Page to LibreFlow / Kindle Reflow extractor.
 * Preserves exact words, punctuation, inline bold/italic emphasis,
 * paragraph breaks, first-line book indentation, lists, dialogues,
 * blockquotes, headings, and verse/short lines from the original PDF page.
 */
export async function extractPageForKindleReflow(
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
    // Keep items that have visible characters; if an item is pure whitespace,
    // attach a trailing space to the previous item so explicit PDF space tokens are never lost
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

  // Cluster items into visual lines using a dynamic baseline tolerance
  // Do NOT sort solely by Y beforehand in a way that breaks slight inline baseline jitter;
  // instead sort roughly top-to-bottom, then left-to-right, and snap to adaptive line baselines.
  const sortedByY = [...rawItems].sort((a, b) => {
    const yDiff = b.y - a.y;
    if (Math.abs(yDiff) > 2.2) return yDiff;
    return a.x - b.x;
  });

  const lines: LineGroup[] = [];

  for (const item of sortedByY) {
    let bestLine: LineGroup | null = null;
    let bestDy = Infinity;

    for (const candidate of lines) {
      const refFs = Math.min(candidate.avgFontSize || item.fontSize, item.fontSize);
      const tolerance = Math.max(3.0, refFs * 0.42);
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
      lines.push(bestLine);
    } else {
      bestLine.items.push(item);
      // Update weighted average baseline Y and fontSize
      const n = bestLine.items.length;
      bestLine.y = (bestLine.y * (n - 1) + item.y) / n;
      bestLine.avgFontSize = (bestLine.avgFontSize * (n - 1) + item.fontSize) / n;
      bestLine.maxFontSize = Math.max(bestLine.maxFontSize, item.fontSize);
    }
  }

  // Sort lines strictly from top of page to bottom of page
  lines.sort((a, b) => b.y - a.y);

  // Reconstruct words and inline rich formatting within each line
  for (const line of lines) {
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

    // Detect if the entire line is kerning-split single characters (e.g., "C H A P T E R")
    const singleCharCount = line.items.filter((it) => it.str.trim().length === 1).length;
    const isLikelyKerningSplitLine =
      line.items.length >= 4 && singleCharCount / line.items.length >= 0.75;

    for (let i = 0; i < line.items.length; i++) {
      const it = line.items[i];
      minX = Math.min(minX, it.x);
      maxX = Math.max(maxX, it.x + it.width);
      maxFs = Math.max(maxFs, it.fontSize);

      if (i > 0) {
        const prev = line.items[i - 1];
        const gap = it.x - (prev.x + prev.width);
        const refFs = Math.max(prev.fontSize, it.fontSize, 10);

        // Proportional space threshold based on font size:
        // For normal text, a word space is > 16% of fontSize (or > 1.2pt).
        // For kerning-split lines where each letter is a separate item, require a larger gap (> 38% of fontSize)
        // so individual letters of a single word don't get split by spaces.
        const spaceThreshold = isLikelyKerningSplitLine
          ? Math.max(2.6, refFs * 0.36)
          : Math.max(1.15, refFs * 0.15);

        // Avoid inserting a space inside a word if gap is negative or tiny
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

      // Collapse multiple internal spaces to single space while preserving single leading/trailing space
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
    line.isAllBold = line.items.length > 0 && line.items.every((it) => it.isBold);
    line.isAllItalic = line.items.length > 0 && line.items.every((it) => it.isItalic);
  }

  // Filter out empty lines and running headers / footers / standalone page numbers
  const nonEmptyLines = lines.filter((l) => l.plainText.length > 0);
  if (nonEmptyLines.length === 0) {
    const pageImgData = await extractPageAsImage(pdfPage, 1.6);
    return pageImgData ? `[PAGE_IMAGE:${pageImgData}]` : `Page ${pageNum}`;
  }

  const allFontSizes = nonEmptyLines.map((l) => l.maxFontSize).sort((a, b) => a - b);
  const medianFontSize = allFontSizes[Math.floor(allFontSizes.length / 2)] || 12;

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

    // Running header at very top of page or running footer at very bottom of page:
    // Short line in top 8% or bottom 8% of page with font size <= medianFontSize * 0.95
    // and separated from the adjacent line by a noticeable vertical gap.
    if (nonEmptyLines.length >= 4) {
      const isTopMargin = idx === 0 && l.y > pageHeight * 0.9;
      const isBottomMargin = idx === nonEmptyLines.length - 1 && l.y < pageHeight * 0.09;
      const neighbor = idx === 0 ? nonEmptyLines[1] : nonEmptyLines[nonEmptyLines.length - 2];
      const gapToNeighbor = Math.abs(l.y - neighbor.y);

      if (
        (isTopMargin || isBottomMargin) &&
        l.maxFontSize <= medianFontSize * 0.96 &&
        text.length < 65 &&
        gapToNeighbor > medianFontSize * 1.8 &&
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

  // Analyze page geometry: dominant left margin, dominant right margin, column width, and median line spacing
  const substantialLines = filteredLines.filter((l) => l.plainText.length > 22);
  const marginSampleLines = substantialLines.length >= 3 ? substantialLines : filteredLines;

  const startXBins = new Map<number, number>();
  marginSampleLines.forEach((l) => {
    const bin = Math.round(l.startX / 3) * 3;
    startXBins.set(bin, (startXBins.get(bin) || 0) + 1);
  });

  let dominantLeftMargin = Math.min(...marginSampleLines.map((l) => l.startX));
  let highestLeftCount = 0;
  startXBins.forEach((count, bin) => {
    // Prefer left-aligned body margin (the most frequent startX bin, or earlier bin on tie)
    if (count > highestLeftCount || (count === highestLeftCount && bin < dominantLeftMargin)) {
      highestLeftCount = count;
      dominantLeftMargin = bin;
    }
  });

  const endXBins = new Map<number, number>();
  marginSampleLines.forEach((l) => {
    const bin = Math.round(l.endX / 4) * 4;
    endXBins.set(bin, (endXBins.get(bin) || 0) + 1);
  });

  let dominantRightMargin = Math.max(...marginSampleLines.map((l) => l.endX));
  let highestRightCount = 0;
  endXBins.forEach((count, bin) => {
    if (count > highestRightCount || (count === highestRightCount && bin > dominantRightMargin)) {
      highestRightCount = count;
      dominantRightMargin = bin;
    }
  });

  const columnWidth = Math.max(140, dominantRightMargin - dominantLeftMargin);
  const columnMidX = dominantLeftMargin + columnWidth / 2;

  const verticalGaps: number[] = [];
  for (let i = 1; i < filteredLines.length; i++) {
    const gap = filteredLines[i - 1].y - filteredLines[i].y;
    if (gap > medianFontSize * 0.6 && gap < medianFontSize * 3.5) {
      verticalGaps.push(gap);
    }
  }
  verticalGaps.sort((a, b) => a - b);
  // Use the 40th percentile of vertical gaps as the true single-line spacing
  // so paragraph gaps don't skew the baseline line-to-line distance upward
  const medianLineGap =
    verticalGaps.length > 0
      ? verticalGaps[Math.floor(verticalGaps.length * 0.4)]
      : medianFontSize * 1.35;

  // Classify individual lines (headings, subheadings, centered lines, list items, scene breaks)
  for (const line of filteredLines) {
    const trimmed = line.plainText.trim();
    const lineMidX = line.startX + line.width / 2;
    const isHorizontallyCentered =
      Math.abs(lineMidX - pageMidX) < pageWidth * 0.09 ||
      Math.abs(lineMidX - columnMidX) < columnWidth * 0.09;
    const isLeftIndentedForCenter = line.startX > dominantLeftMargin + medianFontSize * 1.6;
    const isNotFullWidth = line.width < columnWidth * 0.8;

    line.isCentered = isHorizontallyCentered && isNotFullWidth && isLeftIndentedForCenter;

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

    const isTrueLargeHeader =
      line.maxFontSize >= medianFontSize * 1.26 && isNotFullWidth && trimmed.length < 95;

    line.isHeading =
      !line.isSceneBreak && (isExplicitChapter || isStandaloneMajorTitle || isTrueLargeHeader);

    line.isSubheading =
      !line.isHeading &&
      !line.isSceneBreak &&
      !line.isListItem &&
      ((line.isAllBold && isNotFullWidth && trimmed.length < 85 && !/[.,;]$/.test(trimmed)) ||
        (line.maxFontSize >= medianFontSize * 1.12 &&
          isNotFullWidth &&
          trimmed.length < 85 &&
          !/[.,;]$/.test(trimmed)));
  }

  // Group lines into structured Kindle / LibreFlow blocks
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
      // Merge multi-line heading if the immediately preceding block was also a heading with similar font size
      const lastBlock = blocks[blocks.length - 1];
      if (
        lastBlock &&
        (lastBlock.type === 'heading' || lastBlock.type === 'centered_heading') &&
        prevLine &&
        prevLine.isHeading &&
        gapFromPrev < line.maxFontSize * 1.8 &&
        Math.abs(prevLine.maxFontSize - line.maxFontSize) < 2.5
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

    // Check indentation & margins for paragraph, blockquote, or verse detection
    const indentOffset = line.startX - dominantLeftMargin;
    const isFirstLineIndented =
      indentOffset >= Math.max(6.5, medianFontSize * 0.55) && indentOffset <= columnWidth * 0.28;

    const isBlockquoteIndented =
      indentOffset > Math.max(14, medianFontSize * 1.15) &&
      line.width < columnWidth * 0.88 &&
      ((prevLine && prevLine.startX - dominantLeftMargin > Math.max(14, medianFontSize * 1.15)) ||
        (i + 1 < filteredLines.length &&
          filteredLines[i + 1].startX - dominantLeftMargin > Math.max(14, medianFontSize * 1.15)));

    // 5. Determine whether this line starts a new paragraph or merges into currentBlock
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

    // Evaluate multi-signal paragraph boundary rules:
    // Rule A: Significant vertical spacing between lines (> 1.26x normal line spacing)
    const hasVerticalParagraphGap = gapFromPrev > medianLineGap * 1.26;
    const hasSceneBreakVerticalGap = gapFromPrev > medianLineGap * 2.25;

    // Rule B: First-line book indentation on the current line
    const hasFirstLineIndentBreak = isFirstLineIndented && !isBlockquoteIndented;

    // Rule C: Previous line ended significantly before the right margin
    const prevEndedShort =
      prevLine !== null &&
      prevLine.endX < dominantRightMargin - Math.max(22, columnWidth * 0.14);

    // Rule D: Dialogue turn — new line starting with opening quote when previous line ended a sentence
    const startsWithQuoteOrDash = /^["“'‘—–]/.test(line.plainText.trim());
    const prevEndedSentence =
      prevLine !== null && /[.!?:"”'’—–]$/.test(prevLine.plainText.trim());
    const isDialogueBreak =
      startsWithQuoteOrDash &&
      prevEndedSentence &&
      (isFirstLineIndented ||
        hasVerticalParagraphGap ||
        (prevLine !== null && prevLine.endX < dominantRightMargin - Math.max(12, columnWidth * 0.07)));

    // Rule E: Short consecutive lines (poetry, epigraphs, TOC entries, addresses, signatures)
    const isShortLinePair =
      prevLine !== null &&
      prevLine.width < columnWidth * 0.62 &&
      line.width < columnWidth * 0.62;

    // Rule F: Transition into or out of a blockquote
    const blockquoteTransition =
      (currentBlock.type === 'blockquote') !== Boolean(isBlockquoteIndented);

    // Continuation guard: if currentBlock is a list item and the current line is indented continuation
    // without a vertical gap, keep it in the list item unless it's a new paragraph.
    const isNewParagraph =
      hasVerticalParagraphGap ||
      hasFirstLineIndentBreak ||
      prevEndedShort ||
      isDialogueBreak ||
      isShortLinePair ||
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
          : isShortLinePair && line.isCentered
          ? 'verse_line'
          : isFirstLineIndented
          ? 'indent_paragraph'
          : 'paragraph',
        plainText: line.plainText,
        richText: line.richText,
      };
    } else {
      // Join into the existing paragraph, handling soft line-wrap hyphens cleanly
      if (shouldStripLineEndHyphen(currentBlock.plainText, line.plainText)) {
        currentBlock.plainText = currentBlock.plainText.replace(/-$/, '') + line.plainText;
        currentBlock.richText =
          currentBlock.richText
            .replace(/-<\/strong><\/em>$/, '</strong></em>')
            .replace(/-<\/em><\/strong>$/, '</em></strong>')
            .replace(/-<\/strong>$/, '</strong>')
            .replace(/-<\/em>$/, '</em>')
            .replace(/-$/, '') + line.richText;
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
