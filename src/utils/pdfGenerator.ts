/**
 * Lightweight, zero-dependency PDF document generator.
 * Produces 100% valid PDF 1.4 binary data that works with PDF.js and standard PDF viewers.
 */

export interface GeneratedPdfPage {
  title?: string;
  paragraphs: string[];
}

export interface GeneratedPdfOptions {
  title: string;
  author: string;
  pages: GeneratedPdfPage[];
}

function escapePdfText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
    .replace(/[\u0080-\uffff]/g, ''); // strip non-ascii for standard Type1 font
}

function wrapText(text: string, maxCharsPerLine: number = 70): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    if ((currentLine + ' ' + word).trim().length <= maxCharsPerLine) {
      currentLine = currentLine ? currentLine + ' ' + word : word;
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
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

  const fontObjNum = 3;
  const fontBoldObjNum = 4;
  const pageStartObjNum = 5;
  const numPages = options.pages.length;

  // Obj 1: Catalog
  const catalog = `1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n`;
  offsets.push(byteOffset);
  objects.push(catalog);
  byteOffset += catalog.length;

  // Obj 2: Pages (Kids placeholder)
  const kids = Array.from({ length: numPages }, (_, i) => `${pageStartObjNum + i * 2} 0 R`).join(' ');
  const pagesObj = `2 0 obj\n<< /Type /Pages /Kids [${kids}] /Count ${numPages} >>\nendobj\n`;
  offsets.push(byteOffset);
  objects.push(pagesObj);
  byteOffset += pagesObj.length;

  // Obj 3: Regular Font (Helvetica)
  const regularFont = `3 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n`;
  offsets.push(byteOffset);
  objects.push(regularFont);
  byteOffset += regularFont.length;

  // Obj 4: Bold Font (Helvetica-Bold)
  const boldFont = `4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj\n`;
  offsets.push(byteOffset);
  objects.push(boldFont);
  byteOffset += boldFont.length;

  // Page objects and Stream contents
  for (let i = 0; i < numPages; i++) {
    const pageData = options.pages[i];
    const pageObjNum = pageStartObjNum + i * 2;
    const streamObjNum = pageObjNum + 1;

    // Build Content Stream
    let streamBody = '';
    // Background card fill
    streamBody += 'q 0.98 0.98 0.96 rg 20 20 572 752 re f Q\n';
    // Subtle border
    streamBody += 'q 0.85 0.85 0.82 RG 1 w 20 20 572 752 re S Q\n';

    // Header title
    streamBody += `BT\n/F2 10 Tf\n0.5 0.5 0.5 rg\n40 740 Td\n(${escapePdfText(options.title.toUpperCase())}) Tj\nET\n`;
    streamBody += `BT\n/F1 9 Tf\n0.6 0.6 0.6 rg\n520 740 Td\n(Page ${i + 1}/${numPages}) Tj\nET\n`;
    streamBody += 'q 0.8 0.8 0.8 RG 0.5 w 40 730 m 572 730 l S Q\n';

    let currentY = 700;

    if (pageData.title) {
      streamBody += `BT\n/F2 18 Tf\n0.1 0.1 0.1 rg\n40 ${currentY} Td\n(${escapePdfText(pageData.title)}) Tj\nET\n`;
      currentY -= 28;
    }

    for (const paragraph of pageData.paragraphs) {
      const lines = wrapText(paragraph, 68);
      for (const line of lines) {
        if (currentY < 60) break; // page boundary
        streamBody += `BT\n/F1 11 Tf\n0.15 0.15 0.15 rg\n40 ${currentY} Td\n(${escapePdfText(line)}) Tj\nET\n`;
        currentY -= 16;
      }
      currentY -= 10; // paragraph gap
    }

    // Footer
    streamBody += `BT\n/F1 8 Tf\n0.6 0.6 0.6 rg\n40 35 Td\n(${escapePdfText(options.author)} · E-Reader Reflow Edition) Tj\nET\n`;

    const streamObj = `${streamObjNum} 0 obj\n<< /Length ${streamBody.length} >>\nstream\n${streamBody}endstream\nendobj\n`;

    // Page object
    const pageObj = `${pageObjNum} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents ${streamObjNum} 0 R /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> >>\nendobj\n`;

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
