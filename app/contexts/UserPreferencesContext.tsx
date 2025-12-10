'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getCurrentUser } from '../utils/auth';
import {
  UserPreferences,
  getUserPreferences,
  clearPreferencesCache,
} from '../utils/userPreferences';
import { Quote, getRandomQuoteFrom, defaultQuotes } from '../data/loadingQuotes';

interface UserPreferencesContextType {
  preferences: UserPreferences | null;
  loading: boolean;
  error: string | null;
  refreshPreferences: () => Promise<void>;
  getQuote: () => Quote;
  getHeroImage: () => string | null;
  getProfilePhoto: () => string | null;
  getWalkonSong: () => { url: string | null; label: string };
  clearPreferences: () => void;
}

const UserPreferencesContext = createContext<UserPreferencesContextType | undefined>(undefined);

export function UserPreferencesProvider({ children }: { children: React.ReactNode }) {
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadPreferences = useCallback(async () => {
    const user = getCurrentUser();
    if (!user) {
      setPreferences(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const prefs = await getUserPreferences(user.id);
      setPreferences(prefs);
    } catch (err) {
      console.error('Failed to load preferences:', err);
      setError('Failed to load preferences');
    } finally {
      setLoading(false);
    }
  }, []);

  // Load preferences on mount and when user changes
  useEffect(() => {
    loadPreferences();
  }, [loadPreferences]);

  const refreshPreferences = useCallback(async () => {
    clearPreferencesCache();
    await loadPreferences();
  }, [loadPreferences]);

  const clearPreferences = useCallback(() => {
    clearPreferencesCache();
    setPreferences(null);
  }, []);

  // Get a random quote from user's preferences or fallback
  const getQuote = useCallback((): Quote => {
    if (preferences?.quotes && preferences.quotes.length > 0) {
      const quote = getRandomQuoteFrom(preferences.quotes);
      if (quote) return quote;
    }
    // Fallback to default quotes
    return defaultQuotes[Math.floor(Math.random() * defaultQuotes.length)];
  }, [preferences]);

  // Get weekly hero image from user's preferences
  const getHeroImage = useCallback((): string | null => {
    if (!preferences?.hero_images || preferences.hero_images.length === 0) {
      return null;
    }

    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const weekNumber = Math.ceil(
      ((now.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7
    );

    return preferences.hero_images[weekNumber % preferences.hero_images.length];
  }, [preferences]);

  // Get profile photo URL
  const getProfilePhoto = useCallback((): string | null => {
    return preferences?.photo_url || null;
  }, [preferences]);

  // Get walk-on song details
  const getWalkonSong = useCallback((): { url: string | null; label: string } => {
    return {
      url: preferences?.walkon_song_url || null,
      label: preferences?.walkon_button_label || 'Get fired up',
    };
  }, [preferences]);

  return (
    <UserPreferencesContext.Provider
      value={{
        preferences,
        loading,
        error,
        refreshPreferences,
        getQuote,
        getHeroImage,
        getProfilePhoto,
        getWalkonSong,
        clearPreferences,
      }}
    >
      {children}
    </UserPreferencesContext.Provider>
  );
}

export function useUserPreferences() {
  const context = useContext(UserPreferencesContext);
  if (context === undefined) {
    throw new Error('useUserPreferences must be used within a UserPreferencesProvider');
  }
  return context;
}
