import React, { useState, useRef } from 'react';
import { Upload, X, FileText, CheckCircle2, AlertCircle, BookOpen, Layers } from 'lucide-react';
import { Book, PdfReadingMode } from '../types';
import { pdfjsLib } from '../utils/pdfSetup';
import { savePdfToStorage } from '../utils/pdfStorage';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBookUploaded: (newBook: Book) => void;
}

export const UploadModal: React.FC<UploadModalProps> = ({
  isOpen,
  onClose,
  onBookUploaded,
}) => {
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [readingMode, setReadingMode] = useState<PdfReadingMode>('reflow-ereader');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileSelect = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      setError('Please select a valid .pdf document');
      return;
    }

    setError(null);
    setSelectedFile(file);

    // Auto-generate title from filename
    const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
    setTitle(cleanName.replace(/\b\w/g, (l) => l.toUpperCase()));
    setAuthor('Uploaded Document');
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    setIsProcessing(true);
    setError(null);
    setProcessingStatus('Reading document...');

    try {
      const bookId = `local-pdf-${Date.now()}`;
      // Read file into ArrayBuffer and make safe copy
      const rawBuffer = await selectedFile.arrayBuffer();
      const uint8 = new Uint8Array(rawBuffer);

      // Save raw binary to IndexedDB & get session blob URL
      const blobUrl = await savePdfToStorage(bookId, uint8);

      let totalPages = 1;
      let extractedPages: string[] = [];
      let coverThumbnail: string | null = null;

      try {
        setProcessingStatus('Parsing PDF structure & pages...');
        const loadingTask = pdfjsLib.getDocument({ data: uint8.slice() });
        const pdfDoc = await loadingTask.promise;
        totalPages = pdfDoc.numPages || 1;

        // Try generating a real thumbnail of page 1 for the book cover
        try {
          const page1 = await pdfDoc.getPage(1);
          const viewport = page1.getViewport({ scale: 0.5 });
          const canvas = document.createElement('canvas');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            await page1.render({
              canvasContext: ctx,
              viewport: viewport,
              canvas: canvas,
            } as any).promise;
            coverThumbnail = canvas.toDataURL('image/jpeg', 0.85);
          }
        } catch (thumbErr) {
          console.warn('Thumbnail generation notice:', thumbErr);
        }

        // Extract text across pages (up to 100 pages)
        setProcessingStatus('Extracting content for Reflow Reader...');
        const pagesToExtract = Math.min(totalPages, 100);
        for (let i = 1; i <= pagesToExtract; i++) {
          try {
            const page = await pdfDoc.getPage(i);
            const textContent = await page.getTextContent();
            
            let lastY: number | null = null;
            let pageText = '';

            textContent.items.forEach((item: any) => {
              if (lastY !== null && Math.abs(item.transform[5] - lastY) > 12) {
                pageText += '\n\n';
              } else if (pageText.length > 0 && !pageText.endsWith(' ') && !pageText.endsWith('\n')) {
                pageText += ' ';
              }
              pageText += item.str;
              lastY = item.transform[5];
            });

            const cleanText = pageText.trim();
            if (cleanText.length > 0) {
              extractedPages.push(cleanText);
            } else {
              extractedPages.push(
                `[Page ${i} of ${selectedFile.name} — Scanned / Diagram Layout]\n\nThis page contains images or visual layout. You can also switch to "Original PDF" mode using the top header button to see the exact graphic layout.`
              );
            }
          } catch (pageErr) {
            extractedPages.push(`[Page ${i} content]`);
          }
        }
      } catch (pdfErr) {
        console.warn('PDF parse fallback notice:', pdfErr);
        totalPages = 1;
        extractedPages = [
          `Document: ${title}\n\nPDF document loaded into your reader. Switch between "Reflow Mode" and "Original PDF" using the switcher in the top bar.`,
        ];
      }

      const defaultCover =
        'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=400&q=80';

      const newBook: Book = {
        id: bookId,
        title: title.trim() || selectedFile.name.replace(/\.[^/.]+$/, ''),
        author: author.trim() || 'Uploaded Document',
        coverUrl: coverThumbnail || defaultCover,
        source: 'local',
        format: 'pdf',
        totalPages: totalPages || 1,
        currentPage: 1,
        progressPercent: 0,
        fileSize: `${(selectedFile.size / (1024 * 1024)).toFixed(1)} MB`,
        addedDate: new Date().toISOString().split('T')[0],
        totalTimeReadMinutes: 0,
        pdfDataUrl: blobUrl,
        contentPages: extractedPages.length > 0 ? extractedPages : undefined,
        preferredReadingMode: readingMode,
        bookmarks: [],
        highlights: [],
      };

      onBookUploaded(newBook);
      onClose();
      // Reset state
      setSelectedFile(null);
      setTitle('');
      setAuthor('');
    } catch (err: any) {
      console.error('PDF upload error:', err);
      setError(`Failed to process PDF: ${err.message || 'Unknown error'}`);
    } finally {
      setIsProcessing(false);
      setProcessingStatus('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in font-sans">
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-stone-200 overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 bg-stone-50 border-b border-stone-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center">
              <Upload size={18} />
            </div>
            <div>
              <h3 className="font-bold text-stone-900 text-base">PDF Document Upload</h3>
              <p className="text-xs text-stone-500">Add PDFs to your library with dual-mode reading</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          
          {error && (
            <div className="p-3 bg-stone-100 border border-stone-300 rounded-xl flex items-center gap-2 text-xs text-black">
              <AlertCircle size={15} className="flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Drag and Drop Zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all duration-200 ${
              dragOver
                ? 'border-black bg-stone-100'
                : selectedFile
                ? 'border-black bg-stone-50'
                : 'border-stone-300 hover:border-black bg-stone-50/50'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,application/pdf"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleFileSelect(e.target.files[0]);
                }
              }}
            />

            {selectedFile ? (
              <div className="flex items-center justify-center gap-3 text-stone-800">
                <FileText size={28} className="text-black shrink-0" />
                <div className="text-left min-w-0 flex-1">
                  <div className="font-semibold text-xs truncate text-black">{selectedFile.name}</div>
                  <div className="text-[11px] text-stone-500">{(selectedFile.size / (1024 * 1024)).toFixed(2)} MB · Ready to parse</div>
                </div>
                <CheckCircle2 size={20} className="text-black shrink-0" />
              </div>
            ) : (
              <div className="space-y-1.5 py-2">
                <div className="w-10 h-10 rounded-full bg-stone-100 text-black flex items-center justify-center mx-auto mb-1">
                  <Upload size={18} />
                </div>
                <div className="text-xs text-stone-800 font-medium">
                  <span className="font-bold text-black">Click to upload PDF</span> or drag and drop here
                </div>
                <div className="text-[11px] text-stone-400">Standard PDF documents supported</div>
              </div>
            )}
          </div>

          {/* Reading Mode Selection */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-stone-800">
              Preferred Reading Mode:
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              {/* Option 1: Reflow Reader Mode */}
              <button
                type="button"
                onClick={() => setReadingMode('reflow-ereader')}
                className={`p-3 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
                  readingMode === 'reflow-ereader'
                    ? 'border-black bg-stone-100 ring-2 ring-black/10 text-black font-semibold'
                    : 'border-stone-200 bg-white hover:bg-stone-50 text-stone-700'
                }`}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <BookOpen size={15} className={readingMode === 'reflow-ereader' ? 'text-black' : 'text-stone-500'} />
                  <span className="font-bold text-xs">1. Reflow Mode</span>
                </div>
                <p className="text-[10px] text-stone-500 leading-tight">
                  Reflows text with customizable typography, fonts, themes, and eye protection warmth.
                </p>
              </button>

              {/* Option 2: Original PDF exact layout */}
              <button
                type="button"
                onClick={() => setReadingMode('original-pdf')}
                className={`p-3 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
                  readingMode === 'original-pdf'
                    ? 'border-black bg-stone-100 ring-2 ring-black/10 text-black font-semibold'
                    : 'border-stone-200 bg-white hover:bg-stone-50 text-stone-700'
                }`}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <Layers size={15} className={readingMode === 'original-pdf' ? 'text-black' : 'text-stone-500'} />
                  <span className="font-bold text-xs">2. Original PDF</span>
                </div>
                <p className="text-[10px] text-stone-500 leading-tight">
                  Preserves the exact original layout, diagrams, figures, and page proportions.
                </p>
              </button>
            </div>
          </div>

          {/* Title & Author Inputs */}
          {selectedFile && (
            <div className="space-y-2.5 pt-1">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Document Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg focus:outline-none focus:border-black"
                  placeholder="e.g. Political Philosophy of Peace"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Author / Source</label>
                <input
                  type="text"
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg focus:outline-none focus:border-black"
                  placeholder="e.g. John Hume"
                />
              </div>
            </div>
          )}

          {/* Footer Buttons */}
          <div className="flex items-center justify-between pt-3 border-t border-stone-100">
            <span className="text-[11px] text-stone-400">
              {processingStatus || 'Ready to upload & read'}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-stone-600 hover:text-black rounded-lg hover:bg-stone-100 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!selectedFile || isProcessing}
                className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                  !selectedFile || isProcessing
                    ? 'bg-stone-200 text-stone-400 cursor-not-allowed'
                    : 'bg-black hover:bg-stone-800 text-white shadow-md'
                }`}
              >
                {isProcessing ? 'Processing PDF...' : 'Add & Open in Reader'}
              </button>
            </div>
          </div>

        </form>

      </div>
    </div>
  );
};
