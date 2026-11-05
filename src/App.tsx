import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
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
import { LoginView, AppUserProfile } from './components/LoginView';
import { BookshelfWordmark } from './components/BookshelfWordmark';
import {
  deletePdfFromStorage,
  createBookCoverDataUrl,
  getPdfFromStorage,
  uploadPdfChunksToCloud,
  savePdfToStorage,
} from './utils/pdfStorage';
import { buildBookNotesPdfData } from './utils/pdfGenerator';
import {
  auth,
  db,
  isFirebaseReady,
  onAuthStateChanged,
  getRedirectResult,
  signOut,
  doc,
  setDoc,
  deleteDoc,
  collection,
  onSnapshot,
  handleFirestoreError,
  OperationType,
} from './firebase';

const LOCAL_PROFILE_STORAGE_KEY = 'bookshelf_active_local_profile_v1';

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

function getBooksStorageKey(uid: string) {
  return `ereader_pdf_books_v8_${uid}`;
}
function getStacksStorageKey(uid: string) {
  return `ereader_pdf_stacks_v8_${uid}`;
}
function getStatsStorageKey(uid: string) {
  return `ereader_stats_v8_${uid}`;
}
function getSettingsStorageKey(uid: string) {
  return `ereader_settings_v8_${uid}`;
}

function stripUndefined<T extends Record<string, any>>(obj: T): T {
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      result[key] = value;
    }
  }
  return result as T;
}

