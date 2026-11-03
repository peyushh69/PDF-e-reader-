import React, { useState } from 'react';
import { auth, googleProvider, signInWithPopup } from '../firebase';
import { BookshelfWordmark } from './BookshelfWordmark';
import { PWAInstallButton } from './PWAInstallButton';

export const LoginView: React.FC = () => {
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    setIsSigningIn(true);
    setErrorMsg(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      const code = err?.code || '';
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
        setErrorMsg(null);
      } else {
        setErrorMsg(err?.message || 'Unable to sign in with Google. Please try again.');
      }
    } finally {
      setIsSigningIn(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#DBD9D3] text-[#2B2A27] font-sans select-none antialiased overflow-y-auto">
      {/* Minimal Top Header */}
      <header className="px-4 sm:px-6 h-13 sm:h-14 border-b border-[#B8B6AF] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <img
            src="/pwa-192x192.png"
            alt="Bookshelf Logo"
            className="w-6 h-6 rounded-[5px] object-cover border border-[#6E6C66] shrink-0"
          />
          <BookshelfWordmark className="h-[13px] sm:h-[15px] w-auto" />
        </div>
        <PWAInstallButton />
      </header>

      {/* Center Login Card */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-sm bg-[#E2E0DA] border border-[#6E6C66] rounded-2xl p-6 sm:p-7 space-y-6">
          <div className="flex flex-col items-center text-center space-y-3">
            <img
              src="/pwa-192x192.png"
              alt="Bookshelf App Icon"
              className="w-14 h-14 rounded-xl object-cover border border-[#6E6C66]"
            />
            <div className="pt-1">
              <BookshelfWordmark className="h-[16px] sm:h-[18px] w-auto mx-auto" />
            </div>
            <p className="text-xs sm:text-[13px] text-[#575550] leading-relaxed max-w-[270px]">
              Sign in with your Google account to sync your uploaded PDFs, reading progress, highlights, and library across devices.
            </p>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-lg bg-[#E5D5D5] border border-[#9E6B6B] text-[11px] text-[#5C2626] text-center">
              {errorMsg}
            </div>
          )}

          <button
            onClick={handleGoogleSignIn}
            disabled={isSigningIn}
            className="w-full h-10 px-4 bg-[#2B2A27] hover:bg-[#1F1E1C] disabled:opacity-60 text-[#EAE8E2] border border-[#1F1E1C] rounded-xl text-xs sm:text-[13px] font-medium flex items-center justify-center gap-2.5 transition cursor-pointer"
          >
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="#EA4335"
                d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.4 1 3.5 3.6 1.6 7.4l3.7 2.8C6.2 7.2 8.9 5 12 5z"
              />
              <path
                fill="#4285F4"
                d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.6l3.7 2.9c2.2-2 3.7-5 3.7-8.7z"
              />
              <path
                fill="#FBBC05"
                d="M5.3 14.8c-.2-.8-.4-1.6-.4-2.5s.2-1.7.4-2.5L1.6 7C.6 9 0 11.2 0 13.5s.6 4.5 1.6 6.5l3.7-2.9z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3.1 0-5.8-2.1-6.7-5l-3.7 2.9C3.5 21.4 7.4 24 12 24z"
              />
            </svg>
            <span>{isSigningIn ? 'Signing in...' : 'Continue with Google'}</span>
          </button>

          <div className="pt-2 border-t border-[#C5C3BB] grid grid-cols-3 gap-2 text-center">
            <div>
              <div className="text-[11px] font-semibold text-[#2B2A27]">Personal Library</div>
              <div className="text-[10px] text-[#575550]">Private PDFs</div>
            </div>
            <div className="border-x border-[#C5C3BB] px-1">
              <div className="text-[11px] font-semibold text-[#2B2A27]">Auto Sync</div>
              <div className="text-[10px] text-[#575550]">Page & Progress</div>
            </div>
            <div>
              <div className="text-[11px] font-semibold text-[#2B2A27]">Smart Reflow</div>
              <div className="text-[10px] text-[#575550]">Notes & Stacks</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
