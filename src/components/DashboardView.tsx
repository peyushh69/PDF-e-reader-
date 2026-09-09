import React, { useState, useEffect } from 'react';
import {
  Book,
  ReadingStats,
  ReadingStack,
  EyeProtectionSettings,
  DeviceHardwareTheme,
  PdfReadingMode,
} from '../types';
import { HoodedCatIcon } from './HoodedCatIcon';
import {
  BookOpen,
  Search,
  Upload,
  Cloud,
  Code2,
  ChevronDown,
  Trash2,
  Flame,
  Palette,
  Layers,
  Plus,
  FolderPlus,
  Check,
  X,
  Clock,
  Sparkles,
  BarChart3,
  Flame as StreakIcon,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface DashboardViewProps {
  books: Book[];
  stats: ReadingStats;
  stacks: ReadingStack[];
  currentlyReadingBook: Book | null;
  onOpenBook: (book: Book, mode?: PdfReadingMode) => void;
  onOpenUploadModal: () => void;
  onOpenDriveModal: () => void;
  onOpenDjangoCodeModal: () => void;
  onDeleteBook: (bookId: string) => void;
  onCreateStack: (name: string, color: string, description?: string) => void;
  onDeleteStack: (stackId: string) => void;
  onToggleBookInStack: (bookId: string, stackId: string) => void;
  onOpenThemeModal?: () => void;
  eyeProtection?: EyeProtectionSettings;
  onChangeEyeProtection?: (settings: EyeProtectionSettings) => void;
  hardwareTheme?: DeviceHardwareTheme;
  onChangeHardwareTheme?: (theme: DeviceHardwareTheme) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  books,
  stats,
  stacks,
  currentlyReadingBook,
  onOpenBook,
  onOpenUploadModal,
  onOpenDriveModal,
  onOpenDjangoCodeModal,
  onDeleteBook,
  onCreateStack,
  onDeleteStack,
  onToggleBookInStack,
  onOpenThemeModal,
  eyeProtection,
  onChangeEyeProtection,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStackFilter, setSelectedStackFilter] = useState<string | null>(null);
  const [filterSource, setFilterSource] = useState<'all' | 'local' | 'drive' | 'finished'>('all');
  const [companionQuote, setCompanionQuote] = useState<string | null>(null);
  const [companionMood, setCompanionMood] = useState<'reading' | 'happy' | 'curious'>('reading');
  const [isQuickSettingsOpen, setIsQuickSettingsOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState('8:17 PM');

  // Stacks modal state
  const [isNewStackModalOpen, setIsNewStackModalOpen] = useState(false);
  const [newStackName, setNewStackName] = useState('');
  const [newStackDesc, setNewStackDesc] = useState('');
  const [newStackColor, setNewStackColor] = useState('#2A2927');
  const [editingBookForStack, setEditingBookForStack] = useState<Book | null>(null);

  const STACK_PALETTE = ['#2A2927', '#4E4C46', '#726E64', '#999589', '#3D4A3E', '#4A3D3D'];

  const QUOTES = [
    '"A room without books is like a body without a soul." — Cicero',
    '"Difference is the essence of humanity. The answer to difference is to respect it." — John Hume',
    '"To read is to fly: it is to soar to a point of vantage." — Eleanor Vance',
    '"Waste no more time arguing what a good man should be. Be one." — Marcus Aurelius',
    '"Deep focus in reading is the ultimate sovereign superpower." — Cal Newport',
  ];

  // Live time ticker
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      let hours = now.getHours();
      const minutes = now.getMinutes();
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      hours = hours ? hours : 12;
      const minutesStr = minutes < 10 ? '0' + minutes : minutes;
      setCurrentTime(`${hours}:${minutesStr} ${ampm}`);
    };
    updateTime();
    const timer = setInterval(updateTime, 30000);
    return () => clearInterval(timer);
  }, []);

  const handleCompanionClick = () => {
    const randomQuote = QUOTES[Math.floor(Math.random() * QUOTES.length)];
    setCompanionQuote(randomQuote);
    setCompanionMood('happy');
    confetti({
      particleCount: 20,
      spread: 50,
      origin: { y: 0.3, x: 0.15 },
      colors: ['#2A2927', '#5A5852', '#A3A092', '#ECEAE4'],
    });
    setTimeout(() => {
      setCompanionMood('reading');
    }, 4000);
  };

  const handleCreateStackSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStackName.trim()) return;
    onCreateStack(newStackName.trim(), newStackColor, newStackDesc.trim());
    setNewStackName('');
    setNewStackDesc('');
    setIsNewStackModalOpen(false);
  };

  // Active reading book resolution
  const activeBook = currentlyReadingBook || books[0] || null;

  // Filtered books list
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

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#ECEAE4] text-[#121212] font-sans select-none antialiased">
      
      {/* ============================================================ */}
      {/* 1. TOP HEADER & SLEEK RESPONSIVE NAVIGATION                  */}
      {/* ============================================================ */}
      <header className="px-3 sm:px-5 lg:px-6 py-2 sm:py-2.5 bg-[#ECEAE4] border-b border-[#D8D6CF] flex items-center justify-between gap-2.5 shrink-0 z-20">
        
        {/* Brand & Cat Companion */}
        <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
          <button
            onClick={handleCompanionClick}
            className="flex items-center gap-2 group cursor-pointer text-left focus:outline-none"
            title="Click for inspiration"
          >
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#E2DFD7] border border-[#C5C2B8] flex items-center justify-center text-[#2A2927] group-hover:scale-105 transition shadow-2xs shrink-0">
              <HoodedCatIcon mood={companionMood} size={18} />
            </div>
            <div className="min-w-0">
              <div className="font-serif font-bold text-sm sm:text-base leading-none text-[#121212] flex items-center gap-1.5">
                <span>Kindle Lab</span>
                <span className="text-[9px] font-mono px-1 py-0.2 bg-[#DDD9D0] text-[#4A4843] rounded font-semibold">
                  E-INK
                </span>
              </div>
              <div className="text-[10px] sm:text-[11px] text-[#6A6861] font-ember truncate mt-0.5">
                {currentTime} • {books.length} {books.length === 1 ? 'Book' : 'Books'}
              </div>
            </div>
          </button>
        </div>

        {/* Action Controls - Compact & Proportional (h-7 sm:h-8) */}
        <div className="flex items-center gap-1.5 sm:gap-2 font-ember shrink-0">
          
          {/* Prominent Upload Button */}
          <button
            onClick={onOpenUploadModal}
            className="h-7 sm:h-8 px-2.5 sm:px-3.5 bg-[#121212] hover:bg-[#2A2927] text-white rounded-md text-[11px] sm:text-xs font-bold flex items-center gap-1.5 transition shadow-xs cursor-pointer focus:outline-none"
          >
            <Upload size={13} className="shrink-0" />
            <span className="hidden sm:inline font-medium">Upload PDF</span>
            <span className="sm:hidden font-medium">Upload</span>
          </button>

          {/* Google Drive Sync */}
          <button
            onClick={onOpenDriveModal}
            className="h-7 sm:h-8 px-2 sm:px-2.5 bg-[#F4F3EE] hover:bg-white text-[#2A2927] border border-[#C8C6BE] hover:border-black rounded-md text-[11px] sm:text-xs font-semibold flex items-center gap-1 transition cursor-pointer shadow-2xs focus:outline-none"
            title="Sync from Google Drive"
          >
            <Cloud size={13} className="shrink-0" />
            <span className="hidden md:inline">Drive</span>
          </button>

          {/* Warmth Light Toggle */}
          <button
            onClick={() => setIsQuickSettingsOpen(!isQuickSettingsOpen)}
            className="h-7 sm:h-8 px-2 sm:px-2.5 bg-[#F4F3EE] hover:bg-white text-[#2A2927] border border-[#C8C6BE] hover:border-black rounded-md text-[11px] sm:text-xs font-semibold flex items-center gap-1 transition cursor-pointer shadow-2xs focus:outline-none"
            title="Warmth Light"
          >
            <Flame size={13} className="text-[#3A3832] shrink-0" />
            <span className="hidden lg:inline text-[10px]">Warmth</span>
            <ChevronDown size={11} className={`transition-transform duration-200 ${isQuickSettingsOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Theme & Display Modal */}
          {onOpenThemeModal && (
            <button
              onClick={onOpenThemeModal}
              className="h-7 w-7 sm:h-8 sm:w-auto sm:px-2.5 bg-[#F4F3EE] hover:bg-white text-[#2A2927] border border-[#C8C6BE] hover:border-black rounded-md text-[11px] sm:text-xs font-semibold flex items-center justify-center gap-1 transition cursor-pointer shadow-2xs focus:outline-none"
              title="Display Themes & Typography"
            >
              <Palette size={13} className="shrink-0" />
              <span className="hidden lg:inline">Theme</span>
            </button>
          )}

          {/* Django Specs Modal */}
          <button
            onClick={onOpenDjangoCodeModal}
            className="h-7 w-7 sm:h-8 sm:w-auto sm:px-2.5 bg-[#F4F3EE] hover:bg-white text-[#2A2927] border border-[#C8C6BE] hover:border-black rounded-md text-[11px] sm:text-xs font-semibold flex items-center justify-center gap-1 transition cursor-pointer shadow-2xs focus:outline-none"
            title="Django Backend Integration Specs"
          >
            <Code2 size={13} className="shrink-0" />
            <span className="hidden lg:inline">Django</span>
          </button>
        </div>
      </header>

      {/* Quick Warmth Dropdown */}
      {isQuickSettingsOpen && (
        <div className="bg-[#F4F3EE] border-b border-[#D0CEC6] px-3 sm:px-6 py-2.5 shadow-md z-20 flex flex-wrap items-center justify-between gap-3 text-xs animate-in slide-in-from-top-1 duration-150">
          <div className="flex flex-wrap items-center gap-3 sm:gap-4">
            <div className="flex items-center gap-2">
              <Flame size={13} className="text-[#1A1A1A]" />
              <span className="font-bold text-[#1A1A1A] text-[11px] sm:text-xs">Kindle Warmth Light:</span>
              <input
                type="range"
                min="0"
                max="24"
                value={eyeProtection?.warmth || 12}
                onChange={(e) =>
                  onChangeEyeProtection?.({
                    ...(eyeProtection || {
                      enabled: true,
                      warmth: 12,
                      brightness: 18,
                      blueLightFilter: true,
                      preset: 'afternoon',
                    }),
                    enabled: true,
                    warmth: parseInt(e.target.value),
                  })
                }
                className="w-24 sm:w-36 h-1.5 rounded-lg appearance-none cursor-pointer accent-black bg-[#D5D3CC]"
              />
              <span className="font-mono font-bold text-[10px] sm:text-[11px]">{eyeProtection?.warmth || 12}/24</span>
            </div>

            {onOpenThemeModal && (
              <button
                onClick={() => {
                  setIsQuickSettingsOpen(false);
                  onOpenThemeModal();
                }}
                className="h-6 px-2 rounded bg-[#E4E2DC] hover:bg-[#D8D6CE] text-[#1A1A1A] border border-[#BDBBB2] font-semibold text-[10px] sm:text-[11px] flex items-center gap-1 cursor-pointer"
              >
                <Palette size={11} />
                <span>All Settings</span>
              </button>
            )}
          </div>

          <button
            onClick={() => setIsQuickSettingsOpen(false)}
            className="h-6 px-2 text-stone-600 hover:text-black font-semibold text-[10px] sm:text-[11px] cursor-pointer"
          >
            Close
          </button>
        </div>
      )}

      {/* Companion Quote Banner */}
      {companionQuote && (
        <div className="bg-[#FAF9F5] border-b border-[#DCDAD2] px-3 py-1.5 text-center text-xs font-serif italic text-[#3A3832] flex items-center justify-center gap-2 animate-in fade-in duration-150">
          <Sparkles size={12} className="text-[#6A6861] shrink-0" />
          <span className="truncate max-w-xl">{companionQuote}</span>
          <button
            onClick={() => setCompanionQuote(null)}
            className="text-[#8A8881] hover:text-black p-0.5 rounded cursor-pointer"
          >
            <X size={11} />
          </button>
        </div>
      )}

      {/* ============================================================ */}
      {/* 2. SCROLLABLE DASHBOARD CONTENT (SLEEK & PROPORTIONAL)       */}
      {/* ============================================================ */}
      <div className="flex-1 overflow-y-auto px-3 sm:px-5 lg:px-6 py-3.5 sm:py-4 space-y-4 sm:space-y-4.5 bg-[#ECEAE4]">
        
        {/* ========================================================== */}
        {/* SECTION A: CURRENTLY READING (CLEAN & ELEGANT ORIGINAL)    */}
        {/* ========================================================== */}
        {activeBook && (
          <section className="bg-[#F8F7F3] rounded-lg border border-[#CBC9C0] hover:border-[#8C887B] p-3.5 sm:p-4 shadow-2xs transition-all">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3.5 sm:gap-4">
              
              {/* Left Side: Book Cover + Book Details */}
              <div className="flex items-center gap-3.5 sm:gap-4 min-w-0 flex-1 w-full">
                {/* Book Cover on the Left Side */}
                <div
                  onClick={() => onOpenBook(activeBook)}
                  className="relative w-14 sm:w-16 md:w-18 aspect-[3/4] bg-white border border-[#2D2C2A] rounded-xs overflow-hidden shadow-xs shrink-0 cursor-pointer group hover:scale-103 transition-transform"
                >
                  <img
                    src={activeBook.coverUrl}
                    alt={activeBook.title}
                    className="w-full h-full object-cover grayscale contrast-115"
                  />
                  <div className="absolute top-1 right-1 bg-black text-white font-mono text-[8px] font-bold px-1 py-0.2 rounded-2xs">
                    {activeBook.progressPercent || 0}%
                  </div>
                </div>

                {/* Book Details (Title, Author, Total Pages, Size, Progress) */}
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] uppercase tracking-wider font-mono font-bold text-[#4A4843] bg-[#EAE7DF] border border-[#D5D2C8] px-1.5 py-0.2 rounded">
                      CURRENTLY READING
                    </span>
                  </div>

                  {/* Book Title */}
                  <h2
                    onClick={() => onOpenBook(activeBook)}
                    className="text-sm sm:text-base md:text-lg font-serif font-bold text-[#121212] leading-tight cursor-pointer hover:underline truncate"
                  >
                    {activeBook.title}
                  </h2>

                  {/* Author, Total Pages, File Size */}
                  <div className="text-[11px] sm:text-xs text-[#5A5852] font-ember flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    <span>by <strong className="text-[#2A2927]">{activeBook.author}</strong></span>
                    <span>•</span>
                    <span>{activeBook.totalPages} Total Pages</span>
                    <span>•</span>
                    <span>{activeBook.fileSize || 'PDF Document'}</span>
                  </div>

                  {/* Reading Progress Bar at the Bottom */}
                  <div className="space-y-1 pt-1 max-w-md">
                    <div className="flex items-center justify-between text-[10px] sm:text-[11px] font-mono text-[#5A5852]">
                      <span>Page <strong>{activeBook.currentPage || 1}</strong> of {activeBook.totalPages}</span>
                      <span className="font-bold text-[#121212]">{activeBook.progressPercent || 0}% Completed</span>
                    </div>
                    <div className="w-full h-1.5 bg-[#DCDAD2] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-black rounded-full transition-all duration-300"
                        style={{ width: `${Math.min(100, Math.max(3, activeBook.progressPercent || 0))}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex sm:flex-col items-center sm:items-end gap-1.5 shrink-0 w-full sm:w-auto pt-1 sm:pt-0 border-t sm:border-t-0 border-[#DCDAD2]">
                <button
                  onClick={() => onOpenBook(activeBook, 'reflow-ereader')}
                  className="h-8 px-3.5 bg-[#121212] hover:bg-[#2A2927] text-white text-[11px] sm:text-xs font-bold rounded flex items-center justify-center gap-1.5 shadow-2xs transition cursor-pointer flex-1 sm:flex-initial"
                >
                  <BookOpen size={13} />
                  <span>Continue Reading</span>
                </button>
                <button
                  onClick={() => onOpenBook(activeBook, 'original-pdf')}
                  className="h-7 px-2.5 bg-white hover:bg-[#EFECE5] text-[#121212] border border-[#BDBBB2] hover:border-black text-[10px] sm:text-[11px] font-semibold rounded flex items-center justify-center gap-1 shadow-2xs transition cursor-pointer flex-1 sm:flex-initial"
                >
                  <Layers size={11} />
                  <span>Original PDF</span>
                </button>
              </div>

            </div>
          </section>
        )}

        {/* ========================================================== */}
        {/* SECTION B: COMPACT READING METRICS (4 RESPONSIVE TILES)    */}
        {/* ========================================================== */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
          
          {/* Tile 1: Total Reading Time */}
          <div className="p-2.5 sm:p-3 rounded-lg bg-[#F8F7F3] border border-[#CBC9C0] shadow-2xs flex flex-col justify-between space-y-1">
            <div className="flex items-center justify-between text-[#6A6861]">
              <span className="text-[9px] sm:text-[10px] font-mono uppercase font-bold tracking-wider">Total Time</span>
              <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-[#EAE7DF] flex items-center justify-center text-[#2A2927]">
                <Clock size={12} />
              </div>
            </div>
            <div>
              <div className="text-base sm:text-lg md:text-xl font-serif font-bold text-[#121212] leading-tight">
                {stats.totalHours > 0 ? `${stats.totalHours} hrs` : `${Math.round(stats.totalHours * 60)} mins`}
              </div>
              <div className="text-[10px] text-[#6A6861] mt-0.5 truncate">
                {stats.weeklyHoursLogged} hrs this week
              </div>
            </div>
          </div>

          {/* Tile 2: Reading Streak */}
          <div className="p-2.5 sm:p-3 rounded-lg bg-[#F8F7F3] border border-[#CBC9C0] shadow-2xs flex flex-col justify-between space-y-1">
            <div className="flex items-center justify-between text-[#6A6861]">
              <span className="text-[9px] sm:text-[10px] font-mono uppercase font-bold tracking-wider">Daily Streak</span>
              <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-[#EAE7DF] flex items-center justify-center text-[#2A2927]">
                <StreakIcon size={12} />
              </div>
            </div>
            <div>
              <div className="text-base sm:text-lg md:text-xl font-serif font-bold text-[#121212] leading-tight">
                {stats.currentStreakDays} {stats.currentStreakDays === 1 ? 'Day' : 'Days'}
              </div>
              <div className="text-[10px] text-[#6A6861] mt-0.5 truncate">
                Daily momentum
              </div>
            </div>
          </div>

          {/* Tile 3: Reading Sessions */}
          <div className="p-2.5 sm:p-3 rounded-lg bg-[#F8F7F3] border border-[#CBC9C0] shadow-2xs flex flex-col justify-between space-y-1">
            <div className="flex items-center justify-between text-[#6A6861]">
              <span className="text-[9px] sm:text-[10px] font-mono uppercase font-bold tracking-wider">Sessions</span>
              <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-[#EAE7DF] flex items-center justify-center text-[#2A2927]">
                <BarChart3 size={12} />
              </div>
            </div>
            <div>
              <div className="text-base sm:text-lg md:text-xl font-serif font-bold text-[#121212] leading-tight">
                {stats.totalSessions}
              </div>
              <div className="text-[10px] text-[#6A6861] mt-0.5 truncate">
                Avg {stats.avgMinutesPerSession || 15} mins/session
              </div>
            </div>
          </div>

          {/* Tile 4: Stacks */}
          <div
            onClick={() => setIsNewStackModalOpen(true)}
            className="p-2.5 sm:p-3 rounded-lg bg-[#F8F7F3] border border-[#CBC9C0] hover:border-black shadow-2xs flex flex-col justify-between space-y-1 cursor-pointer transition group"
          >
            <div className="flex items-center justify-between text-[#6A6861]">
              <span className="text-[9px] sm:text-[10px] font-mono uppercase font-bold tracking-wider">Stacks</span>
              <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-[#EAE7DF] group-hover:bg-black group-hover:text-white flex items-center justify-center text-[#2A2927] transition">
                <Plus size={12} />
              </div>
            </div>
            <div>
              <div className="text-base sm:text-lg md:text-xl font-serif font-bold text-[#121212] flex items-center justify-between leading-tight">
                <span>{stacks.length}</span>
                <span className="text-[9px] font-sans font-bold bg-[#E4E2DA] group-hover:bg-black group-hover:text-white px-1.5 py-0.2 rounded text-[#2A2927] transition">
                  + New
                </span>
              </div>
              <div className="text-[10px] text-[#6A6861] mt-0.5 truncate">
                Custom lists
              </div>
            </div>
          </div>

        </section>

        {/* ========================================================== */}
        {/* SECTION C: READING STACKS FILTER PILLS                     */}
        {/* ========================================================== */}
        <section className="space-y-1.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#2A2927] uppercase tracking-wider font-mono">
              <Layers size={12} />
              <span>Reading Stacks</span>
            </div>
            <button
              onClick={() => setIsNewStackModalOpen(true)}
              className="text-[11px] font-semibold text-[#4A4843] hover:text-black flex items-center gap-1 cursor-pointer py-0.5 px-1.5 rounded hover:bg-black/5"
            >
              <FolderPlus size={12} />
              <span>Create Stack</span>
            </button>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar font-ember">
            {/* All Books Filter Pill */}
            <button
              onClick={() => setSelectedStackFilter(null)}
              className={`h-7 whitespace-nowrap px-3 text-[11px] sm:text-xs rounded-full border transition cursor-pointer font-medium flex items-center gap-1 ${
                selectedStackFilter === null
                  ? 'bg-[#121212] text-white border-black shadow-xs font-semibold'
                  : 'bg-white/80 text-[#2C2B29] border-[#BDBBB2] hover:bg-white hover:border-black'
              }`}
            >
              <span>All Books</span>
              <span className="opacity-70 text-[9px]">({books.length})</span>
            </button>

            {/* Individual Stack Pills */}
            {stacks.map((stack) => {
              const isSelected = selectedStackFilter === stack.id;
              const count = books.filter((b) => b.stackIds?.includes(stack.id)).length;

              return (
                <button
                  key={stack.id}
                  onClick={() => setSelectedStackFilter(isSelected ? null : stack.id)}
                  className={`h-7 whitespace-nowrap px-3 text-[11px] sm:text-xs rounded-full border transition cursor-pointer font-medium flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-[#121212] text-white border-black shadow-xs font-semibold'
                      : 'bg-white/80 text-[#2C2B29] border-[#BDBBB2] hover:bg-white hover:border-black'
                  }`}
                >
                  <span
                    className="w-2 h-2 rounded-full border border-black/40 shrink-0"
                    style={{ backgroundColor: stack.color }}
                  />
                  <span>{stack.name}</span>
                  <span className="opacity-70 text-[9px]">({count})</span>
                </button>
              );
            })}
          </div>
        </section>

        {/* ========================================================== */}
        {/* SECTION D: SEARCH & FILTER BAR                             */}
        {/* ========================================================== */}
        <section className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 pt-0.5">
          {/* Search Input - Sleek h-7.5 */}
          <div className="relative flex-1 max-w-sm">
            <input
              type="text"
              placeholder="Search by title or author..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-7.5 sm:h-8 pl-8 pr-7 text-xs bg-white border border-[#BDBBB2] focus:border-black rounded-md text-[#1A1A1A] placeholder-[#76746E] focus:outline-none shadow-2xs font-ember"
            />
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#76746E]" />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#76746E] hover:text-black p-0.5"
              >
                <X size={11} />
              </button>
            )}
          </div>

          {/* Source Segments */}
          <div className="flex items-center gap-1 text-xs font-ember">
            <span className="text-[10px] text-[#6A6861] mr-0.5 hidden sm:inline">Filter:</span>
            <button
              onClick={() => setFilterSource('all')}
              className={`h-6.5 sm:h-7 px-2.5 rounded text-[11px] transition cursor-pointer font-medium ${
                filterSource === 'all'
                  ? 'bg-black text-white font-bold'
                  : 'bg-[#E4E2DC] text-[#4A4843] hover:bg-[#D5D3CC]'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilterSource('local')}
              className={`h-6.5 sm:h-7 px-2.5 rounded text-[11px] transition cursor-pointer font-medium ${
                filterSource === 'local'
                  ? 'bg-black text-white font-bold'
                  : 'bg-[#E4E2DC] text-[#4A4843] hover:bg-[#D5D3CC]'
              }`}
            >
              Local
            </button>
            <button
              onClick={() => setFilterSource('drive')}
              className={`h-6.5 sm:h-7 px-2.5 rounded text-[11px] transition cursor-pointer font-medium ${
                filterSource === 'drive'
                  ? 'bg-black text-white font-bold'
                  : 'bg-[#E4E2DC] text-[#4A4843] hover:bg-[#D5D3CC]'
              }`}
            >
              Drive
            </button>
            <button
              onClick={() => setFilterSource('finished')}
              className={`h-6.5 sm:h-7 px-2.5 rounded text-[11px] transition cursor-pointer font-medium ${
                filterSource === 'finished'
                  ? 'bg-black text-white font-bold'
                  : 'bg-[#E4E2DC] text-[#4A4843] hover:bg-[#D5D3CC]'
              }`}
            >
              Finished
            </button>
          </div>
        </section>

        {/* ========================================================== */}
        {/* SECTION E: PROPORTIONAL LIBRARY BOOKS GRID                 */}
        {/* ========================================================== */}
        <section className="space-y-2.5 pt-0.5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm sm:text-base font-serif font-bold text-[#121212] tracking-tight">
              {selectedStackFilter
                ? stacks.find((s) => s.id === selectedStackFilter)?.name || 'Filtered Stack'
                : 'Library Books'}
            </h3>
            <span className="text-[10px] sm:text-[11px] font-mono text-[#6A6861]">
              {filteredBooks.length} of {books.length} Books
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-2 sm:gap-2.5 md:gap-3">
            {filteredBooks.map((book) => {
              const pct = book.progressPercent || Math.round((book.currentPage / Math.max(1, book.totalPages)) * 100);

              return (
                <div
                  key={book.id}
                  className="flex flex-col group relative bg-[#F8F7F3] rounded-md border border-[#CBC9C0] hover:border-black transition duration-150 shadow-2xs hover:shadow-xs overflow-hidden"
                >
                  {/* Full Cover Viewable (object-contain with clean padding) */}
                  <div
                    onClick={() => onOpenBook(book)}
                    className="relative aspect-[3/4] w-full bg-[#EAE8E2] flex items-center justify-center p-1.5 overflow-hidden cursor-pointer"
                  >
                    <img
                      src={book.coverUrl}
                      alt={book.title}
                      className="w-full h-full object-contain grayscale contrast-115 group-hover:scale-103 transition-transform duration-200 drop-shadow-xs"
                    />

                    {/* Progress Badge */}
                    <div className="absolute top-1 right-1 bg-black/85 text-white font-mono text-[8px] font-bold px-1 py-0.2 rounded-2xs tracking-tight shadow-xs">
                      {pct > 0 ? `${pct}%` : 'NEW'}
                    </div>

                    {/* Checkmark Badge */}
                    <div className="absolute bottom-1 left-1 w-3 h-3 rounded-full bg-black/80 text-white flex items-center justify-center text-[7px] border border-white/40 shadow-xs">
                      <Check size={7} className="stroke-[3]" />
                    </div>

                    {/* Stack Color Dots */}
                    {book.stackIds && book.stackIds.length > 0 && (
                      <div className="absolute bottom-1 right-1 flex items-center gap-0.5">
                        {book.stackIds.slice(0, 3).map((sId) => {
                          const stack = stacks.find((s) => s.id === sId);
                          if (!stack) return null;
                          return (
                            <span
                              key={sId}
                              className="w-1.5 h-1.5 rounded-full border border-black/50"
                              style={{ backgroundColor: stack.color }}
                              title={stack.name}
                            />
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Info and Actions */}
                  <div className="p-1.5 sm:p-2 flex-1 flex flex-col justify-between space-y-1">
                    <div>
                      <h4
                        onClick={() => onOpenBook(book)}
                        className="text-[11px] sm:text-xs font-serif font-bold text-[#121212] line-clamp-1 group-hover:underline cursor-pointer leading-tight"
                        title={book.title}
                      >
                        {book.title}
                      </h4>
                      <p className="text-[9px] sm:text-[10px] text-[#5A5852] truncate font-ember">
                        {book.author}
                      </p>
                    </div>

                    {/* Card Footer */}
                    <div className="flex items-center justify-between pt-1 border-t border-[#DCDAD2] text-[9px] sm:text-[10px]">
                      <button
                        onClick={() => setEditingBookForStack(book)}
                        className="text-[9px] sm:text-[10px] text-[#5A5852] hover:text-black font-semibold flex items-center gap-0.5 cursor-pointer py-0.5 px-0.5 rounded hover:bg-black/5"
                        title="Assign to Stacks"
                      >
                        <Layers size={9} />
                        <span>Stacks</span>
                      </button>

                      <div className="flex items-center gap-0.5">
                        <button
                          onClick={() => onOpenBook(book, 'reflow-ereader')}
                          className="p-0.5 text-[#2A2927] hover:bg-black hover:text-white rounded transition cursor-pointer"
                          title="Open Reflow Mode"
                        >
                          <BookOpen size={10} />
                        </button>
                        <button
                          onClick={() => onDeleteBook(book.id)}
                          className="p-0.5 text-[#8A8881] hover:text-red-700 hover:bg-red-50 rounded transition cursor-pointer"
                          title="Delete PDF"
                        >
                          <Trash2 size={10} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

      </div>

      {/* ============================================================ */}
      {/* 3. MODAL: CREATE NEW READING STACK                           */}
      {/* ============================================================ */}
      {isNewStackModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-fade-in font-sans">
          <div className="w-full max-w-sm bg-[#F7F6F1] rounded-xl shadow-2xl border border-[#2D2C2A] p-5 space-y-3.5 text-[#121212]">
            <div className="flex items-center justify-between border-b border-[#D8D6CF] pb-2.5">
              <h3 className="font-serif font-bold text-sm sm:text-base flex items-center gap-2">
                <FolderPlus size={16} />
                <span>Create New Stack</span>
              </h3>
              <button
                onClick={() => setIsNewStackModalOpen(false)}
                className="text-[#6A6861] hover:text-black p-1 rounded hover:bg-black/5 cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            <form onSubmit={handleCreateStackSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold mb-1">Stack Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Science & Machine Learning"
                  value={newStackName}
                  onChange={(e) => setNewStackName(e.target.value)}
                  className="w-full h-8 px-2.5 text-xs bg-white border border-[#BDBBB2] rounded focus:outline-none focus:border-black"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Description (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Research papers and reading queue"
                  value={newStackDesc}
                  onChange={(e) => setNewStackDesc(e.target.value)}
                  className="w-full h-8 px-2.5 text-xs bg-white border border-[#BDBBB2] rounded focus:outline-none focus:border-black"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Color Tag</label>
                <div className="flex items-center gap-2">
                  {STACK_PALETTE.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setNewStackColor(c)}
                      className={`w-6 h-6 rounded-full border-2 transition cursor-pointer ${
                        newStackColor === c ? 'border-black scale-110 shadow-xs' : 'border-transparent hover:scale-105'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#D8D6CF]">
                <button
                  type="button"
                  onClick={() => setIsNewStackModalOpen(false)}
                  className="h-7.5 px-3 text-xs text-[#5A5852] hover:text-black rounded cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="h-7.5 px-3.5 text-xs font-bold bg-black hover:bg-stone-800 text-white rounded cursor-pointer transition shadow-xs"
                >
                  Create Stack
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 4. MODAL: ASSIGN BOOK TO STACKS                              */}
      {/* ============================================================ */}
      {editingBookForStack && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-fade-in font-sans">
          <div className="w-full max-w-sm bg-[#F7F6F1] rounded-xl shadow-2xl border border-[#2D2C2A] p-5 space-y-3.5 text-[#121212]">
            <div className="flex items-center justify-between border-b border-[#D8D6CF] pb-2.5">
              <div>
                <h3 className="font-serif font-bold text-sm">Assign to Stacks</h3>
                <p className="text-[11px] text-[#5A5852] truncate max-w-[220px] font-ember mt-0.5">{editingBookForStack.title}</p>
              </div>
              <button
                onClick={() => setEditingBookForStack(null)}
                className="text-[#6A6861] hover:text-black p-1 rounded hover:bg-black/5 cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
              {stacks.map((stack) => {
                const isSelected = editingBookForStack.stackIds?.includes(stack.id);
                return (
                  <button
                    key={stack.id}
                    onClick={() => onToggleBookInStack(editingBookForStack.id, stack.id)}
                    className={`w-full p-2 rounded border flex items-center justify-between text-left transition cursor-pointer ${
                      isSelected
                        ? 'border-black bg-white font-semibold shadow-2xs'
                        : 'border-[#D0CEC6] hover:bg-white text-[#2C2B29]'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full border border-black/40 shrink-0" style={{ backgroundColor: stack.color }} />
                      <span className="text-xs">{stack.name}</span>
                    </div>
                    {isSelected && <Check size={14} className="text-black stroke-[2.5]" />}
                  </button>
                );
              })}
            </div>

            <div className="flex justify-end pt-2.5 border-t border-[#D8D6CF]">
              <button
                onClick={() => setEditingBookForStack(null)}
                className="h-7.5 px-3.5 text-xs font-bold bg-black hover:bg-stone-800 text-white rounded cursor-pointer transition shadow-xs"
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
