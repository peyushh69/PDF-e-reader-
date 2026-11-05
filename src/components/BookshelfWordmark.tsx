import React from 'react';

interface BookshelfWordmarkProps {
  className?: string;
}

/**
 * Clean, single-line Title Case geometric sans-serif wordmark ("Bookshelf")
 * inspired by modern geometric logotypes (Palapita / Futura / Plus Jakarta ExtraBold).
 * Features circular bowls, heavy uniform stems, tight negative tracking (-0.045em),
 * and flat terminals with zero extraneous icons.
 */
export const BookshelfWordmark: React.FC<BookshelfWordmarkProps> = ({
  className = 'text-xl sm:text-[22px]',
}) => {
  return (
    <span
      translate="no"
      className={`notranslate inline-flex items-baseline select-none font-extrabold tracking-[-0.045em] leading-none text-[var(--ink-primary)] ${className}`}
      style={{
        fontFamily: "'Plus Jakarta Sans', 'Outfit', system-ui, -apple-system, sans-serif",
      }}
      aria-label="Bookshelf"
    >
      Bookshelf
    </span>
  );
};
