import React, { useEffect } from 'react';
import { EyeProtectionSettings, ThemeMode } from '../types';

interface DeviceFrameProps {
  children: React.ReactNode;
  eyeProtection?: EyeProtectionSettings;
  readingTheme?: ThemeMode;
}

export const DeviceFrame: React.FC<DeviceFrameProps> = ({
  children,
  eyeProtection = {
    enabled: false,
    warmth: 4,
    brightness: 16,
    blueLightFilter: true,
    preset: 'afternoon',
  },
  readingTheme = 'light',
}) => {
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-paper-theme', readingTheme);
    }
  }, [readingTheme]);

  // Only apply warmth & brightness optical filters when Eye Comfort is actively enabled
  const warmthOpacity = eyeProtection.enabled ? (eyeProtection.warmth / 24) * 0.18 : 0;
  const brightnessMultiplier = eyeProtection.enabled
    ? 0.88 + (eyeProtection.brightness / 24) * 0.12
    : 1.0;

  return (
    <div
      data-paper-theme={readingTheme}
      className="relative w-full h-screen flex flex-col bg-[var(--paper-bg)] text-[var(--ink-primary)] overflow-hidden font-sans antialiased transition-colors duration-200"
    >
      {/* Main Full-Screen App Content */}
      <div
        className="w-full h-full flex flex-col relative overflow-hidden"
        style={{
          filter: brightnessMultiplier < 0.999 ? `brightness(${brightnessMultiplier})` : undefined,
        }}
      >
        {children}

        {/* Subtle Matte E-Ink Paper Fiber Micro-Grain Overlay */}
        <svg
          className="pointer-events-none fixed inset-0 w-full h-full z-25 opacity-[0.026]"
          aria-hidden="true"
        >
          <filter id="eink-paper-fiber">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.82"
              numOctaves="3"
              stitchTiles="stitch"
            />
            <feColorMatrix type="saturate" values="0" />
          </filter>
          <rect width="100%" height="100%" filter="url(#eink-paper-fiber)" />
        </svg>

        {/* Dynamic Warm Light (Eye Protection) Frontlight Overlay */}
        {eyeProtection.enabled && eyeProtection.warmth > 0 && (
          <div
            className="absolute inset-0 pointer-events-none z-30 transition-opacity duration-300 mix-blend-multiply"
            style={{
              backgroundColor: `rgba(244, 194, 118, ${warmthOpacity})`,
            }}
            aria-hidden="true"
          />
        )}
      </div>
    </div>
  );
};
