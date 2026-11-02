import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, '.data');
const PDF_DIR = path.join(DATA_DIR, 'pdfs');
const STATE_FILE = path.join(DATA_DIR, 'reader_state.json');

function ensureDirectories() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(PDF_DIR)) {
      fs.mkdirSync(PDF_DIR, { recursive: true });
    }
  } catch (err) {
    console.warn('Directory initialization notice:', err);
  }
}

ensureDirectories();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));
  app.use(express.raw({ type: 'application/pdf', limit: '50mb' }));

  // Health check
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  // Load persisted application state (books, stacks, stats, settings)
  app.get('/api/state', (_req, res) => {
    try {
      if (fs.existsSync(STATE_FILE)) {
        const raw = fs.readFileSync(STATE_FILE, 'utf-8');
        const data = JSON.parse(raw);
        if (data && typeof data === 'object') {
          const defaultStackIds = new Set([
            'stack-reading',
            'stack-favorites',
            'stack-research',
            'stack-toread',
          ]);
          if (Array.isArray(data.books)) {
            data.books = data.books.filter(
              (b: any) => b && b.id && !String(b.id).startsWith('book-')
            );
          }
          if (Array.isArray(data.stacks)) {
            data.stacks = data.stacks.filter(
              (s: any) => s && s.id && !defaultStackIds.has(String(s.id))
            );
          }
        }
        res.json({ state: data });
        return;
      }
    } catch (err) {
      console.warn('Error reading state file:', err);
    }
    res.json({ state: null });
  });

  // Save application state
  app.post('/api/state', (req, res) => {
    try {
      ensureDirectories();
      const payload = req.body;
      if (payload && typeof payload === 'object') {
        fs.writeFileSync(STATE_FILE, JSON.stringify(payload), 'utf-8');
      }
      res.json({ ok: true });
    } catch (err) {
      console.warn('Error writing state file:', err);
      res.status(500).json({ ok: false });
    }
  });

  // Retrieve raw PDF binary by bookId
  app.get('/api/pdf/:bookId', (req, res) => {
    try {
      const safeId = req.params.bookId.replace(/[^a-zA-Z0-9_-]/g, '');
      const filePath = path.join(PDF_DIR, `${safeId}.pdf`);
      if (fs.existsSync(filePath)) {
        res.setHeader('Content-Type', 'application/pdf');
        const stream = fs.createReadStream(filePath);
        stream.pipe(res);
        return;
      }
    } catch (err) {
      console.warn('Error reading PDF file:', err);
    }
    res.status(404).json({ error: 'PDF not found' });
  });

  // Store raw PDF binary by bookId
  app.post('/api/pdf/:bookId', (req, res) => {
    try {
      ensureDirectories();
      const safeId = req.params.bookId.replace(/[^a-zA-Z0-9_-]/g, '');
      const filePath = path.join(PDF_DIR, `${safeId}.pdf`);
      if (Buffer.isBuffer(req.body) && req.body.length > 0) {
        fs.writeFileSync(filePath, req.body);
        res.json({ ok: true, size: req.body.length });
        return;
      }
      res.status(400).json({ error: 'Invalid PDF binary payload' });
    } catch (err) {
      console.warn('Error saving PDF file:', err);
      res.status(500).json({ error: 'Failed to save PDF' });
    }
  });

  // Delete PDF binary by bookId
  app.delete('/api/pdf/:bookId', (req, res) => {
    try {
      const safeId = req.params.bookId.replace(/[^a-zA-Z0-9_-]/g, '');
      const filePath = path.join(PDF_DIR, `${safeId}.pdf`);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ ok: false });
    }
  });

  // Mount Vite in development or serve static build in production
  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
