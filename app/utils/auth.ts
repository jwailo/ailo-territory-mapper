import bcrypt from 'bcryptjs';
import { supabase } from './supabase';
import { trackLogin } from './analytics';

// User type
export interface User {
  id: string;
  email: string;
  name: string;
  role: 'ae' | 'admin';
  photo_url: string | null;
}

// Admin mode password (separate from user login)
const ADMIN_PASSWORD = 'Victory!';

// User authentication - login with email and password
export async function loginUser(
  email: string,
  password: string
): Promise<{ success: boolean; user?: User; error?: string }> {
  try {
    // Query user by email
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, name, role, photo_url, password_hash')
      .eq('email', email.toLowerCase().trim())
      .single();

    if (error || !user) {
      return { success: false, error: 'Invalid email or password' };
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return { success: false, error: 'Invalid email or password' };
    }

    // Update last_login timestamp
    await supabase
      .from('users')
      .update({ last_login: new Date().toISOString() })
      .eq('id', user.id);

    // Store user in session
    const userData: User = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      photo_url: user.photo_url,
    };

    setCurrentUser(userData);
    generateAuthToken(user.id);

    // Track login event
    trackLogin(userData.email, userData.name);

    return { success: true, user: userData };
  } catch (err) {
    console.error('Login error:', err);
    return { success: false, error: 'An error occurred during login' };
  }
}

// Store current user in session
export function setCurrentUser(user: User): void {
  if (typeof window !== 'undefined') {
    sessionStorage.setItem('currentUser', JSON.stringify(user));
    sessionStorage.setItem('siteAuthenticated', 'true');
  }
}

// Get current user from session
export function getCurrentUser(): User | null {
  if (typeof window !== 'undefined') {
    const userJson = sessionStorage.getItem('currentUser');
    if (userJson) {
      try {
        return JSON.parse(userJson) as User;
      } catch {
        return null;
      }
    }
  }
  return null;
}

// Clear current user (logout)
export function clearCurrentUser(): void {
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem('currentUser');
    sessionStorage.removeItem('siteAuthenticated');
    sessionStorage.removeItem('aset-auth-token');
  }
}

// Site authentication (check if user is logged in)
export function isSiteAuthenticated(): boolean {
  if (typeof window !== 'undefined') {
    return sessionStorage.getItem('siteAuthenticated') === 'true';
  }
  return false;
}

// Legacy function for backwards compatibility
export function setSiteAuthenticated(): void {
  if (typeof window !== 'undefined') {
    sessionStorage.setItem('siteAuthenticated', 'true');
  }
}

// Admin mode authentication (separate from user login)
export function checkAdminPassword(entered: string): boolean {
  return entered === ADMIN_PASSWORD;
}

export function setAdminAuthenticated(): void {
  if (typeof window !== 'undefined') {
    sessionStorage.setItem('adminAuthenticated', 'true');
  }
}

export function isAdminAuthenticated(): boolean {
  if (typeof window !== 'undefined') {
    return sessionStorage.getItem('adminAuthenticated') === 'true';
  }
  return false;
}

export function clearAdminAuthenticated(): void {
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem('adminAuthenticated');
  }
}

// Cross-app authentication token
const AUTH_SECRET = 'ailo-sales-2024';

export function generateAuthToken(userId?: string): string {
  if (typeof window === 'undefined') return '';

  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const payload = userId
    ? JSON.stringify({ secret: AUTH_SECRET, date: today, userId })
    : `${AUTH_SECRET}-${today}`;
  const token = btoa(payload);
  sessionStorage.setItem('aset-auth-token', token);
  return token;
}

export function getAuthToken(): string {
  if (typeof window === 'undefined') return '';
  return sessionStorage.getItem('aset-auth-token') || '';
}

export function getCaseStudyUrl(): string {
  const token = getAuthToken();
  return `https://case-study-database-ailo.vercel.app/login?auth=${token}`;
}

export function getCostCalculatorUrl(): string {
  const token = getAuthToken();
  return `https://cost-comparison-tool.vercel.app/sales-dashboard.html?auth=${token}`;
}

// Validate an auth token from URL parameter
export function validateAuthToken(token: string | null): boolean {
  if (!token) return false;

  try {
    const decoded = atob(token);

    // Check if it's the new JSON format with userId
    try {
      const parsed = JSON.parse(decoded);
      const today = new Date().toISOString().split('T')[0];
      return parsed.secret === AUTH_SECRET && parsed.date === today;
    } catch {
      // Fall back to legacy format
      const today = new Date().toISOString().split('T')[0];
      const expectedToken = btoa(`${AUTH_SECRET}-${today}`);
      return token === expectedToken;
    }
  } catch {
    return false;
  }
}

// Check URL for auth token and authenticate if valid
export function checkUrlAuthToken(): boolean {
  if (typeof window === 'undefined') return false;

  const urlParams = new URLSearchParams(window.location.search);
  const authToken = urlParams.get('auth');

  if (validateAuthToken(authToken)) {
    // Valid token - set session as authenticated
    setSiteAuthenticated();

    // Try to extract userId from token and restore user session
    try {
      const decoded = atob(authToken!);
      const parsed = JSON.parse(decoded);
      if (parsed.userId) {
        // Regenerate the token to maintain session
        generateAuthToken(parsed.userId);
      }
    } catch {
      // Legacy token format, just generate a new one
      generateAuthToken();
    }

    // Clean the URL by removing the auth parameter
    const url = new URL(window.location.href);
    url.searchParams.delete('auth');
    window.history.replaceState({}, '', url.toString());

    return true;
  }

  return false;
}

// Hash a password (for creating users)
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

// Change password for a user
export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // First, fetch the user's current password hash
    const { data: user, error: fetchError } = await supabase
      .from('users')
      .select('password_hash')
      .eq('id', userId)
      .single();

    if (fetchError || !user) {
      return { success: false, error: 'User not found' };
    }

    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isValidPassword) {
      return { success: false, error: 'Current password is incorrect' };
    }

    // Hash the new password
    const newPasswordHash = await bcrypt.hash(newPassword, 10);

    // Update the password in the database
    const { error: updateError } = await supabase
      .from('users')
      .update({ password_hash: newPasswordHash })
      .eq('id', userId);

    if (updateError) {
      console.error('Error updating password:', updateError);
      return { success: false, error: 'Failed to update password' };
    }

    return { success: true };
  } catch (err) {
    console.error('Change password error:', err);
    return { success: false, error: 'An error occurred while changing password' };
  }
}
