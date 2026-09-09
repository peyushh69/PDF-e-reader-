import React from 'react';
import {
  Sun,
  Moon,
  Eye,
  Sparkles,
  ShieldCheck,
  Flame,
  Palette,
  Layers,
  X,
  Check,
  Sliders,
  Smartphone,
  BookOpen,
} from 'lucide-react';
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

export const HARDWARE_THEMES: {
  id: DeviceHardwareTheme;
  name: string;
  subtitle: string;
  bezelColor: string;
  borderColor: string;
  badge: string;
}[] = [
  {
    id: 'black-paperwhite',
    name: 'Kindle Paperwhite Black',
    subtitle: 'Classic Matte Black bezel (Image 1)',
    bezelColor: '#1a1a1e',
    borderColor: '#0d0d0f',
    badge: 'Classic',
  },
  {
    id: 'white-folio',
    name: 'Kindle White & Leather Folio',
    subtitle: 'White bezel with dark leather flip cover (Image 2)',
    bezelColor: '#f3f3f1',
    borderColor: '#3a322d',
    badge: 'Folio Case',
  },
  {
    id: 'mint-agave',
    name: 'Agave Mint Green',
    subtitle: 'Soothing pastel sage green bezel',
    bezelColor: '#b8e2c8',
    borderColor: '#a6d6b9',
    badge: 'Signature',
  },
  {
    id: 'midnight-denim',
    name: 'Midnight Denim Blue',
    subtitle: 'Deep oceanic navy matte finish',
    bezelColor: '#202e3d',
    borderColor: '#151e28',
    badge: 'Modern',
  },
  {
    id: 'champagne-gold',
    name: 'Champagne Warm Metal',
    subtitle: 'Soft brushed warm champagne aluminum',
    bezelColor: '#dfd4c8',
    borderColor: '#c6b6a6',
    badge: 'Luxury',
  },
];

export const ENVIRONMENT_BACKGROUNDS: {
  id: EnvironmentBackground;
  name: string;
  desc: string;
  previewClass: string;
}[] = [
  {
    id: 'linen-bed',
    name: 'White Linen Bedding',
    desc: 'Cozy crumpled cotton duvet (Photo 1)',
    previewClass: 'bg-gradient-to-br from-[#f5f5f3] via-[#e8e8e4] to-[#deded8]',
  },
  {
    id: 'sunlit-sheets',
    name: 'Sunlit Linen & Shadow',
    desc: 'Warm sunbeam & soft fabric folds (Photo 2)',
    previewClass: 'bg-gradient-to-br from-[#8a9ba8] via-[#687a87] to-[#475763]',
  },
  {
    id: 'dark-slate',
    name: 'Twilight Studio Slate',
    desc: 'Distraction-free dark mode canvas',
    previewClass: 'bg-gradient-to-br from-[#181a1e] via-[#121417] to-[#0a0a0c]',
  },
  {
    id: 'warm-wood',
    name: 'Walnut Library Table',
    desc: 'Rich natural woodgrain reading nook',
    previewClass: 'bg-gradient-to-br from-[#3d2b1f] via-[#2a1c14] to-[#1f140e]',
  },
];

export const EYE_PRESETS: {
  id: EyeProtectionSettings['preset'];
  name: string;
  warmth: number;
  brightness: number;
  blueLightFilter: boolean;
  desc: string;
  iconColor: string;
}[] = [
  {
    id: 'daylight',
    name: 'Daylight Crisp (6500K)',
    warmth: 0,
    brightness: 20,
    blueLightFilter: false,
    desc: 'High contrast black & white e-ink for bright rooms',
    iconColor: 'text-sky-500',
  },
  {
    id: 'afternoon',
    name: 'Afternoon Soft (4500K)',
    warmth: 8,
    brightness: 16,
    blueLightFilter: true,
    desc: 'Gentle cream glow for prolonged study & reading',
    iconColor: 'text-amber-500',
  },
  {
    id: 'candlelight',
    name: 'Kindle Amber Candlelight (2200K)',
    warmth: 20,
    brightness: 12,
    blueLightFilter: true,
    desc: 'Warm amber glow like Paperwhite Warmth (Zero Eye Strain)',
    iconColor: 'text-orange-500',
  },
  {
    id: 'vintage',
    name: 'Vintage Book Parchment',
    warmth: 14,
    brightness: 15,
    blueLightFilter: true,
    desc: 'Classic antique book pages tone',
    iconColor: 'text-yellow-600',
  },
  {
    id: 'dark-night',
    name: 'Dark Inverted E-Ink',
    warmth: 4,
    brightness: 8,
    blueLightFilter: true,
    desc: 'Inverted black page with soft dimmed text',
    iconColor: 'text-indigo-400',
  },
];

