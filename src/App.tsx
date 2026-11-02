import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Book,
  ReadingStats,
  ReadingStack,
  Highlight,
  DeviceHardwareTheme,
  EnvironmentBackground,
  EyeProtectionSettings,
  ThemeMode,
  PdfReadingMode,
} from './types';
import { INITIAL_BOOKS, INITIAL_STATS, DEFAULT_STACKS } from './data/sampleBooks';
import { DeviceFrame } from './components/DeviceFrame';
import { DashboardView } from './components/DashboardView';
import { ReadingInterface } from './components/ReadingInterface';
import { UploadModal } from './components/UploadModal';
import { GoogleDriveModal } from './components/GoogleDriveModal';
import { ThemeAndEyeProtectionModal } from './components/ThemeAndEyeProtectionModal';
import { deletePdfFromStorage, createBookCoverDataUrl } from './utils/pdfStorage';

const STORAGE_KEY_BOOKS = 'ereader_pdf_books_v7';
const STORAGE_KEY_STACKS = 'ereader_pdf_stacks_v7';
const STORAGE_KEY_STATS = 'ereader_stats_v8';
const STORAGE_KEY_SETTINGS = 'ereader_settings_v7';

interface PersistedCustomization {
  hardwareTheme: DeviceHardwareTheme;
  environmentBg: EnvironmentBackground;
  eyeProtection: EyeProtectionSettings;
  readingTheme: ThemeMode;
}

const DEFAULT_CUSTOMIZATION: PersistedCustomization = {
  hardwareTheme: 'black-paperwhite',
  environmentBg: 'linen-bed',
  eyeProtection: {
    enabled: false,
    warmth: 4,
    brightness: 16,
    blueLightFilter: true,
    preset: 'afternoon',
  },
  readingTheme: 'light',
};

const LEGACY_DEFAULT_STACK_IDS = new Set([
  'stack-reading',
  'stack-favorites',
  'stack-research',
  'stack-toread',
]);

function sanitizeBooksList(rawBooks: any[]): Book[] {
  return rawBooks
    .filter(
      (b) =>
        b &&
        b.format === 'pdf' &&
        b.id &&
        b.title &&
        !String(b.id).startsWith('book-')
    )
    .map((book) => {
      const hasValidCover =
        book.coverUrl &&
        (book.coverUrl.startsWith('data:image/') || !book.coverUrl.includes('images.unsplash.com'));

      const coverUrl = hasValidCover
        ? book.coverUrl
        : createBookCoverDataUrl({
            title: book.title || 'Document',
            author: book.author || 'PDF Document',
            subtitle: book.source === 'drive' ? 'Cloud Document' : 'PDF Document',
          });

      return {
        ...book,
        coverUrl,
        totalPages: Math.max(1, book.totalPages || 1),
        currentPage: Math.max(1, Math.min(book.currentPage || 1, Math.max(1, book.totalPages || 1))),
        bookmarks: Array.isArray(book.bookmarks) ? book.bookmarks : [],
        highlights: Array.isArray(book.highlights) ? book.highlights : [],
        stackIds: Array.isArray(book.stackIds)
          ? book.stackIds.filter((id: string) => !LEGACY_DEFAULT_STACK_IDS.has(id))
          : [],
        pdfDataUrl:
          book.pdfDataUrl && book.pdfDataUrl.startsWith('blob:') ? undefined : book.pdfDataUrl,
      };
    });
}

