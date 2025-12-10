// Loading quotes for ASET
// Now supports user-specific quotes loaded from preferences
// Fall back to default quotes when user has none configured

export interface Quote {
  content: string;
  attribution?: string;
}

// Default fallback quotes (used when user has no custom quotes)
// These are a subset for non-authenticated or new users
export const defaultQuotes: Quote[] = [
  {
    content:
      "Working hard for something we don't care about is called stress. Working hard for something we love is called passion.",
    attribution: 'Simon Sinek',
  },
  {
    content: "People don't buy what you do; they buy why you do it.",
    attribution: 'Simon Sinek',
  },
  {
    content: 'Dream big. Start small. But most of all, start.',
    attribution: 'Simon Sinek',
  },
  {
    content: "I don't have dreams. I have goals.",
    attribution: 'Harvey Specter',
  },
  {
    content: 'The only time success comes before work is in the dictionary.',
    attribution: 'Harvey Specter',
  },
];

// Legacy: Bern's personal mantras - will be migrated to her preferences
export const bernMantras: Quote[] = [
  { content: 'This too shall pass' },
  { content: 'A winner is a loser who tried one more time' },
  { content: "Yesterday's home runs don't win today's games" },
];

// Legacy: All inspirational quotes - will be migrated to user preferences
export const inspirationalQuotes: Quote[] = [
  // Usain Bolt
  {
    content:
      "Worrying gets you nowhere. If you turn up worrying about how you're going to perform, you've already lost.",
    attribution: 'Usain Bolt',
  },
  {
    content: "There are better starters than me, but I'm a strong finisher.",
    attribution: 'Usain Bolt',
  },
  {
    content: 'A lot of legends, a lot of people, have come before me. But this is my time.',
    attribution: 'Usain Bolt',
  },
  { content: "I don't think limits.", attribution: 'Usain Bolt' },
  {
    content:
      'You have to set yourself goals so you can push yourself harder. Desire is the key to success.',
    attribution: 'Usain Bolt',
  },
  { content: 'I know what I can do, so I never doubt myself.', attribution: 'Usain Bolt' },
  {
    content: "I stopped worrying about the start. The end is what's important.",
    attribution: 'Usain Bolt',
  },
  {
    content:
      "I work hard, and I do good, and I'm going to enjoy myself. I'm not going to let you restrict me.",
    attribution: 'Usain Bolt',
  },
  // Simon Sinek
  {
    content:
      "Working hard for something we don't care about is called stress. Working hard for something we love is called passion.",
    attribution: 'Simon Sinek',
  },
  {
    content: "People don't buy what you do; they buy why you do it.",
    attribution: 'Simon Sinek',
  },
  {
    content: 'Dream big. Start small. But most of all, start.',
    attribution: 'Simon Sinek',
  },
  {
    content: 'The goal is not to be perfect by the end. The goal is to be better today.',
    attribution: 'Simon Sinek',
  },
  {
    content:
      'Leadership is not a license to do less. Leadership is a responsibility to do more.',
    attribution: 'Simon Sinek',
  },
  {
    content:
      'A team is not a group of people that work together. A team is a group of people that trust each other.',
    attribution: 'Simon Sinek',
  },
  // Oprah Winfrey
  {
    content: 'The biggest adventure you can take is to live the life of your dreams.',
    attribution: 'Oprah Winfrey',
  },
  {
    content:
      'Think like a queen. A queen is not afraid to fail. Failure is another stepping stone to greatness.',
    attribution: 'Oprah Winfrey',
  },
  {
    content:
      'The more you praise and celebrate your life, the more there is in life to celebrate.',
    attribution: 'Oprah Winfrey',
  },
  {
    content: 'Surround yourself with only people who are going to lift you higher.',
    attribution: 'Oprah Winfrey',
  },
  { content: 'Turn your wounds into wisdom.', attribution: 'Oprah Winfrey' },
  { content: 'Where there is no struggle, there is no strength.', attribution: 'Oprah Winfrey' },
  // Harvey Specter
  { content: "I don't have dreams. I have goals.", attribution: 'Harvey Specter' },
  {
    content: "Winners don't make excuses when the other side plays the game.",
    attribution: 'Harvey Specter',
  },
  {
    content: "When you're backed against the wall, break the goddamn thing down.",
    attribution: 'Harvey Specter',
  },
  {
    content:
      "Loyalty is a two-way street. If I'm asking for it from you, then you're getting it from me.",
    attribution: 'Harvey Specter',
  },
  {
    content: 'The only time success comes before work is in the dictionary.',
    attribution: 'Harvey Specter',
  },
  {
    content: "I'm against having emotions, not against using them.",
    attribution: 'Harvey Specter',
  },
];

// Combined legacy quotes for backward compatibility
export const allQuotes: Quote[] = [...bernMantras, ...inspirationalQuotes];

/**
 * Get a random quote from the default set
 * Used for non-authenticated users or as fallback
 */
export function getRandomQuote(): Quote {
  const randomIndex = Math.floor(Math.random() * defaultQuotes.length);
  return defaultQuotes[randomIndex];
}

/**
 * Get a random quote from a specific array
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

/**
 * Get Bern's default quotes for migration
 * Combines her mantras with inspirational quotes
 */
export function getBernDefaultQuotes(): Quote[] {
  return [...bernMantras, ...inspirationalQuotes];
}
