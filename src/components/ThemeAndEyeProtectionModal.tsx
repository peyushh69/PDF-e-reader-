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

export const EYE_PRESETS: {
  id: EyeProtectionSettings['preset'];
  name: string;
  warmth: number;
  brightness: number;
  blueLightFilter: boolean;
  desc: string;
}[] = [
  {
    id: 'daylight',
    name: 'Daylight (6500K)',
    warmth: 0,
    brightness: 20,
    blueLightFilter: false,
    desc: 'Crisp black and white contrast',
  },
  {
    id: 'afternoon',
    name: 'Afternoon (4500K)',
    warmth: 8,
    brightness: 16,
    blueLightFilter: true,
    desc: 'Soft balanced paper warmth',
  },
  {
    id: 'candlelight',
    name: 'Amber Warmth (2200K)',
    warmth: 20,
    brightness: 12,
    blueLightFilter: true,
    desc: 'Reduced blue light for evening',
  },
  {
    id: 'vintage',
    name: 'Parchment',
    warmth: 14,
    brightness: 15,
    blueLightFilter: true,
    desc: 'Classic warm book tone',
  },
  {
    id: 'dark-night',
    name: 'Night Mode',
    warmth: 4,
    brightness: 8,
    blueLightFilter: true,
    desc: 'Low-glare inverted page',
  },
];

