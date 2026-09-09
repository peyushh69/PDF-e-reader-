import React, { useState, useRef, useLayoutEffect, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  Highlighter,
  FileEdit,
  Copy,
  Trash2,
  Check,
  X,
  MessageSquare,
} from 'lucide-react';
import { Highlight } from '../types';

export const HIGHLIGHT_COLORS = [
  { id: 'yellow', name: 'Yellow', hex: '#facc15', bgLight: 'rgba(250, 204, 21, 0.40)', bgDark: 'rgba(250, 204, 21, 0.35)', border: '#eab308' },
  { id: 'blue', name: 'Blue', hex: '#38bdf8', bgLight: 'rgba(56, 189, 248, 0.40)', bgDark: 'rgba(56, 189, 248, 0.35)', border: '#0284c7' },
  { id: 'pink', name: 'Pink', hex: '#f472b6', bgLight: 'rgba(244, 114, 182, 0.40)', bgDark: 'rgba(244, 114, 182, 0.35)', border: '#db2777' },
  { id: 'green', name: 'Green', hex: '#4ade80', bgLight: 'rgba(74, 222, 128, 0.40)', bgDark: 'rgba(74, 222, 128, 0.35)', border: '#16a34a' },
  { id: 'orange', name: 'Orange', hex: '#fb923c', bgLight: 'rgba(251, 146, 60, 0.40)', bgDark: 'rgba(251, 146, 60, 0.35)', border: '#ea580c' },
  { id: 'purple', name: 'Purple', hex: '#c084fc', bgLight: 'rgba(192, 132, 252, 0.40)', bgDark: 'rgba(192, 132, 252, 0.35)', border: '#9333ea' },
];

export interface SelectionRangeData {
  text: string;
  pageNumber: number;
  rect: {
    top: number;
    left: number;
    bottom: number;
    right: number;
    width: number;
    height: number;
  };
  existingHighlight?: Highlight;
  blockIndex?: number;
  startOffset?: number;
  endOffset?: number;
}

interface KindleAnnotationToolbarProps {
  selection: SelectionRangeData | null;
  onClose: () => void;
  onHighlight?: (text: string, pageNumber: number, colorHex: string, note?: string, blockIndex?: number, startOffset?: number, endOffset?: number) => void;
  onApplyHighlight?: (text: string, pageNumber: number, colorHex: string, note?: string, blockIndex?: number, startOffset?: number, endOffset?: number) => void;
  onUpdateHighlight?: (highlight: Highlight) => void;
  onDeleteHighlight?: (highlightId: string) => void;
  isDarkTheme?: boolean;
}

