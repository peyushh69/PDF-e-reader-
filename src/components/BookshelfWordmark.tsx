import React from 'react';

interface BookshelfWordmarkProps {
  className?: string;
  /**
   * Matches the knockout stroke around the angled 'O' to the underlying surface:
   * - 'bg' for header / page background (--paper-bg)
   * - 'sheet' for elevated cards / modals (--paper-sheet)
   */
  surface?: 'bg' | 'sheet';
}

/**
 * Custom ultra-condensed heavy block wordmark ("BOOKSHELF") inspired by the
 * iconic DOGPOUND logotype:
 * - Tall, ultra-condensed black grotesque letterforms ('Anton' / 'Impact')
 * - Ultra-tight negative tracking so vertical stems nearly kiss
 * - Signature forward-tilted 'O' (-14.5deg slant) with a precision knockout
 *   border that carves cleanly into the adjacent letters
 * - 100% em-relative geometry so it scales seamlessly across all screen sizes
 */
export const BookshelfWordmark: React.FC<BookshelfWordmarkProps> = ({
  className = 'text-[22px] sm:text-[26px] md:text-[28px]',
  surface = 'bg',
}) => {
  const cutoutColor =
    surface === 'sheet' ? 'var(--paper-sheet, #FAF8F4)' : 'var(--paper-bg, #F4F1EA)';

  return (
    <span
      translate="no"
      aria-label="BOOKSHELF"
      className={`notranslate inline-flex items-baseline select-none uppercase leading-[0.88] text-[var(--ink-primary)] whitespace-nowrap py-[0.04em] ${className}`}
      style={{
        fontFamily: "'Anton', 'Impact', 'Haettenschweiler', 'Arial Narrow Bold', sans-serif",
        fontWeight: 400,
        letterSpacing: '-0.026em',
        transform: 'scaleY(1.04)',
        transformOrigin: 'left center',
      }}
    >
      <span className="inline-block tracking-[-0.026em]">BO</span>
      <span
        aria-hidden="true"
        className="inline-block relative z-10"
        style={{
          transform: 'translateX(-0.015em) skewX(-14.5deg) rotate(1.5deg) scaleY(1.035)',
          transformOrigin: 'center center',
          marginLeft: '-0.042em',
          marginRight: '-0.022em',
          WebkitTextStroke: `0.062em ${cutoutColor}`,
          paintOrder: 'stroke fill',
        }}
      >
        O
      </span>
      <span className="inline-block tracking-[-0.026em]">KSHELF</span>
    </span>
  );
};
