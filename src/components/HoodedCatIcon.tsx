import React from 'react';

interface HoodedCatIconProps {
  className?: string;
  size?: number;
  mood?: 'reading' | 'happy' | 'sleepy' | 'curious';
}

export const HoodedCatIcon: React.FC<HoodedCatIconProps> = ({
  className = '',
  size = 36,
  mood = 'reading',
}) => {
  return (
    <div 
      className={`relative inline-flex items-center justify-center select-none ${className}`}
      style={{ width: size, height: size }}
      title="Your Reading Companion"
    >
      <svg
        viewBox="0 0 100 100"
        width={size}
        height={size}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="drop-shadow-sm transition-transform duration-300 hover:scale-110"
      >
        {/* Hood Background (Dark teal/slate hood with rounded drape) */}
        <path
          d="M 20 85 C 15 50, 22 20, 50 15 C 78 20, 85 50, 80 85 C 70 88, 30 88, 20 85 Z"
          fill="#334155"
        />
        
        {/* Hood Left Cat Ear point */}
        <path
          d="M 22 28 C 18 16, 28 8, 38 18 Z"
          fill="#1e293b"
        />
        {/* Hood Right Cat Ear point */}
        <path
          d="M 78 28 C 82 16, 72 8, 62 18 Z"
          fill="#1e293b"
        />

        {/* Hood Inner Shadow / Depth */}
        <ellipse cx="50" cy="52" rx="27" ry="29" fill="#1e293b" />

        {/* Cat Face (Warm cream / white soft fur) */}
        <ellipse cx="50" cy="54" rx="22" ry="23" fill="#f8fafc" />

        {/* Inner Ear Highlights */}
        <path d="M 26 26 C 24 19, 30 14, 35 20 Z" fill="#fda4af" opacity="0.8" />
        <path d="M 74 26 C 76 19, 70 14, 65 20 Z" fill="#fda4af" opacity="0.8" />

        {/* Cat Eyes */}
        {mood === 'reading' ? (
          // Focused sleepy / gentle looking down at book
          <g>
            <path
              d="M 38 52 C 40 56, 44 56, 46 52"
              stroke="#0f172a"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            <path
              d="M 54 52 C 56 56, 60 56, 62 52"
              stroke="#0f172a"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          </g>
        ) : (
          <g>
            <circle cx="42" cy="52" r="3" fill="#0f172a" />
            <circle cx="58" cy="52" r="3" fill="#0f172a" />
            <circle cx="43" cy="51" r="1" fill="#ffffff" />
            <circle cx="59" cy="51" r="1" fill="#ffffff" />
          </g>
        )}

        {/* Cute Pink Cat Nose */}
        <polygon points="48,58 52,58 50,61" fill="#f472b6" />

        {/* Cat Whiskers */}
        <path d="M 32 58 L 22 57" stroke="#cbd5e1" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M 32 61 L 21 63" stroke="#cbd5e1" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M 68 58 L 78 57" stroke="#cbd5e1" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M 68 61 L 79 63" stroke="#cbd5e1" strokeWidth="1.5" strokeLinecap="round" />

        {/* Cat Smile */}
        <path
          d="M 47 62 Q 50 65 53 62"
          stroke="#0f172a"
          strokeWidth="1.5"
          strokeLinecap="round"
          fill="none"
        />

        {/* Rosy Cheeks */}
        <circle cx="36" cy="59" r="3" fill="#fbcfe8" opacity="0.7" />
        <circle cx="64" cy="59" r="3" fill="#fbcfe8" opacity="0.7" />

        {/* Little Cloak Ties / Brooch */}
        <ellipse cx="50" cy="79" rx="4" ry="4" fill="#fbbf24" stroke="#d97706" strokeWidth="1" />
        <path d="M 44 83 C 48 80, 52 80, 56 83" stroke="#475569" strokeWidth="2" strokeLinecap="round" />

        {/* Tiny Mini Book held by little paws */}
        <path
          d="M 36 82 L 50 78 L 64 82 L 64 92 L 50 88 L 36 92 Z"
          fill="#e2e8f0"
          stroke="#64748b"
          strokeWidth="1"
        />
        <line x1="50" y1="78" x2="50" y2="88" stroke="#94a3b8" strokeWidth="1" />

        {/* Little Cat Paws over book edge */}
        <ellipse cx="38" cy="83" rx="3.5" ry="2.5" fill="#f8fafc" stroke="#334155" strokeWidth="0.8" />
        <ellipse cx="62" cy="83" rx="3.5" ry="2.5" fill="#f8fafc" stroke="#334155" strokeWidth="0.8" />
      </svg>
    </div>
  );
};
