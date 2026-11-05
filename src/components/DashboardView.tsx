import React, { useState } from 'react';
import {
  Book,
  ReadingStats,
  ReadingStack,
  PdfReadingMode,
} from '../types';
import { createBookCoverDataUrl } from '../utils/pdfStorage';
import { PWAInstallButton } from './PWAInstallButton';
import { BookshelfWordmark } from './BookshelfWordmark';
import {
  Search,
  Plus,
  Check,
  X,
  Trash2,
  LogOut,
  Upload,
} from 'lucide-react';

interface DashboardViewProps {
  books: Book[];
  stats: ReadingStats;
  stacks: ReadingStack[];
  currentlyReadingBook: Book | null;
  userEmail?: string | null;
  userName?: string | null;
  userPhotoUrl?: string | null;
  onSignOut?: () => void;
  onOpenBook: (book: Book, mode?: PdfReadingMode) => void;
  onOpenUploadModal: () => void;
  onOpenDriveModal: () => void;
  onDeleteBook: (bookId: string) => void;
  onCreateStack: (name: string, color: string, description?: string) => void;
  onDeleteStack: (stackId: string) => void;
  onToggleBookInStack: (bookId: string, stackId: string) => void;
  onOpenThemeModal?: () => void;
}

const STACK_PALETTE = ['#161514', '#4A463F', '#6E685F', '#8A8275', '#3B4D41', '#5C3D3D'];