const PAGE_THEMES: {
  id: ThemeMode;
  name: string;
  desc: string;
  swatchClass: string;
}[] = [
  {
    id: 'light',
    name: 'Matte E-Ink',
    desc: 'Soft low-glare electronic paper',
    swatchClass: 'bg-[#DBD9D3] text-[#2B2A27] border-[#6E6C66]',
  },
  {
    id: 'warm-sepia',
    name: 'Warm Cream',
    desc: 'Soft low-glare cream page',
    swatchClass: 'bg-[#E6DFCF] text-[#2B251E] border-[#8C8270]',
  },
  {
    id: 'sepia',
    name: 'Classic Sepia',
    desc: 'Traditional book parchment',
    swatchClass: 'bg-[#DFD2BC] text-[#2C2217] border-[#8A7B65]',
  },
  {
    id: 'amber-glow',
    name: 'Amber Glow',
    desc: 'Warm evening reading tone',
    swatchClass: 'bg-[#E0CCA4] text-[#2A1D0C] border-[#8C764B]',
  },
  {
    id: 'emerald-paper',
    name: 'Sage Paper',
    desc: 'Relaxing muted green tint',
    swatchClass: 'bg-[#D3DDD7] text-[#1D2B23] border-[#6B7D72]',
  },
  {
    id: 'dark',
    name: 'Dark Night',
    desc: 'Inverted dark background',
    swatchClass: 'bg-[#1E1D1B] text-[#D8D6D0] border-[#4A4844]',
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
      } else if (preset.id === 'afternoon') {
        onChangeReadingTheme('light');
      } else {
        onChangeReadingTheme('light');
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs font-sans">
      <div className="bg-[#E2E0DA] border border-[#5A5852] text-[#2B2A27] rounded-xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[86vh]">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-[#B8B6AF] flex items-center justify-between bg-[#DBD9D3]">
          <h2 className="text-sm font-semibold text-[#2B2A27]">Display & Reading Settings</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-md hover:bg-[#D2D0C9] text-[#575550] hover:text-[#2B2A27] transition cursor-pointer"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-[#B8B6AF] bg-[#DBD9D3]/60 px-5 gap-5 text-xs font-medium">
          <button
            onClick={() => setActiveTab('eye')}
            className={`py-2.5 border-b-2 transition cursor-pointer ${
              activeTab === 'eye'
                ? 'border-[#2B2A27] text-[#2B2A27] font-semibold'
                : 'border-transparent text-[#575550] hover:text-[#2B2A27]'
            }`}
          >
            Warmth & Brightness
          </button>

          <button
            onClick={() => setActiveTab('themes')}
            className={`py-2.5 border-b-2 transition cursor-pointer ${
              activeTab === 'themes'
                ? 'border-[#2B2A27] text-[#2B2A27] font-semibold'
                : 'border-transparent text-[#575550] hover:text-[#2B2A27]'
            }`}
          >
            Page Themes
          </button>
        </div>

        {/* Tab Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1 text-xs">
          {activeTab === 'eye' && (
            <div className="space-y-4">
              {/* Toggle */}
              <div className="p-3.5 rounded-xl bg-[#DBD9D3] border border-[#6E6C66] flex items-center justify-between">
                <div>
                  <div className="text-xs font-medium text-[#2B2A27]">Eye Comfort Filter</div>
                  <div className="text-[11px] text-[#575550] mt-0.5">
                    Softens blue light and adjusts page warmth
                  </div>
                </div>

                <button
                  onClick={() =>
                    onChangeEyeProtection({ ...eyeProtection, enabled: !eyeProtection.enabled })
                  }
                  className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer border border-[#5A5852] ${
                    eyeProtection.enabled ? 'bg-[#383633]' : 'bg-[#C8C6BE]'
                  }`}
                  aria-label="Toggle Eye Comfort Filter"
                >
                  <div
                    className={`w-4 h-4 rounded-full absolute top-0.5 transition-transform ${
                      eyeProtection.enabled ? 'right-1 bg-[#EAE8E2]' : 'left-1 bg-[#575550]'
                    }`}
                  />
                </button>
              </div>

              {/* Sliders */}
              <div className="p-4 rounded-xl bg-[#DBD9D3] border border-[#6E6C66] space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-medium text-xs text-[#2B2A27]">Warmth</span>
                    <span className="tabular-nums text-[11px] text-[#575550]">
                      {eyeProtection.warmth} / 24
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="24"
                    value={eyeProtection.warmth}
                    onChange={(e) => handleWarmthSlider(parseInt(e.target.value, 10))}
                    className="w-full h-1.5 rounded-lg appearance-none cursor-pointer accent-[#383633] bg-[#B8B6AF]"
                  />
                </div>

                <div className="pt-3 border-t border-[#B8B6AF]">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-medium text-xs text-[#2B2A27]">Brightness</span>
                    <span className="tabular-nums text-[11px] text-[#575550]">
                      {eyeProtection.brightness} / 24
                    </span>
                  </div>
                  <input
                    type="range"
                    min="2"
                    max="24"
                    value={eyeProtection.brightness}
                    onChange={(e) => handleBrightnessSlider(parseInt(e.target.value, 10))}
                    className="w-full h-1.5 rounded-lg appearance-none cursor-pointer bg-[#B8B6AF] accent-[#383633]"
                  />
                </div>
              </div>

              {/* Presets */}
              <div>
                <div className="text-[11px] uppercase font-medium tracking-wider text-[#575550] mb-2">
                  Presets
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {EYE_PRESETS.map((preset) => {
                    const isSelected = eyeProtection.preset === preset.id;
                    return (
                      <button
                        key={preset.id}
                        onClick={() => applyPreset(preset.id)}
                        className={`p-2.5 rounded-lg border text-left transition flex items-center justify-between cursor-pointer ${
                          isSelected
                            ? 'bg-[#383633] border-[#2B2A27] text-[#EAE8E2]'
                            : 'bg-[#DBD9D3] border-[#6E6C66] text-[#2B2A27] hover:bg-[#D2D0C9]'
                        }`}
                      >
                        <div>
                          <div className="font-medium text-xs">{preset.name}</div>
                          <div className={`text-[10px] mt-0.5 ${isSelected ? 'text-[#C8C6BE]' : 'text-[#575550]'}`}>
                            {preset.desc}
                          </div>
                        </div>
                        {isSelected && <Check size={14} className="text-[#EAE8E2] shrink-0 ml-2" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'themes' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {PAGE_THEMES.map((t) => {
                const isSelected = readingTheme === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => onChangeReadingTheme(t.id)}
                    className={`p-3 rounded-lg border text-left transition cursor-pointer ${t.swatchClass} ${
                      isSelected ? 'ring-2 ring-[#2B2A27]' : 'opacity-90 hover:opacity-100'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-xs">{t.name}</span>
                      {isSelected && <Check size={14} />}
                    </div>
                    <div className="text-[11px] opacity-75 mt-0.5">{t.desc}</div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[#B8B6AF] bg-[#DBD9D3] flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-[#383633] hover:bg-[#2B2A27] text-[#EAE8E2] text-xs font-medium rounded-lg transition cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
