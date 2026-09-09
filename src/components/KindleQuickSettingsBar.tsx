import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Sun,
  Flame,
  Moon,
  Smartphone,
  Palette,
  ShieldCheck,
  Sparkles,
  Wifi,
  Sliders,
  X,
  Check,
} from 'lucide-react';
import {
  DeviceHardwareTheme,
  EnvironmentBackground,
  EyeProtectionSettings,
  ThemeMode,
} from '../types';
import { HARDWARE_THEMES, EYE_PRESETS } from './ThemeAndEyeProtectionModal';

interface KindleQuickSettingsBarProps {
  hardwareTheme: DeviceHardwareTheme;
  onChangeHardwareTheme: (theme: DeviceHardwareTheme) => void;
  environmentBg: EnvironmentBackground;
  onChangeEnvironmentBg: (bg: EnvironmentBackground) => void;
  eyeProtection: EyeProtectionSettings;
  onChangeEyeProtection: (settings: EyeProtectionSettings) => void;
  readingTheme: ThemeMode;
  onChangeReadingTheme: (theme: ThemeMode) => void;
  onOpenFullModal: () => void;
}

export const KindleQuickSettingsBar: React.FC<KindleQuickSettingsBarProps> = ({
  hardwareTheme,
  onChangeHardwareTheme,
  environmentBg,
  onChangeEnvironmentBg,
  eyeProtection,
  onChangeEyeProtection,
  readingTheme,
  onChangeReadingTheme,
  onOpenFullModal,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const toggleWarmth = () => {
    onChangeEyeProtection({
      ...eyeProtection,
      enabled: !eyeProtection.enabled,
    });
  };

  const handleWarmthChange = (val: number) => {
    onChangeEyeProtection({
      ...eyeProtection,
      enabled: true,
      warmth: val,
    });
  };

  const handleBrightnessChange = (val: number) => {
    onChangeEyeProtection({
      ...eyeProtection,
      brightness: val,
    });
  };

  return (
    <div className="relative z-40 font-sans">
      {/* Top Subtle Pull Handle (As seen in real Kindle photos - small v chevron at top) */}
      <div className="w-full flex justify-center -mb-2">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="group px-4 py-0.5 rounded-b-md bg-stone-200/80 hover:bg-stone-300 dark:bg-stone-800/80 dark:hover:bg-stone-700 text-stone-600 dark:text-stone-300 text-[10px] flex items-center gap-1 transition-all shadow-xs cursor-pointer border-b border-x border-stone-300/40"
          title="Kindle Quick Settings: Eye Protection, Warmth & Themes"
        >
          {isOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          <span className="font-semibold text-[9px] uppercase tracking-wider">
            {isOpen ? 'Close' : 'Quick Settings'}
          </span>
          {eyeProtection.enabled && (
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
          )}
        </button>
      </div>

      {/* Dropdown Quick Settings Drawer Panel */}
      {isOpen && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 w-[94%] max-w-lg bg-stone-900/95 text-stone-100 border border-stone-800 rounded-2xl shadow-2xl p-4 space-y-3.5 backdrop-blur-md animate-in fade-in slide-in-from-top-3">
          
          {/* Header */}
          <div className="flex items-center justify-between pb-2 border-b border-stone-800">
            <div className="flex items-center gap-2">
              <Flame size={16} className="text-amber-400" />
              <span className="font-bold text-xs text-white">Kindle Control Center</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={onOpenFullModal}
                className="text-[10px] text-amber-300 hover:text-amber-200 underline font-semibold cursor-pointer"
              >
                All Themes & Modes
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded hover:bg-stone-800 text-stone-400 hover:text-white"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {/* Quick Toggles Row (Airplane, Dark Mode, Eye Protection) */}
          <div className="grid grid-cols-3 gap-2 text-center text-[10px]">
            {/* Eye Protection Toggle */}
            <button
              onClick={toggleWarmth}
              className={`p-2 rounded-xl border flex flex-col items-center gap-1 transition ${
                eyeProtection.enabled
                  ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold'
                  : 'bg-stone-800/60 border-stone-700 text-stone-400 hover:bg-stone-800'
              }`}
            >
              <ShieldCheck size={16} />
              <span>Eye Protection</span>
            </button>

            {/* Inverted / Dark Mode */}
            <button
              onClick={() => onChangeReadingTheme(readingTheme === 'dark' ? 'light' : 'dark')}
              className={`p-2 rounded-xl border flex flex-col items-center gap-1 transition ${
                readingTheme === 'dark'
                  ? 'bg-indigo-500/20 border-indigo-500 text-indigo-300 font-bold'
                  : 'bg-stone-800/60 border-stone-700 text-stone-400 hover:bg-stone-800'
              }`}
            >
              <Moon size={16} />
              <span>Dark Mode</span>
            </button>

            {/* Full Themes Modal Trigger */}
            <button
              onClick={() => {
                setIsOpen(false);
                onOpenFullModal();
              }}
              className="p-2 rounded-xl border bg-stone-800/60 border-stone-700 text-stone-300 hover:bg-stone-800 flex flex-col items-center gap-1 transition"
            >
              <Palette size={16} />
              <span>Bezels & Skins</span>
            </button>
          </div>

          {/* Warmth (Eye Protection) Slider (0 to 24) */}
          <div className="space-y-1.5 bg-stone-950/60 p-2.5 rounded-xl border border-stone-800">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 text-amber-400 font-medium">
                <Flame size={13} />
                <span>Warmth (Eye Care Light)</span>
              </div>
              <span className="font-mono text-[11px] text-amber-400 font-bold">
                {eyeProtection.warmth} / 24
              </span>
            </div>

            <input
              type="range"
              min="0"
              max="24"
              value={eyeProtection.warmth}
              onChange={(e) => handleWarmthChange(parseInt(e.target.value))}
              className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-amber-400"
              style={{
                background: 'linear-gradient(to right, #f4f4f5 0%, #fef3c7 35%, #fbbf24 65%, #f97316 100%)',
              }}
            />
          </div>

          {/* Brightness Slider (0 to 24) */}
          <div className="space-y-1.5 bg-stone-950/60 p-2.5 rounded-xl border border-stone-800">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 text-yellow-300 font-medium">
                <Sun size={13} />
                <span>Frontlight Brightness</span>
              </div>
              <span className="font-mono text-[11px] text-yellow-300 font-bold">
                {eyeProtection.brightness} / 24
              </span>
            </div>

            <input
              type="range"
              min="2"
              max="24"
              value={eyeProtection.brightness}
              onChange={(e) => handleBrightnessChange(parseInt(e.target.value))}
              className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-stone-700 accent-yellow-400"
            />
          </div>

          {/* Fast Hardware Bezel Selector Chips */}
          <div className="space-y-1.5 pt-1">
            <div className="text-[10px] text-stone-400 uppercase font-semibold">
              Kindle Bezel Style
            </div>
            <div className="grid grid-cols-3 gap-1.5 text-[10px]">
              {HARDWARE_THEMES.slice(0, 3).map((theme) => {
                const isSelected = hardwareTheme === theme.id;
                return (
                  <button
                    key={theme.id}
                    onClick={() => onChangeHardwareTheme(theme.id)}
                    className={`py-1 px-2 rounded-lg border truncate transition flex items-center justify-center gap-1 ${
                      isSelected
                        ? 'border-amber-400 bg-amber-500/10 text-white font-bold'
                        : 'border-stone-800 bg-stone-800/40 text-stone-400 hover:text-stone-200'
                    }`}
                  >
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: theme.bezelColor }}
                    />
                    <span className="truncate">{theme.badge}</span>
                  </button>
                );
              })}
            </div>
          </div>

        </div>
      )}
    </div>
  );
};