export const DashboardView: React.FC<DashboardViewProps> = ({
  books,
  stats,
  stacks,
  currentlyReadingBook,
  userEmail,
  userName,
  userPhotoUrl,
  onSignOut,
  onOpenBook,
  onOpenUploadModal,
  onOpenDriveModal,
  onDeleteBook,
  onCreateStack,
  onDeleteStack,
  onToggleBookInStack,
  onOpenThemeModal,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStackFilter, setSelectedStackFilter] = useState<string | null>(null);
  const [filterSource, setFilterSource] = useState<'all' | 'local' | 'drive' | 'finished'>('all');

  const [isNewStackModalOpen, setIsNewStackModalOpen] = useState(false);
  const [newStackName, setNewStackName] = useState('');
  const [newStackDesc, setNewStackDesc] = useState('');
  const [newStackColor, setNewStackColor] = useState('#161514');
  const [editingBookForStack, setEditingBookForStack] = useState<Book | null>(null);
  const [bookToDelete, setBookToDelete] = useState<Book | null>(null);

  const handleCreateStackSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStackName.trim()) return;
    onCreateStack(newStackName.trim(), newStackColor, newStackDesc.trim());
    setNewStackName('');
    setNewStackDesc('');
    setIsNewStackModalOpen(false);
  };

  const activeBook = currentlyReadingBook || books[0] || null;

  const filteredBooks = books.filter((b) => {
    const matchesSearch =
      b.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.author.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (selectedStackFilter) {
      if (!b.stackIds || !b.stackIds.includes(selectedStackFilter)) {
        return false;
      }
    }

    if (filterSource === 'all') return true;
    if (filterSource === 'finished') return b.isFinished || (b.progressPercent || 0) >= 100;
    return b.source === filterSource;
  });

  const handleCoverError = (e: React.SyntheticEvent<HTMLImageElement, Event>, book: Book) => {
    const target = e.currentTarget;
    if (!target.dataset.fallbackApplied) {
      target.dataset.fallbackApplied = 'true';
      target.src = createBookCoverDataUrl({
        title: book.title,
        author: book.author,
      });
    }
  };

  const formattedReadingTime =
    stats.totalHours >= 1
      ? `${stats.totalHours.toFixed(1)} hrs`
      : `${Math.max(0, Math.round(stats.totalHours * 60))} mins`;

  const displayInitial = (userName || userEmail || 'U').trim().charAt(0).toUpperCase();

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[var(--paper-bg)] text-[var(--ink-primary)] font-sans select-none antialiased transition-colors duration-200">
      {/* Unified Responsive Top Header — Paper-Ink Editorial Bar */}
      <header className="bg-[var(--paper-bg)] border-b border-[var(--paper-border)] shrink-0 z-20">
        <div className="max-w-[1360px] mx-auto w-full px-4 sm:px-8 lg:px-10 py-2.5 sm:py-0 sm:h-15 flex flex-wrap sm:flex-nowrap items-center justify-between gap-y-2 gap-x-4">
          {/* 1. Brand Wordmark */}
          <div className="order-1 flex items-center min-w-0 shrink-0">
            <BookshelfWordmark className="text-[21px] sm:text-[23px]" />
          </div>

          {/* 2. Primary Action Toolbar */}
          <div className="order-3 sm:order-2 w-full sm:w-auto sm:ml-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-[var(--paper-border)] flex items-center justify-between sm:justify-end gap-2">
            <div className="flex items-center gap-2">
              <PWAInstallButton />

              {onOpenThemeModal && (
                <button
                  onClick={onOpenThemeModal}
                  className="h-8 px-3 bg-[var(--paper-sheet)] hover:bg-[var(--paper-subtle)] text-[var(--ink-primary)] border border-[var(--paper-border-strong)] rounded-lg text-xs font-medium transition cursor-pointer whitespace-nowrap"
                >
                  Display
                </button>
              )}
            </div>

            <button
              onClick={onOpenUploadModal}
              className="h-8 px-3.5 bg-[var(--ink-primary)] hover:opacity-90 text-[var(--ink-inverse)] border border-[var(--ink-primary)] rounded-lg text-xs font-medium flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap shrink-0"
            >
              <Upload size={12} className="shrink-0" />
              <span>Upload PDF</span>
            </button>
          </div>

          {/* 3. User Account & Sign Out */}
          {onSignOut && (
            <div className="order-2 sm:order-3 flex items-center gap-2 sm:pl-3 sm:border-l sm:border-[var(--paper-border)] shrink-0">
              {userPhotoUrl ? (
                <img
                  src={userPhotoUrl}
                  alt={userName || 'User'}
                  referrerPolicy="no-referrer"
                  className="w-7.5 h-7.5 rounded-lg object-cover border border-[var(--paper-border-strong)] shrink-0"
                  title={userEmail || userName || 'Signed in'}
                />
              ) : (
                <div
                  className="w-7.5 h-7.5 rounded-lg bg-[var(--paper-sheet)] border border-[var(--paper-border-strong)] text-[var(--ink-primary)] text-xs font-semibold flex items-center justify-center shrink-0"
                  title={userEmail || userName || 'Signed in'}
                >
                  {displayInitial}
                </div>
              )}
              <button
                onClick={onSignOut}
                className="h-7.5 sm:h-8 px-2.5 bg-[var(--paper-sheet)] hover:bg-[var(--paper-subtle)] text-[var(--ink-primary)] border border-[var(--paper-border-strong)] rounded-lg text-[11px] font-medium flex items-center justify-center gap-1.5 transition cursor-pointer shrink-0"
                title={`Sign out (${userEmail || userName || ''})`}
              >
                <LogOut size={12} />
                <span className="hidden md:inline">Sign out</span>
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Main Scrollable Paper-Ink Workspace */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[1360px] mx-auto w-full px-4 sm:px-8 lg:px-10 py-5 sm:py-7 space-y-6 sm:space-y-8">
          {/* Section 1: Currently Reading Bookplate */}
          {activeBook && (
            <section className="bg-[var(--paper-sheet)] rounded-xl border border-[var(--paper-border)] p-4 sm:p-6 transition-colors">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
                {/* Left Side: Book Cover + Editorial Details */}
                <div className="flex items-center gap-4 sm:gap-5 min-w-0 flex-1 w-full">
                  <div
                    onClick={() => onOpenBook(activeBook)}
                    className="relative w-16 sm:w-20 md:w-22 aspect-[3/4] bg-[var(--paper-subtle)] border border-[var(--paper-border-strong)] rounded-md p-1.5 flex items-center justify-center overflow-hidden shrink-0 cursor-pointer hover:opacity-95 transition"
                  >
                    <img
                      src={activeBook.coverUrl}
                      alt={activeBook.title}
                      referrerPolicy="no-referrer"
                      onError={(e) => handleCoverError(e, activeBook)}
                      className="w-full h-full object-contain"
                    />
                  </div>

                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="text-[11px] font-medium tracking-wide text-[var(--ink-muted)]">
                      Currently Reading
                    </div>

                    <h2
                      onClick={() => onOpenBook(activeBook)}
                      className="text-base sm:text-lg md:text-xl font-literata font-semibold text-[var(--ink-primary)] leading-snug cursor-pointer hover:underline truncate"
                    >
                      {activeBook.title}
                    </h2>

                    <div className="text-xs text-[var(--ink-secondary)] flex flex-wrap items-center gap-x-2 gap-y-0.5 tabular-nums">
                      <span>
                        by <strong className="text-[var(--ink-primary)] font-medium">{activeBook.author}</strong>
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>
                        {activeBook.totalPages} {activeBook.totalPages === 1 ? 'Page' : 'Pages'}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{activeBook.fileSize || 'PDF Edition'}</span>
                    </div>

                    <div className="space-y-1.5 pt-2 max-w-md">
                      <div className="flex items-center justify-between text-[11px] tabular-nums text-[var(--ink-secondary)]">
                        <span>
                          Page {activeBook.currentPage || 1} of {activeBook.totalPages}
                        </span>
                        <span className="font-semibold text-[var(--ink-primary)]">
                          {activeBook.progressPercent || 0}%
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-[var(--paper-subtle)] border border-[var(--paper-border)] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[var(--ink-primary)] rounded-full transition-all duration-200"
                          style={{
                            width: `${Math.min(100, Math.max(2, activeBook.progressPercent || 0))}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Single Primary Action Button */}
                <div className="flex items-center shrink-0 w-full sm:w-auto pt-3 sm:pt-0 border-t sm:border-t-0 border-[var(--paper-border)]">
                  <button
                    onClick={() => onOpenBook(activeBook)}
                    className="h-9 px-5 bg-[var(--ink-primary)] hover:opacity-90 text-[var(--ink-inverse)] text-xs font-medium rounded-lg flex items-center justify-center transition cursor-pointer w-full sm:w-auto whitespace-nowrap"
                  >
                    Continue Reading
                  </button>
                </div>
              </div>
            </section>
          )}

          {/* Section 2: Unified Paper-Ink Reading Ledger */}
          <section className="bg-[var(--paper-sheet)] border border-[var(--paper-border)] rounded-xl grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 divide-x divide-[var(--paper-border)] overflow-hidden">
            <div className="p-3.5 sm:p-4">
              <div className="text-[11px] font-medium text-[var(--ink-muted)]">Reading Time</div>
              <div className="text-lg sm:text-2xl font-literata font-semibold text-[var(--ink-primary)] tabular-nums mt-1">
                {formattedReadingTime}
              </div>
            </div>

            <div className="p-3.5 sm:p-4">
              <div className="text-[11px] font-medium text-[var(--ink-muted)]">Daily Streak</div>
              <div className="text-lg sm:text-2xl font-literata font-semibold text-[var(--ink-primary)] tabular-nums mt-1">
                {stats.currentStreakDays} {stats.currentStreakDays === 1 ? 'Day' : 'Days'}
              </div>
            </div>

            <div className="p-3.5 sm:p-4">
              <div className="text-[11px] font-medium text-[var(--ink-muted)]">Pages Read</div>
              <div className="text-lg sm:text-2xl font-literata font-semibold text-[var(--ink-primary)] tabular-nums mt-1">
                {stats.totalPagesRead}
              </div>
            </div>

            <div className="p-3.5 sm:p-4">
              <div className="text-[11px] font-medium text-[var(--ink-muted)]">Completed</div>
              <div className="text-lg sm:text-2xl font-literata font-semibold text-[var(--ink-primary)] tabular-nums mt-1">
                {stats.totalBooksFinished} of {books.length}
              </div>
            </div>
          </section>

          {/* Section 3: Unified Filter & Search Bar */}
          <section className="space-y-3">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              {/* Single Unified Filter Bar */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                <button
                  onClick={() => {
                    setSelectedStackFilter(null);
                    setFilterSource('all');
                  }}
                  className={`h-8 px-3.5 text-xs rounded-lg border transition cursor-pointer whitespace-nowrap shrink-0 ${
                    selectedStackFilter === null && filterSource === 'all'
                      ? 'bg-[var(--ink-primary)] text-[var(--ink-inverse)] border-[var(--ink-primary)] font-medium'
                      : 'bg-[var(--paper-sheet)] text-[var(--ink-primary)] border-[var(--paper-border-strong)] hover:bg-[var(--paper-subtle)]'
                  }`}
                >
                  All Books ({books.length})
                </button>

                <button
                  onClick={() => {
                    setSelectedStackFilter(null);
                    setFilterSource(filterSource === 'finished' ? 'all' : 'finished');
                  }}
                  className={`h-8 px-3.5 text-xs rounded-lg border transition cursor-pointer whitespace-nowrap shrink-0 ${
                    selectedStackFilter === null && filterSource === 'finished'
                      ? 'bg-[var(--ink-primary)] text-[var(--ink-inverse)] border-[var(--ink-primary)] font-medium'
                      : 'bg-[var(--paper-sheet)] text-[var(--ink-primary)] border-[var(--paper-border-strong)] hover:bg-[var(--paper-subtle)]'
                  }`}
                >
                  Completed ({stats.totalBooksFinished})
                </button>

                {stacks.map((stack) => {
                  const isSelected = selectedStackFilter === stack.id;
                  const count = books.filter((b) => b.stackIds?.includes(stack.id)).length;

                  return (
                    <div key={stack.id} className="inline-flex items-center shrink-0">
                      <button
                        onClick={() => {
                          setFilterSource('all');
                          setSelectedStackFilter(isSelected ? null : stack.id);
                        }}
                        className={`h-8 px-3.5 text-xs border transition cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                          isSelected ? 'rounded-l-lg' : 'rounded-lg'
                        } ${
                          isSelected
                            ? 'bg-[var(--ink-primary)] text-[var(--ink-inverse)] border-[var(--ink-primary)] font-medium'
                            : 'bg-[var(--paper-sheet)] text-[var(--ink-primary)] border-[var(--paper-border-strong)] hover:bg-[var(--paper-subtle)]'
                        }`}
                      >
                        <span>{stack.name}</span>
                        <span className="opacity-70 tabular-nums">({count})</span>
                      </button>
                      {isSelected && (
                        <button
                          onClick={() => {
                            setSelectedStackFilter(null);
                            onDeleteStack(stack.id);
                          }}
                          className="h-8 px-2 bg-[var(--ink-secondary)] hover:bg-[#7F2D2D] text-[var(--ink-inverse)] border border-l-0 border-[var(--ink-primary)] rounded-r-lg flex items-center justify-center cursor-pointer transition"
                          title="Delete Stack"
                        >
                          <X size={11} />
                        </button>
                      )}
                    </div>
                  );
                })}

                <button
                  onClick={() => setIsNewStackModalOpen(true)}
                  className="h-8 px-3 text-xs rounded-lg border border-dashed border-[var(--paper-border-strong)] hover:border-[var(--ink-primary)] bg-transparent hover:bg-[var(--paper-subtle)] text-[var(--ink-primary)] transition cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-1"
                >
                  <Plus size={12} />
                  <span>New Stack</span>
                </button>
              </div>

              {/* Search Input */}
              <div className="relative w-full md:w-64 shrink-0">
                <input
                  type="text"
                  placeholder="Search title or author..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-8 pl-7.5 pr-6 text-xs bg-[var(--paper-sheet)] border border-[var(--paper-border-strong)] focus:border-[var(--ink-primary)] rounded-lg text-[var(--ink-primary)] placeholder-[var(--ink-muted)] focus:outline-none transition-colors"
                />
                <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--ink-muted)]" />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--ink-muted)] hover:text-[var(--ink-primary)] cursor-pointer"
                  >
                    <X size={11} />
                  </button>
                )}
              </div>
            </div>
          </section>

          {/* Section 4: Editorial Paper-Ink Library Grid (Unnested, Clean Hairline Folios) */}
          <section className="space-y-4 pb-6">
            <div className="flex items-center justify-between border-b border-[var(--paper-border)] pb-2.5">
              <h3 className="text-sm sm:text-base font-literata font-semibold text-[var(--ink-primary)]">
                {selectedStackFilter
                  ? stacks.find((s) => s.id === selectedStackFilter)?.name || 'Library'
                  : 'Library'}
              </h3>
              <span className="text-xs text-[var(--ink-secondary)] tabular-nums">
                {filteredBooks.length} {filteredBooks.length === 1 ? 'Volume' : 'Volumes'}
              </span>
            </div>

            {books.length === 0 ? (
              <div className="py-14 px-4 bg-[var(--paper-sheet)] border border-[var(--paper-border)] rounded-xl text-center space-y-3">
                <p className="text-sm font-literata font-medium text-[var(--ink-primary)]">
                  Your bookshelf is currently empty.
                </p>
                <p className="text-xs text-[var(--ink-secondary)] max-w-md mx-auto">
                  Upload a PDF document or import from Google Drive to experience crisp Paper-Ink reading across all your devices.
                </p>
                <div className="pt-1">
                  <button
                    onClick={onOpenUploadModal}
                    className="h-8.5 px-4 bg-[var(--ink-primary)] hover:opacity-90 text-[var(--ink-inverse)] rounded-lg text-xs font-medium inline-flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <Upload size={12} />
                    <span>Upload PDF</span>
                  </button>
                </div>
              </div>
            ) : filteredBooks.length === 0 ? (
              <div className="py-12 bg-[var(--paper-sheet)] border border-[var(--paper-border)] rounded-xl text-center space-y-2.5">
                <p className="text-xs text-[var(--ink-secondary)]">No books match the current filter.</p>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedStackFilter(null);
                    setFilterSource('all');
                  }}
                  className="h-7.5 px-3.5 bg-[var(--ink-primary)] text-[var(--ink-inverse)] rounded-lg text-xs font-medium cursor-pointer"
                >
                  Reset Filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3.5 sm:gap-4">
                {filteredBooks.map((book) => {
                  const pct =
                    book.progressPercent ??
                    Math.round((book.currentPage / Math.max(1, book.totalPages)) * 100);

                  return (
                    <div
                      key={book.id}
                      className="flex flex-col group bg-[var(--paper-sheet)] rounded-xl border border-[var(--paper-border)] hover:border-[var(--ink-primary)] transition duration-150 overflow-hidden"
                    >
                      {/* Full Book Cover Matte Frame */}
                      <div
                        onClick={() => onOpenBook(book)}
                        className="relative aspect-[3/4] w-full bg-[var(--paper-subtle)] flex items-center justify-center p-2.5 overflow-hidden cursor-pointer border-b border-[var(--paper-border)]"
                      >
                        <img
                          src={book.coverUrl}
                          alt={book.title}
                          referrerPolicy="no-referrer"
                          onError={(e) => handleCoverError(e, book)}
                          className="w-full h-full object-contain group-hover:scale-102 transition-transform duration-150"
                        />
                        {/* Subtle bottom progress hairline */}
                        {pct > 0 && (
                          <div className="absolute bottom-0 left-0 right-0 h-1 bg-[var(--paper-border)]">
                            <div
                              className="h-full bg-[var(--ink-primary)]"
                              style={{ width: `${Math.min(100, pct)}%` }}
                            />
                          </div>
                        )}
                      </div>

                      {/* Book Metadata & Clean Unboxed Actions */}
                      <div className="p-2.5 sm:p-3 flex-1 flex flex-col justify-between space-y-2">
                        <div>
                          <h4
                            onClick={() => onOpenBook(book)}
                            className="text-xs sm:text-[13px] font-literata font-semibold text-[var(--ink-primary)] line-clamp-1 group-hover:underline cursor-pointer leading-snug"
                            title={book.title}
                          >
                            {book.title}
                          </h4>
                          <div className="text-[11px] text-[var(--ink-secondary)] flex items-center justify-between gap-1 mt-0.5 tabular-nums">
                            <span className="truncate">{book.author}</span>
                            <span className="shrink-0 font-medium text-[var(--ink-primary)]">{pct}%</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-[var(--paper-border)] text-[11px]">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => onOpenBook(book)}
                              className="font-medium text-[var(--ink-primary)] hover:underline cursor-pointer"
                            >
                              Read
                            </button>
                            <span className="text-[var(--ink-muted)]" aria-hidden="true">
                              ·
                            </span>
                            <button
                              onClick={() => setEditingBookForStack(book)}
                              className="text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] cursor-pointer"
                            >
                              Stacks
                            </button>
                          </div>

                          <button
                            onClick={() => setBookToDelete(book)}
                            className="p-0.5 text-[var(--ink-muted)] hover:text-[#8B2626] rounded transition cursor-pointer"
                            title="Delete Book"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </div>

      {/* Modal: Create New Stack */}
      {isNewStackModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs font-sans">
          <div className="w-full max-w-sm bg-[var(--paper-sheet)] rounded-xl shadow-xl border border-[var(--paper-border-strong)] p-5 space-y-4 text-[var(--ink-primary)]">
            <div className="flex items-center justify-between border-b border-[var(--paper-border)] pb-2.5">
              <h3 className="font-literata font-semibold text-sm sm:text-base">New Reading Stack</h3>
              <button
                onClick={() => setIsNewStackModalOpen(false)}
                className="text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] p-1 rounded cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            <form onSubmit={handleCreateStackSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-medium mb-1">Stack Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Philosophy & Essays"
                  value={newStackName}
                  onChange={(e) => setNewStackName(e.target.value)}
                  className="w-full h-8.5 px-3 text-xs bg-[var(--paper-bg)] border border-[var(--paper-border-strong)] rounded-lg text-[var(--ink-primary)] focus:outline-none focus:border-[var(--ink-primary)]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">Description (Optional)</label>
                <input
                  type="text"
                  placeholder="Optional notes"
                  value={newStackDesc}
                  onChange={(e) => setNewStackDesc(e.target.value)}
                  className="w-full h-8.5 px-3 text-xs bg-[var(--paper-bg)] border border-[var(--paper-border-strong)] rounded-lg text-[var(--ink-primary)] focus:outline-none focus:border-[var(--ink-primary)]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1.5">Tag Color</label>
                <div className="flex items-center gap-2">
                  {STACK_PALETTE.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setNewStackColor(c)}
                      className={`w-5 h-5 rounded-full border-2 transition cursor-pointer ${
                        newStackColor === c ? 'border-[var(--ink-primary)] scale-110' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[var(--paper-border)]">
                <button
                  type="button"
                  onClick={() => setIsNewStackModalOpen(false)}
                  className="h-8 px-3 text-xs text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="h-8 px-4 text-xs font-medium bg-[var(--ink-primary)] hover:opacity-90 text-[var(--ink-inverse)] rounded-lg cursor-pointer transition"
                >
                  Create Stack
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Assign Book to Stacks */}
      {editingBookForStack && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs font-sans">
          <div className="w-full max-w-sm bg-[var(--paper-sheet)] rounded-xl shadow-xl border border-[var(--paper-border-strong)] p-5 space-y-3.5 text-[var(--ink-primary)]">
            <div className="flex items-center justify-between border-b border-[var(--paper-border)] pb-2.5">
              <div className="min-w-0">
                <h3 className="font-literata font-semibold text-sm">Assign to Stacks</h3>
                <p className="text-xs text-[var(--ink-secondary)] truncate mt-0.5">
                  {editingBookForStack.title}
                </p>
              </div>
              <button
                onClick={() => setEditingBookForStack(null)}
                className="text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] p-1 rounded cursor-pointer shrink-0"
              >
                <X size={15} />
              </button>
            </div>

            {stacks.length === 0 ? (
              <p className="text-xs text-[var(--ink-secondary)] py-4 text-center">
                No stacks created yet. Use "+ New Stack" to create one.
              </p>
            ) : (
              <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                {stacks.map((stack) => {
                  const currentBook =
                    books.find((b) => b.id === editingBookForStack.id) || editingBookForStack;
                  const isSelected = currentBook.stackIds?.includes(stack.id);
                  return (
                    <button
                      key={stack.id}
                      onClick={() => onToggleBookInStack(editingBookForStack.id, stack.id)}
                      className={`w-full p-2.5 rounded-lg border flex items-center justify-between text-left transition cursor-pointer text-xs ${
                        isSelected
                          ? 'border-[var(--ink-primary)] bg-[var(--paper-subtle)] font-medium'
                          : 'border-[var(--paper-border-strong)] hover:bg-[var(--paper-subtle)] text-[var(--ink-primary)]'
                      }`}
                    >
                      <span>{stack.name}</span>
                      {isSelected && <Check size={14} className="text-[var(--ink-primary)]" />}
                    </button>
                  );
                })}
              </div>
            )}

            <div className="flex justify-end pt-2 border-t border-[var(--paper-border)]">
              <button
                onClick={() => setEditingBookForStack(null)}
                className="h-8 px-4 text-xs font-medium bg-[var(--ink-primary)] hover:opacity-90 text-[var(--ink-inverse)] rounded-lg cursor-pointer transition"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Confirm Book Deletion */}
      {bookToDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs font-sans"
          onClick={() => setBookToDelete(null)}
        >
          <div
            className="w-full max-w-sm bg-[var(--paper-sheet)] rounded-xl shadow-2xl border border-[var(--paper-border-strong)] p-5 space-y-4 text-[var(--ink-primary)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[var(--paper-border)] pb-2.5">
              <h3 className="font-literata font-semibold text-sm sm:text-base text-[var(--ink-primary)]">
                Delete Book?
              </h3>
              <button
                onClick={() => setBookToDelete(null)}
                className="text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] p-1 rounded cursor-pointer"
                aria-label="Close"
              >
                <X size={15} />
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-xs text-[var(--ink-primary)] leading-relaxed">
                Are you sure you want to delete{' '}
                <strong className="font-literata font-semibold">"{bookToDelete.title}"</strong> from
                your bookshelf?
              </p>
              <p className="text-[11px] text-[var(--ink-secondary)] leading-relaxed">
                Your reading progress, bookmarks, and highlights for this book will be permanently
                removed.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2.5 border-t border-[var(--paper-border)]">
              <button
                type="button"
                onClick={() => setBookToDelete(null)}
                className="h-8.5 px-3.5 text-xs font-medium bg-[var(--paper-bg)] hover:bg-[var(--paper-subtle)] text-[var(--ink-primary)] border border-[var(--paper-border-strong)] rounded-lg cursor-pointer transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteBook(bookToDelete.id);
                  setBookToDelete(null);
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
  );
};
