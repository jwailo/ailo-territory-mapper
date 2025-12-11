// Quote type definition for ASET
// Quotes should come from user_preferences table, NOT hardcoded here

export interface Quote {
  content: string;
  attribution?: string;
}

/**
 * Get a random quote from an array of quotes
 * Returns null if the array is empty
 */
export function getRandomQuoteFrom(quotes: Quote[]): Quote | null {
  if (!quotes || quotes.length === 0) {
    return null;
  }
  const randomIndex = Math.floor(Math.random() * quotes.length);
  return quotes[randomIndex];
}

/**
 * Format quote for display
 */
export function formatQuote(quote: Quote): string {
  if (quote.attribution) {
    return `"${quote.content}" — ${quote.attribution}`;
  }
  return `"${quote.content}"`;
}