function sanitizeBooksList(rawBooks: any[]): Book[] {
  return rawBooks
    .filter(
      (b) =>
        b &&
        b.format === 'pdf' &&
        b.id &&
        b.title &&
        !String(b.id).startsWith('book-') &&
        !String(b.id).startsWith('notes-pdf-')
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

function prepareBookForFirestore(uid: string, book: Book): Record<string, any> {
  const safeCover =
    book.coverUrl && book.coverUrl.length <= 420000
      ? book.coverUrl
      : createBookCoverDataUrl({
          title: book.title || 'Document',
          author: book.author || 'PDF Document',
          subtitle: book.source === 'drive' ? 'Cloud Document' : 'PDF Document',
        });

  return stripUndefined({
    id: String(book.id).slice(0, 150),
    uid,
    title: String(book.title || 'Untitled Document').slice(0, 300),
    author: String(book.author || 'Uploaded Document').slice(0, 200),
    coverUrl: safeCover,
    source: book.source || 'local',
    format: 'pdf',
    totalPages: Math.max(1, Number(book.totalPages) || 1),
    currentPage: Math.max(1, Number(book.currentPage) || 1),
    progressPercent: Math.min(100, Math.max(0, Number(book.progressPercent) || 0)),
    fileSize: book.fileSize ? String(book.fileSize) : undefined,
    addedDate: book.addedDate || new Date().toISOString().split('T')[0],
    lastReadDate: book.lastReadDate,
    lastReadTimestamp: book.lastReadTimestamp,
    totalTimeReadMinutes: Math.max(0, Number(book.totalTimeReadMinutes) || 0),
    isFinished: Boolean(book.isFinished),
    preferredReadingMode: book.preferredReadingMode || 'reflow-ereader',
    hasCloudBinary: book.hasCloudBinary,
    chunkCount: book.chunkCount,
    stackIds: Array.isArray(book.stackIds) ? book.stackIds.slice(0, 100) : [],
    bookmarks: Array.isArray(book.bookmarks)
      ? book.bookmarks.slice(0, 500).map((bm) => stripUndefined({ ...bm }))
      : [],
    highlights: Array.isArray(book.highlights)
      ? book.highlights.slice(0, 1000).map((hl) => stripUndefined({ ...hl }))
      : [],
    contentPages:
      String(book.id).startsWith('notes-pdf-') && Array.isArray(book.contentPages)
        ? book.contentPages.slice(0, 120)
        : undefined,
  });
}

export default function App() {
  const [user, setUser] = useState<AppUserProfile | null>(() => {
    try {
      const savedProfile = localStorage.getItem(LOCAL_PROFILE_STORAGE_KEY);
      if (savedProfile) {
        return JSON.parse(savedProfile) as AppUserProfile;
      }
    } catch {}
    return null;
  });
  const [authLoading, setAuthLoading] = useState<boolean>(true);

  const [stacks, setStacks] = useState<ReadingStack[]>(DEFAULT_STACKS);
  const [books, setBooks] = useState<Book[]>(INITIAL_BOOKS);
  const [stats, setStats] = useState<ReadingStats>(INITIAL_STATS);

  const [hardwareTheme, setHardwareTheme] = useState<DeviceHardwareTheme>(
    DEFAULT_CUSTOMIZATION.hardwareTheme
  );
  const [environmentBg, setEnvironmentBg] = useState<EnvironmentBackground>(
    DEFAULT_CUSTOMIZATION.environmentBg
  );
  const [eyeProtection, setEyeProtection] = useState<EyeProtectionSettings>(
    DEFAULT_CUSTOMIZATION.eyeProtection
  );
  const [readingTheme, setReadingTheme] = useState<ThemeMode>(
    DEFAULT_CUSTOMIZATION.readingTheme
  );

  const [currentView, setCurrentView] = useState<'dashboard' | 'reading'>('dashboard');
  const [activeBookId, setActiveBookId] = useState<string>('');

  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isDriveOpen, setIsDriveOpen] = useState(false);
  const [isThemeModalOpen, setIsThemeModalOpen] = useState(false);

  const isHydratingRef = useRef(false);
  const pendingBookSyncTimersRef = useRef<Map<string, { book: Book; timer: any }>>(new Map());

  // 1. Listen to Firebase Authentication state with safety fallback
  useEffect(() => {
    if (!isFirebaseReady || !auth) {
      setAuthLoading(false);
      return;
    }

    const safetyTimer = setTimeout(() => {
      setAuthLoading(false);
    }, 2500);

    getRedirectResult(auth).catch(() => {});

    let unsubscribe = () => {};
    try {
      unsubscribe = onAuthStateChanged(
        auth,
        (firebaseUser) => {
          clearTimeout(safetyTimer);
          if (firebaseUser) {
            try {
              localStorage.removeItem(LOCAL_PROFILE_STORAGE_KEY);
            } catch {}
            setUser({
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              displayName: firebaseUser.displayName,
              photoURL: firebaseUser.photoURL,
              isLocalProfile: false,
            });
          } else {
            try {
              const savedLocal = localStorage.getItem(LOCAL_PROFILE_STORAGE_KEY);
              if (savedLocal) {
                setUser(JSON.parse(savedLocal) as AppUserProfile);
                setAuthLoading(false);
                return;
              }
            } catch {}
            setUser(null);
            setCurrentView('dashboard');
            setActiveBookId('');
            setBooks([]);
            setStacks([]);
            setStats(INITIAL_STATS);
          }
          setAuthLoading(false);
        },
        () => {
          clearTimeout(safetyTimer);
          setAuthLoading(false);
        }
      );
    } catch {
      clearTimeout(safetyTimer);
      setAuthLoading(false);
    }

    return () => {
      clearTimeout(safetyTimer);
      unsubscribe();
    };
  }, []);

  // Immediate Firestore write for a book
  const syncBookToCloud = useCallback(
    async (book: Book) => {
      if (!user || user.isLocalProfile || !isFirebaseReady || !db) return;
      const pending = pendingBookSyncTimersRef.current.get(book.id);
      if (pending) {
        clearTimeout(pending.timer);
        pendingBookSyncTimersRef.current.delete(book.id);
      }
      const path = `users/${user.uid}/books/${book.id}`;
      try {
        await setDoc(doc(db, 'users', user.uid, 'books', book.id), prepareBookForFirestore(user.uid, book));
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, path);
      }
    },
    [user]
  );

  // Coalesced/debounced Firestore write for frequent page-turn & reading-time updates
  const queueBookSync = useCallback(
    (book: Book, delayMs = 1200) => {
      if (!user) return;
      const existing = pendingBookSyncTimersRef.current.get(book.id);
      if (existing) {
        clearTimeout(existing.timer);
      }
      const timer = setTimeout(() => {
        pendingBookSyncTimersRef.current.delete(book.id);
        syncBookToCloud(book);
      }, delayMs);
      pendingBookSyncTimersRef.current.set(book.id, { book, timer });
    },
    [user, syncBookToCloud]
  );

  // Flush any queued book syncs immediately
  const flushPendingBookSyncs = useCallback(() => {
    pendingBookSyncTimersRef.current.forEach(({ book, timer }) => {
      clearTimeout(timer);
      syncBookToCloud(book);
    });
    pendingBookSyncTimersRef.current.clear();
  }, [syncBookToCloud]);

  // Helper to persist user profile (stats & settings) to Firestore
  const syncProfileToCloud = useCallback(
    async (nextStats: ReadingStats, nextSettings: PersistedCustomization) => {
      if (!user || user.isLocalProfile || !isFirebaseReady || !db) return;
      const path = `users/${user.uid}`;
      try {
        await setDoc(
          doc(db, 'users', user.uid),
          stripUndefined({
            uid: user.uid,
            email: user.email || undefined,
            displayName: user.displayName || undefined,
            photoURL: user.photoURL || undefined,
            stats: stripUndefined({ ...nextStats }),
            settings: stripUndefined({
              hardwareTheme: nextSettings.hardwareTheme,
              environmentBg: nextSettings.environmentBg,
              eyeProtection: stripUndefined({ ...nextSettings.eyeProtection }),
              readingTheme: nextSettings.readingTheme,
            }),
            updatedAt: new Date().toISOString(),
          }),
          { merge: true }
        );
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, path);
      }
    },
    [user]
  );

  // 2. Load per-user local cache & subscribe to Firestore when user logs in
  useEffect(() => {
    if (!user) return;
    const uid = user.uid;
    isHydratingRef.current = true;

    // Load immediate local cache for this specific user
    try {
      const savedBooks = localStorage.getItem(getBooksStorageKey(uid));
      if (savedBooks) {
        const parsed = JSON.parse(savedBooks);
        if (Array.isArray(parsed)) {
          setBooks(sanitizeBooksList(parsed));
        }
      } else {
        setBooks([]);
      }

      const savedStacks = localStorage.getItem(getStacksStorageKey(uid));
      if (savedStacks) {
        const parsed = JSON.parse(savedStacks);
        if (Array.isArray(parsed)) {
          setStacks(parsed);
        }
      } else {
        setStacks([]);
      }

      const savedStats = localStorage.getItem(getStatsStorageKey(uid));
      if (savedStats) {
        const parsed = JSON.parse(savedStats);
        if (parsed && typeof parsed.totalHours === 'number') {
          setStats(parsed);
        }
      } else {
        setStats(INITIAL_STATS);
      }

      const savedSettings = localStorage.getItem(getSettingsStorageKey(uid));
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        if (parsed?.hardwareTheme) setHardwareTheme(parsed.hardwareTheme);
        if (parsed?.environmentBg) setEnvironmentBg(parsed.environmentBg);
        if (parsed?.eyeProtection) setEyeProtection(parsed.eyeProtection);
        if (parsed?.readingTheme) setReadingTheme(parsed.readingTheme);
      }
    } catch (e) {
      console.warn('Local user cache read notice:', e);
    }

    if (user.isLocalProfile || !isFirebaseReady || !db) {
      isHydratingRef.current = false;
      return;
    }

    // Subscribe to Firestore /users/{uid}
    const userDocRef = doc(db, 'users', uid);
    const unsubProfile = onSnapshot(
      userDocRef,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          if (data.stats && typeof data.stats.totalHours === 'number') {
            setStats(data.stats as ReadingStats);
          }
          if (data.settings) {
            if (data.settings.hardwareTheme) setHardwareTheme(data.settings.hardwareTheme);
            if (data.settings.environmentBg) setEnvironmentBg(data.settings.environmentBg);
            if (data.settings.eyeProtection) setEyeProtection(data.settings.eyeProtection);
            if (data.settings.readingTheme) setReadingTheme(data.settings.readingTheme);
          }
        } else {
          // Initialize user profile doc on first login
          setDoc(
            userDocRef,
            stripUndefined({
              uid,
              email: user.email || undefined,
              displayName: user.displayName || undefined,
              photoURL: user.photoURL || undefined,
              stats: INITIAL_STATS,
              settings: DEFAULT_CUSTOMIZATION,
              updatedAt: new Date().toISOString(),
            }),
            { merge: true }
          ).catch((err) => handleFirestoreError(err, OperationType.CREATE, `users/${uid}`));
        }
      },
      (err) => handleFirestoreError(err, OperationType.GET, `users/${uid}`)
    );

    // Subscribe to Firestore /users/{uid}/books
    const booksColRef = collection(db, 'users', uid, 'books');
    const unsubBooks = onSnapshot(
      booksColRef,
      (snap) => {
        const cloudBooks: Book[] = [];
        snap.forEach((docSnap) => {
          const data = docSnap.data();
          if (data && data.id && String(data.id).startsWith('notes-pdf-')) {
            deleteDoc(doc(db, 'users', uid, 'books', String(data.id))).catch(() => {});
            return;
          }
          if (data && data.id && data.title) {
            cloudBooks.push(data as Book);
          }
        });
        const sanitized = sanitizeBooksList(cloudBooks).sort((a, b) => {
          const timeA = a.lastReadTimestamp || (a.lastReadDate ? new Date(a.lastReadDate).getTime() : 0);
          const timeB = b.lastReadTimestamp || (b.lastReadDate ? new Date(b.lastReadDate).getTime() : 0);
          return timeB - timeA;
        });
        setBooks(sanitized);
        isHydratingRef.current = false;

        // Auto-backfill cloud PDF chunks if this device has the PDF in local IndexedDB
        sanitized.forEach((b) => {
          if (!b.hasCloudBinary) {
            getPdfFromStorage(b.id, uid)
              .then((bytes) => {
                if (bytes && bytes.length > 0) {
                  uploadPdfChunksToCloud(b.id, bytes, uid).catch(() => {});
                }
              })
              .catch(() => {});
          }
        });
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, `users/${uid}/books`);
        isHydratingRef.current = false;
      }
    );

    // Subscribe to Firestore /users/{uid}/stacks
    const stacksColRef = collection(db, 'users', uid, 'stacks');
    const unsubStacks = onSnapshot(
      stacksColRef,
      (snap) => {
        const cloudStacks: ReadingStack[] = [];
        snap.forEach((docSnap) => {
          const data = docSnap.data();
          if (data && data.id && data.name) {
            cloudStacks.push(data as ReadingStack);
          }
        });
        setStacks(cloudStacks);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, `users/${uid}/stacks`)
    );

    return () => {
      unsubProfile();
      unsubBooks();
      unsubStacks();
    };
  }, [user]);

  // Save per-user localStorage cache
  useEffect(() => {
    if (!user) return;
    try {
      const serializableBooks = books.map((b) => ({
        ...b,
        pdfFile: undefined,
        pdfDataUrl:
          b.pdfDataUrl && b.pdfDataUrl.startsWith('blob:')
            ? undefined
            : b.id.startsWith('book-')
            ? undefined
            : b.pdfDataUrl,
      }));
      localStorage.setItem(getBooksStorageKey(user.uid), JSON.stringify(serializableBooks));
    } catch (e) {}
  }, [books, user]);

  useEffect(() => {
    if (!user) return;
    try {
      localStorage.setItem(getStacksStorageKey(user.uid), JSON.stringify(stacks));
    } catch (e) {}
  }, [stacks, user]);

  useEffect(() => {
    if (!user) return;
    try {
      localStorage.setItem(getStatsStorageKey(user.uid), JSON.stringify(stats));
    } catch (e) {}
  }, [stats, user]);

  useEffect(() => {
    if (!user) return;
    const settingsPayload: PersistedCustomization = {
      hardwareTheme,
      environmentBg,
      eyeProtection,
      readingTheme,
    };
    try {
      localStorage.setItem(getSettingsStorageKey(user.uid), JSON.stringify(settingsPayload));
    } catch (e) {}
  }, [hardwareTheme, environmentBg, eyeProtection, readingTheme, user]);

  // Debounced sync of profile (stats + settings) to Firestore & Express Server
  useEffect(() => {
    if (!user || isHydratingRef.current) return;
    const timer = setTimeout(() => {
      const settingsPayload: PersistedCustomization = {
        hardwareTheme,
        environmentBg,
        eyeProtection,
        readingTheme,
      };
      syncProfileToCloud(stats, settingsPayload);

      const compactBooks = books.map((b) => ({
        ...b,
        pdfFile: undefined,
        pdfDataUrl: b.pdfDataUrl?.startsWith('blob:') ? undefined : b.pdfDataUrl,
      }));
      fetch(`/api/state?uid=${encodeURIComponent(user.uid)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          books: compactBooks,
          stacks,
          stats,
          settings: settingsPayload,
        }),
      }).catch(() => {});
    }, 1500);
    return () => clearTimeout(timer);
  }, [
    user,
    books,
    stacks,
    stats,
    hardwareTheme,
    environmentBg,
    eyeProtection,
    readingTheme,
    syncProfileToCloud,
  ]);

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

    const updatedBook: Book = {
      ...book,
      lastReadDate: today,
      lastReadTimestamp: now,
      ...(mode ? { preferredReadingMode: mode } : {}),
    };

    setBooks((prev) => prev.map((b) => (b.id === book.id ? updatedBook : b)));
    queueBookSync(updatedBook, 600);
  };

  const handleBackToDashboard = () => {
    flushPendingBookSyncs();
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
          const isFinished =
            clampedPage >= validTotal && (pageChanged || b.isFinished || progressPercent >= 100);
          const addedMinutes = secondsRead > 0 ? Number((secondsRead / 60).toFixed(2)) : 0;

          const updated: Book = {
            ...b,
            currentPage: clampedPage,
            progressPercent,
            isFinished,
            totalTimeReadMinutes: Number(((b.totalTimeReadMinutes || 0) + addedMinutes).toFixed(2)),
            lastReadDate: today,
            lastReadTimestamp: now,
          };
          queueBookSync(updated, 1200);
          return updated;
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

  const handleUpdateBookTotalPages = useCallback(
    (bookId: string, discoveredTotalPages: number) => {
      if (!discoveredTotalPages || discoveredTotalPages < 1) return;
      setBooks((prev) =>
        prev.map((b) => {
          if (b.id === bookId && b.totalPages !== discoveredTotalPages) {
            const clampedCurrent = Math.max(1, Math.min(b.currentPage || 1, discoveredTotalPages));
            const updated: Book = {
              ...b,
              totalPages: discoveredTotalPages,
              currentPage: clampedCurrent,
              progressPercent: Math.round((clampedCurrent / discoveredTotalPages) * 100),
            };
            queueBookSync(updated, 800);
            return updated;
          }
          return b;
        })
      );
    },
    [queueBookSync]
  );

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
          const updated = { ...b, bookmarks: updatedBookmarks };
          syncBookToCloud(updated);
          return updated;
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
          const updated = {
            ...b,
            highlights: [...existing, highlight],
          };
          syncBookToCloud(updated);
          return updated;
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
          const updated = {
            ...b,
            highlights: currentHighlights.map((h) => (h.id === highlight.id ? highlight : h)),
          };
          syncBookToCloud(updated);
          return updated;
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
          const updated = {
            ...b,
            highlights: currentHighlights.filter((h) => h.id !== highlightId),
          };
          syncBookToCloud(updated);
          return updated;
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

    if (user && !user.isLocalProfile && isFirebaseReady && db) {
      const path = `users/${user.uid}/stacks/${newStack.id}`;
      setDoc(
        doc(db, 'users', user.uid, 'stacks', newStack.id),
        stripUndefined({
          ...newStack,
          uid: user.uid,
        })
      ).catch((err) => handleFirestoreError(err, OperationType.CREATE, path));
    }
  };

  const handleDeleteStack = (stackId: string) => {
    setStacks((prev) => prev.filter((s) => s.id !== stackId));
    setBooks((prev) =>
      prev.map((b) => {
        if (b.stackIds?.includes(stackId)) {
          const updated = {
            ...b,
            stackIds: b.stackIds.filter((id) => id !== stackId),
          };
          syncBookToCloud(updated);
          return updated;
        }
        return b;
      })
    );

    if (user && !user.isLocalProfile && isFirebaseReady && db) {
      const path = `users/${user.uid}/stacks/${stackId}`;
      deleteDoc(doc(db, 'users', user.uid, 'stacks', stackId)).catch((err) =>
        handleFirestoreError(err, OperationType.DELETE, path)
      );
    }
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
          const updated = {
            ...b,
            stackIds: updatedStacks,
          };
          syncBookToCloud(updated);
          return updated;
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
    syncBookToCloud(updatedNewBook);
    setActiveBookId(updatedNewBook.id);
    setCurrentView('reading');
  };

  const handleImportDriveBook = (driveBook: Book) => {
    const updatedDriveBook: Book = {
      ...driveBook,
      lastReadTimestamp: Date.now(),
      stackIds: [],
    };
    setBooks((prev) => {
      const filtered = prev.filter((b) => b.id !== driveBook.id);
      return [updatedDriveBook, ...filtered];
    });
    syncBookToCloud(updatedDriveBook);
  };

  const handleSaveNotesPdfToLibrary = async (sourceBook: Book) => {
    const cleanSourceId = sourceBook.id.replace(/^notes-pdf-/, '');
    const notesBookId = `notes-pdf-${cleanSourceId}`;
    const baseTitle = sourceBook.title.replace(/\s*—\s*Notes PDF$/i, '').trim();
    const { pdfBytes, contentPages, totalPages } = buildBookNotesPdfData({
      ...sourceBook,
      title: baseTitle,
    });

    const blobUrl = await savePdfToStorage(notesBookId, pdfBytes, user?.uid);
    const notesTitle = `${baseTitle} — Notes PDF`;
    const notesCover = createBookCoverDataUrl({
      title: notesTitle,
      author: sourceBook.author || 'Short Notes',
      subtitle: 'SHORT NOTES & HIGHLIGHTS PDF',
      bgHex: '#1E1C19',
      accentHex: '#FAF8F4',
    });

    const notesBook: Book = {
      id: notesBookId,
      uid: user?.uid,
      title: notesTitle,
      author: `${sourceBook.author} · Short Notes`,
      coverUrl: notesCover,
      source: 'local',
      format: 'pdf',
      totalPages: Math.max(1, totalPages),
      currentPage: 1,
      progressPercent: 0,
      fileSize: `${Math.max(0.05, pdfBytes.byteLength / (1024 * 1024)).toFixed(2)} MB`,
      addedDate: new Date().toISOString().split('T')[0],
      lastReadDate: new Date().toISOString().split('T')[0],
      lastReadTimestamp: Date.now(),
      totalTimeReadMinutes: 0,
      pdfDataUrl: blobUrl,
      contentPages,
      preferredReadingMode: 'reflow-ereader',
      stackIds: sourceBook.stackIds || [],
      bookmarks: [],
      highlights: [],
    };

    setBooks((prev) => [notesBook, ...prev.filter((b) => b.id !== notesBookId)]);
    await syncBookToCloud(notesBook);
  };

  const handleDeleteBook = (bookId: string) => {
    const pending = pendingBookSyncTimersRef.current.get(bookId);
    if (pending) {
      clearTimeout(pending.timer);
      pendingBookSyncTimersRef.current.delete(bookId);
    }
    deletePdfFromStorage(bookId).catch(() => {});
    setBooks((prev) => prev.filter((b) => b.id !== bookId));
    if (user && !user.isLocalProfile && isFirebaseReady && db) {
      const path = `users/${user.uid}/books/${bookId}`;
      deleteDoc(doc(db, 'users', user.uid, 'books', bookId)).catch((err) =>
        handleFirestoreError(err, OperationType.DELETE, path)
      );
    }
  };

  const handleUpdateReadingMode = (bookId: string, mode: PdfReadingMode) => {
    setBooks((prev) =>
      prev.map((b) => {
        if (b.id === bookId) {
          const updated: Book = {
            ...b,
            preferredReadingMode: mode,
          };
          queueBookSync(updated, 800);
          return updated;
        }
        return b;
      })
    );
  };

  const handleFallbackSignIn = (profile: AppUserProfile) => {
    try {
      localStorage.setItem(LOCAL_PROFILE_STORAGE_KEY, JSON.stringify(profile));
    } catch {}
    setUser(profile);
    setAuthLoading(false);
  };

  const handleSignOut = async () => {
    flushPendingBookSyncs();
    try {
      localStorage.removeItem(LOCAL_PROFILE_STORAGE_KEY);
    } catch {}
    setUser(null);
    if (isFirebaseReady && auth) {
      try {
        await signOut(auth);
      } catch (err) {
        console.error('Sign out error:', err);
      }
    }
  };

  return (
    <DeviceFrame eyeProtection={eyeProtection} readingTheme={readingTheme}>
      {authLoading ? (
        <div className="flex-1 flex flex-col items-center justify-center p-6 bg-[var(--paper-bg)] text-[var(--ink-primary)] font-sans gap-3">
          <BookshelfWordmark className="text-2xl" />
          <span className="text-xs text-[var(--ink-secondary)]">Loading your bookshelf...</span>
        </div>
      ) : !user ? (
        <LoginView onFallbackSignIn={handleFallbackSignIn} />
      ) : currentView === 'dashboard' ? (
        <DashboardView
          books={books}
          stats={computedStats}
          stacks={stacks}
          currentlyReadingBook={currentlyReadingBook}
          userEmail={user.email}
          userName={user.displayName}
          userPhotoUrl={user.photoURL}
          onSignOut={handleSignOut}
          onOpenBook={handleOpenBook}
          onOpenUploadModal={() => setIsUploadOpen(true)}
          onOpenDriveModal={() => setIsDriveOpen(true)}
          onDeleteBook={handleDeleteBook}
          onCreateStack={handleCreateStack}
          onDeleteStack={handleDeleteStack}
          onToggleBookInStack={handleToggleBookInStack}
          onOpenThemeModal={() => setIsThemeModalOpen(true)}
          onAddHighlight={handleAddHighlight}
          onUpdateHighlight={handleUpdateHighlight}
          onDeleteHighlight={handleDeleteHighlight}
          onSaveNotesPdfToLibrary={handleSaveNotesPdfToLibrary}
        />
      ) : activeBook ? (
        <ReadingInterface
          book={activeBook}
          theme={readingTheme}
          onChangeTheme={setReadingTheme}
          onBackToDashboard={handleBackToDashboard}
          onUpdateProgress={handleUpdateProgress}
          onUpdateBookTotalPages={handleUpdateBookTotalPages}
          onAddBookmark={handleAddBookmark}
          onAddHighlight={handleAddHighlight}
          onUpdateHighlight={handleUpdateHighlight}
          onDeleteHighlight={handleDeleteHighlight}
          onChangeReadingMode={handleUpdateReadingMode}
          eyeProtection={eyeProtection}
          onChangeEyeProtection={setEyeProtection}
          onSaveNotesPdfToLibrary={handleSaveNotesPdfToLibrary}
        />
      ) : (
        <div className="flex-1 flex items-center justify-center p-8 bg-[var(--paper-bg)]">
          <button
            onClick={() => setCurrentView('dashboard')}
            className="px-4 py-2 bg-[var(--ink-primary)] text-[var(--ink-inverse)] rounded-lg text-xs font-medium cursor-pointer"
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
