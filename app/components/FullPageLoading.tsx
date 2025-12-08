'use client';

import { useState, useEffect } from 'react';
import { getRandomQuote, Quote } from '../data/loadingQuotes';

interface FullPageLoadingProps {
  onLoadingComplete?: () => void;
  minDisplayTime?: number; // milliseconds
}

export default function FullPageLoading({
  onLoadingComplete,
  minDisplayTime = 2500,
}: FullPageLoadingProps) {
  const [quote, setQuote] = useState<Quote | null>(null);
  const [isVisible, setIsVisible] = useState(true);
  const [isFadingOut, setIsFadingOut] = useState(false);

  useEffect(() => {
    // Set a random quote on mount
    setQuote(getRandomQuote());

    // Start fade out after minimum display time
    const fadeTimer = setTimeout(() => {
      setIsFadingOut(true);
    }, minDisplayTime);

    // Remove from DOM after fade completes
    const hideTimer = setTimeout(() => {
      setIsVisible(false);
      onLoadingComplete?.();
    }, minDisplayTime + 500); // 500ms fade duration

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(hideTimer);
    };
  }, [minDisplayTime, onLoadingComplete]);

  if (!isVisible) {
    return null;
  }

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#1A1A2E] transition-opacity duration-500 ${
        isFadingOut ? 'opacity-0' : 'opacity-100'
      }`}
    >
      {/* ASET Logo */}
      <div className="mb-12">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/ASET-White.png" alt="ASET" className="h-16 w-auto lg:h-20" />
      </div>

      {/* Spinner */}
      <div className="mb-12">
        <div className="relative">
          {/* Outer ring */}
          <div className="h-12 w-12 rounded-full border-4 border-white/20" />
          {/* Spinning arc */}
          <div className="absolute inset-0 h-12 w-12 animate-spin rounded-full border-4 border-transparent border-t-[#EE0B4F]" />
        </div>
      </div>

      {/* Quote */}
      {quote && (
        <div className="max-w-lg px-6 text-center">
          <p className="text-lg italic text-white/80 leading-relaxed">
            {quote.attribution ? (
              <>
                &ldquo;{quote.content}&rdquo;
                <span className="mt-3 block text-sm text-white/60 not-italic">
                  — {quote.attribution}
                </span>
              </>
            ) : (
              <>&ldquo;{quote.content}&rdquo;</>
            )}
          </p>
        </div>
      )}
    </div>
  );
}
