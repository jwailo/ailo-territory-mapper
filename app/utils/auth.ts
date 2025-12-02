// Password constants
const SITE_PASSWORD = 'letswin!';
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
