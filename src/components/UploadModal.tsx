import React, { useState, useRef } from 'react';
import { X } from 'lucide-react';
import { Book } from '../types';
import { pdfjsLib } from '../utils/pdfSetup';
import { savePdfToStorage, createBookCoverDataUrl } from '../utils/pdfStorage';

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
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileSelect = (file: File) => {
    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      setError('Please select a valid .pdf document.');
      return;
    }

    setError(null);
    setSelectedFile(file);

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

    try {
      const bookId = `local-pdf-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const rawBuffer = await selectedFile.arrayBuffer();
      const uint8 = new Uint8Array(rawBuffer);

      const blobUrl = await savePdfToStorage(bookId, uint8);

      let totalPages = 1;
      let coverThumbnail: string | null = null;

      try {
        const loadingTask = pdfjsLib.getDocument({ data: uint8.slice() });
        const pdfDoc = await loadingTask.promise;
        totalPages = pdfDoc.numPages || 1;

        try {
          const page1 = await pdfDoc.getPage(1);
          const baseViewport = page1.getViewport({ scale: 1 });
          const targetWidth = 280;
          const scale = Math.min(0.55, targetWidth / Math.max(1, baseViewport.width));
          const viewport = page1.getViewport({ scale });
          const canvas = document.createElement('canvas');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            await page1.render({
              canvasContext: ctx,
              viewport,
              canvas,
            } as any).promise;
            const dataUrl = canvas.toDataURL('image/jpeg', 0.72);
            if (dataUrl.length < 300000) {
              coverThumbnail = dataUrl;
            }
          }
        } catch {
          // Fallback to generated cover below
        }
      } catch {
        totalPages = 1;
      }

      const finalTitle = title.trim() || selectedFile.name.replace(/\.[^/.]+$/, '');
      const finalAuthor = author.trim() || 'Uploaded Document';

      const fallbackCover = createBookCoverDataUrl({
        title: finalTitle,
        author: finalAuthor,
        subtitle: 'PDF Document',
        bgHex: '#18181b',
        accentHex: '#e4e4e7',
      });

      const newBook: Book = {
        id: bookId,
        title: finalTitle,
        author: finalAuthor,
        coverUrl: coverThumbnail || fallbackCover,
        source: 'local',
        format: 'pdf',
        totalPages: totalPages || 1,
        currentPage: 1,
        progressPercent: 0,
        fileSize: `${Math.max(0.1, selectedFile.size / (1024 * 1024)).toFixed(1)} MB`,
        addedDate: new Date().toISOString().split('T')[0],
        totalTimeReadMinutes: 0,
        pdfDataUrl: blobUrl,
        preferredReadingMode: 'reflow-ereader',
        bookmarks: [],
        highlights: [],
      };

      onBookUploaded(newBook);
      onClose();
      setSelectedFile(null);
      setTitle('');
      setAuthor('');
    } catch (err: any) {
      setError(`Failed to process PDF: ${err.message || 'Unknown error'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs font-sans">
      <div className="relative w-full max-w-md bg-[#E2E0DA] text-[#2B2A27] rounded-xl shadow-2xl border border-[#5A5852] overflow-hidden">
        {/* Header */}
        <div className="px-5 py-3.5 bg-[#DBD9D3] border-b border-[#B8B6AF] flex items-center justify-between">
          <h3 className="font-semibold text-[#2B2A27] text-sm">Upload PDF</h3>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-[#575550] hover:text-[#2B2A27] hover:bg-[#D2D0C9] transition cursor-pointer"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-2.5 bg-[#E5D5D5] border border-[#9E6B6B] rounded-lg text-xs text-[#5C2626]">
              {error}
            </div>
          )}

          {/* Drag and Drop Zone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border border-dashed rounded-xl p-5 text-center cursor-pointer transition-colors ${
              dragOver
                ? 'border-[#2B2A27] bg-[#D2D0C9]'
                : selectedFile
                ? 'border-[#2B2A27] bg-[#DBD9D3]'
                : 'border-[#6E6C66] hover:border-[#2B2A27] bg-[#DBD9D3]/70'
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
              <div className="text-left">
                <div className="font-medium text-xs truncate text-[#2B2A27]">{selectedFile.name}</div>
                <div className="text-[11px] text-[#575550] mt-0.5">
                  {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                </div>
              </div>
            ) : (
              <div className="py-2">
                <div className="text-xs text-[#2B2A27] font-medium">
                  Select a PDF file or drag and drop here
                </div>
              </div>
            )}
          </div>

          {/* Title & Author Inputs */}
          {selectedFile && (
            <div className="space-y-2.5">
              <div>
                <label className="block text-[11px] font-medium text-[#2B2A27] mb-1">Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  className="w-full px-3 py-1.5 text-xs bg-[#DBD9D3] border border-[#6E6C66] rounded-lg text-[#2B2A27] focus:outline-none focus:border-[#2B2A27]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-[#2B2A27] mb-1">Author</label>
                <input
                  type="text"
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-[#DBD9D3] border border-[#6E6C66] rounded-lg text-[#2B2A27] focus:outline-none focus:border-[#2B2A27]"
                />
              </div>
            </div>
          )}

          {/* Footer Buttons */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#B8B6AF]">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs font-medium text-[#575550] hover:text-[#2B2A27] rounded-lg hover:bg-[#D2D0C9] transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!selectedFile || isProcessing}
              className={`px-4 py-1.5 text-xs font-medium rounded-lg transition cursor-pointer ${
                !selectedFile || isProcessing
                  ? 'bg-[#C8C6BE] text-[#7A7872] cursor-not-allowed'
                  : 'bg-[#383633] hover:bg-[#2B2A27] text-[#EAE8E2]'
              }`}
            >
              {isProcessing ? 'Processing...' : 'Open Book'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
