import express from 'express';
import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, '.data');
const PDF_DIR = path.join(DATA_DIR, 'pdfs');

const LEGACY_DEFAULT_STACK_IDS = new Set([
  'stack-reading',
  'stack-favorites',
  'stack-research',
  'stack-toread',
]);

// High-concurrency in-memory LRU cache for user state & hot PDF buffers
const MAX_STATE_CACHE_ENTRIES = 2000;
const stateCache = new Map<string, any>();
const pendingStateWrites = new Map<string, { payload: any; timer: NodeJS.Timeout }>();

const MAX_PDF_CACHE_BYTES = 64 * 1024 * 1024; // 64 MB RAM cache for fast concurrent PDF delivery
let currentPdfCacheBytes = 0;
const pdfBufferCache = new Map<string, Buffer>();

function setCachedState(uid: string, data: any) {
  if (stateCache.has(uid)) {
    stateCache.delete(uid);
  } else if (stateCache.size >= MAX_STATE_CACHE_ENTRIES) {
    const oldestKey = stateCache.keys().next().value;
    if (oldestKey) stateCache.delete(oldestKey);
  }
  stateCache.set(uid, data);
}

function setCachedPdf(bookId: string, buffer: Buffer) {
  if (buffer.length > 8 * 1024 * 1024) return; // Only cache PDFs <= 8MB in RAM
  if (pdfBufferCache.has(bookId)) {
    const prev = pdfBufferCache.get(bookId)!;
    currentPdfCacheBytes -= prev.length;
    pdfBufferCache.delete(bookId);
  }
  while (
    currentPdfCacheBytes + buffer.length > MAX_PDF_CACHE_BYTES &&
    pdfBufferCache.size > 0
  ) {
    const oldestKey = pdfBufferCache.keys().next().value;
    if (!oldestKey) break;
    const oldBuf = pdfBufferCache.get(oldestKey)!;
    currentPdfCacheBytes -= oldBuf.length;
    pdfBufferCache.delete(oldestKey);
  }
  pdfBufferCache.set(bookId, buffer);
  currentPdfCacheBytes += buffer.length;
}

function sanitizeUserState(data: any) {
  if (!data || typeof data !== 'object') return null;
  if (Array.isArray(data.books)) {
    data.books = data.books.filter(
      (b: any) => b && b.id && !String(b.id).startsWith('book-')
    );
  }
  if (Array.isArray(data.stacks)) {
    data.stacks = data.stacks.filter(
      (s: any) => s && s.id && !LEGACY_DEFAULT_STACK_IDS.has(String(s.id))
    );
  }
  return data;
}

async function ensureDirectoriesAsync() {
  try {
    await fsp.mkdir(DATA_DIR, { recursive: true });
    await fsp.mkdir(PDF_DIR, { recursive: true });
  } catch (err) {
    console.warn('Directory initialization notice:', err);
  }
}

// Coalesced non-blocking atomic disk write per user
function scheduleStateFlush(safeUid: string, payload: any) {
  const existing = pendingStateWrites.get(safeUid);
  if (existing) {
    clearTimeout(existing.timer);
  }

  const timer = setTimeout(async () => {
    pendingStateWrites.delete(safeUid);
    const userStateFile = path.join(DATA_DIR, `reader_state_${safeUid}.json`);
    const tempFile = `${userStateFile}.tmp`;
    try {
      await ensureDirectoriesAsync();
      await fsp.writeFile(tempFile, JSON.stringify(payload), 'utf-8');
      await fsp.rename(tempFile, userStateFile);
    } catch (err) {
      try {
        await fsp.writeFile(userStateFile, JSON.stringify(payload), 'utf-8');
      } catch {}
    }
  }, 300);

  pendingStateWrites.set(safeUid, { payload, timer });
}

// Prevent unexpected exceptions from bringing down the server under heavy load
process.on('uncaughtException', (err) => {
  console.error('Uncaught exception handled safely:', err);
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection handled safely:', reason);
});

