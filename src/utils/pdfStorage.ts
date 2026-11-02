import { Book } from '../types';

// Multi-tier PDF storage: In-Memory + IndexedDB + Express Backend Disk Storage
const DB_NAME = 'ereader_pdf_storage_db';
const STORE_NAME = 'pdf_files';
const DB_VERSION = 1;

const memoryCache = new Map<string, Uint8Array>();
const blobUrlCache = new Map<string, string>();

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported in this environment'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function savePdfToStorage(bookId: string, data: ArrayBuffer | Uint8Array): Promise<string> {
  const uint8 = data instanceof Uint8Array ? data : new Uint8Array(data);
  memoryCache.set(bookId, uint8);

  if (blobUrlCache.has(bookId)) {
    URL.revokeObjectURL(blobUrlCache.get(bookId)!);
  }
  const blob = new Blob([uint8], { type: 'application/pdf' });
  const blobUrl = URL.createObjectURL(blob);
  blobUrlCache.set(bookId, blobUrl);

  // 1. Save to IndexedDB
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(
        uint8.buffer.slice(uint8.byteOffset, uint8.byteOffset + uint8.byteLength),
        bookId
      );
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('IndexedDB save fallback:', err);
  }

  // 2. Save to Backend Server disk storage
  try {
    await fetch(`/api/pdf/${encodeURIComponent(bookId)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/pdf' },
      body: uint8,
    });
  } catch (err) {
    // Non-blocking if offline
  }

  return blobUrl;
}

export async function getPdfFromStorage(bookId: string): Promise<Uint8Array | null> {
  if (memoryCache.has(bookId)) {
    return memoryCache.get(bookId)!;
  }

  // 1. Try IndexedDB
  try {
    const db = await openDB();
    const idbResult = await new Promise<Uint8Array | null>((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(bookId);

      req.onsuccess = () => {
        if (req.result) {
          const uint8 = new Uint8Array(req.result);
          memoryCache.set(bookId, uint8);
          resolve(uint8);
        } else {
          resolve(null);
        }
      };

      req.onerror = () => resolve(null);
    });
    if (idbResult && idbResult.length > 0) {
      return idbResult;
    }
  } catch (err) {
    console.warn('IndexedDB read fallback:', err);
  }

  // 2. Try Backend Server API
  try {
    const res = await fetch(`/api/pdf/${encodeURIComponent(bookId)}`);
    if (res.ok) {
      const buf = await res.arrayBuffer();
      if (buf.byteLength > 0) {
        const uint8 = new Uint8Array(buf);
        memoryCache.set(bookId, uint8);
        return uint8;
      }
    }
  } catch (err) {
    // Ignore network fallback error
  }

  return null;
}

export function decodeBase64DataUrlToBytes(dataUrl: string): Uint8Array | null {
  try {
    const base64Marker = 'base64,';
    const idx = dataUrl.indexOf(base64Marker);
    if (idx === -1) return null;
    const base64 = dataUrl.slice(idx + base64Marker.length).trim();
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i) & 0xff;
    }
    return bytes;
  } catch (err) {
    console.warn('Failed to decode base64 PDF data URL:', err);
    return null;
  }
}

/**
 * Resolves the raw Uint8Array bytes for any book (Uploaded, Sample, or Google Drive).
 */
export async function resolveBookPdfBytes(book: Book): Promise<Uint8Array | null> {
  // 1. Check storage (Memory -> IndexedDB -> Backend Server)
  const stored = await getPdfFromStorage(book.id);
  if (stored && stored.length > 0) {
    return stored;
  }

  // 2. Check embedded base64 data URL (used by Sample & Drive books)
  if (book.pdfDataUrl && book.pdfDataUrl.startsWith('data:application/pdf;base64,')) {
    const decoded = decodeBase64DataUrlToBytes(book.pdfDataUrl);
    if (decoded && decoded.length > 0) {
      memoryCache.set(book.id, decoded);
      return decoded;
    }
  }

  // 3. Check if pdfDataUrl is a fetchable URL
  if (book.pdfDataUrl && (book.pdfDataUrl.startsWith('blob:') || book.pdfDataUrl.startsWith('http'))) {
    try {
      const res = await fetch(book.pdfDataUrl);
      if (res.ok) {
        const buf = await res.arrayBuffer();
        const uint8 = new Uint8Array(buf);
        if (uint8.length > 0) {
          memoryCache.set(book.id, uint8);
          return uint8;
        }
      }
    } catch (e) {
      // Stale blob URL or network failure
    }
  }

  return null;
}

export async function getPdfBlobUrl(bookId: string): Promise<string | null> {
  if (blobUrlCache.has(bookId)) {
    return blobUrlCache.get(bookId)!;
  }

  const uint8 = await getPdfFromStorage(bookId);
  if (uint8) {
    const blob = new Blob([uint8], { type: 'application/pdf' });
    const blobUrl = URL.createObjectURL(blob);
    blobUrlCache.set(bookId, blobUrl);
    return blobUrl;
  }

  return null;
}

export async function deletePdfFromStorage(bookId: string): Promise<void> {
  memoryCache.delete(bookId);
  if (blobUrlCache.has(bookId)) {
    URL.revokeObjectURL(blobUrlCache.get(bookId)!);
    blobUrlCache.delete(bookId);
  }

  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.delete(bookId);
  } catch (err) {
    console.warn('IndexedDB delete fallback:', err);
  }

  try {
    await fetch(`/api/pdf/${encodeURIComponent(bookId)}`, { method: 'DELETE' });
  } catch (err) {
    // Ignore network error
  }
}

/**
 * Generates a crisp, self-contained editorial book cover as an SVG Data URL.
 * Guarantees full book cover visibility with zero external network dependencies.
 */
export function createBookCoverDataUrl(options: {
  title: string;
  author: string;
  subtitle?: string;
  bgHex?: string;
  accentHex?: string;
  textHex?: string;
}): string {
  const bg = options.bgHex || '#1C1B19';
  const accent = options.accentHex || '#D6D1C4';
  const text = options.textHex || '#F5F4EF';
  const subtitle = options.subtitle || 'EDITION';

  const escapeXml = (s: string) =>
    s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');

  // Split title into up to 3 balanced lines
  const words = options.title.trim().split(/\s+/);
  const lines: string[] = [];
  let current = '';
  for (const w of words) {
    if ((current + ' ' + w).trim().length <= 16 || !current) {
      current = current ? `${current} ${w}` : w;
    } else {
      lines.push(current);
      current = w;
    }
  }
  if (current) lines.push(current);
  const titleLines = lines.slice(0, 3);

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 480" width="360" height="480">
    <rect width="360" height="480" fill="${bg}" rx="4" />
    <rect x="18" y="18" width="324" height="444" fill="none" stroke="${accent}" stroke-width="1" stroke-opacity="0.35" />
    <rect x="26" y="26" width="308" height="428" fill="none" stroke="${accent}" stroke-width="0.5" stroke-opacity="0.2" />
    <line x1="44" y1="78" x2="316" y2="78" stroke="${accent}" stroke-width="0.75" stroke-opacity="0.3" />
    <text x="180" y="60" text-anchor="middle" fill="${accent}" font-family="Georgia, serif" font-size="10" letter-spacing="3" opacity="0.85">${escapeXml(subtitle.toUpperCase())}</text>
    ${titleLines
      .map(
        (line, idx) =>
          `<text x="180" y="${165 + idx * 36}" text-anchor="middle" fill="${text}" font-family="Georgia, 'Times New Roman', serif" font-weight="bold" font-size="26">${escapeXml(line)}</text>`
      )
      .join('')}
    <circle cx="180" cy="310" r="28" fill="none" stroke="${accent}" stroke-width="1" stroke-opacity="0.45" />
    <circle cx="180" cy="310" r="14" fill="none" stroke="${accent}" stroke-width="0.75" stroke-opacity="0.35" />
    <line x1="130" y1="310" x2="230" y2="310" stroke="${accent}" stroke-width="0.75" stroke-opacity="0.35" />
    <line x1="44" y1="396" x2="316" y2="396" stroke="${accent}" stroke-width="0.75" stroke-opacity="0.3" />
    <text x="180" y="428" text-anchor="middle" fill="${accent}" font-family="system-ui, -apple-system, sans-serif" font-size="13" font-weight="500" letter-spacing="1.5">${escapeXml(options.author.toUpperCase())}</text>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
