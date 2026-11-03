import { Book } from '../types';
import {
  db as firestoreDb,
  auth,
  isFirebaseReady,
  doc,
  setDoc,
  deleteDoc,
  collection,
  getDocs,
} from '../firebase';

// Multi-tier PDF storage: In-Memory + IndexedDB + Firestore Cloud Chunks + Backend Disk Storage
const DB_NAME = 'ereader_pdf_storage_db';
const STORE_NAME = 'pdf_files';
const DB_VERSION = 1;

const CHUNK_CHAR_SIZE = 600000; // ~450 KB binary per Firestore document (well below 1 MiB limit)
const MAX_CLOUD_CHUNKS = 80; // Supports PDFs up to ~36 MB across devices

const memoryCache = new Map<string, Uint8Array>();
const blobUrlCache = new Map<string, string>();
const inFlightCloudUploads = new Set<string>();

export function isValidPdfBytes(bytes: Uint8Array | null | undefined): bytes is Uint8Array {
  if (!bytes || bytes.length < 8) return false;
  // Standard PDF header "%PDF-" can appear anywhere in the first 1024 bytes
  const limit = Math.min(bytes.length - 4, 1024);
  for (let i = 0; i <= limit; i++) {
    if (
      bytes[i] === 0x25 && // %
      bytes[i + 1] === 0x50 && // P
      bytes[i + 2] === 0x44 && // D
      bytes[i + 3] === 0x46 // F
    ) {
      return true;
    }
  }
  return false;
}

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

async function saveToIndexedDB(bookId: string, uint8: Uint8Array): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const bufferCopy = uint8.buffer.slice(uint8.byteOffset, uint8.byteOffset + uint8.byteLength);
      store.put(bufferCopy, bookId);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('IndexedDB save fallback:', err);
  }
}

export function encodeBytesToBase64(bytes: Uint8Array): string {
  const chunkSize = 0x8000;
  const parts: string[] = [];
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const sub = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
    parts.push(String.fromCharCode.apply(null, Array.from(sub)));
  }
  return btoa(parts.join(''));
}

export function decodeBase64ToBytes(base64: string): Uint8Array | null {
  try {
    const clean = base64.trim();
    const binaryString = atob(clean);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i) & 0xff;
    }
    return bytes;
  } catch (err) {
    console.warn('Failed to decode base64 PDF payload:', err);
    return null;
  }
}

export function decodeBase64DataUrlToBytes(dataUrl: string): Uint8Array | null {
  const base64Marker = 'base64,';
  const idx = dataUrl.indexOf(base64Marker);
  if (idx === -1) return null;
  return decodeBase64ToBytes(dataUrl.slice(idx + base64Marker.length));
}

export async function uploadPdfChunksToCloud(
  bookId: string,
  uint8: Uint8Array,
  explicitUid?: string
): Promise<boolean> {
  const uid = explicitUid || auth?.currentUser?.uid;
  if (!uid || uid === 'local-reader-profile' || !isFirebaseReady || !firestoreDb) {
    return false;
  }
  if (!isValidPdfBytes(uint8)) return false;

  const uploadKey = `${uid}:${bookId}`;
  if (inFlightCloudUploads.has(uploadKey)) {
    return false;
  }
  inFlightCloudUploads.add(uploadKey);

  try {
    const base64 = encodeBytesToBase64(uint8);
    const totalChunks = Math.ceil(base64.length / CHUNK_CHAR_SIZE);
    if (totalChunks === 0 || totalChunks > MAX_CLOUD_CHUNKS) {
      return false;
    }

    const batchConcurrency = 4;
    for (let i = 0; i < totalChunks; i += batchConcurrency) {
      const slicePromises: Promise<void>[] = [];
      for (let j = i; j < Math.min(i + batchConcurrency, totalChunks); j++) {
        const chunkData = base64.slice(j * CHUNK_CHAR_SIZE, (j + 1) * CHUNK_CHAR_SIZE);
        const chunkId = `chunk_${String(j).padStart(4, '0')}`;
        const chunkRef = doc(firestoreDb, 'users', uid, 'books', bookId, 'chunks', chunkId);
        slicePromises.push(
          setDoc(chunkRef, {
            uid,
            bookId,
            index: j,
            totalChunks,
            data: chunkData,
          })
        );
      }
      await Promise.all(slicePromises);
    }

    // Mark book document as having cloud binary available across devices
    try {
      await setDoc(
        doc(firestoreDb, 'users', uid, 'books', bookId),
        {
          hasCloudBinary: true,
          chunkCount: totalChunks,
        },
        { merge: true }
      );
    } catch {
      // Book doc might be written right after by syncBookToCloud
    }

    return true;
  } catch (err) {
    console.warn('Cloud PDF chunk upload notice:', err);
    return false;
  } finally {
    inFlightCloudUploads.delete(uploadKey);
  }
}

