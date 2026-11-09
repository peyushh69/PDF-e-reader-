import React, { useState, useEffect } from 'react';
import {
  Trash2,
  X,
  Search,
  ExternalLink,
  Download,
  Plus,
  FileEdit,
  AlertTriangle,
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
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [colorFilter, setColorFilter] = useState<string>('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingNoteVal, setEditingNoteVal] = useState<string>('');
  const [isAddingNoteOpen, setIsAddingNoteOpen] = useState<boolean>(false);
  const [newQuickNote, setNewQuickNote] = useState<string>('');
  const [newQuickNotePage, setNewQuickNotePage] = useState<string>(`${currentPage || 1}`);
  const [highlightToDelete, setHighlightToDelete] = useState<Highlight | null>(null);

  useEffect(() => {
    if (isOpen && currentPage) {
      setNewQuickNotePage(`${currentPage}`);
    }
    if (!isOpen) {
      setIsAddingNoteOpen(false);
      setEditingId(null);
      setHighlightToDelete(null);
    }
  }, [isOpen, currentPage]);

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

  // Sort by page number ascending so the Notes PDF flows in book order
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
    setIsAddingNoteOpen(false);
  };

  const handleDownloadPdf = () => {
    if (!book) return;
    downloadBookNotesPdf({
      ...book,
      highlights,
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xs font-sans"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl bg-[var(--paper-sheet)] border border-[var(--paper-border-strong)] text-[var(--ink-primary)] rounded-2xl shadow-2xl flex flex-col max-h-[88vh] overflow-hidden relative"
      >
        {/* Clean Editorial Header */}
        <div className="px-4 sm:px-6 py-3.5 bg-[var(--paper-bg)] border-b border-[var(--paper-border)] flex items-center justify-between gap-3 shrink-0">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-literata font-semibold text-[var(--ink-primary)] truncate">
                Notes & Highlights
              </h2>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-[var(--paper-sheet)] text-[var(--ink-secondary)] border border-[var(--paper-border-strong)] shrink-0 tabular-nums">
                {highlights.length}
              </span>
            </div>
            <p className="text-[11px] text-[var(--ink-secondary)] truncate mt-0.5">
              {displayTitle}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                setNewQuickNotePage(`${currentPage || 1}`);
                setIsAddingNoteOpen((prev) => !prev);
              }}
              className={`h-8 px-3 rounded-lg text-xs font-medium inline-flex items-center gap-1.5 transition cursor-pointer border ${
                isAddingNoteOpen
                  ? 'bg-[var(--paper-subtle)] text-[var(--ink-primary)] border-[var(--ink-primary)]'
                  : 'bg-[var(--ink-primary)] text-[var(--ink-inverse)] border-[var(--ink-primary)] hover:opacity-90'
              }`}
            >
              <Plus size={13} className={isAddingNoteOpen ? 'rotate-45 transition-transform' : 'transition-transform'} />
              <span>Add Note</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center hover:bg-[var(--paper-subtle)] rounded-lg text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] transition cursor-pointer shrink-0"
              aria-label="Close"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Collapsible Add Page Note Composer — Contained & Never Overflows */}
        {isAddingNoteOpen && (
          <form
            onSubmit={handleQuickNoteSubmit}
            className="px-4 sm:px-6 py-3.5 bg-[var(--paper-bg)]/80 border-b border-[var(--paper-border-strong)] space-y-2.5 shrink-0"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-[var(--ink-primary)]">
                  New Page Note
                </span>
                <div className="flex items-center gap-1 bg-[var(--paper-sheet)] border border-[var(--paper-border-strong)] rounded-lg px-2 h-7 text-xs">
                  <span className="text-[var(--ink-secondary)] text-[11px]">Page</span>
                  <input
                    type="number"
                    min={1}
                    max={book?.totalPages || 9999}
                    value={newQuickNotePage}
                    onChange={(e) => setNewQuickNotePage(e.target.value)}
                    className="w-12 text-center font-mono text-xs font-semibold text-[var(--ink-primary)] bg-transparent focus:outline-none tabular-nums"
                  />
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddingNoteOpen(false);
                    setNewQuickNote('');
                  }}
                  className="h-7 px-2.5 text-xs text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] rounded-md cursor-pointer transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newQuickNote.trim()}
                  className="h-7 px-3 bg-[var(--ink-primary)] disabled:opacity-40 text-[var(--ink-inverse)] rounded-lg text-xs font-medium transition cursor-pointer"
                >
                  Save Note
                </button>
              </div>
            </div>

            <textarea
              value={newQuickNote}
              onChange={(e) => setNewQuickNote(e.target.value)}
              placeholder={`Write your note or key takeaway for Page ${newQuickNotePage || currentPage}...`}
              rows={2}
              autoFocus
              className="w-full min-w-0 p-2.5 text-xs bg-[var(--paper-sheet)] border border-[var(--paper-border-strong)] focus:border-[var(--ink-primary)] rounded-lg text-[var(--ink-primary)] placeholder-[var(--ink-muted)] focus:outline-none leading-relaxed resize-none"
            />
          </form>
        )}

        {/* Compact Search & Color Filter Bar */}
        {highlights.length > 0 && (
          <div className="px-4 sm:px-6 py-2.5 bg-[var(--paper-bg)]/40 border-b border-[var(--paper-border)] flex flex-wrap items-center justify-between gap-2 shrink-0">
            <div className="relative flex-1 min-w-[160px]">
              <Search
                size={12}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--ink-muted)]"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search quotes, notes, or page..."
                className="w-full min-w-0 h-8 pl-7.5 pr-7 text-xs bg-[var(--paper-sheet)] border border-[var(--paper-border-strong)] rounded-lg text-[var(--ink-primary)] placeholder-[var(--ink-muted)] focus:outline-none focus:border-[var(--ink-primary)]"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--ink-muted)] hover:text-[var(--ink-primary)] cursor-pointer"
                >
                  <X size={11} />
                </button>
              )}
            </div>

            <div className="flex items-center gap-1.5 bg-[var(--paper-sheet)] px-2 py-1 rounded-lg border border-[var(--paper-border-strong)] shrink-0">
              <button
                type="button"
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
                  type="button"
                  onClick={() => setColorFilter(c.hex)}
                  className={`w-3.5 h-3.5 rounded-full transition-transform cursor-pointer ${
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

        {/* Notes & Highlights List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3 min-h-[220px]">
          {filteredHighlights.length === 0 ? (
            <div className="h-48 flex flex-col items-center justify-center text-center space-y-2.5 text-[var(--ink-secondary)] bg-[var(--paper-bg)]/50 border border-dashed border-[var(--paper-border-strong)] rounded-xl p-6">
              <p className="text-xs sm:text-sm font-literata font-medium text-[var(--ink-primary)]">
                {highlights.length === 0
                  ? 'No highlights or notes yet.'
                  : 'No entries match your filter.'}
              </p>
              <p className="text-[11px] text-[var(--ink-secondary)] max-w-sm leading-relaxed">
                {highlights.length === 0
                  ? 'Select any text while reading to highlight it, or tap "+ Add Note" above to jot down a note for the current page.'
                  : 'Try clearing your search query or switching the color filter back to All.'}
              </p>
              {highlights.length === 0 && !isAddingNoteOpen && (
                <button
                  type="button"
                  onClick={() => setIsAddingNoteOpen(true)}
                  className="mt-1 h-8 px-3.5 bg-[var(--ink-primary)] text-[var(--ink-inverse)] rounded-lg text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer hover:opacity-90 transition"
                >
                  <Plus size={12} />
                  <span>Add Note for Page {currentPage}</span>
                </button>
              )}
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
                  {/* Card Header: Page Jump Link + Edit/Delete Actions */}
                  <div className="flex items-center justify-between gap-2 pb-2 border-b border-[var(--paper-border)] text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0 border border-black/15"
                        style={{ backgroundColor: h.color || '#facc15' }}
                      />
                      {onJumpToPage ? (
                        <button
                          type="button"
                          onClick={() => {
                            onJumpToPage(h.pageNumber);
                            onClose();
                          }}
                          className="inline-flex items-center gap-1.5 font-semibold text-xs text-[var(--ink-primary)] hover:underline cursor-pointer tabular-nums"
                          title={`Jump to Page ${h.pageNumber}`}
                        >
                          <span>Page {h.pageNumber}</span>
                          <ExternalLink size={11} className="opacity-65" />
                        </button>
                      ) : (
                        <span className="font-semibold text-xs text-[var(--ink-primary)] tabular-nums">
                          Page {h.pageNumber}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleStartEdit(h)}
                        className="px-2.5 py-1 text-[11px] font-medium text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] hover:bg-[var(--paper-subtle)] rounded-md flex items-center gap-1 transition cursor-pointer"
                      >
                        <FileEdit size={11} />
                        <span>{hasNote ? 'Edit Note' : 'Add Note'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setHighlightToDelete(h)}
                        className="p-1.5 text-[var(--ink-muted)] hover:text-[#8B2626] hover:bg-[var(--paper-subtle)] rounded-md transition cursor-pointer"
                        title="Delete entry"
                        aria-label="Delete entry"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  {/* Highlighted Quote */}
                  {hasQuote && (
                    <blockquote
                      className="pl-3 py-0.5 text-xs sm:text-[13px] font-literata leading-relaxed border-l-3 text-[var(--ink-primary)]"
                      style={{
                        borderLeftColor: h.color || '#facc15',
                      }}
                    >
                      “{h.text}”
                    </blockquote>
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
                        className="w-full min-w-0 p-2.5 text-xs bg-[var(--paper-sheet)] border border-[var(--ink-primary)] rounded-lg text-[var(--ink-primary)] focus:outline-none leading-relaxed resize-none"
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
                      <div className="bg-[var(--paper-sheet)] rounded-lg px-3 py-2.5 border border-[var(--paper-border)] text-xs text-[var(--ink-primary)] leading-relaxed whitespace-pre-wrap">
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

        {/* Clean Footer */}
        <div className="px-4 sm:px-6 py-3 bg-[var(--paper-bg)] border-t border-[var(--paper-border)] flex items-center justify-between gap-3 shrink-0">
          <div className="text-[11px] text-[var(--ink-secondary)] truncate tabular-nums">
            {highlights.length} {highlights.length === 1 ? 'entry' : 'entries'} · Sorted by page
          </div>

          {book && (
            <button
              type="button"
              disabled={highlights.length === 0}
              onClick={handleDownloadPdf}
              className="h-8.5 px-4 bg-[var(--ink-primary)] hover:opacity-90 disabled:opacity-40 text-[var(--ink-inverse)] rounded-lg text-xs font-medium inline-flex items-center gap-1.5 transition cursor-pointer shrink-0"
            >
              <Download size={13} />
              <span>Download PDF</span>
            </button>
          )}
        </div>

        {/* Delete Confirmation Popup Modal */}
        {highlightToDelete && (
          <div
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/55 backdrop-blur-xs"
            onClick={() => setHighlightToDelete(null)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm bg-[var(--paper-sheet)] border border-[var(--paper-border-strong)] text-[var(--ink-primary)] rounded-xl shadow-2xl p-5 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-[var(--paper-border)] pb-2.5">
                <div className="flex items-center gap-2">
                  <AlertTriangle size={15} className="text-[#7F2323] shrink-0" />
                  <h3 className="font-literata font-semibold text-sm sm:text-base text-[var(--ink-primary)]">
                    {highlightToDelete.text && highlightToDelete.note
                      ? 'Delete Highlight & Note?'
                      : highlightToDelete.text
                      ? 'Delete Highlight?'
                      : 'Delete Note?'}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setHighlightToDelete(null)}
                  className="text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] p-1 rounded cursor-pointer"
                  aria-label="Close"
                >
                  <X size={15} />
                </button>
              </div>

              <div className="space-y-2.5">
                <p className="text-xs text-[var(--ink-primary)] leading-relaxed">
                  Are you sure you want to delete this entry from{' '}
                  <strong className="font-semibold">Page {highlightToDelete.pageNumber}</strong>?
                </p>

                {(highlightToDelete.text || highlightToDelete.note) && (
                  <div className="p-2.5 bg-[var(--paper-bg)] border border-[var(--paper-border)] rounded-lg text-[11px] text-[var(--ink-secondary)] line-clamp-3 italic font-literata">
                    “{highlightToDelete.text || highlightToDelete.note}”
                  </div>
                )}

                <p className="text-[11px] text-[var(--ink-secondary)]">
                  This action cannot be undone.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--paper-border)]">
                <button
                  type="button"
                  onClick={() => setHighlightToDelete(null)}
                  className="h-8.5 px-3.5 text-xs font-medium bg-[var(--paper-bg)] hover:bg-[var(--paper-subtle)] text-[var(--ink-primary)] border border-[var(--paper-border-strong)] rounded-lg cursor-pointer transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onDeleteHighlight(highlightToDelete.id);
                    setHighlightToDelete(null);
                  }}
                  className="h-8.5 px-4 text-xs font-medium bg-[#7F2323] hover:bg-[#661A1A] text-[#FAF8F4] rounded-lg cursor-pointer transition"
                >
                  Yes, Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
