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
    ? 'h-6.5 px-2.5 bg-[#E4E2DC] hover:bg-[#D5D3CC] text-[#2B2A27] border border-[#6E6C66] rounded-md text-[11px] font-medium flex items-center gap-1 transition cursor-pointer whitespace-nowrap shrink-0'
    : 'h-8 px-3 bg-[#E4E2DC] hover:bg-[#D5D3CC] text-[#2B2A27] border border-[#6E6C66] rounded-lg text-xs font-medium flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap shrink-0';

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
              className="w-full max-w-sm rounded-xl bg-[#E2E0DA] text-[#2B2A27] border border-[#5A5852] p-5 shadow-2xl space-y-3"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-[#B8B6AF] pb-2.5">
                <div className="flex items-center gap-2.5">
                  <img
                    src="/pwa-192x192.png"
                    alt="Bookshelf Logo"
                    className="w-7 h-7 rounded-md object-cover border border-[#6E6C66]"
                  />
                  <h3 className="text-sm font-semibold text-[#2B2A27]">Install Bookshelf</h3>
                </div>
                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="p-1 rounded-md text-[#575550] hover:text-[#2B2A27] hover:bg-[#D2D0C9] transition cursor-pointer"
                >
                  <X size={15} />
                </button>
              </div>
              <p className="text-xs text-[#2B2A27] leading-relaxed">
                1. Tap the <strong>Share</strong> button in your browser toolbar.<br />
                2. Scroll down and tap <strong>Add to Home Screen</strong> or <strong>Install App</strong>.
              </p>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="w-full rounded-lg bg-[#383633] text-[#EAE8E2] py-2 text-xs font-medium hover:bg-[#2B2A27] transition cursor-pointer"
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