export const KindleAnnotationToolbar: React.FC<KindleAnnotationToolbarProps> = ({
  selection,
  onClose,
  onHighlight,
  onApplyHighlight,
  onUpdateHighlight,
  onDeleteHighlight,
}) => {
  const [selectedColor, setSelectedColor] = useState<string>('#facc15');
  const [isNoteEditorOpen, setIsNoteEditorOpen] = useState<boolean>(false);
  const [noteText, setNoteText] = useState<string>('');
  const [copiedToast, setCopiedToast] = useState<boolean>(false);

  const applyHighlightCallback = onApplyHighlight || onHighlight;
  const toolbarRef = useRef<HTMLDivElement | null>(null);

  if (!selection) return null;

  const existing = selection.existingHighlight;
  const activeColor = existing ? existing.color : selectedColor;

  const handleApplyHighlight = (colorHex: string) => {
    setSelectedColor(colorHex);
    if (existing && onUpdateHighlight) {
      onUpdateHighlight({
        ...existing,
        color: colorHex,
      });
    } else if (applyHighlightCallback) {
      applyHighlightCallback(
        selection.text,
        selection.pageNumber,
        colorHex,
        existing?.note,
        selection.blockIndex,
        selection.startOffset,
        selection.endOffset
      );
    }
    onClose();
  };

  const handleCopy = async () => {
    try {
      if (navigator.clipboard && selection.text) {
        await navigator.clipboard.writeText(selection.text);
      }
      setCopiedToast(true);
      setTimeout(() => {
        setCopiedToast(false);
        onClose();
      }, 900);
    } catch (e) {
      console.warn('Copy failed:', e);
      onClose();
    }
  };

  const handleOpenNoteEditor = () => {
    setNoteText(existing?.note || '');
    setIsNoteEditorOpen(true);
  };

  const handleSaveNote = () => {
    if (existing && onUpdateHighlight) {
      onUpdateHighlight({
        ...existing,
        note: noteText.trim() || undefined,
        color: activeColor,
      });
    } else if (applyHighlightCallback) {
      applyHighlightCallback(
        selection.text,
        selection.pageNumber,
        activeColor,
        noteText.trim() || undefined,
        selection.blockIndex,
        selection.startOffset,
        selection.endOffset
      );
    }
    setIsNoteEditorOpen(false);
    onClose();
  };

  const handleDelete = () => {
    if (existing && onDeleteHighlight) {
      onDeleteHighlight(existing.id);
    }
    setIsNoteEditorOpen(false);
    onClose();
  };

  // Compute smart viewport positioning (guarantee it NEVER covers the selected text)
  const screenWidth = typeof window !== 'undefined' ? window.innerWidth : 800;
  const screenHeight = typeof window !== 'undefined' ? window.innerHeight : 600;
  const toolbarWidth = Math.min(screenWidth - 24, 330);
  const estimatedToolbarHeight = 84;
  const gap = 16; // strict safety clearance

  const centerX = selection.rect.left + selection.rect.width / 2;
  const leftPos = Math.max(12, Math.min(screenWidth - toolbarWidth - 12, centerX - toolbarWidth / 2));

  // Determine top position:
  // If there's enough space above the selection (at least 90px from screen top), open ABOVE
  // Otherwise open safely BELOW selection.rect.bottom
  let topPos: number;
  let isPlacedAbove = true;

  if (selection.rect.top >= estimatedToolbarHeight + gap + 50) {
    topPos = selection.rect.top - estimatedToolbarHeight - gap;
    isPlacedAbove = true;
  } else {
    topPos = selection.rect.bottom + gap;
    isPlacedAbove = false;
  }

  // Safety clamp so toolbar is never clipped by screen borders
  topPos = Math.max(10, Math.min(screenHeight - estimatedToolbarHeight - 10, topPos));

  // Escape key listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Outside click listener
  useEffect(() => {
    const handleDocumentPointerDown = (e: MouseEvent | TouchEvent) => {
      if (isNoteEditorOpen) return;
      const target = e.target as Node | null;
      if (toolbarRef.current && target && toolbarRef.current.contains(target)) {
        return;
      }
      setTimeout(() => {
        const sel = window.getSelection();
        if (!sel || sel.isCollapsed) {
          onClose();
        }
      }, 80);
    };

    document.addEventListener('mousedown', handleDocumentPointerDown);
    document.addEventListener('touchstart', handleDocumentPointerDown, { passive: true });
    return () => {
      document.removeEventListener('mousedown', handleDocumentPointerDown);
      document.removeEventListener('touchstart', handleDocumentPointerDown);
    };
  }, [onClose, isNoteEditorOpen]);

  const toolbarNode = (
    <>
      {/* Floating Kindle Selection Action Menu via Portal to document.body */}
      {!isNoteEditorOpen && (
        <div
          ref={toolbarRef}
          className="fixed z-[999999] animate-in fade-in zoom-in-95 duration-150 select-none font-sans pointer-events-auto shadow-2xl"
          style={{
            top: `${topPos}px`,
            left: `${leftPos}px`,
            width: `${toolbarWidth}px`,
          }}
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className="bg-black text-white rounded-2xl shadow-2xl border border-stone-800 p-2.5 flex flex-col gap-2 ring-1 ring-white/10">
            {/* Direct Highlight Color Palette Bar */}
            <div className="flex items-center justify-between px-2 py-1.5 bg-stone-900 rounded-xl">
              <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider mr-1">
                Colors:
              </span>
              <div className="flex items-center gap-1.5">
                {HIGHLIGHT_COLORS.map((c) => {
                  const isSelected = activeColor === c.hex;
                  return (
                    <button
                      key={c.id}
                      onClick={() => handleApplyHighlight(c.hex)}
                      onMouseDown={(e) => e.preventDefault()}
                      className={`w-6 h-6 rounded-full flex items-center justify-center transition-all hover:scale-115 active:scale-95 cursor-pointer relative shadow-sm ${
                        isSelected ? 'ring-2 ring-white scale-110' : 'opacity-90 hover:opacity-100'
                      }`}
                      style={{ backgroundColor: c.hex }}
                      title={`Highlight in ${c.name}`}
                    >
                      {isSelected && (
                        <Check size={12} className="text-black stroke-[3]" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Primary Action Buttons Bar */}
            <div className="flex items-center justify-between px-1 py-0.5 text-xs">
              {/* 1. Quick Highlight in Current Color */}
              <button
                onClick={() => handleApplyHighlight(activeColor || '#facc15')}
                onMouseDown={(e) => e.preventDefault()}
                className="flex-1 flex items-center justify-center gap-1.5 py-1 px-1.5 rounded-lg transition hover:bg-stone-800 active:scale-95 cursor-pointer"
                title="Highlight text"
              >
                <div
                  className="w-3.5 h-3.5 rounded-full border border-stone-600 shadow-xs"
                  style={{ backgroundColor: activeColor || '#facc15' }}
                />
                <span className="text-[11px] font-medium text-stone-200">Highlight</span>
              </button>

              <div className="w-px h-5 bg-stone-800 mx-1" />

              {/* 2. Note Button */}
              <button
                onClick={handleOpenNoteEditor}
                onMouseDown={(e) => e.preventDefault()}
                className="flex-1 flex items-center justify-center gap-1.5 py-1 px-1.5 rounded-lg hover:bg-stone-800 active:scale-95 transition cursor-pointer text-stone-300 hover:text-white"
                title="Attach note to selection"
              >
                <FileEdit size={13} />
                <span className="text-[11px] font-medium">
                  {existing?.note ? 'Edit Note' : 'Note'}
                </span>
              </button>

              <div className="w-px h-5 bg-stone-800 mx-1" />

              {/* 3. Copy Button */}
              <button
                onClick={handleCopy}
                onMouseDown={(e) => e.preventDefault()}
                className="flex-1 flex items-center justify-center gap-1.5 py-1 px-1.5 rounded-lg hover:bg-stone-800 active:scale-95 transition cursor-pointer text-stone-300 hover:text-white"
                title="Copy quote to clipboard"
              >
                {copiedToast ? (
                  <>
                    <Check size={13} className="text-white" />
                    <span className="text-[11px] font-medium text-white">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy size={13} />
                    <span className="text-[11px] font-medium">Copy</span>
                  </>
                )}
              </button>

              {/* 4. Optional Delete Button */}
              {existing && (
                <>
                  <div className="w-px h-5 bg-stone-800 mx-1" />
                  <button
                    onClick={handleDelete}
                    onMouseDown={(e) => e.preventDefault()}
                    className="flex-none p-1.5 rounded-lg hover:bg-stone-800 text-stone-400 hover:text-white active:scale-95 transition cursor-pointer"
                    title="Remove Highlight"
                  >
                    <Trash2 size={13} />
                  </button>
                </>
              )}

              {/* 5. Close Button */}
              <div className="w-px h-5 bg-stone-800 mx-1" />
              <button
                onClick={onClose}
                onMouseDown={(e) => e.preventDefault()}
                className="flex-none p-1.5 rounded-lg hover:bg-stone-800 text-stone-400 hover:text-white active:scale-95 transition cursor-pointer"
                title="Close"
              >
                <X size={13} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Note Editor Modal Dialog */}
      <AnimatePresence>
        {isNoteEditorOpen && (
          <div
            className="fixed inset-0 z-[999999] flex items-center justify-center p-3 bg-black/80 backdrop-blur-xs animate-in fade-in"
            onClick={() => setIsNoteEditorOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-stone-950 border border-stone-800 text-white rounded-2xl shadow-2xl p-4 sm:p-5 flex flex-col gap-3 font-sans"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-stone-800 pb-2.5">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-stone-800 text-white flex items-center justify-center border border-stone-700">
                    <MessageSquare size={14} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">
                      {existing?.note ? 'Edit Note' : 'Add Note to Quote'}
                    </h3>
                    <p className="text-[10px] text-stone-400">Page {selection.pageNumber}</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsNoteEditorOpen(false)}
                  className="p-1 hover:bg-stone-800 rounded-full text-stone-400 hover:text-white transition cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Quote Preview */}
              <div className="bg-black rounded-xl p-3 border border-stone-800 text-xs font-serif italic text-stone-300 max-h-24 overflow-y-auto leading-relaxed border-l-3 border-l-stone-400">
                “{selection.text}”
              </div>

              {/* Highlight Color Picker */}
              <div className="flex items-center justify-between text-xs py-1">
                <span className="text-[11px] text-stone-400 font-medium">Highlight Color:</span>
                <div className="flex items-center gap-1.5">
                  {HIGHLIGHT_COLORS.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setSelectedColor(c.hex)}
                      className={`w-6 h-6 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                        selectedColor === c.hex ? 'ring-2 ring-white scale-110' : 'opacity-80 hover:opacity-100'
                      }`}
                      style={{ backgroundColor: c.hex }}
                      title={c.name}
                    >
                      {selectedColor === c.hex && (
                        <Check size={12} className="text-black stroke-[3]" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Note Textarea */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-stone-300">Your Thoughts / Notes:</label>
                <textarea
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="Type your notes, analysis, or reflections here..."
                  rows={4}
                  autoFocus
                  className="w-full bg-stone-900 border border-stone-700 rounded-xl p-3 text-xs text-white placeholder:text-stone-500 focus:outline-none focus:border-white transition leading-relaxed resize-none"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-2 border-t border-stone-800">
                {existing ? (
                  <button
                    onClick={handleDelete}
                    className="flex items-center gap-1.5 text-xs text-stone-400 hover:text-white px-3 py-1.5 rounded-lg hover:bg-stone-800 transition cursor-pointer"
                  >
                    <Trash2 size={13} />
                    <span>Delete Highlight</span>
                  </button>
                ) : (
                  <div />
                )}

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsNoteEditorOpen(false)}
                    className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-stone-800 text-stone-300 hover:bg-stone-700 transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveNote}
                    className="px-4 py-1.5 text-xs font-bold rounded-lg bg-white hover:bg-stone-200 text-black shadow-md transition cursor-pointer"
                  >
                    Save Note
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );

  if (typeof document !== 'undefined' && document.body) {
    return createPortal(toolbarNode, document.body);
  }

  return toolbarNode;
};
