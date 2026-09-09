import React from 'react';
import { EyeProtectionSettings } from '../types';

interface DeviceFrameProps {
  children: React.ReactNode;
  eyeProtection?: EyeProtectionSettings;
}

export const DeviceFrame: React.FC<DeviceFrameProps> = ({
  children,
  eyeProtection = {
    enabled: true,
    warmth: 12,
    brightness: 18,
    blueLightFilter: true,
    preset: 'afternoon',
  },
}) => {
  // Optical Warm Light Calculation (0-24 scale) for eye comfort without artificial frames
  const warmthOpacity = eyeProtection.enabled ? (eyeProtection.warmth / 24) * 0.22 : 0;
  const brightnessMultiplier = 0.9 + (eyeProtection.brightness / 24) * 0.2; // 0.90 to 1.10

  return (
    <div className="relative w-full h-screen flex flex-col bg-stone-100 dark:bg-stone-950 overflow-hidden font-sans">
      {/* Main Full-Screen App Content */}
      <div
        className="w-full h-full flex flex-col relative overflow-hidden"
        style={{
          filter: `brightness(${brightnessMultiplier})`,
        }}
      >
        {children}

        {/* Dynamic Warm Light (Eye Protection) Amber Glow Overlay using pure multiply tint */}
        {eyeProtection.enabled && eyeProtection.warmth > 0 && (
          <div
            className="absolute inset-0 pointer-events-none z-30 transition-opacity duration-300 mix-blend-multiply"
            style={{
              backgroundColor: `rgba(255, 200, 120, ${warmthOpacity})`,
            }}
            aria-hidden="true"
          />
        )}
      </div>
    </div>
  );
};


