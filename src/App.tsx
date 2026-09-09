import React, { useState, useEffect, useMemo } from 'react';
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
import { DjangoCodeViewer } from './components/DjangoCodeViewer';
import { ThemeAndEyeProtectionModal } from './components/ThemeAndEyeProtectionModal';
import { deletePdfFromStorage } from './utils/pdfStorage';

const STORAGE_KEY_BOOKS = 'ereader_pdf_books_v4';
const STORAGE_KEY_STACKS = 'ereader_pdf_stacks_v4';
const STORAGE_KEY_STATS = 'ereader_stats_v5';
const STORAGE_KEY_SETTINGS = 'ereader_settings_v4';

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
    warmth: 0,
    brightness: 20,
    blueLightFilter: false,
    preset: 'daylight',
  },
  readingTheme: 'light',
};

export default function App() {
  // Stacks state
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

  // Books state (Strictly PDF format only)
  const [books, setBooks] = useState<Book[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_BOOKS);
      if (saved) {
        const parsed: any[] = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Filter strictly for valid PDF format books
          const pdfOnly = parsed.filter((b) => b && b.format === 'pdf');
          if (pdfOnly.length > 0) {
            const initialMap = new Map(INITIAL_BOOKS.map((b) => [b.id, b]));
            return pdfOnly.map((book) => {
              if (initialMap.has(book.id)) {
                const freshSample = initialMap.get(book.id)!;
                return {
                  ...freshSample,
                  currentPage: Math.min(book.currentPage || 1, freshSample.totalPages || 1),
                  progressPercent: book.progressPercent ?? freshSample.progressPercent,
                  bookmarks: Array.isArray(book.bookmarks) ? book.bookmarks : (freshSample.bookmarks || []),
                  highlights: Array.isArray(book.highlights) ? book.highlights : (freshSample.highlights || []),
                  lastReadDate: book.lastReadDate || freshSample.lastReadDate,
                  lastReadTimestamp: book.lastReadTimestamp || freshSample.lastReadTimestamp,
                  stackIds: Array.isArray(book.stackIds) ? book.stackIds : freshSample.stackIds,
                };
              }
              return {
                ...book,
                bookmarks: Array.isArray(book.bookmarks) ? book.bookmarks : [],
                highlights: Array.isArray(book.highlights) ? book.highlights : [],
                stackIds: Array.isArray(book.stackIds) ? book.stackIds : ['stack-reading'],
              };
            });
          }
        }
      }
    } catch (e) {
      console.warn('Storage read error:', e);
    }
    return INITIAL_BOOKS;
  });

  // Reading stats state: strictly initialized to real zeroes and calculated dynamically
  const [stats, setStats] = useState<ReadingStats>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_STATS);
      if (saved) {
        const parsed = JSON.parse(saved);
        // If it was the legacy mock stats (18.5 hours or 38 sessions), purge and start fresh at 0
        if (parsed && parsed.totalHours !== 18.5 && parsed.totalSessions !== 38) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Storage read error:', e);
    }
    return INITIAL_STATS;
  });

  // Customization & Eye Protection state
  const [hardwareTheme, setHardwareTheme] = useState<DeviceHardwareTheme>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SETTINGS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.hardwareTheme) return parsed.hardwareTheme;
      }
    } catch (e) {
      console.warn('Settings load error:', e);
    }
    return DEFAULT_CUSTOMIZATION.hardwareTheme;
  });

  const [environmentBg, setEnvironmentBg] = useState<EnvironmentBackground>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SETTINGS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.environmentBg) return parsed.environmentBg;
      }
    } catch (e) {
      console.warn('Settings load error:', e);
    }
    return DEFAULT_CUSTOMIZATION.environmentBg;
  });

  const [eyeProtection, setEyeProtection] = useState<EyeProtectionSettings>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SETTINGS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.eyeProtection) return parsed.eyeProtection;
      }
    } catch (e) {
      console.warn('Settings load error:', e);
    }
    return DEFAULT_CUSTOMIZATION.eyeProtection;
  });

  const [readingTheme, setReadingTheme] = useState<ThemeMode>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SETTINGS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.readingTheme) return parsed.readingTheme;
      }
    } catch (e) {
      console.warn('Settings load error:', e);
    }
    return DEFAULT_CUSTOMIZATION.readingTheme;
  });

  // Active view: 'dashboard' or 'reading'
  const [currentView, setCurrentView] = useState<'dashboard' | 'reading'>('dashboard');
  const [activeBookId, setActiveBookId] = useState<string>(INITIAL_BOOKS[0]?.id || '');

  // Modals
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isDriveOpen, setIsDriveOpen] = useState(false);
  const [isDjangoCodeOpen, setIsDjangoCodeOpen] = useState(false);
  const [isThemeModalOpen, setIsThemeModalOpen] = useState(false);

  // Persist to local storage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_BOOKS, JSON.stringify(books));
    } catch (e) {
      console.warn('Books save error:', e);
    }
  }, [books]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_STACKS, JSON.stringify(stacks));
    } catch (e) {
      console.warn('Stacks save error:', e);
    }
  }, [stacks]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_STATS, JSON.stringify(stats));
    } catch (e) {
      console.warn('Stats save error:', e);
    }
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
    } catch (e) {
      console.warn('Settings save error:', e);
    }
  }, [hardwareTheme, environmentBg, eyeProtection, readingTheme]);

  // Dynamically resolve currently active reading book
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

    // Increment session count and mark streak on real active reading
    setStats((prev) => ({
      ...prev,
      totalSessions: prev.totalSessions + 1,
      currentStreakDays: prev.currentStreakDays === 0 ? 1 : prev.currentStreakDays,
    }));

    // Update last read date, timestamp, and preferred reading mode if specified
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
          const progressPercent = Math.round((newPage / Math.max(1, b.totalPages)) * 100);
          const isFinished = newPage >= b.totalPages;
          const addedMinutes = secondsRead > 0 ? Number((secondsRead / 60).toFixed(2)) : 0;
          return {
            ...b,
            currentPage: newPage,
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

    // Update global telemetry statistics accurately
    if (secondsRead > 0) {
      setStats((prev) => {
        const addedHours = secondsRead / 3600;
        const newTotalHours = Number((prev.totalHours + addedHours).toFixed(2));
        const newWeeklyHours = Number((prev.weeklyHoursLogged + addedHours).toFixed(2));
        const totalMinutes = newTotalHours * 60;
        const sessions = Math.max(1, prev.totalSessions);
        const avgMins = Math.round(totalMinutes / sessions);

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

  // Stack management operations
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
    // Remove stack from all books
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
      stackIds: ['stack-reading'],
    };
    setBooks((prev) => [updatedNewBook, ...prev.filter((b) => b.id !== newBook.id)]);
    setActiveBookId(updatedNewBook.id);
    setCurrentView('reading');
  };

  const handleImportDriveBook = (driveBook: Book) => {
    setBooks((prev) => {
      const filtered = prev.filter((b) => b.id !== driveBook.id);
      return [{ ...driveBook, stackIds: ['stack-research'] }, ...filtered];
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
          stats={stats}
          stacks={stacks}
          currentlyReadingBook={currentlyReadingBook}
          onOpenBook={handleOpenBook}
          onOpenUploadModal={() => setIsUploadOpen(true)}
          onOpenDriveModal={() => setIsDriveOpen(true)}
          onOpenDjangoCodeModal={() => setIsDjangoCodeOpen(true)}
          onDeleteBook={handleDeleteBook}
          onCreateStack={handleCreateStack}
          onDeleteStack={handleDeleteStack}
          onToggleBookInStack={handleToggleBookInStack}
          onOpenThemeModal={() => setIsThemeModalOpen(true)}
          eyeProtection={eyeProtection}
          onChangeEyeProtection={setEyeProtection}
          hardwareTheme={hardwareTheme}
          onChangeHardwareTheme={setHardwareTheme}
        />
      ) : activeBook ? (
        <ReadingInterface
          book={activeBook}
          onBackToDashboard={handleBackToDashboard}
          onUpdateProgress={handleUpdateProgress}
          onAddBookmark={handleAddBookmark}
          onAddHighlight={handleAddHighlight}
          onUpdateHighlight={handleUpdateHighlight}
          onDeleteHighlight={handleDeleteHighlight}
          eyeProtection={eyeProtection}
          onChangeEyeProtection={setEyeProtection}
          onOpenThemeModal={() => setIsThemeModalOpen(true)}
        />
      ) : (
        <div className="flex-1 flex items-center justify-center p-8 bg-stone-100">
          <button
            onClick={() => setCurrentView('dashboard')}
            className="px-4 py-2 bg-stone-900 text-white rounded-lg text-xs"
          >
            Back to Dashboard
          </button>
        </div>
      )}

      {/* Theme & Kindle Eye Protection Modal */}
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

      {/* Modals & Dialogs */}
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

      <DjangoCodeViewer
        isOpen={isDjangoCodeOpen}
        onClose={() => setIsDjangoCodeOpen(false)}
      />
    </DeviceFrame>
  );
}
