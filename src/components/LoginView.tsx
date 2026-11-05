import React, { useState } from 'react';
import {
  auth,
  googleProvider,
  signInWithPopup,
  signInWithRedirect,
  isFirebaseReady,
} from '../firebase';
import { BookshelfWordmark } from './BookshelfWordmark';
import { PWAInstallButton } from './PWAInstallButton';

export interface AppUserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  isLocalProfile?: boolean;
}

interface LoginViewProps {
  onFallbackSignIn?: (profile: AppUserProfile) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onFallbackSignIn }) => {
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [unauthorizedDomainHost, setUnauthorizedDomainHost] = useState<string | null>(null);

  const handleContinueOnDevice = () => {
    if (!onFallbackSignIn) return;
    onFallbackSignIn({
      uid: 'local-reader-profile',
      email: 'Personal Device Library',
      displayName: 'Bookshelf Reader',
      photoURL: null,
      isLocalProfile: true,
    });
  };

  const handleGoogleSignIn = async () => {
    if (!isFirebaseReady || !auth) {
      handleContinueOnDevice();
      return;
    }

    setIsSigningIn(true);
    setErrorMsg(null);
    setUnauthorizedDomainHost(null);

    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      const code = err?.code || '';
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
        setErrorMsg(null);
      } else if (code === 'auth/popup-blocked') {
        try {
          await signInWithRedirect(auth, googleProvider);
          return;
        } catch {
          handleContinueOnDevice();
          return;
        }
      } else if (
        code === 'auth/unauthorized-domain' ||
        code === 'auth/operation-not-supported-in-this-environment'
      ) {
        if (onFallbackSignIn) {
          handleContinueOnDevice();
          return;
        }
        const host = typeof window !== 'undefined' ? window.location.hostname : 'your Vercel domain';
        setUnauthorizedDomainHost(host);
        setErrorMsg(
          `Domain "${host}" is not yet added to Firebase Authorized Domains.`
        );
      } else {
        setErrorMsg(err?.message || 'Unable to sign in with Google. Please try again.');
      }
    } finally {
      setIsSigningIn(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[var(--paper-bg)] text-[var(--ink-primary)] font-sans select-none antialiased overflow-y-auto transition-colors duration-200">
      {/* Minimal Top Header */}
      <header className="px-4 sm:px-8 h-14 border-b border-[var(--paper-border)] flex items-center justify-between shrink-0 max-w-[1360px] mx-auto w-full">
        <div className="flex items-center min-w-0">
          <BookshelfWordmark className="text-[21px] sm:text-[23px]" />
        </div>
        <PWAInstallButton />
      </header>

      {/* Center Paper-Ink Login Folio */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-sm bg-[var(--paper-sheet)] border border-[var(--paper-border-strong)] rounded-2xl p-6 sm:p-8 space-y-6">
          <div className="flex flex-col items-center text-center space-y-3">
            <div className="pt-1">
              <BookshelfWordmark className="text-[28px] sm:text-[32px] mx-auto" />
            </div>
            <p className="text-xs sm:text-[13px] text-[var(--ink-secondary)] leading-relaxed max-w-[270px]">
              Sign in with your Google account to sync your uploaded PDFs, reading progress, highlights, and library across devices.
            </p>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-lg bg-[#E5D5D5] border border-[#9E6B6B] text-[11px] text-[#5C2626] text-center space-y-2">
              <div>{errorMsg}</div>
              {unauthorizedDomainHost && onFallbackSignIn && (
                <button
                  type="button"
                  onClick={handleContinueOnDevice}
                  className="w-full h-8 px-3 bg-[var(--ink-primary)] text-[var(--ink-inverse)] rounded-lg text-[11px] font-medium cursor-pointer"
                >
                  Open Bookshelf Now (Device Storage)
                </button>
              )}
            </div>
          )}

          <div className="space-y-2.5">
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isSigningIn}
              className="w-full h-10.5 px-4 bg-[var(--ink-primary)] hover:opacity-90 disabled:opacity-60 text-[var(--ink-inverse)] border border-[var(--ink-primary)] rounded-xl text-xs sm:text-[13px] font-medium flex items-center justify-center gap-2.5 transition cursor-pointer"
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
          </div>

          <div className="pt-3 border-t border-[var(--paper-border)] grid grid-cols-3 gap-2 text-center">
            <div>
              <div className="text-[11px] font-literata font-semibold text-[var(--ink-primary)]">Paper-Ink</div>
              <div className="text-[10px] text-[var(--ink-secondary)]">Matte Display</div>
            </div>
            <div className="border-x border-[var(--paper-border)] px-1">
              <div className="text-[11px] font-literata font-semibold text-[var(--ink-primary)]">Cloud Sync</div>
              <div className="text-[10px] text-[var(--ink-secondary)]">PDF & Progress</div>
            </div>
            <div>
              <div className="text-[11px] font-literata font-semibold text-[var(--ink-primary)]">Smart Reflow</div>
              <div className="text-[10px] text-[var(--ink-secondary)]">Notes & Stacks</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