async function startServer() {
  await ensureDirectoriesAsync();

  const app = express();
  const PORT = 3000;

  app.disable('x-powered-by');
  app.use(express.json({ limit: '50mb' }));
  app.use(express.raw({ type: 'application/pdf', limit: '50mb' }));

  // Health check endpoint
  app.get('/api/health', (_req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.json({ status: 'ok', uptime: Math.round(process.uptime()) });
  });

  // Load persisted application state per user (served from RAM cache when warm)
  app.get('/api/state', async (req, res) => {
    try {
      const rawUid = typeof req.query.uid === 'string' ? req.query.uid : 'default';
      const safeUid = rawUid.replace(/[^a-zA-Z0-9_-]/g, '') || 'default';

      res.setHeader('Cache-Control', 'no-store');

      if (stateCache.has(safeUid)) {
        res.json({ state: stateCache.get(safeUid) });
        return;
      }

      const userStateFile = path.join(DATA_DIR, `reader_state_${safeUid}.json`);
      const raw = await fsp.readFile(userStateFile, 'utf-8');
      const parsed = sanitizeUserState(JSON.parse(raw));
      setCachedState(safeUid, parsed);
      res.json({ state: parsed });
      return;
    } catch {
      res.json({ state: null });
    }
  });

  // Save application state per user (non-blocking memory update + coalesced disk flush)
  app.post('/api/state', (req, res) => {
    try {
      const rawUid = typeof req.query.uid === 'string' ? req.query.uid : 'default';
      const safeUid = rawUid.replace(/[^a-zA-Z0-9_-]/g, '') || 'default';
      const payload = sanitizeUserState(req.body);
      if (payload && typeof payload === 'object') {
        setCachedState(safeUid, payload);
        scheduleStateFlush(safeUid, payload);
      }
      res.json({ ok: true });
    } catch {
      res.status(500).json({ ok: false });
    }
  });

  // Retrieve raw PDF binary by bookId
  app.get('/api/pdf/:bookId', async (req, res) => {
    try {
      const safeId = req.params.bookId.replace(/[^a-zA-Z0-9_-]/g, '');
      if (!safeId) {
        res.status(400).json({ error: 'Invalid book ID' });
        return;
      }

      if (pdfBufferCache.has(safeId)) {
        const cachedBuf = pdfBufferCache.get(safeId)!;
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Length', String(cachedBuf.length));
        res.setHeader('Cache-Control', 'private, max-age=86400');
        res.end(cachedBuf);
        return;
      }

      const filePath = path.join(PDF_DIR, `${safeId}.pdf`);
      const stat = await fsp.stat(filePath);
      if (stat.isFile()) {
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Length', String(stat.size));
        res.setHeader('Cache-Control', 'private, max-age=86400');

        if (stat.size <= 8 * 1024 * 1024) {
          const buf = await fsp.readFile(filePath);
          setCachedPdf(safeId, buf);
          res.end(buf);
          return;
        }

        const stream = fs.createReadStream(filePath);
        stream.on('error', () => {
          if (!res.headersSent) {
            res.status(404).end();
          } else {
            res.end();
          }
        });
        stream.pipe(res);
        return;
      }
    } catch {
      // File not found
    }
    res.status(404).json({ error: 'PDF not found' });
  });

  // Store raw PDF binary by bookId
  app.post('/api/pdf/:bookId', async (req, res) => {
    try {
      const safeId = req.params.bookId.replace(/[^a-zA-Z0-9_-]/g, '');
      if (!safeId || !Buffer.isBuffer(req.body) || req.body.length === 0) {
        res.status(400).json({ error: 'Invalid PDF binary payload' });
        return;
      }

      const pdfBuf: Buffer = req.body;
      setCachedPdf(safeId, pdfBuf);

      await ensureDirectoriesAsync();
      const filePath = path.join(PDF_DIR, `${safeId}.pdf`);
      await fsp.writeFile(filePath, pdfBuf);
      res.json({ ok: true, size: pdfBuf.length });
    } catch (err) {
      console.warn('Error saving PDF file:', err);
      res.status(500).json({ error: 'Failed to save PDF' });
    }
  });

  // Delete PDF binary by bookId
  app.delete('/api/pdf/:bookId', async (req, res) => {
    try {
      const safeId = req.params.bookId.replace(/[^a-zA-Z0-9_-]/g, '');
      if (pdfBufferCache.has(safeId)) {
        const prev = pdfBufferCache.get(safeId)!;
        currentPdfCacheBytes -= prev.length;
        pdfBufferCache.delete(safeId);
      }
      const filePath = path.join(PDF_DIR, `${safeId}.pdf`);
      await fsp.unlink(filePath).catch(() => {});
      res.json({ ok: true });
    } catch {
      res.status(500).json({ ok: false });
    }
  });

  // Mount Vite in development or serve static build in production
  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false, watch: null },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(
      express.static(distPath, {
        maxAge: '1d',
        etag: true,
      })
    );
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Global Express error handler so no route error ever crashes the process
  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.warn('Request error handled:', err?.message || err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
