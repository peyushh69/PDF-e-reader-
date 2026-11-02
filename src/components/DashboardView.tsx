import React, { useState } from 'react';
import {
  Book,
  ReadingStats,
  ReadingStack,
  PdfReadingMode,
} from '../types';
import { createBookCoverDataUrl } from '../utils/pdfStorage';
import {
  Search,
  Plus,
  Check,
  X,
  Trash2,
} from 'lucide-react';

interface DashboardViewProps {
  books: Book[];
  stats: ReadingStats;
  stacks: ReadingStack[];
  currentlyReadingBook: Book | null;
  onOpenBook: (book: Book, mode?: PdfReadingMode) => void;
  onOpenUploadModal: () => void;
  onOpenDriveModal: () => void;
  onDeleteBook: (bookId: string) => void;
  onCreateStack: (name: string, color: string, description?: string) => void;
  onDeleteStack: (stackId: string) => void;
  onToggleBookInStack: (bookId: string, stackId: string) => void;
  onOpenThemeModal?: () => void;
}

const STACK_PALETTE = ['#383633', '#5C5852', '#7A756C', '#8F8A80', '#4A584C', '#5C4A4A'];

export const DashboardView: React.FC<DashboardViewProps> = ({
  books,
  stats,
  stacks,
  currentlyReadingBook,
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
  const [newStackColor, setNewStackColor] = useState('#383633');
  const [editingBookForStack, setEditingBookForStack] = useState<Book | null>(null);

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

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#DBD9D3] text-[#2B2A27] font-sans select-none antialiased">
      {/* Top Bar */}
      <header className="px-3 sm:px-6 py-2.5 sm:py-3 bg-[#DBD9D3] border-b border-[#B8B6AF] flex items-center justify-between gap-2 sm:gap-6 shrink-0 z-20">
        <span className="font-sans font-semibold text-sm sm:text-lg tracking-tight text-[#2B2A27] whitespace-nowrap shrink-0">
          Kindle Lab
        </span>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {onOpenThemeModal && (
            <button
              onClick={onOpenThemeModal}
              className="h-8 px-2.5 sm:px-3 bg-[#E4E2DC] hover:bg-[#D5D3CC] text-[#2B2A27] border border-[#6E6C66] rounded-lg text-[11px] sm:text-xs font-medium transition cursor-pointer whitespace-nowrap shrink-0"
            >
              Display
            </button>
          )}

          <button
            onClick={onOpenDriveModal}
            className="h-8 px-2.5 sm:px-3 bg-[#E4E2DC] hover:bg-[#D5D3CC] text-[#2B2A27] border border-[#6E6C66] rounded-lg text-[11px] sm:text-xs font-medium transition cursor-pointer whitespace-nowrap shrink-0"
          >
            Google Drive
          </button>

          <button
            onClick={onOpenUploadModal}
            className="h-8 px-2.5 sm:px-3.5 bg-[#383633] hover:bg-[#2B2A27] text-[#EAE8E2] border border-[#2B2A27] rounded-lg text-[11px] sm:text-xs font-medium transition cursor-pointer whitespace-nowrap shrink-0"
          >
            Upload PDF
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-5 bg-[#DBD9D3]">
        {/* Section 1: Currently Reading */}
        {activeBook && (
          <section className="bg-[#E2E0DA] rounded-xl border border-[#6E6C66] p-3.5 sm:p-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              {/* Left Side: Book Cover + Book Details */}
              <div className="flex items-center gap-3.5 sm:gap-4 min-w-0 flex-1 w-full">
                <div
                  onClick={() => onOpenBook(activeBook)}
                  className="relative w-14 sm:w-16 md:w-18 aspect-[3/4] bg-[#D5D3CC] border border-[#6E6C66] rounded-lg p-1 flex items-center justify-center overflow-hidden shrink-0 cursor-pointer hover:opacity-95 transition"
                >
                  <img
                    src={activeBook.coverUrl}
                    alt={activeBook.title}
                    referrerPolicy="no-referrer"
                    onError={(e) => handleCoverError(e, activeBook)}
                    className="w-full h-full object-contain"
                  />
                </div>

                <div className="min-w-0 flex-1 space-y-1">
                  <div className="text-[11px] font-medium text-[#575550]">
                    Currently Reading
                  </div>

                  <h2
                    onClick={() => onOpenBook(activeBook)}
                    className="text-sm sm:text-base md:text-lg font-sans font-semibold text-[#2B2A27] leading-tight cursor-pointer hover:underline truncate"
                  >
                    {activeBook.title}
                  </h2>

                  <div className="text-xs text-[#575550] flex flex-wrap items-center gap-x-2 gap-y-0.5 tabular-nums">
                    <span>by <strong className="text-[#2B2A27] font-medium">{activeBook.author}</strong></span>
                    <span aria-hidden="true">·</span>
                    <span>{activeBook.totalPages} {activeBook.totalPages === 1 ? 'Page' : 'Pages'}</span>
                    <span aria-hidden="true">·</span>
                    <span>{activeBook.fileSize || 'PDF'}</span>
                  </div>

                  <div className="space-y-1 pt-1.5 max-w-md">
                    <div className="flex items-center justify-between text-[11px] tabular-nums text-[#575550]">
                      <span>Page {activeBook.currentPage || 1} of {activeBook.totalPages}</span>
                      <span className="font-medium text-[#2B2A27]">{activeBook.progressPercent || 0}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-[#C8C6BE] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#383633] rounded-full transition-all duration-200"
                        style={{ width: `${Math.min(100, Math.max(2, activeBook.progressPercent || 0))}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex sm:flex-col items-center sm:items-end gap-1.5 shrink-0 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-[#C5C3BB]">
                <button
                  onClick={() => onOpenBook(activeBook, 'reflow-ereader')}
                  className="h-8 px-4 bg-[#383633] hover:bg-[#2B2A27] text-[#EAE8E2] border border-[#2B2A27] text-xs font-medium rounded-lg flex items-center justify-center transition cursor-pointer flex-1 sm:flex-initial whitespace-nowrap"
                >
                  Continue Reading
                </button>
                <button
                  onClick={() => onOpenBook(activeBook, 'original-pdf')}
                  className="h-7 px-3 bg-[#E6E4DE] hover:bg-[#D5D3CC] text-[#2B2A27] border border-[#6E6C66] text-[11px] font-medium rounded-lg flex items-center justify-center transition cursor-pointer flex-1 sm:flex-initial whitespace-nowrap"
                >
                  Original PDF
                </button>
              </div>
            </div>
          </section>
        )}

        {/* Section 2: Reading Metrics */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="p-3 rounded-xl bg-[#E2E0DA] border border-[#6E6C66]">
            <div className="text-[11px] font-medium text-[#575550]">Reading Time</div>
            <div className="text-lg sm:text-xl font-sans font-semibold text-[#2B2A27] tabular-nums mt-0.5">
              {formattedReadingTime}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-[#E2E0DA] border border-[#6E6C66]">
            <div className="text-[11px] font-medium text-[#575550]">Daily Streak</div>
            <div className="text-lg sm:text-xl font-sans font-semibold text-[#2B2A27] tabular-nums mt-0.5">
              {stats.currentStreakDays} {stats.currentStreakDays === 1 ? 'Day' : 'Days'}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-[#E2E0DA] border border-[#6E6C66]">
            <div className="text-[11px] font-medium text-[#575550]">Pages Read</div>
            <div className="text-lg sm:text-xl font-sans font-semibold text-[#2B2A27] tabular-nums mt-0.5">
              {stats.totalPagesRead}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-[#E2E0DA] border border-[#6E6C66]">
            <div className="text-[11px] font-medium text-[#575550]">Completed</div>
            <div className="text-lg sm:text-xl font-sans font-semibold text-[#2B2A27] tabular-nums mt-0.5">
              {stats.totalBooksFinished} of {books.length}
            </div>
          </div>
        </section>

        {/* Section 3: Stacks & Filters */}
        <section className="space-y-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5">
            {/* Stacks Filter Bar */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
              <button
                onClick={() => setSelectedStackFilter(null)}
                className={`h-7 px-3 text-xs rounded-lg border transition cursor-pointer whitespace-nowrap shrink-0 ${
                  selectedStackFilter === null
                    ? 'bg-[#383633] text-[#EAE8E2] border-[#2B2A27] font-medium'
                    : 'bg-[#E2E0DA] text-[#2B2A27] border-[#6E6C66] hover:bg-[#D5D3CC]'
                }`}
              >
                All Books ({books.length})
              </button>

              {stacks.map((stack) => {
                const isSelected = selectedStackFilter === stack.id;
                const count = books.filter((b) => b.stackIds?.includes(stack.id)).length;

                return (
                  <div key={stack.id} className="inline-flex items-center shrink-0">
                    <button
                      onClick={() => setSelectedStackFilter(isSelected ? null : stack.id)}
                      className={`h-7 px-3 text-xs border transition cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                        isSelected ? 'rounded-l-lg' : 'rounded-lg'
                      } ${
                        isSelected
                          ? 'bg-[#383633] text-[#EAE8E2] border-[#2B2A27] font-medium'
                          : 'bg-[#E2E0DA] text-[#2B2A27] border-[#6E6C66] hover:bg-[#D5D3CC]'
                      }`}
                    >
                      <span>{stack.name}</span>
                      <span className="opacity-75 tabular-nums">({count})</span>
                    </button>
                    {isSelected && (
                      <button
                        onClick={() => {
                          setSelectedStackFilter(null);
                          onDeleteStack(stack.id);
                        }}
                        className="h-7 px-1.5 bg-[#4A4844] hover:bg-[#6E3B3B] text-[#EAE8E2] border border-l-0 border-[#2B2A27] rounded-r-lg flex items-center justify-center cursor-pointer transition"
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
                className="h-7 px-2.5 text-xs rounded-lg border border-dashed border-[#6E6C66] hover:border-[#2B2A27] bg-[#E2E0DA]/60 hover:bg-[#D5D3CC] text-[#2B2A27] transition cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-1"
              >
                <Plus size={12} />
                <span>New Stack</span>
              </button>
            </div>

            {/* Search & Source Segments */}
            <div className="flex items-center gap-2 shrink-0">
              <div className="relative w-full sm:w-56">
                <input
                  type="text"
                  placeholder="Search title or author..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-7.5 pl-7 pr-6 text-xs bg-[#E2E0DA] border border-[#6E6C66] focus:border-[#2B2A27] rounded-lg text-[#2B2A27] placeholder-[#686660] focus:outline-none"
                />
                <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#575550]" />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-[#575550] hover:text-[#2B2A27] cursor-pointer"
                  >
                    <X size={11} />
                  </button>
                )}
              </div>

              <div className="flex items-center bg-[#D3D1CA] p-0.5 rounded-lg border border-[#6E6C66] shrink-0">
                {(['all', 'local', 'drive', 'finished'] as const).map((src) => (
                  <button
                    key={src}
                    onClick={() => setFilterSource(src)}
                    className={`h-6.5 px-2.5 rounded-md text-[11px] capitalize transition cursor-pointer whitespace-nowrap ${
                      filterSource === src
                        ? 'bg-[#383633] text-[#EAE8E2] font-medium'
                        : 'text-[#4A4843] hover:text-[#2B2A27]'
                    }`}
                  >
                    {src}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Section 4: Compact Library Books Grid with Full Cover Visibility */}
        <section className="bg-[#E2E0DA] border border-[#6E6C66] rounded-xl p-3.5 sm:p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm sm:text-base font-sans font-medium text-[#2B2A27]">
              {selectedStackFilter
                ? stacks.find((s) => s.id === selectedStackFilter)?.name || 'Library'
                : 'Library'}
            </h3>
            <span className="text-xs text-[#575550] tabular-nums">
              {filteredBooks.length} {filteredBooks.length === 1 ? 'Book' : 'Books'}
            </span>
          </div>

          {books.length === 0 ? (
            <div className="py-10 text-center space-y-3">
              <p className="text-xs text-[#575550]">
                No books in your library yet. Upload a PDF document to begin reading.
              </p>
              <button
                onClick={onOpenUploadModal}
                className="h-8 px-4 bg-[#383633] hover:bg-[#2B2A27] text-[#EAE8E2] border border-[#2B2A27] rounded-lg text-xs font-medium cursor-pointer transition"
              >
                Upload PDF
              </button>
            </div>
          ) : filteredBooks.length === 0 ? (
            <div className="py-8 text-center space-y-2">
              <p className="text-xs text-[#575550]">No books match the current filter.</p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedStackFilter(null);
                  setFilterSource('all');
                }}
                className="h-7 px-3 bg-[#383633] text-[#EAE8E2] rounded-lg text-xs font-medium cursor-pointer"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-2.5 sm:gap-3">
              {filteredBooks.map((book) => {
                const pct =
                  book.progressPercent ??
                  Math.round((book.currentPage / Math.max(1, book.totalPages)) * 100);

                return (
                  <div
                    key={book.id}
                    className="flex flex-col group bg-[#DBD9D3] rounded-lg border border-[#6E6C66] hover:border-[#2B2A27] transition duration-150 overflow-hidden"
                  >
                    {/* Full Book Cover Viewable */}
                    <div
                      onClick={() => onOpenBook(book)}
                      className="relative aspect-[3/4] w-full bg-[#D2D0C9] flex items-center justify-center p-2 overflow-hidden cursor-pointer border-b border-[#8C8A83]"
                    >
                      <img
                        src={book.coverUrl}
                        alt={book.title}
                        referrerPolicy="no-referrer"
                        onError={(e) => handleCoverError(e, book)}
                        className="w-full h-full object-contain group-hover:scale-102 transition-transform duration-150"
                      />
                    </div>

                    {/* Book Metadata & Clean Actions */}
                    <div className="p-2 flex-1 flex flex-col justify-between space-y-1.5">
                      <div>
                        <h4
                          onClick={() => onOpenBook(book)}
                          className="text-xs font-sans font-medium text-[#2B2A27] line-clamp-1 group-hover:underline cursor-pointer leading-tight"
                          title={book.title}
                        >
                          {book.title}
                        </h4>
                        <div className="text-[10px] text-[#575550] flex items-center justify-between gap-1 mt-0.5 tabular-nums">
                          <span className="truncate">{book.author}</span>
                          <span className="shrink-0 font-medium text-[#2B2A27]">{pct}%</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-1.5 border-t border-[#C5C3BB] text-[10px]">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => onOpenBook(book, 'reflow-ereader')}
                            className="font-medium text-[#2B2A27] hover:underline cursor-pointer"
                          >
                            Read
                          </button>
                          <span className="text-[#8C8A83]" aria-hidden="true">·</span>
                          <button
                            onClick={() => setEditingBookForStack(book)}
                            className="text-[#575550] hover:text-[#2B2A27] cursor-pointer"
                          >
                            Stacks
                          </button>
                        </div>

                        <button
                          onClick={() => onDeleteBook(book.id)}
                          className="p-0.5 text-[#686660] hover:text-[#7F2D2D] rounded transition cursor-pointer"
                          title="Delete Book"
                        >
                          <Trash2 size={11} />
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

      {/* Modal: Create New Stack */}
      {isNewStackModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs font-sans">
          <div className="w-full max-w-sm bg-[#E2E0DA] rounded-xl shadow-xl border border-[#5A5852] p-5 space-y-4 text-[#2B2A27]">
            <div className="flex items-center justify-between border-b border-[#B8B6AF] pb-2.5">
              <h3 className="font-sans font-semibold text-sm sm:text-base">New Reading Stack</h3>
              <button
                onClick={() => setIsNewStackModalOpen(false)}
                className="text-[#575550] hover:text-[#2B2A27] p-1 rounded cursor-pointer"
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
                  className="w-full h-8 px-2.5 text-xs bg-[#DBD9D3] border border-[#6E6C66] rounded-lg focus:outline-none focus:border-[#2B2A27]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">Description (Optional)</label>
                <input
                  type="text"
                  placeholder="Optional notes"
                  value={newStackDesc}
                  onChange={(e) => setNewStackDesc(e.target.value)}
                  className="w-full h-8 px-2.5 text-xs bg-[#DBD9D3] border border-[#6E6C66] rounded-lg focus:outline-none focus:border-[#2B2A27]"
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
                        newStackColor === c ? 'border-[#2B2A27] scale-110' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#B8B6AF]">
                <button
                  type="button"
                  onClick={() => setIsNewStackModalOpen(false)}
                  className="h-8 px-3 text-xs text-[#575550] hover:text-[#2B2A27] rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="h-8 px-4 text-xs font-medium bg-[#383633] hover:bg-[#2B2A27] text-[#EAE8E2] rounded-lg cursor-pointer transition"
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
          <div className="w-full max-w-sm bg-[#E2E0DA] rounded-xl shadow-xl border border-[#5A5852] p-5 space-y-3.5 text-[#2B2A27]">
            <div className="flex items-center justify-between border-b border-[#B8B6AF] pb-2.5">
              <div className="min-w-0">
                <h3 className="font-sans font-semibold text-sm">Assign to Stacks</h3>
                <p className="text-xs text-[#575550] truncate mt-0.5">{editingBookForStack.title}</p>
              </div>
              <button
                onClick={() => setEditingBookForStack(null)}
                className="text-[#575550] hover:text-[#2B2A27] p-1 rounded cursor-pointer shrink-0"
              >
                <X size={15} />
              </button>
            </div>

            {stacks.length === 0 ? (
              <p className="text-xs text-[#575550] py-4 text-center">
                No stacks created yet. Use "+ New Stack" to create one.
              </p>
            ) : (
              <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                {stacks.map((stack) => {
                  const currentBook = books.find((b) => b.id === editingBookForStack.id) || editingBookForStack;
                  const isSelected = currentBook.stackIds?.includes(stack.id);
                  return (
                    <button
                      key={stack.id}
                      onClick={() => onToggleBookInStack(editingBookForStack.id, stack.id)}
                      className={`w-full p-2.5 rounded-lg border flex items-center justify-between text-left transition cursor-pointer text-xs ${
                        isSelected
                          ? 'border-[#2B2A27] bg-[#D2D0C9] font-medium'
                          : 'border-[#8C8A83] hover:bg-[#D5D3CC] text-[#2B2A27]'
                      }`}
                    >
                      <span>{stack.name}</span>
                      {isSelected && <Check size={14} className="text-[#2B2A27]" />}
                    </button>
                  );
                })}
              </div>
            )}

            <div className="flex justify-end pt-2 border-t border-[#B8B6AF]">
              <button
                onClick={() => setEditingBookForStack(null)}
                className="h-8 px-4 text-xs font-medium bg-[#383633] hover:bg-[#2B2A27] text-[#EAE8E2] rounded-lg cursor-pointer transition"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
