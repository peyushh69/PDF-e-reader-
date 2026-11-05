import { Book, Highlight } from '../types';

/**
 * Clean, editorial PDF 1.4 generator for Book Highlights & Notes.
 * Renders the book title once at the top, followed by clean page-by-page
 * highlight blocks with a left quote rule and subtle dividers.
 */

export interface PdfHighlightBlock {
  pageNumber: number;
  quoteText?: string;
  noteText?: string;
}

export interface GeneratedPdfPage {
  isFirstPage?: boolean;
  bookTitle?: string;
  blocks?: PdfHighlightBlock[];
  title?: string;
  paragraphs?: string[];
}

export interface GeneratedPdfOptions {
  title: string;
  author?: string;
  pages: GeneratedPdfPage[];
}

function sanitizeAsciiForPdf(text: string): string {
  return text
    .normalize('NFKC')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[—–]/g, '-')
    .replace(/…/g, '...')
    .replace(/•/g, '*')
    .replace(/[^\x20-\x7E\n]/g, '');
}

function escapePdfText(text: string): string {
  return sanitizeAsciiForPdf(text)
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
}

function wrapText(text: string, maxCharsPerLine: number = 72): string[] {
  const cleaned = sanitizeAsciiForPdf(text).replace(/\s+/g, ' ').trim();
  if (!cleaned) return [];
  const words = cleaned.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    if ((currentLine + ' ' + word).trim().length <= maxCharsPerLine) {
      currentLine = currentLine ? currentLine + ' ' + word : word;
    } else {
      if (currentLine) lines.push(currentLine);
      if (word.length > maxCharsPerLine) {
        let rest = word;
        while (rest.length > maxCharsPerLine) {
          lines.push(rest.slice(0, maxCharsPerLine));
          rest = rest.slice(maxCharsPerLine);
        }
        currentLine = rest;
      } else {
        currentLine = word;
      }
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines;
}

export function generatePdfBinary(options: GeneratedPdfOptions): Uint8Array {
  const objects: string[] = [];
  const offsets: number[] = [];

  let byteOffset = 0;
  const header = '%PDF-1.4\n%\xE2\xE3\xCF\xD3\n';
  byteOffset += header.length;

  // Obj 1: Catalog, Obj 2: Pages, Obj 3: Helvetica, Obj 4: Helvetica-Bold, Obj 5: Times-Roman, Obj 6: Times-Italic
  const pageStartObjNum = 7;
  const safePages =
    options.pages.length > 0
      ? options.pages
      : [
          {
            isFirstPage: true,
            bookTitle: options.title,
            blocks: [],
          },
        ];
  const numPages = safePages.length;

  // Obj 1: Catalog
  const catalog = `1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n`;
  offsets.push(byteOffset);
  objects.push(catalog);
  byteOffset += catalog.length;

  // Obj 2: Pages
  const kids = Array.from({ length: numPages }, (_, i) => `${pageStartObjNum + i * 2} 0 R`).join(' ');
  const pagesObj = `2 0 obj\n<< /Type /Pages /Kids [${kids}] /Count ${numPages} >>\nendobj\n`;
  offsets.push(byteOffset);
  objects.push(pagesObj);
  byteOffset += pagesObj.length;

  // Obj 3: Helvetica (Clean Sans Regular)
  const fontSans = `3 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n`;
  offsets.push(byteOffset);
  objects.push(fontSans);
  byteOffset += fontSans.length;

  // Obj 4: Helvetica-Bold (Clean Sans Bold for Title & Page Numbers)
  const fontSansBold = `4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj\n`;
  offsets.push(byteOffset);
  objects.push(fontSansBold);
  byteOffset += fontSansBold.length;

  // Obj 5: Times-Roman (Editorial Book Serif for Highlighted Lines)
  const fontSerif = `5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Times-Roman >>\nendobj\n`;
  offsets.push(byteOffset);
  objects.push(fontSerif);
  byteOffset += fontSerif.length;

  // Obj 6: Times-Italic (Editorial Italic)
  const fontSerifItalic = `6 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Times-Italic >>\nendobj\n`;
  offsets.push(byteOffset);
  objects.push(fontSerifItalic);
  byteOffset += fontSerifItalic.length;

  for (let i = 0; i < numPages; i++) {
    const pageData = safePages[i];
    const pageObjNum = pageStartObjNum + i * 2;
    const streamObjNum = pageObjNum + 1;

    let streamBody = '';
    // Warm Paper-Ink page sheet fill (#FAF8F4)
    streamBody += 'q 0.98 0.973 0.957 rg 0 0 612 792 re f Q\n';

    let currentY = 736;

    // Render Book Title ONLY ONCE on the first page
    if (pageData.isFirstPage) {
      streamBody += `BT\n/F1 8.5 Tf\n0.48 0.45 0.42 rg\n48 ${currentY} Td\n(HIGHLIGHTS & NOTES) Tj\nET\n`;
      currentY -= 22;

      const cleanTitle = (pageData.bookTitle || options.title || 'Book Notes').trim();
      const titleLines = wrapText(cleanTitle, 48);
      for (const tLine of titleLines) {
        streamBody += `BT\n/F2 17 Tf\n0.09 0.085 0.08 rg\n48 ${currentY} Td\n(${escapePdfText(tLine)}) Tj\nET\n`;
        currentY -= 22;
      }

      currentY -= 4;
      // Crisp editorial rule below the Book Title
      streamBody += `q 0.78 0.75 0.70 RG 0.9 w 48 ${currentY} m 564 ${currentY} l S Q\n`;
      currentY -= 26;
    } else {
      currentY = 734;
    }

    // Structured Highlight & Note Blocks
    if (Array.isArray(pageData.blocks) && pageData.blocks.length > 0) {
      pageData.blocks.forEach((block, bIdx) => {
        if (currentY < 75) return;

        // 1. Page Number Header (shown once per block)
        const pageLabel = `Page ${block.pageNumber}`;
        streamBody += `BT\n/F2 11 Tf\n0.10 0.095 0.09 rg\n48 ${currentY} Td\n(${escapePdfText(pageLabel)}) Tj\nET\n`;
        currentY -= 17;

        // 2. Highlighted Lines with a crisp left vertical bar
        if (block.quoteText && block.quoteText.trim()) {
          const quoteLines = wrapText(`"${block.quoteText.trim()}"`, 74);
          const quoteTopY = currentY + 9;

          for (const qLine of quoteLines) {
            if (currentY < 58) break;
            streamBody += `BT\n/F3 11.5 Tf\n0.15 0.14 0.13 rg\n60 ${currentY} Td\n(${escapePdfText(qLine)}) Tj\nET\n`;
            currentY -= 16;
          }

          const quoteBottomY = currentY + 12;
          // Left vertical quote bar
          streamBody += `q 0.22 0.20 0.18 RG 1.8 w 50 ${quoteTopY} m 50 ${quoteBottomY} l S Q\n`;
          currentY -= 4;
        }

        // 3. Optional Note below the highlight
        if (block.noteText && block.noteText.trim()) {
          const noteLines = wrapText(`Note: ${block.noteText.trim()}`, 74);
          for (const nLine of noteLines) {
            if (currentY < 58) break;
            streamBody += `BT\n/F4 10.5 Tf\n0.28 0.26 0.24 rg\n60 ${currentY} Td\n(${escapePdfText(nLine)}) Tj\nET\n`;
            currentY -= 15;
          }
          currentY -= 4;
        }

        // Subtle divider line between entries
        if (bIdx < pageData.blocks!.length - 1 && currentY > 75) {
          currentY -= 4;
          streamBody += `q 0.87 0.85 0.81 RG 0.5 w 48 ${currentY} m 564 ${currentY} l S Q\n`;
          currentY -= 20;
        }
      });
    } else if (Array.isArray(pageData.paragraphs) && pageData.paragraphs.length > 0) {
      for (const paragraph of pageData.paragraphs) {
        const lines = wrapText(paragraph, 72);
        for (const line of lines) {
          if (currentY < 58) break;
          streamBody += `BT\n/F3 11 Tf\n0.20 0.19 0.18 rg\n48 ${currentY} Td\n(${escapePdfText(line)}) Tj\nET\n`;
          currentY -= 16;
        }
        currentY -= 10;
      }
    } else {
      streamBody += `BT\n/F3 11 Tf\n0.40 0.38 0.35 rg\n48 ${currentY} Td\n(No highlights or notes recorded yet.) Tj\nET\n`;
    }

    // Minimal Page Number in Footer (only when multi-page, or subtle single page number)
    const footerPageLabel = numPages > 1 ? `${i + 1} / ${numPages}` : '1';
    streamBody += `BT\n/F1 8.5 Tf\n0.50 0.48 0.45 rg\n548 30 Td\n(${escapePdfText(footerPageLabel)}) Tj\nET\n`;

    const streamObj = `${streamObjNum} 0 obj\n<< /Length ${streamBody.length} >>\nstream\n${streamBody}endstream\nendobj\n`;
    const pageObj = `${pageObjNum} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents ${streamObjNum} 0 R /Resources << /Font << /F1 3 0 R /F2 4 0 R /F3 5 0 R /F4 6 0 R >> >> >>\nendobj\n`;

    offsets.push(byteOffset);
    objects.push(pageObj);
    byteOffset += pageObj.length;

    offsets.push(byteOffset);
    objects.push(streamObj);
    byteOffset += streamObj.length;
  }

  // Cross-reference table
  const xrefOffset = byteOffset;
  let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets) {
    xref += String(offset).padStart(10, '0') + ' 00000 n \n';
  }

  const trailer = `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  const fullPdfString = header + objects.join('') + xref + trailer;

  const result = new Uint8Array(fullPdfString.length);
  for (let i = 0; i < fullPdfString.length; i++) {
    result[i] = fullPdfString.charCodeAt(i) & 0xff;
  }

  return result;
}

export function createPdfDataUrl(options: GeneratedPdfOptions): string {
  const binary = generatePdfBinary(options);
  let binaryString = '';
  for (let i = 0; i < binary.length; i++) {
    binaryString += String.fromCharCode(binary[i]);
  }
  return `data:application/pdf;base64,${btoa(binaryString)}`;
}

export interface CompiledNotesPdfResult {
  pdfBytes: Uint8Array;
  contentPages: string[];
  totalPages: number;
  fileName: string;
}

/**
 * Compiles all highlights and notes of a book into a clean, non-repetitive PDF:
 * - Book title shown once at the top
 * - Followed by "Page X", then the highlighted lines, then the next "Page Y" and its lines.
 */
export function buildBookNotesPdfData(book: Book): CompiledNotesPdfResult {
  const rawHighlights: Highlight[] = Array.isArray(book.highlights) ? [...book.highlights] : [];
  rawHighlights.sort((a, b) => {
    const pageDiff = (a.pageNumber || 1) - (b.pageNumber || 1);
    if (pageDiff !== 0) return pageDiff;
    return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
  });

  const cleanBookTitle = book.title.replace(/\s*—\s*Notes PDF$/i, '').trim() || 'Book';
  const pdfPages: GeneratedPdfPage[] = [];
  const reflowContentPages: string[] = [];

  if (rawHighlights.length === 0) {
    pdfPages.push({
      isFirstPage: true,
      bookTitle: cleanBookTitle,
      blocks: [],
    });
    reflowContentPages.push(
      [`[HEADING] ${cleanBookTitle}`, 'No highlights or notes saved yet.'].join('\n\n')
    );
  } else {
    let currentBlocks: PdfHighlightBlock[] = [];
    let currentReflowBlocks: string[] = [`[HEADING] ${cleanBookTitle}`];
    let usedUnits = 5; // Title space on page 1
    const MAX_UNITS_PER_PAGE = 38;

    rawHighlights.forEach((h) => {
      const pageNum = h.pageNumber || 1;
      const quoteText = h.text ? h.text.trim() : '';
      const noteText = h.note ? h.note.trim() : '';

      const quoteLines = quoteText ? Math.max(1, Math.ceil(quoteText.length / 72)) : 0;
      const noteLines = noteText ? Math.max(1, Math.ceil(noteText.length / 72)) : 0;
      const blockUnits = 2 + quoteLines + noteLines + 1;

      if (usedUnits + blockUnits > MAX_UNITS_PER_PAGE && currentBlocks.length > 0) {
        pdfPages.push({
          isFirstPage: pdfPages.length === 0,
          bookTitle: pdfPages.length === 0 ? cleanBookTitle : undefined,
          blocks: currentBlocks,
        });
        reflowContentPages.push(currentReflowBlocks.join('\n\n'));
        currentBlocks = [];
        currentReflowBlocks = [];
        usedUnits = 2;
      }

      currentBlocks.push({
        pageNumber: pageNum,
        quoteText: quoteText || undefined,
        noteText: noteText || undefined,
      });
      usedUnits += blockUnits;

      currentReflowBlocks.push(`[SUBHEADING] Page ${pageNum}`);
      if (quoteText) {
        currentReflowBlocks.push(`[BLOCKQUOTE] “${quoteText}”`);
      }
      if (noteText) {
        currentReflowBlocks.push(`**Note:** ${noteText}`);
      }
    });

    if (currentBlocks.length > 0) {
      pdfPages.push({
        isFirstPage: pdfPages.length === 0,
        bookTitle: pdfPages.length === 0 ? cleanBookTitle : undefined,
        blocks: currentBlocks,
      });
      reflowContentPages.push(currentReflowBlocks.join('\n\n'));
    }
  }

  const pdfBytes = generatePdfBinary({
    title: cleanBookTitle,
    pages: pdfPages,
  });

  const safeBaseName =
    cleanBookTitle
      .replace(/[^a-zA-Z0-9\s-_]/g, '')
      .trim()
      .replace(/\s+/g, ' ')
      .slice(0, 60) || 'Book';

  return {
    pdfBytes,
    contentPages: reflowContentPages,
    totalPages: pdfPages.length,
    fileName: `${safeBaseName} - Notes.pdf`,
  };
}

/**
 * Triggers a browser download of the compiled Notes & Highlights PDF for a book.
 */
export function downloadBookNotesPdf(book: Book): void {
  const { pdfBytes, fileName } = buildBookNotesPdfData(book);
  const blob = new Blob([pdfBytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
