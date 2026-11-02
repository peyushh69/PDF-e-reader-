import React from 'react';
import { EyeProtectionSettings } from '../types';

interface DeviceFrameProps {
  children: React.ReactNode;
  eyeProtection?: EyeProtectionSettings;
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
}) => {
  // Optical Warm Light Calculation (0-24 scale) for soft matte e-ink comfort
  const warmthOpacity = eyeProtection.enabled ? (eyeProtection.warmth / 24) * 0.2 : 0;
  const brightnessMultiplier = 0.86 + (eyeProtection.brightness / 24) * 0.14; // 0.86 to 1.00 (never overly bright)

  return (
    <div className="relative w-full h-screen flex flex-col bg-[#DBD9D3] text-[#2B2A27] overflow-hidden font-sans antialiased">
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
              backgroundColor: `rgba(245, 195, 120, ${warmthOpacity})`,
            }}
            aria-hidden="true"
          />
        )}
      </div>
    </div>
  );
};


