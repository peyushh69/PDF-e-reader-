import React, { useState } from 'react';
import { Download, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        onClick={install}
        className="h-7 sm:h-8 px-2 sm:px-3 bg-[#E4E2DC] hover:bg-[#D5D3CC] text-[#2B2A27] border border-[#6E6C66] rounded-lg text-[11px] sm:text-xs font-medium flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap shrink-0"
        title="Install Bookshelf App"
      >
        <Download size={12} />
        <span className="hidden xs:inline">Install App</span>
        <span className="xs:hidden">Install</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className="h-7 sm:h-8 px-2 sm:px-3 bg-[#E4E2DC] hover:bg-[#D5D3CC] text-[#2B2A27] border border-[#6E6C66] rounded-lg text-[11px] sm:text-xs font-medium flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap shrink-0"
          title="Install on iPhone / iPad"
        >
          <Download size={12} />
          <span className="hidden xs:inline">Install App</span>
          <span className="xs:hidden">Install</span>
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
