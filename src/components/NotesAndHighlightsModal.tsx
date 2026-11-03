import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Highlighter,
  MessageSquare,
  Trash2,
  X,
  Search,
  ExternalLink,
  BookOpen,
  Filter,
} from 'lucide-react';
import { Book, Highlight } from '../types';
import { HIGHLIGHT_COLORS } from './AnnotationToolbar';

interface NotesAndHighlightsModalProps {
  isOpen: boolean;
  onClose: () => void;
  book?: Book;
  bookTitle?: string;
  highlights?: Highlight[];
  onJumpToPage: (page: number) => void;
  onDeleteHighlight: (highlightId: string) => void;
  onEditHighlight?: (highlight: Highlight) => void;
  isDarkTheme?: boolean;
}

export const NotesAndHighlightsModal: React.FC<NotesAndHighlightsModalProps> = ({
  isOpen,
  onClose,
  book,
  bookTitle,
  highlights: propHighlights,
  onJumpToPage,
  onDeleteHighlight,
  onEditHighlight,
  isDarkTheme = true,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [colorFilter, setColorFilter] = useState<string>('all');

  if (!isOpen) return null;

  const highlights = propHighlights || book?.highlights || [];
  const displayTitle = bookTitle || book?.title || 'Book';

  const filteredHighlights = highlights.filter((h) => {
    const matchesSearch =
      (h.text || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (h.note && h.note.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesColor = colorFilter === 'all' || (h.color || '').toLowerCase() === colorFilter.toLowerCase();
    return matchesSearch && matchesColor;
  });

  // Sort by page number ascending
  filteredHighlights.sort((a, b) => (a.pageNumber || 0) - (b.pageNumber || 0));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs animate-in fade-in"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl bg-stone-900 border border-stone-700 text-stone-100 rounded-2xl shadow-2xl p-4 sm:p-6 flex flex-col gap-4 font-sans max-h-[88vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-800 pb-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-stone-800 text-white flex items-center justify-center border border-stone-700">
              <Highlighter size={16} />
            </div>
            <div>
              <h2 className="text-base font-bold flex items-center gap-2 text-white">
                <span>Notes & Highlights</span>
                <span className="text-xs font-mono font-normal px-2 py-0.5 rounded-full bg-stone-800 text-stone-300 border border-stone-700">
                  {highlights.length}
                </span>
              </h2>
              <p className="text-[11px] text-stone-400 truncate max-w-sm">{displayTitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-stone-800 rounded-full text-stone-400 hover:text-white transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Search & Filter Bar */}
        <div className="flex flex-col sm:flex-row items-center gap-2 shrink-0">
          <div className="relative flex-1 w-full">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search highlights and notes..."
              className="w-full bg-stone-950 border border-stone-700 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder:text-stone-500 focus:outline-none focus:border-white"
            />
          </div>

          {/* Color Filter Swatches */}
          <div className="flex items-center gap-1.5 self-start sm:self-auto bg-stone-950 p-1 rounded-xl border border-stone-800">
            <button
              onClick={() => setColorFilter('all')}
              className={`px-2 py-0.5 text-[10px] font-semibold rounded-lg transition cursor-pointer ${
                colorFilter === 'all' ? 'bg-white text-black font-bold' : 'text-stone-400 hover:text-white'
              }`}
            >
              All
            </button>
            {HIGHLIGHT_COLORS.map((c) => (
              <button
                key={c.id}
                onClick={() => setColorFilter(c.hex)}
                className={`w-4.5 h-4.5 rounded-full transition-transform cursor-pointer ${
                  colorFilter.toLowerCase() === c.hex.toLowerCase() ? 'ring-2 ring-white scale-110' : 'opacity-70 hover:opacity-100'
                }`}
                style={{ backgroundColor: c.hex }}
                title={`Filter ${c.name}`}
              />
            ))}
          </div>
        </div>

        {/* Highlights List */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-3 min-h-[180px]">
          {filteredHighlights.length === 0 ? (
            <div className="h-44 flex flex-col items-center justify-center text-center space-y-2 text-stone-400">
              <BookOpen size={28} className="opacity-30" />
              <p className="text-xs">
                {highlights.length === 0
                  ? 'No highlights or notes yet. Long-press or select text while reading to add one!'
                  : 'No annotations match your search query.'}
              </p>
            </div>
          ) : (
            filteredHighlights.map((h) => {
              return (
                <div
                  key={h.id}
                  className="bg-stone-950/70 border border-stone-800 rounded-xl p-3.5 space-y-2.5 transition hover:border-stone-700 relative group"
                >
                  {/* Top: Page and Action Buttons */}
                  <div className="flex items-center justify-between text-xs">
                    <button
                      onClick={() => {
                        onJumpToPage(h.pageNumber);
                        onClose();
                      }}
                      className="flex items-center gap-1.5 text-white hover:text-stone-300 font-mono font-bold hover:underline cursor-pointer"
                    >
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: h.color }} />
                      <span>Page {h.pageNumber}</span>
                      <ExternalLink size={11} className="opacity-70" />
                    </button>

                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-stone-500">
                        {new Date(h.createdAt).toLocaleDateString()}
                      </span>
                      <button
                        onClick={() => onDeleteHighlight(h.id)}
                        className="p-1 text-stone-500 hover:text-stone-200 hover:bg-stone-800 rounded transition cursor-pointer"
                        title="Delete highlight"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  {/* Quoted Text */}
                  <div
                    className="p-2.5 rounded-lg text-xs font-serif leading-relaxed italic border-l-2"
                    style={{
                      backgroundColor: `${h.color}15`,
                      borderLeftColor: h.color,
                      color: '#f3f4f6',
                    }}
                  >
                    “{h.text}”
                  </div>

                  {/* Attached Note if present */}
                  {h.note && (
                    <div className="flex items-start gap-2 bg-stone-900/90 rounded-lg p-2.5 border border-stone-800 text-xs text-stone-200">
                      <MessageSquare size={13} className="text-stone-400 shrink-0 mt-0.5" />
                      <div className="space-y-0.5">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                          Your Note
                        </div>
                        <p className="leading-relaxed font-sans text-stone-300">{h.note}</p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </motion.div>
    </div>
  );
};
