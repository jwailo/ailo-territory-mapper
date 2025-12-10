'use client';

import { useState, useEffect, useRef } from 'react';
import { Quote } from '../data/loadingQuotes';

interface LoadingOverlayProps {
  isLoading: boolean;
  showQuote?: boolean;
  quote?: Quote | null; // Optional user-specific quote
  className?: string;
  delay?: number; // ms to wait before showing (default 500ms)
}

export default function LoadingOverlay({
  isLoading,
  showQuote = true,
  quote: propQuote,
  className = '',
  delay = 500,
}: LoadingOverlayProps) {
  const [displayQuote, setDisplayQuote] = useState<Quote | null>(propQuote || null);
  const [shouldShow, setShouldShow] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const delayTimerRef = useRef<NodeJS.Timeout | null>(null);
  const loadingStartRef = useRef<number | null>(null);

  // Update quote when prop changes
  useEffect(() => {
    if (propQuote) {
      setDisplayQuote(propQuote);
    }
  }, [propQuote]);

  useEffect(() => {
    if (isLoading) {
      // Track when loading started
      loadingStartRef.current = Date.now();

      // Wait for delay before showing overlay
      delayTimerRef.current = setTimeout(() => {
        setShouldShow(true);
        setIsFadingOut(false);
      }, delay);
    } else {
      // Clear any pending show timer
      if (delayTimerRef.current) {
        clearTimeout(delayTimerRef.current);
        delayTimerRef.current = null;
      }

      // If we were showing, fade out
      if (shouldShow) {
        setIsFadingOut(true);
        // Remove from DOM after fade completes
        setTimeout(() => {
          setShouldShow(false);
          setIsFadingOut(false);
        }, 300); // 300ms fade duration
      }

      loadingStartRef.current = null;
    }

    return () => {
      if (delayTimerRef.current) {
        clearTimeout(delayTimerRef.current);
      }
    };
  }, [isLoading, delay, shouldShow]);

  // Don't render if we shouldn't show yet
  if (!shouldShow) {
    return null;
  }

  return (
    <div
      className={`absolute inset-0 z-50 flex flex-col items-center justify-center bg-[#1A1A2E]/90 backdrop-blur-sm transition-opacity duration-300 ${
        isFadingOut ? 'opacity-0' : 'opacity-100'
      } ${className}`}
    >
      {/* Spinner */}
      <div className="mb-6">
        <div className="relative">
          {/* Outer ring */}
          <div className="h-10 w-10 rounded-full border-3 border-white/20" />
          {/* Spinning arc */}
          <div className="absolute inset-0 h-10 w-10 animate-spin rounded-full border-3 border-transparent border-t-[#EE0B4F]" />
        </div>
      </div>

      {/* Optional quote */}
      {showQuote && displayQuote && (
        <div className="max-w-md px-6 text-center">
          <p className="text-sm italic text-white/70 leading-relaxed">
            {displayQuote.attribution ? (
              <>
                &ldquo;{displayQuote.content}&rdquo;
                <span className="mt-2 block text-xs text-white/50 not-italic">
                  — {displayQuote.attribution}
                </span>
              </>
            ) : (
              <>&ldquo;{displayQuote.content}&rdquo;</>
            )}
          </p>
        </div>
      )}
    </div>
  );
}
