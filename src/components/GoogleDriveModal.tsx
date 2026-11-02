import React, { useState, useRef } from 'react';
import { X } from 'lucide-react';
import { Book } from '../types';
import { pdfjsLib } from '../utils/pdfSetup';
import { savePdfToStorage, createBookCoverDataUrl } from '../utils/pdfStorage';

interface GoogleDriveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportDriveBook: (book: Book) => void;
}

export const GoogleDriveModal: React.FC<GoogleDriveModalProps> = ({
  isOpen,
  onClose,
  onImportDriveBook,
}) => {
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleDriveFileSelect = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      setError('Please select a valid .pdf document.');
      return;
    }

    setIsImporting(true);
    setError(null);

    try {
      const bookId = `drive-pdf-${Date.now()}`;
      const rawBuffer = await file.arrayBuffer();
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
          const viewport = page1.getViewport({ scale: 0.55 });
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
            coverThumbnail = canvas.toDataURL('image/jpeg', 0.85);
          }
        } catch {
          // Fallback cover below
        }
      } catch {
        totalPages = 1;
      }

      const cleanTitle = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
      const finalTitle = cleanTitle.replace(/\b\w/g, (l) => l.toUpperCase());

      const fallbackCover = createBookCoverDataUrl({
        title: finalTitle,
        author: 'Google Drive',
        subtitle: 'Cloud PDF',
        bgHex: '#383633',
        accentHex: '#DBD9D3',
      });

      const newBook: Book = {
        id: bookId,
        title: finalTitle,
        author: 'Google Drive Document',
        coverUrl: coverThumbnail || fallbackCover,
        source: 'drive',
        format: 'pdf',
        totalPages: totalPages || 1,
        currentPage: 1,
        progressPercent: 0,
        fileSize: `${Math.max(0.1, file.size / (1024 * 1024)).toFixed(1)} MB`,
        addedDate: new Date().toISOString().split('T')[0],
        totalTimeReadMinutes: 0,
        pdfDataUrl: blobUrl,
        preferredReadingMode: 'reflow-ereader',
        stackIds: [],
        bookmarks: [],
        highlights: [],
      };

      onImportDriveBook(newBook);
      onClose();
    } catch (err: any) {
      setError(`Failed to import PDF: ${err.message || 'Unknown error'}`);
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs font-sans">
      <div className="relative w-full max-w-md bg-[#E2E0DA] text-[#2B2A27] rounded-xl shadow-2xl border border-[#5A5852] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-5 py-3.5 bg-[#DBD9D3] border-b border-[#B8B6AF] flex items-center justify-between">
          <h3 className="font-semibold text-[#2B2A27] text-sm">Google Drive</h3>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-[#575550] hover:text-[#2B2A27] hover:bg-[#D2D0C9] transition cursor-pointer"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4">
          {error && (
            <div className="p-2.5 bg-[#E5D5D5] border border-[#9E6B6B] rounded-lg text-xs text-[#5C2626]">
              {error}
            </div>
          )}

          <div
            onClick={() => fileInputRef.current?.click()}
            className="border border-dashed border-[#6E6C66] hover:border-[#2B2A27] bg-[#DBD9D3] hover:bg-[#D2D0C9] rounded-xl p-6 text-center cursor-pointer transition"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,application/pdf"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleDriveFileSelect(e.target.files[0]);
                }
              }}
            />
            <div className="text-xs font-medium text-[#2B2A27]">
              {isImporting ? 'Importing PDF...' : 'Select PDF from Google Drive folder'}
            </div>
            <p className="text-[11px] text-[#575550] mt-1">
              Import PDF documents into your Drive collection
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-[#DBD9D3] border-t border-[#B8B6AF] flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-medium bg-[#383633] text-[#EAE8E2] hover:bg-[#2B2A27] rounded-lg transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
