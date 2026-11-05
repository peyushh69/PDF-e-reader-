import React, { useState } from 'react';
import { Download, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  compact?: boolean;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ compact = false }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  const btnClasses = compact
    ? 'h-6.5 px-2.5 bg-[var(--paper-sheet)] hover:bg-[var(--paper-subtle)] text-[var(--ink-primary)] border border-[var(--paper-border-strong)] rounded-md text-[11px] font-medium flex items-center gap-1 transition cursor-pointer whitespace-nowrap shrink-0'
    : 'h-8 px-3 bg-[var(--paper-sheet)] hover:bg-[var(--paper-subtle)] text-[var(--ink-primary)] border border-[var(--paper-border-strong)] rounded-lg text-xs font-medium flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap shrink-0';

  if (isInstallable) {
    return (
      <button
        onClick={install}
        className={btnClasses}
        title="Install Bookshelf App"
      >
        <Download size={compact ? 11 : 12} />
        <span>Install</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className={btnClasses}
          title="Install on iPhone / iPad"
        >
          <Download size={compact ? 11 : 12} />
          <span>Install</span>
        </button>

        {showIOSGuide && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 font-sans"
            onClick={() => setShowIOSGuide(false)}
          >
            <div
              className="w-full max-w-sm rounded-xl bg-[var(--paper-sheet)] text-[var(--ink-primary)] border border-[var(--paper-border-strong)] p-5 shadow-2xl space-y-3"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-[var(--paper-border)] pb-2.5">
                <div className="flex items-center gap-2.5">
                  <img
                    src="/pwa-192x192.png"
                    alt="Bookshelf Logo"
                    className="w-7 h-7 rounded-md object-cover border border-[var(--paper-border-strong)]"
                  />
                  <h3 className="text-sm font-semibold text-[var(--ink-primary)]">Install Bookshelf</h3>
                </div>
                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="p-1 rounded-md text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] hover:bg-[var(--paper-subtle)] transition cursor-pointer"
                >
                  <X size={15} />
                </button>
              </div>
              <p className="text-xs text-[var(--ink-primary)] leading-relaxed">
                1. Tap the <strong>Share</strong> button in your browser toolbar.<br />
                2. Scroll down and tap <strong>Add to Home Screen</strong> or <strong>Install App</strong>.
              </p>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="w-full rounded-lg bg-[var(--ink-primary)] text-[var(--ink-inverse)] py-2 text-xs font-medium hover:opacity-90 transition cursor-pointer"
              >
                Got it
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