export async function downloadPdfChunksFromCloud(
  bookId: string,
  explicitUid?: string
): Promise<Uint8Array | null> {
  const uid = explicitUid || auth?.currentUser?.uid;
  if (!uid || uid === 'local-reader-profile' || !isFirebaseReady || !firestoreDb) {
    return null;
  }

  try {
    const chunksCol = collection(firestoreDb, 'users', uid, 'books', bookId, 'chunks');
    const snap = await getDocs(chunksCol);
    if (snap.empty) return null;

    const chunks: { index: number; data: string }[] = [];
    snap.forEach((docSnap) => {
      const d = docSnap.data();
      if (d && typeof d.index === 'number' && typeof d.data === 'string') {
        chunks.push({ index: d.index, data: d.data });
      }
    });

    if (chunks.length === 0) return null;
    chunks.sort((a, b) => a.index - b.index);

    const fullBase64 = chunks.map((c) => c.data).join('');
    const decoded = decodeBase64ToBytes(fullBase64);
    if (isValidPdfBytes(decoded)) {
      memoryCache.set(bookId, decoded);
      await saveToIndexedDB(bookId, decoded);
      return decoded;
    }
  } catch (err) {
    console.warn('Cloud PDF chunk download notice:', err);
  }

  return null;
}

export async function savePdfToStorage(
  bookId: string,
  data: ArrayBuffer | Uint8Array,
  explicitUid?: string
): Promise<string> {
  const uint8 = data instanceof Uint8Array ? new Uint8Array(data) : new Uint8Array(data);
  memoryCache.set(bookId, uint8);

  if (blobUrlCache.has(bookId)) {
    URL.revokeObjectURL(blobUrlCache.get(bookId)!);
  }
  const blob = new Blob([uint8], { type: 'application/pdf' });
  const blobUrl = URL.createObjectURL(blob);
  blobUrlCache.set(bookId, blobUrl);

  // 1. Save to local IndexedDB
  await saveToIndexedDB(bookId, uint8);

  // 2. Upload to Firestore Cloud Chunks in background (for cross-device sync across phone & laptop)
  uploadPdfChunksToCloud(bookId, uint8, explicitUid).catch(() => {});

  // 3. Save to Backend Server disk storage (when running in Node dev/server mode)
  try {
    await fetch(`/api/pdf/${encodeURIComponent(bookId)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/pdf' },
      body: uint8,
    });
  } catch {
    // Non-blocking on static hosts
  }

  return blobUrl;
}

export async function getPdfFromStorage(
  bookId: string,
  explicitUid?: string
): Promise<Uint8Array | null> {
  const mem = memoryCache.get(bookId);
  if (isValidPdfBytes(mem)) {
    return mem;
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
          const uint8 =
            req.result instanceof Uint8Array
              ? new Uint8Array(req.result)
              : new Uint8Array(req.result as ArrayBuffer);
          if (isValidPdfBytes(uint8)) {
            memoryCache.set(bookId, uint8);
            resolve(uint8);
            return;
          }
        }
        resolve(null);
      };

      req.onerror = () => resolve(null);
    });
    if (isValidPdfBytes(idbResult)) {
      return idbResult;
    }
  } catch (err) {
    console.warn('IndexedDB read fallback:', err);
  }

  // 2. Try Firestore Cloud Chunks (cross-device sync for signed-in Google users)
  const cloudBytes = await downloadPdfChunksFromCloud(bookId, explicitUid);
  if (isValidPdfBytes(cloudBytes)) {
    return cloudBytes;
  }

  // 3. Try Backend Server API (verify response is actually a PDF binary, not an HTML SPA fallback)
  try {
    const res = await fetch(`/api/pdf/${encodeURIComponent(bookId)}`);
    const contentType = res.headers.get('content-type') || '';
    if (res.ok && !contentType.includes('text/html')) {
      const buf = await res.arrayBuffer();
      const uint8 = new Uint8Array(buf);
      if (isValidPdfBytes(uint8)) {
        memoryCache.set(bookId, uint8);
        await saveToIndexedDB(bookId, uint8);
        return uint8;
      }
    }
  } catch {
    // Ignore network fallback error
  }

  return null;
}

/**
 * Resolves the raw Uint8Array bytes for any book (Uploaded, Sample, Cloud-Synced, or Google Drive).
 */
export async function resolveBookPdfBytes(book: Book): Promise<Uint8Array | null> {
  // 1. Check storage (Memory -> IndexedDB -> Firestore Cloud Chunks -> Backend Server)
  const stored = await getPdfFromStorage(book.id, book.uid);
  if (isValidPdfBytes(stored)) {
    return stored;
  }

  // 2. Check embedded base64 data URL (used by Sample & Drive books)
  if (book.pdfDataUrl && book.pdfDataUrl.startsWith('data:application/pdf;base64,')) {
    const decoded = decodeBase64DataUrlToBytes(book.pdfDataUrl);
    if (isValidPdfBytes(decoded)) {
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
        if (isValidPdfBytes(uint8)) {
          memoryCache.set(book.id, uint8);
          return uint8;
        }
      }
    } catch {
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

export async function deletePdfFromStorage(bookId: string, explicitUid?: string): Promise<void> {
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

  const uid = explicitUid || auth?.currentUser?.uid;
  if (uid && uid !== 'local-reader-profile' && isFirebaseReady && firestoreDb) {
    try {
      const chunksCol = collection(firestoreDb, 'users', uid, 'books', bookId, 'chunks');
      const snap = await getDocs(chunksCol);
      const deletes: Promise<void>[] = [];
      snap.forEach((d) => deletes.push(deleteDoc(d.ref)));
      await Promise.all(deletes);
    } catch {}
  }

  try {
    await fetch(`/api/pdf/${encodeURIComponent(bookId)}`, { method: 'DELETE' });
  } catch {
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