export default function App() {
  const [stacks, setStacks] = useState<ReadingStack[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_STACKS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Stacks storage read error:', e);
    }
    return DEFAULT_STACKS;
  });

  const [books, setBooks] = useState<Book[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_BOOKS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const sanitized = sanitizeBooksList(parsed);
          if (sanitized.length > 0) {
            return sanitized;
          }
        }
      }
    } catch (e) {
      console.warn('Books storage read error:', e);
    }
    return INITIAL_BOOKS;
  });

  const [stats, setStats] = useState<ReadingStats>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_STATS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed.totalHours === 'number') {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Stats storage read error:', e);
    }
    return INITIAL_STATS;
  });

  const [hardwareTheme, setHardwareTheme] = useState<DeviceHardwareTheme>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SETTINGS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.hardwareTheme) return parsed.hardwareTheme;
      }
    } catch (e) {}
    return DEFAULT_CUSTOMIZATION.hardwareTheme;
  });

  const [environmentBg, setEnvironmentBg] = useState<EnvironmentBackground>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SETTINGS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.environmentBg) return parsed.environmentBg;
      }
    } catch (e) {}
    return DEFAULT_CUSTOMIZATION.environmentBg;
  });

  const [eyeProtection, setEyeProtection] = useState<EyeProtectionSettings>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SETTINGS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.eyeProtection) return parsed.eyeProtection;
      }
    } catch (e) {}
    return DEFAULT_CUSTOMIZATION.eyeProtection;
  });

  const [readingTheme, setReadingTheme] = useState<ThemeMode>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SETTINGS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.readingTheme) return parsed.readingTheme;
      }
    } catch (e) {}
    return DEFAULT_CUSTOMIZATION.readingTheme;
  });

  const [currentView, setCurrentView] = useState<'dashboard' | 'reading'>('dashboard');
  const [activeBookId, setActiveBookId] = useState<string>(INITIAL_BOOKS[0]?.id || '');

  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isDriveOpen, setIsDriveOpen] = useState(false);
  const [isThemeModalOpen, setIsThemeModalOpen] = useState(false);

  const hasHydratedFromServer = useRef(false);

  // Hydrate from backend server on mount if available
  useEffect(() => {
    let mounted = true;
    fetch('/api/state')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!mounted || !data?.state) {
          hasHydratedFromServer.current = true;
          return;
        }
        const srv = data.state;
        if (Array.isArray(srv.books) && srv.books.length > 0 && !localStorage.getItem(STORAGE_KEY_BOOKS)) {
          setBooks(sanitizeBooksList(srv.books));
        }
        if (Array.isArray(srv.stacks) && srv.stacks.length > 0 && !localStorage.getItem(STORAGE_KEY_STACKS)) {
          const cleanStacks = srv.stacks.filter(
            (s: any) => s && s.id && !LEGACY_DEFAULT_STACK_IDS.has(String(s.id))
          );
          setStacks(cleanStacks);
        }
        if (srv.stats && !localStorage.getItem(STORAGE_KEY_STATS)) {
          setStats(srv.stats);
        }
        hasHydratedFromServer.current = true;
      })
      .catch(() => {
        hasHydratedFromServer.current = true;
      });
    return () => {
      mounted = false;
    };
  }, []);

  // Save to localStorage and sync to backend server
  useEffect(() => {
    try {
      const serializableBooks = books.map((b) => ({
        ...b,
        pdfFile: undefined,
        // Avoid storing transient blob URLs or huge base64 PDFs for sample books in localStorage
        pdfDataUrl:
          b.pdfDataUrl && b.pdfDataUrl.startsWith('blob:')
            ? undefined
            : b.id.startsWith('book-')
            ? undefined
            : b.pdfDataUrl,
      }));
      localStorage.setItem(STORAGE_KEY_BOOKS, JSON.stringify(serializableBooks));
    } catch (e) {
      console.warn('Books localStorage save notice:', e);
    }
  }, [books]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_STACKS, JSON.stringify(stacks));
    } catch (e) {}
  }, [stacks]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_STATS, JSON.stringify(stats));
    } catch (e) {}
  }, [stats]);

  useEffect(() => {
    try {
      const settingsPayload: PersistedCustomization = {
        hardwareTheme,
        environmentBg,
        eyeProtection,
        readingTheme,
      };
      localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settingsPayload));
    } catch (e) {}
  }, [hardwareTheme, environmentBg, eyeProtection, readingTheme]);

  // Debounced sync to Express Backend Server
  useEffect(() => {
    const timer = setTimeout(() => {
      const compactBooks = books.map((b) => ({
        ...b,
        pdfFile: undefined,
        pdfDataUrl: b.pdfDataUrl?.startsWith('blob:') ? undefined : b.pdfDataUrl,
      }));
      fetch('/api/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          books: compactBooks,
          stacks,
          stats,
          settings: { hardwareTheme, environmentBg, eyeProtection, readingTheme },
        }),
      }).catch(() => {});
    }, 600);
    return () => clearTimeout(timer);
  }, [books, stacks, stats, hardwareTheme, environmentBg, eyeProtection, readingTheme]);

  // Computed stats enriched with live book metrics
  const computedStats = useMemo<ReadingStats>(() => {
    const finishedCount = books.filter((b) => b.isFinished || (b.progressPercent || 0) >= 100).length;
    const pagesReadCount = books.reduce((sum, b) => {
      const readPages = b.progressPercent > 0 ? Math.max(1, b.currentPage || 1) : 0;
      return sum + readPages;
    }, 0);
    return {
      ...stats,
      totalBooksFinished: finishedCount,
      totalPagesRead: Math.max(stats.totalPagesRead || 0, pagesReadCount),
    };
  }, [stats, books]);

  const currentlyReadingBook = useMemo(() => {
    if (books.length === 0) return null;
    const sorted = [...books].sort((a, b) => {
      const timeA = a.lastReadTimestamp || (a.lastReadDate ? new Date(a.lastReadDate).getTime() : 0);
      const timeB = b.lastReadTimestamp || (b.lastReadDate ? new Date(b.lastReadDate).getTime() : 0);
      return timeB - timeA;
    });
    return sorted[0];
  }, [books]);

  const activeBook = books.find((b) => b.id === activeBookId) || currentlyReadingBook || books[0];

  const handleOpenBook = (book: Book, mode?: PdfReadingMode) => {
    setActiveBookId(book.id);
    setCurrentView('reading');

    const now = Date.now();
    const today = new Date().toISOString().split('T')[0];

    setStats((prev) => ({
      ...prev,
      totalSessions: prev.totalSessions + 1,
      currentStreakDays: prev.currentStreakDays === 0 ? 1 : prev.currentStreakDays,
    }));

    setBooks((prev) =>
      prev.map((b) =>
        b.id === book.id
          ? {
              ...b,
              lastReadDate: today,
              lastReadTimestamp: now,
              ...(mode ? { preferredReadingMode: mode } : {}),
            }
          : b
      )
    );
  };

  const handleBackToDashboard = () => {
    setCurrentView('dashboard');
  };

  const handleUpdateProgress = (bookId: string, newPage: number, secondsRead: number) => {
    const now = Date.now();
    const today = new Date().toISOString().split('T')[0];

    setBooks((prev) =>
      prev.map((b) => {
        if (b.id === bookId) {
          const validTotal = Math.max(1, b.totalPages || 1);
          const clampedPage = Math.max(1, Math.min(newPage, validTotal));
          const pageChanged = clampedPage !== b.currentPage;
          const progressPercent = pageChanged
            ? Math.round((clampedPage / validTotal) * 100)
            : b.progressPercent || Math.round((clampedPage / validTotal) * 100);
          const isFinished = clampedPage >= validTotal && (pageChanged || b.isFinished || progressPercent >= 100);
          const addedMinutes = secondsRead > 0 ? Number((secondsRead / 60).toFixed(2)) : 0;

          return {
            ...b,
            currentPage: clampedPage,
            progressPercent,
            isFinished,
            totalTimeReadMinutes: Number(((b.totalTimeReadMinutes || 0) + addedMinutes).toFixed(2)),
            lastReadDate: today,
            lastReadTimestamp: now,
          };
        }
        return b;
      })
    );

    if (secondsRead > 0) {
      setStats((prev) => {
        const addedHours = secondsRead / 3600;
        const newTotalHours = Number((prev.totalHours + addedHours).toFixed(2));
        const newWeeklyHours = Number((prev.weeklyHoursLogged + addedHours).toFixed(2));
        const totalMinutes = newTotalHours * 60;
        const sessions = Math.max(1, prev.totalSessions);
        const avgMins = Math.max(1, Math.round(totalMinutes / sessions));

        return {
          ...prev,
          totalHours: newTotalHours,
          weeklyHoursLogged: newWeeklyHours,
          avgMinutesPerSession: avgMins,
        };
      });
    }
  };

  const handleAddBookmark = (bookId: string, pageNumber: number) => {
    setBooks((prev) =>
      prev.map((b) => {
        if (b.id === bookId) {
          const exists = b.bookmarks.some((bm) => bm.pageNumber === pageNumber);
          const updatedBookmarks = exists
            ? b.bookmarks.filter((bm) => bm.pageNumber !== pageNumber)
            : [
                ...b.bookmarks,
                {
                  id: `bm-${Date.now()}`,
                  pageNumber,
                  label: `Page ${pageNumber}`,
                  createdAt: new Date().toISOString(),
                },
              ];
          return { ...b, bookmarks: updatedBookmarks };
        }
        return b;
      })
    );
  };

  const handleAddHighlight = (bookId: string, highlight: Highlight) => {
    setBooks((prev) =>
      prev.map((b) => {
        if (b.id === bookId) {
          const currentHighlights = Array.isArray(b.highlights) ? b.highlights : [];
          const existing = currentHighlights.filter((h) => h.id !== highlight.id);
          return {
            ...b,
            highlights: [...existing, highlight],
          };
        }
        return b;
      })
    );
  };

  const handleUpdateHighlight = (bookId: string, highlight: Highlight) => {
    setBooks((prev) =>
      prev.map((b) => {
        if (b.id === bookId) {
          const currentHighlights = Array.isArray(b.highlights) ? b.highlights : [];
          return {
            ...b,
            highlights: currentHighlights.map((h) => (h.id === highlight.id ? highlight : h)),
          };
        }
        return b;
      })
    );
  };

  const handleDeleteHighlight = (bookId: string, highlightId: string) => {
    setBooks((prev) =>
      prev.map((b) => {
        if (b.id === bookId) {
          const currentHighlights = Array.isArray(b.highlights) ? b.highlights : [];
          return {
            ...b,
            highlights: currentHighlights.filter((h) => h.id !== highlightId),
          };
        }
        return b;
      })
    );
  };

  const handleCreateStack = (name: string, color: string, description?: string) => {
    const newStack: ReadingStack = {
      id: `stack-${Date.now()}`,
      name,
      color,
      description,
      createdAt: new Date().toISOString().split('T')[0],
    };
    setStacks((prev) => [...prev, newStack]);
  };

  const handleDeleteStack = (stackId: string) => {
    setStacks((prev) => prev.filter((s) => s.id !== stackId));
    setBooks((prev) =>
      prev.map((b) => ({
        ...b,
        stackIds: b.stackIds?.filter((id) => id !== stackId),
      }))
    );
  };

  const handleToggleBookInStack = (bookId: string, stackId: string) => {
    setBooks((prev) =>
      prev.map((b) => {
        if (b.id === bookId) {
          const currentStacks = b.stackIds || [];
          const exists = currentStacks.includes(stackId);
          const updatedStacks = exists
            ? currentStacks.filter((id) => id !== stackId)
            : [...currentStacks, stackId];
          return {
            ...b,
            stackIds: updatedStacks,
          };
        }
        return b;
      })
    );
  };

  const handleBookUploaded = (newBook: Book) => {
    const now = Date.now();
    const updatedNewBook: Book = {
      ...newBook,
      lastReadTimestamp: now,
      stackIds: [],
    };
    setBooks((prev) => [updatedNewBook, ...prev.filter((b) => b.id !== newBook.id)]);
    setActiveBookId(updatedNewBook.id);
    setCurrentView('reading');
  };

  const handleImportDriveBook = (driveBook: Book) => {
    setBooks((prev) => {
      const filtered = prev.filter((b) => b.id !== driveBook.id);
      return [{ ...driveBook, lastReadTimestamp: Date.now(), stackIds: [] }, ...filtered];
    });
  };

  const handleDeleteBook = (bookId: string) => {
    deletePdfFromStorage(bookId).catch(() => {});
    setBooks((prev) => prev.filter((b) => b.id !== bookId));
  };

  return (
    <DeviceFrame eyeProtection={eyeProtection}>
      {currentView === 'dashboard' ? (
        <DashboardView
          books={books}
          stats={computedStats}
          stacks={stacks}
          currentlyReadingBook={currentlyReadingBook}
          onOpenBook={handleOpenBook}
          onOpenUploadModal={() => setIsUploadOpen(true)}
          onOpenDriveModal={() => setIsDriveOpen(true)}
          onDeleteBook={handleDeleteBook}
          onCreateStack={handleCreateStack}
          onDeleteStack={handleDeleteStack}
          onToggleBookInStack={handleToggleBookInStack}
          onOpenThemeModal={() => setIsThemeModalOpen(true)}
        />
      ) : activeBook ? (
        <ReadingInterface
          book={activeBook}
          theme={readingTheme}
          onChangeTheme={setReadingTheme}
          onBackToDashboard={handleBackToDashboard}
          onUpdateProgress={handleUpdateProgress}
          onAddBookmark={handleAddBookmark}
          onAddHighlight={handleAddHighlight}
          onUpdateHighlight={handleUpdateHighlight}
          onDeleteHighlight={handleDeleteHighlight}
          eyeProtection={eyeProtection}
          onChangeEyeProtection={setEyeProtection}
        />
      ) : (
        <div className="flex-1 flex items-center justify-center p-8 bg-[#DBD9D3]">
          <button
            onClick={() => setCurrentView('dashboard')}
            className="px-4 py-2 bg-[#3A3834] text-[#EAE8E2] border border-[#2B2A27] rounded-lg text-xs font-medium cursor-pointer"
          >
            Back to Library
          </button>
        </div>
      )}

      <ThemeAndEyeProtectionModal
        isOpen={isThemeModalOpen}
        onClose={() => setIsThemeModalOpen(false)}
        hardwareTheme={hardwareTheme}
        onChangeHardwareTheme={setHardwareTheme}
        environmentBg={environmentBg}
        onChangeEnvironmentBg={setEnvironmentBg}
        eyeProtection={eyeProtection}
        onChangeEyeProtection={setEyeProtection}
        readingTheme={readingTheme}
        onChangeReadingTheme={setReadingTheme}
      />

      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onBookUploaded={handleBookUploaded}
      />

      <GoogleDriveModal
        isOpen={isDriveOpen}
        onClose={() => setIsDriveOpen(false)}
        onImportDriveBook={handleImportDriveBook}
      />
    </DeviceFrame>
  );
}
