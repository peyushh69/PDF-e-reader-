import React, { useState } from 'react';
import {
  Trash2,
  X,
  Search,
  ExternalLink,
  Download,
  BookmarkCheck,
  Plus,
  FileEdit,
  Check,
} from 'lucide-react';
import { Book, Highlight } from '../types';
import { HIGHLIGHT_COLORS } from './AnnotationToolbar';
import { downloadBookNotesPdf } from '../utils/pdfGenerator';

interface NotesAndHighlightsModalProps {
  isOpen: boolean;
  onClose: () => void;
  book?: Book;
  bookTitle?: string;
  currentPage?: number;
  highlights?: Highlight[];
  onJumpToPage?: (page: number) => void;
  onDeleteHighlight: (highlightId: string) => void;
  onEditHighlight?: (highlight: Highlight) => void;
  onAddStandaloneNote?: (pageNumber: number, noteText: string) => void;
  onSaveNotesPdfToLibrary?: (book: Book) => Promise<void> | void;
}

export const NotesAndHighlightsModal: React.FC<NotesAndHighlightsModalProps> = ({
  isOpen,
  onClose,
  book,
  bookTitle,
  currentPage = 1,
  highlights: propHighlights,
  onJumpToPage,
  onDeleteHighlight,
  onEditHighlight,
  onAddStandaloneNote,
  onSaveNotesPdfToLibrary,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [colorFilter, setColorFilter] = useState<string>('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingNoteVal, setEditingNoteVal] = useState<string>('');
  const [newQuickNote, setNewQuickNote] = useState<string>('');
  const [newQuickNotePage, setNewQuickNotePage] = useState<string>(`${currentPage || 1}`);
  const [isSavingToLibrary, setIsSavingToLibrary] = useState<boolean>(false);
  const [savedLibrarySuccess, setSavedLibrarySuccess] = useState<boolean>(false);

  if (!isOpen) return null;

  const highlights = propHighlights || book?.highlights || [];
  const displayTitle = bookTitle || book?.title || 'Book';

  const filteredHighlights = highlights.filter((h) => {
    const matchesSearch =
      (h.text || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (h.note && h.note.toLowerCase().includes(searchQuery.toLowerCase())) ||
      `page ${h.pageNumber}`.includes(searchQuery.toLowerCase().trim());
    const matchesColor =
      colorFilter === 'all' || (h.color || '').toLowerCase() === colorFilter.toLowerCase();
    return matchesSearch && matchesColor;
  });

  // Sort by page number ascending so the Short Notes PDF flows in book order
  filteredHighlights.sort((a, b) => {
    const pDiff = (a.pageNumber || 1) - (b.pageNumber || 1);
    if (pDiff !== 0) return pDiff;
    return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
  });

  const handleStartEdit = (h: Highlight) => {
    setEditingId(h.id);
    setEditingNoteVal(h.note || '');
  };

  const handleSaveInlineNote = (h: Highlight) => {
    if (onEditHighlight) {
      onEditHighlight({
        ...h,
        note: editingNoteVal.trim() || undefined,
      });
    }
    setEditingId(null);
    setEditingNoteVal('');
  };

  const handleQuickNoteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newQuickNote.trim();
    if (!trimmed) return;
    const maxPages = Math.max(1, book?.totalPages || 9999);
    const parsedPage = Math.max(
      1,
      Math.min(maxPages, parseInt(newQuickNotePage, 10) || currentPage || 1)
    );

    if (onAddStandaloneNote) {
      onAddStandaloneNote(parsedPage, trimmed);
    } else if (onEditHighlight) {
      onEditHighlight({
        id: `hl-note-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        pageNumber: parsedPage,
        text: '',
        color: '#facc15',
        note: trimmed,
        createdAt: new Date().toISOString(),
      });
    }
    setNewQuickNote('');
  };

  const handleDownloadPdf = () => {
    if (!book) return;
    downloadBookNotesPdf({
      ...book,
      highlights,
    });
  };

  const handleSaveToBookshelf = async () => {
    if (!book || !onSaveNotesPdfToLibrary) return;
    try {
      setIsSavingToLibrary(true);
      await onSaveNotesPdfToLibrary({
        ...book,
        highlights,
      });
      setSavedLibrarySuccess(true);
      setTimeout(() => setSavedLibrarySuccess(false), 2600);
    } finally {
      setIsSavingToLibrary(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/55 backdrop-blur-xs font-sans"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl bg-[var(--paper-sheet)] border border-[var(--paper-border-strong)] text-[var(--ink-primary)] rounded-xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
      >
        {/* Top Paper-Ink Header */}
        <div className="px-4 sm:px-6 py-3.5 bg-[var(--paper-bg)] border-b border-[var(--paper-border)] flex items-center justify-between gap-3 shrink-0">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-literata font-semibold text-[var(--ink-primary)] truncate">
                Short Notes & Highlights PDF
              </h2>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-[var(--paper-sheet)] text-[var(--ink-primary)] border border-[var(--paper-border-strong)] shrink-0 tabular-nums">
                {highlights.length} {highlights.length === 1 ? 'Entry' : 'Entries'}
              </span>
            </div>
            <p className="text-[11px] text-[var(--ink-secondary)] truncate mt-0.5">
              {displayTitle} · Auto-compiled by Page Number
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 hover:bg-[var(--paper-subtle)] rounded-lg text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] transition cursor-pointer shrink-0"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* Add Quick Short Note Bar + Search/Filter */}
        <div className="px-4 sm:px-6 py-3 bg-[var(--paper-bg)]/60 border-b border-[var(--paper-border)] space-y-2.5 shrink-0">
          {/* Quick Short Note Input */}
          <form onSubmit={handleQuickNoteSubmit} className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-[var(--paper-sheet)] border border-[var(--paper-border-strong)] rounded-lg px-2.5 h-8 shrink-0 text-xs">
              <span className="text-[var(--ink-secondary)] text-[11px]">Page</span>
              <input
                type="number"
                min={1}
                max={book?.totalPages || 9999}
                value={newQuickNotePage}
                onChange={(e) => setNewQuickNotePage(e.target.value)}
                className="w-11 text-center font-mono text-xs font-semibold text-[var(--ink-primary)] bg-transparent focus:outline-none tabular-nums"
              />
            </div>

            <input
              type="text"
              value={newQuickNote}
              onChange={(e) => setNewQuickNote(e.target.value)}
              placeholder="Write a short note for this page to include in your Notes PDF..."
              className="flex-1 h-8 px-3 text-xs bg-[var(--paper-sheet)] border border-[var(--paper-border-strong)] focus:border-[var(--ink-primary)] rounded-lg text-[var(--ink-primary)] placeholder-[var(--ink-muted)] focus:outline-none"
            />

            <button
              type="submit"
              disabled={!newQuickNote.trim()}
              className="h-8 px-3 bg-[var(--ink-primary)] disabled:opacity-40 text-[var(--ink-inverse)] rounded-lg text-xs font-medium flex items-center gap-1 transition cursor-pointer shrink-0"
            >
              <Plus size={12} />
              <span>Add Note</span>
            </button>
          </form>

          {/* Search & Color Filter */}
          {highlights.length > 0 && (
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
              <div className="relative flex-1">
                <Search
                  size={12}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--ink-muted)]"
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by page number, highlighted text, or short note..."
                  className="w-full h-7.5 pl-7.5 pr-3 text-xs bg-[var(--paper-sheet)] border border-[var(--paper-border-strong)] rounded-lg text-[var(--ink-primary)] placeholder-[var(--ink-muted)] focus:outline-none focus:border-[var(--ink-primary)]"
                />
              </div>

              <div className="flex items-center gap-1.5 bg-[var(--paper-sheet)] px-2 py-1 rounded-lg border border-[var(--paper-border-strong)] self-start sm:self-auto">
                <button
                  onClick={() => setColorFilter('all')}
                  className={`px-2 py-0.5 text-[10px] font-medium rounded transition cursor-pointer ${
                    colorFilter === 'all'
                      ? 'bg-[var(--ink-primary)] text-[var(--ink-inverse)]'
                      : 'text-[var(--ink-secondary)] hover:text-[var(--ink-primary)]'
                  }`}
                >
                  All
                </button>
                {HIGHLIGHT_COLORS.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setColorFilter(c.hex)}
                    className={`w-4 h-4 rounded-full transition-transform cursor-pointer ${
                      colorFilter.toLowerCase() === c.hex.toLowerCase()
                        ? 'ring-2 ring-[var(--ink-primary)] scale-110'
                        : 'opacity-75 hover:opacity-100'
                    }`}
                    style={{ backgroundColor: c.hex }}
                    title={c.name}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Compiled Short Notes & Highlights Sheet List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3 min-h-[220px]">
          {filteredHighlights.length === 0 ? (
            <div className="h-44 flex flex-col items-center justify-center text-center space-y-2 text-[var(--ink-secondary)] bg-[var(--paper-bg)]/50 border border-dashed border-[var(--paper-border-strong)] rounded-xl p-6">
              <p className="text-xs font-literata font-medium text-[var(--ink-primary)]">
                {highlights.length === 0
                  ? 'Your Short Notes & Highlights PDF is empty.'
                  : 'No entries match your search.'}
              </p>
              <p className="text-[11px] text-[var(--ink-secondary)] max-w-md">
                {highlights.length === 0
                  ? 'Select any sentence while reading to highlight it or attach a note. Every highlight and note is automatically recorded here with its page number and compiled into your downloadable Notes PDF.'
                  : 'Try clearing the search box or selecting All colors.'}
              </p>
            </div>
          ) : (
            filteredHighlights.map((h) => {
              const hasQuote = Boolean(h.text && h.text.trim());
              const hasNote = Boolean(h.note && h.note.trim());
              const isEditingThis = editingId === h.id;

              return (
                <div
                  key={h.id}
                  className="bg-[var(--paper-bg)] border border-[var(--paper-border-strong)] rounded-xl p-3.5 sm:p-4 space-y-2.5 transition"
                >
                  {/* Entry Header: Page Number shown once */}
                  <div className="flex items-center justify-between gap-2 border-b border-[var(--paper-border)] pb-2 text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0 border border-black/20"
                        style={{ backgroundColor: h.color || '#facc15' }}
                      />
                      {onJumpToPage ? (
                        <button
                          onClick={() => {
                            onJumpToPage(h.pageNumber);
                            onClose();
                          }}
                          className="inline-flex items-center gap-1.5 font-semibold text-xs text-[var(--ink-primary)] hover:underline cursor-pointer"
                        >
                          <span>Page {h.pageNumber}</span>
                          <ExternalLink size={11} className="opacity-70" />
                        </button>
                      ) : (
                        <span className="font-semibold text-xs text-[var(--ink-primary)]">
                          Page {h.pageNumber}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => handleStartEdit(h)}
                        className="px-2 py-1 text-[11px] font-medium text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] hover:bg-[var(--paper-subtle)] rounded-md flex items-center gap-1 transition cursor-pointer"
                      >
                        <FileEdit size={11} />
                        <span>{hasNote ? 'Edit Note' : 'Add Note'}</span>
                      </button>

                      <button
                        onClick={() => onDeleteHighlight(h.id)}
                        className="p-1 text-[var(--ink-muted)] hover:text-[#8B2626] hover:bg-[var(--paper-subtle)] rounded-md transition cursor-pointer"
                        title="Delete entry"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  {/* Highlighted Lines */}
                  {hasQuote && (
                    <div
                      className="p-3 rounded-lg text-xs font-literata leading-relaxed border-l-3 bg-[var(--paper-sheet)] text-[var(--ink-primary)] italic"
                      style={{
                        borderLeftColor: h.color || '#facc15',
                      }}
                    >
                      “{h.text}”
                    </div>
                  )}

                  {/* Note Display or Inline Editor */}
                  {isEditingThis ? (
                    <div className="space-y-2 pt-1">
                      <textarea
                        value={editingNoteVal}
                        onChange={(e) => setEditingNoteVal(e.target.value)}
                        placeholder={`Write your note for Page ${h.pageNumber}...`}
                        rows={2}
                        autoFocus
                        className="w-full p-2.5 text-xs bg-[var(--paper-sheet)] border border-[var(--ink-primary)] rounded-lg text-[var(--ink-primary)] focus:outline-none leading-relaxed"
                      />
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          className="px-3 py-1 text-xs text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] rounded-md cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSaveInlineNote(h)}
                          className="px-3 py-1 text-xs font-medium bg-[var(--ink-primary)] text-[var(--ink-inverse)] rounded-md cursor-pointer"
                        >
                          Save Note
                        </button>
                      </div>
                    </div>
                  ) : (
                    hasNote && (
                      <div className="bg-[var(--paper-sheet)] rounded-lg p-3 border border-[var(--paper-border)] text-xs text-[var(--ink-primary)] leading-relaxed whitespace-pre-wrap">
                        <strong className="font-semibold text-[var(--ink-secondary)] mr-1.5">
                          Note:
                        </strong>
                        {h.note}
                      </div>
                    )
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer: Download Notes PDF */}
        <div className="px-4 sm:px-6 py-3.5 bg-[var(--paper-bg)] border-t border-[var(--paper-border)] flex flex-wrap items-center justify-between gap-2.5 shrink-0">
          <div className="text-[11px] text-[var(--ink-secondary)]">
            Automatically saved in your dashboard’s <strong>Notes PDF</strong> section.
          </div>

          <div className="flex items-center gap-2 ml-auto">
            {book && (
              <button
                type="button"
                disabled={highlights.length === 0}
                onClick={handleDownloadPdf}
                className="h-8.5 px-4 bg-[var(--ink-primary)] hover:opacity-90 disabled:opacity-45 text-[var(--ink-inverse)] rounded-lg text-xs font-medium inline-flex items-center gap-1.5 transition cursor-pointer"
              >
                <Download size={13} />
                <span>Download PDF</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
