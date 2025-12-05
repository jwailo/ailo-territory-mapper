// Password constants
const SITE_PASSWORD = 'bDL-YPzMM7wRPTC9d3mm';
const ADMIN_PASSWORD = 'Victory!';

// Site authentication
export function checkSitePassword(entered: string): boolean {
  return entered === SITE_PASSWORD;
}

export function setSiteAuthenticated(): void {
  if (typeof window !== 'undefined') {
    sessionStorage.setItem('siteAuthenticated', 'true');
  }
}

export function isSiteAuthenticated(): boolean {
  if (typeof window !== 'undefined') {
    return sessionStorage.getItem('siteAuthenticated') === 'true';
  }
  return false;
}

// Admin authentication
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

export function generateAuthToken(): string {
  if (typeof window === 'undefined') return '';

  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const token = btoa(`${AUTH_SECRET}-${today}`); // base64 encode
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
