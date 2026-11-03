export type ThemeMode = 'light' | 'dark' | 'sepia' | 'warm-sepia' | 'amber-glow' | 'emerald-paper';
export type FontOption = 'literata' | 'classic-serif' | 'newsreader' | 'garamond' | 'lora' | 'sans';
export type BookSource = 'local' | 'drive' | 'sample';
export type ActiveView = 'dashboard' | 'reading' | 'django-code';
export type PdfReadingMode = 'original-pdf' | 'reflow-ereader';

export type DeviceHardwareTheme =
  | 'black-paperwhite'
  | 'white-folio'
  | 'mint-agave'
  | 'midnight-denim'
  | 'champagne-gold';

export type EnvironmentBackground =
  | 'dark-slate'
  | 'linen-bed'
  | 'sunlit-sheets'
  | 'warm-wood';

export interface EyeProtectionSettings {
  enabled: boolean;
  warmth: number; // 0 to 24 scale
  brightness: number; // 0 to 24 scale
  blueLightFilter: boolean;
  preset: 'standard' | 'daylight' | 'afternoon' | 'candlelight' | 'vintage' | 'dark-night';
}

export interface Highlight {
  id: string;
  pageNumber: number;
  text: string;
  color: string;
  note?: string;
  createdAt: string;
  blockIndex?: number;
  startOffset?: number;
  endOffset?: number;
}

export interface Bookmark {
  id: string;
  pageNumber: number;
  label?: string;
  createdAt: string;
}

export interface ReadingStack {
  id: string;
  name: string;
  color: string;
  icon?: string;
  description?: string;
  createdAt: string;
}

export interface Book {
  id: string;
  title: string;
  author: string;
  coverUrl: string;
  source: BookSource;
  format: 'pdf';
  totalPages: number;
  currentPage: number;
  progressPercent: number;
  fileSize?: string;
  addedDate: string;
  lastReadDate?: string;
  lastReadTimestamp?: number;
  totalTimeReadMinutes: number;
  isFinished?: boolean;

  // Content storage
  contentPages?: string[];
  pdfDataUrl?: string;
  pdfFile?: File;

  // User annotations & categorization
  stackIds?: string[];
  bookmarks: Bookmark[];
  highlights: Highlight[];
  notes?: string;
  driveFileId?: string;
  preferredReadingMode?: PdfReadingMode;
}

export interface ReadingStats {
  totalHours: number;
  avgMinutesPerSession: number;
  totalBooksFinished: number;
  totalPagesRead: number;
  currentStreakDays: number;
  totalSessions: number;
  weeklyGoalHours: number;
  weeklyHoursLogged: number;
}

export interface ReadingSettings {
  theme: ThemeMode;
  fontSize: number;
  lineHeight: number;
  fontFamily: FontOption;
  margins: 'compact' | 'normal' | 'spacious';
  showHands: boolean;
  fullscreenFrame: boolean;
  soundEffects: boolean;
  hardwareTheme: DeviceHardwareTheme;
  environmentBg: EnvironmentBackground;
  eyeProtection: EyeProtectionSettings;
}