export const ThemeAndEyeProtectionModal: React.FC<ThemeAndEyeProtectionModalProps> = ({
  isOpen,
  onClose,
  hardwareTheme,
  onChangeHardwareTheme,
  environmentBg,
  onChangeEnvironmentBg,
  eyeProtection,
  onChangeEyeProtection,
  readingTheme,
  onChangeReadingTheme,
}) => {
  const [activeTab, setActiveTab] = React.useState<'eye' | 'themes'>('eye');

  if (!isOpen) return null;

  const handleWarmthSlider = (value: number) => {
    onChangeEyeProtection({
      ...eyeProtection,
      enabled: true,
      warmth: value,
    });
  };

  const handleBrightnessSlider = (value: number) => {
    onChangeEyeProtection({
      ...eyeProtection,
      brightness: value,
    });
  };

  const applyPreset = (presetId: EyeProtectionSettings['preset']) => {
    const preset = EYE_PRESETS.find((p) => p.id === presetId);
    if (preset) {
      onChangeEyeProtection({
        enabled: true,
        warmth: preset.warmth,
        brightness: preset.brightness,
        blueLightFilter: preset.blueLightFilter,
        preset: preset.id,
      });
      if (preset.id === 'dark-night') {
        onChangeReadingTheme('dark');
      } else if (preset.id === 'vintage') {
        onChangeReadingTheme('sepia');
      } else if (preset.id === 'candlelight') {
        onChangeReadingTheme('amber-glow');
      } else {
        onChangeReadingTheme('light');
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-sm animate-in fade-in font-sans">
      <div className="bg-stone-900 border border-stone-800 text-stone-100 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-stone-800 flex items-center justify-between bg-black">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-stone-800 text-white border border-stone-700">
              <Eye size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Eye Protection & Reading Themes
                <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-stone-800 text-stone-300 border border-stone-700">
                  Comfort Mode
                </span>
              </h2>
              <p className="text-xs text-stone-400">
                Adjust warm light temperature, frontlight brightness, and page color tones
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-stone-800 text-stone-400 hover:text-white transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-stone-800 bg-stone-950/40 px-5 gap-4 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('eye')}
            className={`py-3 border-b-2 flex items-center gap-2 transition cursor-pointer ${
              activeTab === 'eye'
                ? 'border-white text-white font-bold'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            <Flame size={14} />
            <span>Eye Protection & Warm Light</span>
          </button>

          <button
            onClick={() => setActiveTab('themes')}
            className={`py-3 border-b-2 flex items-center gap-2 transition cursor-pointer ${
              activeTab === 'themes'
                ? 'border-white text-white font-bold'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            <Palette size={14} />
            <span>Reading Page Themes</span>
          </button>
        </div>

        {/* Tab Body */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1 text-xs">
          
          {/* TAB 1: EYE PROTECTION & WARMTH SLIDER */}
          {activeTab === 'eye' && (
            <div className="space-y-5">
              
              {/* Master Eye Protection Toggle */}
              <div className="p-4 rounded-xl bg-stone-800/80 border border-stone-700/60 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-lg ${eyeProtection.enabled ? 'bg-white text-black' : 'bg-stone-700 text-stone-400'}`}>
                    <ShieldCheck size={20} />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white flex items-center gap-2">
                      Eye Protection Mode
                      {eyeProtection.enabled && (
                        <span className="text-[10px] text-white bg-stone-700 px-2 py-0.5 rounded-full border border-stone-600">
                          Active
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-stone-400 mt-0.5">
                      Filters blue light and emits soothing warm tones for fatigue-free reading
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => onChangeEyeProtection({ ...eyeProtection, enabled: !eyeProtection.enabled })}
                  className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                    eyeProtection.enabled ? 'bg-white' : 'bg-stone-700'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-black absolute top-1 transition-transform ${
                      eyeProtection.enabled ? 'right-1' : 'left-1 bg-stone-400'
                    }`}
                  />
                </button>
              </div>

              {/* Warmth (0 to 24) Slider */}
              <div className="p-4 rounded-xl bg-stone-950/60 border border-stone-800 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Flame className="text-white" size={16} />
                    <span className="font-bold text-sm text-stone-200">Warmth (Color Temperature)</span>
                  </div>
                  <span className="font-mono text-white font-bold bg-stone-800 px-2 py-0.5 rounded border border-stone-700">
                    {eyeProtection.warmth} / 24
                  </span>
                </div>

                <div className="space-y-1.5">
                  <div className="relative flex items-center">
                    <input
                      type="range"
                      min="0"
                      max="24"
                      value={eyeProtection.warmth}
                      onChange={(e) => handleWarmthSlider(parseInt(e.target.value))}
                      className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-white bg-stone-700"
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-stone-400 font-mono">
                    <span>0 (Crisp Daylight 6500K)</span>
                    <span>12 (Neutral Soft 4500K)</span>
                    <span>24 (Warm Candlelight 2200K)</span>
                  </div>
                </div>

                {/* Brightness (0 to 24) Slider */}
                <div className="pt-3 border-t border-stone-800/80">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Sun className="text-white" size={16} />
                      <span className="font-bold text-sm text-stone-200">Brightness / Frontlight</span>
                    </div>
                    <span className="font-mono text-white font-bold bg-stone-800 px-2 py-0.5 rounded border border-stone-700">
                      {eyeProtection.brightness} / 24
                    </span>
                  </div>

                  <input
                    type="range"
                    min="2"
                    max="24"
                    value={eyeProtection.brightness}
                    onChange={(e) => handleBrightnessSlider(parseInt(e.target.value))}
                    className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-stone-700 accent-white"
                  />
                  <div className="flex justify-between text-[10px] text-stone-400 font-mono mt-1">
                    <span>Low Night (2)</span>
                    <span>Standard (14)</span>
                    <span>Max Daylight (24)</span>
                  </div>
                </div>
              </div>

              {/* Quick Reading Presets */}
              <div>
                <div className="text-xs uppercase font-bold tracking-wider text-stone-400 mb-2.5">
                  Eye Comfort Presets (One-Click)
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {EYE_PRESETS.map((preset) => {
                    const isSelected = eyeProtection.preset === preset.id;
                    return (
                      <button
                        key={preset.id}
                        onClick={() => applyPreset(preset.id)}
                        className={`p-3 rounded-xl border text-left transition flex items-start justify-between cursor-pointer ${
                          isSelected
                            ? 'bg-stone-800 border-white text-white font-semibold'
                            : 'bg-stone-800/40 border-stone-800 text-stone-300 hover:bg-stone-800/80'
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="font-bold text-xs flex items-center gap-1.5">
                            <Flame size={13} className="text-stone-300" />
                            <span>{preset.name}</span>
                          </div>
                          <div className="text-[11px] text-stone-400 leading-tight">
                            {preset.desc}
                          </div>
                        </div>
                        {isSelected && <Check size={14} className="text-white shrink-0 ml-2" />}
                      </button>
                    );
                  })}
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: READING PAGE THEMES */}
          {activeTab === 'themes' && (
            <div className="space-y-4">
              <div className="text-xs text-stone-400">
                Choose the background and text color scheme for your reading interface:
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* 1. Daylight Light */}
                <div
                  onClick={() => onChangeReadingTheme('light')}
                  className={`p-3.5 rounded-xl border transition cursor-pointer space-y-2 bg-[#FBFBF9] text-[#111111] ${
                    readingTheme === 'light'
                      ? 'border-stone-900 ring-2 ring-stone-900/30 font-bold'
                      : 'border-stone-300 hover:border-stone-500'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-sm">Daylight Paper</span>
                    {readingTheme === 'light' && <Check size={16} className="text-stone-900" />}
                  </div>
                  <div className="text-xs text-stone-600">Crisp high-contrast black on off-white</div>
                </div>

                {/* 2. Dark Night */}
                <div
                  onClick={() => onChangeReadingTheme('dark')}
                  className={`p-3.5 rounded-xl border transition cursor-pointer space-y-2 bg-[#0d0d0d] text-[#e5e5e5] ${
                    readingTheme === 'dark'
                      ? 'border-white ring-2 ring-white/30 font-bold'
                      : 'border-stone-800 hover:border-stone-600'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-sm">Dark Inverted</span>
                    {readingTheme === 'dark' && <Check size={16} className="text-white" />}
                  </div>
                  <div className="text-xs text-stone-400">Soft dimmed text for complete darkness</div>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-stone-800 bg-stone-950/80 flex items-center justify-between text-xs">
          <div className="text-stone-400">
            {eyeProtection.enabled ? (
              <span className="text-white font-medium flex items-center gap-1">
                <Flame size={12} />
                Warmth level {eyeProtection.warmth}/24 active
              </span>
            ) : (
              <span>Eye protection off</span>
            )}
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-white hover:bg-stone-200 text-black font-bold rounded-lg transition cursor-pointer"
          >
            Apply & Done
          </button>
        </div>

      </div>
    </div>
  );
};
