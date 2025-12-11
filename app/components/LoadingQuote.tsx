'use client';

import { useState, useEffect } from 'react';
import { getUserPreferences, getRandomUserQuote } from '../utils/userPreferences';
import { getCurrentUser } from '../utils/auth';

interface Quote {
  content: string;
  attribution?: string;
}

interface LoadingQuoteProps {
  className?: string;
}

export default function LoadingQuote({ className = '' }: LoadingQuoteProps) {
  const [quote, setQuote] = useState<Quote | null>(null);

  useEffect(() => {
    async function fetchQuote() {
      const user = getCurrentUser();

      if (user) {
        // Get user's quotes from preferences - NO FALLBACK
        const preferences = await getUserPreferences(user.id);
        if (preferences?.quotes && preferences.quotes.length > 0) {
          const userQuote = getRandomUserQuote(preferences);
          if (userQuote) {
            setQuote({
              content: userQuote.content,
              attribution: userQuote.attribution,
            });
          }
        }
      }
      // If no user or no quotes configured, quote remains null (no fallback)
    }

    fetchQuote();
  }, []);

  // Don't render anything if no quote
  if (!quote) {
    return null;
  }

  return (
    <div className={`text-center ${className}`}>
      <p className="text-lg italic text-gray-600 max-w-md mx-auto">
        &ldquo;{quote.content}&rdquo;
        {quote.attribution && (
          <span className="block mt-2 text-sm text-gray-500 not-italic">
            — {quote.attribution}
          </span>
        )}
      </p>
    </div>
  );
}
