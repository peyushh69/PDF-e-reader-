import * as pdfjsLib from 'pdfjs-dist';
// @ts-ignore
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

const CDN_WORKER_URL = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

if (typeof window !== 'undefined') {
  try {
    pdfjsLib.GlobalWorkerOptions.workerSrc =
      pdfWorker ||
      new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();
  } catch (e) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = CDN_WORKER_URL;
  }
}

export async function loadPdfDocumentSafe(rawBytes: Uint8Array): Promise<any> {
  try {
    const task = pdfjsLib.getDocument({ data: rawBytes.slice() });
    return await task.promise;
  } catch (firstErr) {
    try {
      pdfjsLib.GlobalWorkerOptions.workerSrc = CDN_WORKER_URL;
      const retryTask = pdfjsLib.getDocument({ data: rawBytes.slice() });
      return await retryTask.promise;
    } catch {
      throw firstErr;
    }
  }
}

export { pdfjsLib };
