import { supabase } from './supabase';
import { getCurrentUser } from './auth';

// Quote type for user preferences
export interface UserQuote {
  content: string;
  attribution?: string;
}

// Interests type
export interface UserInterests {
  sports_teams?: string[];
  music_artists?: string[];
  tv_shows?: string[];
}

// User preferences stored in database
export interface UserPreferences {
  id: string;
  user_id: string;
  photo_url: string | null;
  hero_images: string[]; // Array of image URLs
  quotes: UserQuote[];
  walkon_song_url: string | null;
  walkon_button_label: string;
  interests: UserInterests | null;
  created_at: string;
  updated_at: string;
}

// Default preferences for new users
export const DEFAULT_PREFERENCES: Omit<UserPreferences, 'id' | 'user_id' | 'created_at' | 'updated_at'> = {
  photo_url: null,
  hero_images: [],
  quotes: [],
  walkon_song_url: null,
  walkon_button_label: 'Get fired up',
  interests: null,
};

// Validation constants
export const QUOTE_MIN_COUNT = 5;
export const QUOTE_MAX_COUNT = 30;
export const QUOTE_MAX_LENGTH = 200;
export const HERO_IMAGE_MIN_COUNT = 3;
export const HERO_IMAGE_MAX_COUNT = 10;
export const PROFILE_PHOTO_MAX_SIZE_KB = 100;
export const HERO_IMAGE_MAX_SIZE_KB = 500;
export const PROFILE_PHOTO_MAX_WIDTH = 200;
export const HERO_IMAGE_MAX_WIDTH = 800;

// Cached preferences for the current session
let cachedPreferences: UserPreferences | null = null;
let cacheUserId: string | null = null;

/**
 * Get user preferences from database
 */
export async function getUserPreferences(userId?: string): Promise<UserPreferences | null> {
  const targetUserId = userId || getCurrentUser()?.id;
  console.log('DEBUG getUserPreferences - targetUserId:', targetUserId);

  if (!targetUserId) {
    console.log('DEBUG getUserPreferences - no targetUserId, returning null');
    return null;
  }

  // Return cached if same user and already loaded
  if (cachedPreferences && cacheUserId === targetUserId) {
    console.log('DEBUG getUserPreferences - returning cached:', cachedPreferences);
    return cachedPreferences;
  }

  try {
    console.log('DEBUG getUserPreferences - fetching from Supabase...');
    const { data, error } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', targetUserId)
      .single();

    console.log('DEBUG getUserPreferences - result:', { data, error });

    if (error) {
      if (error.code === 'PGRST116') {
        // No preferences exist yet - return null (will use defaults)
        console.log('DEBUG getUserPreferences - no preferences exist yet');
        return null;
      }
      console.error('Error fetching user preferences:', error);
      return null;
    }

    // Cache the result
    cachedPreferences = data as UserPreferences;
    cacheUserId = targetUserId;

    console.log('DEBUG getUserPreferences - cached and returning:', cachedPreferences);
    return cachedPreferences;
  } catch (err) {
    console.error('Error fetching user preferences:', err);
    return null;
  }
}

/**
 * Create or update user preferences
 */
export async function saveUserPreferences(
  userId: string,
  preferences: Partial<Omit<UserPreferences, 'id' | 'user_id' | 'created_at' | 'updated_at'>>
): Promise<{ success: boolean; error?: string }> {
  console.log('DEBUG saveUserPreferences - userId:', userId);
  console.log('DEBUG saveUserPreferences - preferences:', preferences);

  try {
    // Check if preferences already exist
    const { data: existing, error: checkError } = await supabase
      .from('user_preferences')
      .select('id')
      .eq('user_id', userId)
      .single();

    console.log('DEBUG saveUserPreferences - existing record:', existing, 'checkError:', checkError);

    if (existing) {
      // Update existing
      const updateData = {
        ...preferences,
        updated_at: new Date().toISOString(),
      };
      console.log('DEBUG saveUserPreferences - updating with:', updateData);

      const { error, data } = await supabase
        .from('user_preferences')
        .update(updateData)
        .eq('user_id', userId)
        .select();

      console.log('DEBUG saveUserPreferences - update result:', { error, data });

      if (error) {
        console.error('Error updating preferences:', error);
        return { success: false, error: error.message };
      }
    } else {
      // Create new
      const insertData = {
        user_id: userId,
        ...DEFAULT_PREFERENCES,
        ...preferences,
      };
      console.log('DEBUG saveUserPreferences - inserting:', insertData);

      const { error, data } = await supabase
        .from('user_preferences')
        .insert(insertData)
        .select();

      console.log('DEBUG saveUserPreferences - insert result:', { error, data });

      if (error) {
        console.error('Error creating preferences:', error);
        return { success: false, error: error.message };
      }
    }

    // Clear cache so it reloads
    if (cacheUserId === userId) {
      cachedPreferences = null;
      cacheUserId = null;
    }

    return { success: true };
  } catch (err) {
    console.error('Error saving preferences:', err);
    return { success: false, error: 'Failed to save preferences' };
  }
}

/**
 * Clear the preferences cache (call on logout)
 */
export function clearPreferencesCache(): void {
  cachedPreferences = null;
  cacheUserId = null;
}

/**
 * Get a random quote from user's preferences
 * Falls back to default quotes if user has none
 */
export function getRandomUserQuote(preferences: UserPreferences | null): UserQuote | null {
  const quotes = preferences?.quotes || [];

  if (quotes.length === 0) {
    return null;
  }

  const randomIndex = Math.floor(Math.random() * quotes.length);
  return quotes[randomIndex];
}

/**
 * Get weekly hero image from user's preferences
 * Returns null if no hero images configured
 */
export function getWeeklyHeroImage(preferences: UserPreferences | null): string | null {
  const images = preferences?.hero_images || [];

  if (images.length === 0) {
    return null;
  }

  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const weekNumber = Math.ceil(
    ((now.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7
  );

  return images[weekNumber % images.length];
}

/**
 * Get profile photo URL
 * Falls back to initials-based avatar if no photo
 */
export function getProfilePhotoUrl(preferences: UserPreferences | null): string | null {
  return preferences?.photo_url || null;
}

/**
 * Validate quotes meet requirements
 */
export function validateQuotes(quotes: UserQuote[]): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (quotes.length < QUOTE_MIN_COUNT) {
    errors.push(`Minimum ${QUOTE_MIN_COUNT} quotes required (currently ${quotes.length})`);
  }

  if (quotes.length > QUOTE_MAX_COUNT) {
    errors.push(`Maximum ${QUOTE_MAX_COUNT} quotes allowed (currently ${quotes.length})`);
  }

  quotes.forEach((quote, index) => {
    if (quote.content.length > QUOTE_MAX_LENGTH) {
      errors.push(`Quote ${index + 1} exceeds ${QUOTE_MAX_LENGTH} character limit`);
    }
    if (!quote.content.trim()) {
      errors.push(`Quote ${index + 1} cannot be empty`);
    }
  });

  return { valid: errors.length === 0, errors };
}

/**
 * Validate hero images meet requirements
 */
export function validateHeroImages(images: string[]): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (images.length > 0 && images.length < HERO_IMAGE_MIN_COUNT) {
    errors.push(`Minimum ${HERO_IMAGE_MIN_COUNT} hero images required (currently ${images.length})`);
  }

  if (images.length > HERO_IMAGE_MAX_COUNT) {
    errors.push(`Maximum ${HERO_IMAGE_MAX_COUNT} hero images allowed (currently ${images.length})`);
  }

  return { valid: errors.length === 0, errors };
}
