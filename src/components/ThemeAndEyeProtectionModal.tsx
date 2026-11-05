import React from 'react';
import { X, Check } from 'lucide-react';
import {
  DeviceHardwareTheme,
  EnvironmentBackground,
  EyeProtectionSettings,
  ThemeMode,
} from '../types';

interface ThemeAndEyeProtectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  hardwareTheme: DeviceHardwareTheme;
  onChangeHardwareTheme: (theme: DeviceHardwareTheme) => void;
  environmentBg: EnvironmentBackground;
  onChangeEnvironmentBg: (bg: EnvironmentBackground) => void;
  eyeProtection: EyeProtectionSettings;
  onChangeEyeProtection: (settings: EyeProtectionSettings) => void;
  readingTheme: ThemeMode;
  onChangeReadingTheme: (theme: ThemeMode) => void;
}

const PAGE_THEMES: {
  id: ThemeMode;
  name: string;
  desc: string;
  swatchClass: string;
}[] = [
  {
    id: 'light',
    name: 'Paper-Ink',
    desc: 'Crisp matte paper & deep carbon ink',
    swatchClass: 'bg-[#F4F1EA] text-[#161514] border-[#B8B0A2]',
  },
  {
    id: 'warm-sepia',
    name: 'Warm Ivory',
    desc: 'Soft cotton book paper tone',
    swatchClass: 'bg-[#EFE9DC] text-[#1E1A15] border-[#B5A992]',
  },
  {
    id: 'sepia',
    name: 'Sepia',
    desc: 'Traditional warm edition parchment',
    swatchClass: 'bg-[#E8DEC8] text-[#231B12] border-[#AA9A7C]',
  },
  {
    id: 'amber-glow',
    name: 'Amber',
    desc: 'Warm evening frontlit tone',
    swatchClass: 'bg-[#E6D5B8] text-[#21170B] border-[#A68E67]',
  },
  {
    id: 'emerald-paper',
    name: 'Sage',
    desc: 'Relaxing archival sage paper',
    swatchClass: 'bg-[#E6ECE8] text-[#131D17] border-[#9FB0A5]',
  },
  {
    id: 'dark',
    name: 'Night',
    desc: 'Low-glare inverted carbon display',
    swatchClass: 'bg-[#141413] text-[#E6E3DC] border-[#45433E]',
  },
];

export const ThemeAndEyeProtectionModal: React.FC<ThemeAndEyeProtectionModalProps> = ({
  isOpen,
  onClose,
  eyeProtection,
  onChangeEyeProtection,
  readingTheme,
  onChangeReadingTheme,
}) => {
  if (!isOpen) return null;

  const handleWarmthSlider = (value: number) => {
    onChangeEyeProtection({
      ...eyeProtection,
      enabled: value > 0 || eyeProtection.brightness < 24,
      warmth: value,
    });
  };

  const handleBrightnessSlider = (value: number) => {
    onChangeEyeProtection({
      ...eyeProtection,
      enabled: eyeProtection.warmth > 0 || value < 24,
      brightness: value,
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs font-sans"
      onClick={onClose}
    >
      <div
        className="bg-[var(--paper-sheet)] border border-[var(--paper-border-strong)] text-[var(--ink-primary)] rounded-xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[86vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-[var(--paper-border)] flex items-center justify-between bg-[var(--paper-bg)]">
          <h2 className="text-sm font-literata font-semibold text-[var(--ink-primary)]">
            Display Settings
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-md hover:bg-[var(--paper-subtle)] text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] transition cursor-pointer"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* Unified Single-View Body (Zero Duplicate Presets) */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1 text-xs">
          {/* 1. Paper-Ink Surface Themes */}
          <div>
            <div className="font-medium text-xs text-[var(--ink-primary)] mb-2.5">
              Display Theme
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {PAGE_THEMES.map((t) => {
                const isSelected = readingTheme === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => onChangeReadingTheme(t.id)}
                    className={`p-3 rounded-xl border text-left transition cursor-pointer ${t.swatchClass} ${
                      isSelected ? 'ring-2 ring-[var(--ink-primary)]' : 'opacity-90 hover:opacity-100'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-literata font-semibold text-xs">{t.name}</span>
                      {isSelected && <Check size={13} />}
                    </div>
                    <div className="text-[10px] opacity-75 mt-1 leading-snug">{t.desc}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Warm Light & Brightness Sliders */}
          <div className="p-4 rounded-xl bg-[var(--paper-bg)] border border-[var(--paper-border)] space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-medium text-xs text-[var(--ink-primary)]">Warm Light</span>
                <span className="tabular-nums text-[11px] text-[var(--ink-secondary)]">
                  {eyeProtection.warmth} / 24
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="24"
                value={eyeProtection.warmth}
                onChange={(e) => handleWarmthSlider(parseInt(e.target.value, 10))}
                className="w-full h-1.5 rounded-lg appearance-none cursor-pointer accent-[var(--ink-primary)] bg-[var(--paper-border-strong)]"
              />
            </div>

            <div className="pt-3 border-t border-[var(--paper-border)]">
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-medium text-xs text-[var(--ink-primary)]">Brightness</span>
                <span className="tabular-nums text-[11px] text-[var(--ink-secondary)]">
                  {eyeProtection.brightness} / 24
                </span>
              </div>
              <input
                type="range"
                min="2"
                max="24"
                value={eyeProtection.brightness}
                onChange={(e) => handleBrightnessSlider(parseInt(e.target.value, 10))}
                className="w-full h-1.5 rounded-lg appearance-none cursor-pointer bg-[var(--paper-border-strong)] accent-[var(--ink-primary)]"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[var(--paper-border)] bg-[var(--paper-bg)] flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-[var(--ink-primary)] hover:opacity-90 text-[var(--ink-inverse)] text-xs font-medium rounded-lg transition cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
