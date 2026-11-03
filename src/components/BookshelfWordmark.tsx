import React from 'react';

interface BookshelfWordmarkProps {
  className?: string;
}

/**
 * Precision-engineered vector wordmark for "BOOKSHELF" inspired by the SETLIFE STUDIOS
 * extended geometric grotesque aesthetic. Every letter shares an exact 28-unit cap height
 * (y=2 to y=30) and 5.8-unit horizontal bar weight so there is zero height discrepancy
 * across mobile, tablet, laptop, and desktop screens.
 */
export const BookshelfWordmark: React.FC<BookshelfWordmarkProps> = ({
  className = 'h-[13px] sm:h-[15px] md:h-[16px] lg:h-[17px] xl:h-[18px] w-auto',
}) => {
  return (
    <svg
      viewBox="0 0 308 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`select-none shrink-0 block ${className}`}
      role="img"
      aria-label="Bookshelf"
    >
      <defs>
        {/* Signature SETLIFE-inspired horizontal speed-bar gradient for the extended 'E' */}
        <linearGradient id="bookshelf-speed-e" x1="193" y1="16" x2="249" y2="16" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FF4800" />
          <stop offset="22%" stopColor="#EB4205" />
          <stop offset="58%" stopColor="#7C2508" />
          <stop offset="86%" stopColor="#E63E00" />
          <stop offset="100%" stopColor="#FF4D00" />
        </linearGradient>
      </defs>

      {/* Primary Extended Grotesque Letterforms (B O O K S H _ L F) */}
      <g fill="#22211E">
        {/* B (x: 0 -> 26.2, y: 2 -> 30) */}
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M0 2H18.8C23.0 2 25.6 4.2 25.6 8.3C25.6 11.4 23.9 13.7 21.1 14.8C24.4 15.8 26.2 18.2 26.2 21.8C26.2 26.8 23.2 30 18.6 30H0V2ZM6.6 7.4V13.2H17.4C19.3 13.2 20.4 12.1 20.4 10.3C20.4 8.5 19.3 7.4 17.4 7.4H6.6ZM6.6 18.6V24.6H17.8C19.8 24.6 21.0 23.5 21.0 21.6C21.0 19.7 19.8 18.6 17.8 18.6H6.6Z"
        />

        {/* First O (x: 31 -> 59, y: 2 -> 30) */}
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M40 2H50C55.5 2 59 5.5 59 11V21C59 26.5 55.5 30 50 30H40C34.5 30 31 26.5 31 21V11C31 5.5 34.5 2 40 2ZM41.2 7.8C38.9 7.8 37.6 9.1 37.6 11.4V20.6C37.6 22.9 38.9 24.2 41.2 24.2H48.8C51.1 24.2 52.4 22.9 52.4 20.6V11.4C52.4 9.1 51.1 7.8 48.8 7.8H41.2Z"
        />

        {/* Second O (x: 64 -> 92, y: 2 -> 30) */}
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M73 2H83C88.5 2 92 5.5 92 11V21C92 26.5 88.5 30 83 30H73C67.5 30 64 26.5 64 21V11C64 5.5 67.5 2 73 2ZM74.2 7.8C71.9 7.8 70.6 9.1 70.6 11.4V20.6C70.6 22.9 71.9 24.2 74.2 24.2H81.8C84.1 24.2 85.4 22.9 85.4 20.6V11.4C85.4 9.1 84.1 7.8 81.8 7.8H74.2Z"
        />

        {/* K (x: 97 -> 125.5, y: 2 -> 30) */}
        <path d="M97 2H103.6V13.4H107.2L116.8 2H125.2L113.2 15.8L125.6 30H117.0L107.2 18.8H103.6V30H97V2Z" />

        {/* S (x: 129 -> 156, y: 2 -> 30) */}
        <path d="M137.5 2H147.8C153.0 2 155.8 4.6 155.8 9.2V10.2H149.4V9.4C149.4 8.0 148.4 7.2 146.6 7.2H138.2C136.4 7.2 135.4 8.0 135.4 9.3C135.4 10.7 136.3 11.4 138.4 11.9L148.6 14.1C153.8 15.2 156.2 17.6 156.2 22.1C156.2 27.2 153.2 30 147.6 30H137.2C131.8 30 128.8 27.3 128.8 22.5V21.2H135.2V22.2C135.2 23.8 136.3 24.7 138.3 24.7H147.0C148.9 24.7 149.8 23.9 149.8 22.4C149.8 21.0 148.9 20.2 146.7 19.7L136.5 17.5C131.5 16.4 129.0 14.0 129.0 9.6C129.0 4.7 132.1 2 137.5 2Z" />

        {/* H (x: 161 -> 188, y: 2 -> 30) */}
        <path d="M161 2H167.6V13.1H181.4V2H188V30H181.4V18.9H167.6V30H161V2Z" />

        {/* L (x: 254 -> 278, y: 2 -> 30) */}
        <path d="M254 2H260.6V24.2H278V30H254V2Z" />

        {/* F (x: 282 -> 307, y: 2 -> 30) */}
        <path d="M282 2H307V7.8H288.6V13.1H304.5V18.9H288.6V30H282V2Z" />
      </g>

      {/* Signature Extended Speed-Bar 'E' (x: 193 -> 249, y: 2 -> 30) */}
      <g>
        {/* Top, Middle, and Bottom Extended Gradient Bars */}
        <path
          d="M193 2H249V7.8H199.8V13.1H249V18.9H199.8V24.2H249V30H193V2Z"
          fill="url(#bookshelf-speed-e)"
        />
        {/* Crisp Solid Orange-Red Left Spine Anchor */}
        <rect x="193" y="2" width="6.8" height="28" fill="#FF4800" />
      </g>
    </svg>
  );
};
