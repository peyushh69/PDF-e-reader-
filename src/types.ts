export type ThemeMode = 'light' | 'dark' | 'sepia' | 'warm-sepia' | 'amber-glow' | 'emerald-paper';
export type FontOption = 'literata' | 'bookerly' | 'newsreader' | 'garamond' | 'lora' | 'sans';
export type BookSource = 'local' | 'drive' | 'sample';
export type ActiveView = 'dashboard' | 'reading' | 'django-code';
export type PdfReadingMode = 'original-pdf' | 'reflow-ereader';

export type DeviceHardwareTheme =
  | 'black-paperwhite' // Exact black kindle from image 1
  | 'white-folio'      // White kindle with folio case from image 2
  | 'mint-agave'       // Signature mint-green bezel
  | 'midnight-denim'   // Deep ocean navy bezel
  | 'champagne-gold';  // Warm luxury aluminum bezel

export type EnvironmentBackground =
  | 'dark-slate'    // Minimalist twilight dark
  | 'linen-bed'     // White cozy duvet bedding (image 1)
  | 'sunlit-sheets' // Sunlit grey linen & shadows (image 2)
  | 'warm-wood';    // Walnut reading desk

export interface EyeProtectionSettings {
  enabled: boolean;
  warmth: number; // 0 to 24 (Kindle Paperwhite scale)
  brightness: number; // 0 to 24 (Kindle frontlight scale)
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
  color: string; // e.g. '#f59e0b', '#3b82f6', '#10b981'
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
  contentPages?: string[]; // For formatted reflow pages
  pdfDataUrl?: string;     // For loaded binary PDFs
  pdfFile?: File;
  
  // User annotations & categorization
  stackIds?: string[];     // IDs of stacks this book belongs to
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
  fontSize: number; // in px, e.g. 18
  lineHeight: number; // e.g. 1.7
  fontFamily: FontOption;
  margins: 'compact' | 'normal' | 'spacious';
  showHands: boolean;
  fullscreenFrame: boolean;
  soundEffects: boolean;
  hardwareTheme: DeviceHardwareTheme;
  environmentBg: EnvironmentBackground;
  eyeProtection: EyeProtectionSettings;
}

export interface DjangoFileDeliverable {
  path: string;
  title: string;
  category: 'models' | 'views' | 'templates' | 'config' | 'docs' | 'utils';
  code: string;
  description: string;
  language: string;
}
