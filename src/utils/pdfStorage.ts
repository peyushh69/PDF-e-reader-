// Robust IndexedDB storage for uploaded PDF binary files
const DB_NAME = 'ereader_pdf_storage_db';
const STORE_NAME = 'pdf_files';
const DB_VERSION = 1;

// In-memory cache for fast session access
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

  // Create persistent blob URL for this session
  if (blobUrlCache.has(bookId)) {
    URL.revokeObjectURL(blobUrlCache.get(bookId)!);
  }
  const blob = new Blob([uint8], { type: 'application/pdf' });
  const blobUrl = URL.createObjectURL(blob);
  blobUrlCache.set(bookId, blobUrl);

  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      // Store as ArrayBuffer for compatibility
      const req = store.put(uint8.buffer.slice(uint8.byteOffset, uint8.byteOffset + uint8.byteLength), bookId);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('IndexedDB save fallback (in-memory only):', err);
  }

  return blobUrl;
}

export async function getPdfFromStorage(bookId: string): Promise<Uint8Array | null> {
  if (memoryCache.has(bookId)) {
    return memoryCache.get(bookId)!;
  }

  try {
    const db = await openDB();
    return new Promise<Uint8Array | null>((resolve) => {
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
  } catch (err) {
    console.warn('IndexedDB read fallback:', err);
    return null;
  }
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
}
