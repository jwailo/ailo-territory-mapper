'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';
import { getCurrentUser } from '../utils/auth';

interface Quote {
  content: string;
}

// Default quotes to use if no user-specific quotes exist
const defaultQuotes = [
  { content: 'The best time to plant a tree was 20 years ago. The second best time is now.' },
  { content: 'Success is not final, failure is not fatal: it is the courage to continue that counts. — Winston Churchill' },
  { content: 'The only way to do great work is to love what you do. — Steve Jobs' },
  { content: 'Every champion was once a contender that refused to give up. — Rocky Balboa' },
  { content: "Don't watch the clock; do what it does. Keep going. — Sam Levenson" },
  { content: "Hard work beats talent when talent doesn't work hard. — Tim Notke" },
  { content: 'The difference between ordinary and extraordinary is that little extra.' },
  { content: 'Your only limit is the amount of action you take.' },
];

interface LoadingQuoteProps {
  className?: string;
}

export default function LoadingQuote({ className = '' }: LoadingQuoteProps) {
  const [quote, setQuote] = useState<Quote | null>(null);

  useEffect(() => {
    async function fetchQuote() {
      const user = getCurrentUser();

      if (user) {
        // Try to get user-specific quotes first
        const { data: userQuotes } = await supabase
          .from('user_content')
          .select('content')
          .eq('user_id', user.id)
          .eq('content_type', 'quote');

        if (userQuotes && userQuotes.length > 0) {
          const randomIndex = Math.floor(Math.random() * userQuotes.length);
          setQuote({ content: userQuotes[randomIndex].content });
          return;
        }
      }

      // Fall back to default quotes
      const randomIndex = Math.floor(Math.random() * defaultQuotes.length);
      setQuote(defaultQuotes[randomIndex]);
    }

    fetchQuote();
  }, []);

  if (!quote) {
    return null;
  }

  return (
    <div className={`text-center ${className}`}>
      <p className="text-lg italic text-gray-600 max-w-md mx-auto">
        &ldquo;{quote.content}&rdquo;
      </p>
    </div>
  );
}
