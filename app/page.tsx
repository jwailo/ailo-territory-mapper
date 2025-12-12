'use client';
// Force rebuild - deployment test 2025-12-11

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { MapPin, FolderOpen, Calculator, ArrowRight, Settings, BarChart3, Users, ChevronDown, LogOut, KeyRound } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import {
  isSiteAuthenticated,
  getCaseStudyUrl,
  getCostCalculatorUrl,
  checkUrlAuthToken,
  generateAuthToken,
  getCurrentUser,
  clearCurrentUser,
  User,
} from './utils/auth';
import { trackToolOpen, trackButtonClick, trackPageView } from './utils/analytics';
import {
  getUserPreferences,
  getWeeklyHeroImage as getWeeklyHeroFromPrefs,
  getProfilePhotoUrl as getProfilePhotoFromPrefs,
  clearPreferencesCache,
  UserPreferences,
} from './utils/userPreferences';
import SiteLoginScreen from './components/SiteLoginScreen';
import ChangePasswordModal from './components/ChangePasswordModal';

// Default walk-on song label (used when user hasn't configured one)
const DEFAULT_WALKON_LABEL = 'Get fired up';

// Helper to generate initials from name
function getInitials(name: string): string {
  const parts = name.split(' ').filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return (parts[0]?.[0] || '?').toUpperCase();
}

// Sales-focused time-based greetings
const morningGreetings = [
  (name: string) => `Rise and close, ${name}!`,
  (name: string) => `New day, new deals, ${name}! Let's go!`,
  (name: string) => `The early bird gets the commission, ${name}!`,
  (name: string) => `Good morning, ${name}! Time to make it happen!`,
];

const afternoonGreetings = [
  (name: string) => `Keep that momentum going, ${name}!`,
  (name: string) => `Afternoon push, ${name}! Finish strong!`,
  (name: string) => `Halfway there, ${name}! Let's close some deals!`,
  (name: string) => `Stay hungry, ${name}! The day's not over!`,
];

const eveningGreetings = [
  (name: string) => `Closing time, ${name}! One more deal?`,
  (name: string) => `End the day on a win, ${name}!`,
  (name: string) => `Evening grind, ${name}! Champions work late!`,
  (name: string) => `Still here, still winning, ${name}!`,
];

// Time-based greeting helper - returns a random sales-focused greeting
function getTimeBasedGreeting(firstName: string): string {
  const now = new Date();
  const hour = now.getHours();

  let greetings: ((name: string) => string)[];
  if (hour < 12) {
    greetings = morningGreetings;
  } else if (hour < 17) {
    greetings = afternoonGreetings;
  } else {
    greetings = eveningGreetings;
  }

  const randomIndex = Math.floor(Math.random() * greetings.length);
  return greetings[randomIndex](firstName);
}

const tools = [
  {
    title: 'Territory Map',
    description: 'Explore company locations and territories across the region',
    icon: MapPin,
    href: '/map',
    internal: true,
  },
  {
    title: 'Case Study Database',
    description: 'Search and share customer success stories that close deals',
    icon: FolderOpen,
    href: 'case-studies', // Will be dynamically generated with auth token
    internal: false,
  },
  {
    title: 'True Cost Calculator',
    description: 'Calculate and compare true costs for prospects',
    icon: Calculator,
    href: 'cost-calculator', // Will be dynamically generated with auth token
    internal: false,
  },
];

function ToolCard({
  title,
  description,
  icon: Icon,
  href,
  internal,
  onExternalClick,
  onInternalClick,
}: {
  title: string;
  description: string;
  icon: LucideIcon;
  href: string;
  internal: boolean;
  onExternalClick?: () => void;
  onInternalClick?: () => void;
}) {
  const [isHovered, setIsHovered] = useState(false);
  const [isClicked, setIsClicked] = useState(false);

  const handleClick = (e: React.MouseEvent) => {
    if (!internal && onExternalClick) {
      e.preventDefault();
      setIsClicked(true);
      setTimeout(() => {
        setIsClicked(false);
        onExternalClick();
      }, 400);
      return;
    }

    if (internal) {
      // Fire internal click handler for tracking
      if (onInternalClick) {
        onInternalClick();
      }
      setIsClicked(true);
      setTimeout(() => {
        setIsClicked(false);
      }, 400);
    }
  };

  const CardContent = (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="group relative block h-full cursor-pointer"
    >
      <div className="relative h-full overflow-hidden rounded-2xl border-2 border-gray-200 bg-white p-8 transition-all duration-300 group-hover:border-[#EE0B4F] group-hover:shadow-2xl group-hover:shadow-[#EE0B4F]/20 group-hover:-translate-y-1">
        <div className="absolute inset-0 bg-gradient-to-br from-[#EE0B4F]/10 via-transparent to-[#6e8fcb]/10 opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

        <div className="relative flex flex-col h-full">
          <div className="relative mb-6 inline-flex">
            <div
              className={`flex h-16 w-16 items-center justify-center rounded-xl transition-all duration-700 ease-out ${
                isClicked ? 'bg-[#EE0B4F] scale-150' : isHovered ? 'bg-[#EE0B4F] scale-110' : 'bg-[#1A1A2E]'
              }`}
              style={{
                transform: isClicked ? 'scale(1.5) rotate(360deg)' : isHovered ? 'scale(1.1)' : 'scale(1)',
                transition: 'all 700ms cubic-bezier(0.34, 1.56, 0.64, 1)',
              }}
            >
              <Icon
                className={`h-8 w-8 transition-all duration-500 ${
                  isClicked ? 'text-white scale-125' : 'text-white'
                }`}
                strokeWidth={1.5}
              />
            </div>
          </div>

          <h3 className="mb-3 text-2xl font-bold text-gray-900">
            {title.split(' ').map((word, i) => (
              <span
                key={i}
                className="inline-block mr-2 transition-all duration-500"
                style={{
                  color: isClicked ? '#EE0B4F' : 'inherit',
                  transform: isClicked ? 'translateY(-4px) scale(1.05)' : 'none',
                  transitionDelay: isClicked ? `${i * 100}ms` : '0ms',
                }}
              >
                {word}
              </span>
            ))}
            <span className="block h-0.5 w-0 bg-[#EE0B4F] transition-all duration-300 group-hover:w-full" />
          </h3>

          <p className="mb-6 text-gray-600 leading-relaxed flex-1">{description}</p>

          <div className="flex items-center gap-2 text-sm font-semibold text-[#EE0B4F] opacity-0 transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-2">
            <span>Launch tool</span>
            <ArrowRight className="h-4 w-4" />
          </div>
        </div>
      </div>
    </div>
  );

  if (internal) {
    return (
      <Link href={href} onClick={handleClick} className="h-full block">
        {CardContent}
      </Link>
    );
  }

  return (
    <button onClick={handleClick} className="h-full block w-full text-left">
      {CardContent}
    </button>
  );
}

// Admin dropdown menu component
function AdminDropdown() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1 p-2 rounded-lg hover:bg-white/10 transition-colors"
        title="Admin Menu"
      >
        <Settings className="h-5 w-5 text-white/70 hover:text-white" />
        <ChevronDown className={`h-4 w-4 text-white/70 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          {/* Backdrop to close dropdown */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown menu */}
          <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-200 py-1 z-50">
            <Link
              href="/admin/users"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 px-4 py-2 text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Users className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium">Users</span>
            </Link>
            <Link
              href="/admin/analytics"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 px-4 py-2 text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <BarChart3 className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium">Analytics</span>
            </Link>
          </div>
        </>
      )}
    </div>
  );
}

export default function Home() {
  // Use lazy initialization to check auth status synchronously on first render
  const [authState, setAuthState] = useState<{ authenticated: boolean; checked: boolean; user: User | null }>(() => {
    if (typeof window === 'undefined') {
      return { authenticated: false, checked: false, user: null };
    }
    // First check for auth token in URL (cross-app authentication)
    if (checkUrlAuthToken()) {
      return { authenticated: true, checked: true, user: getCurrentUser() };
    }
    // Fall back to session storage check
    const isAuth = isSiteAuthenticated();
    return { authenticated: isAuth, checked: true, user: isAuth ? getCurrentUser() : null };
  });

  // User preferences state
  const [userPrefs, setUserPrefs] = useState<UserPreferences | null>(null);
  const [prefsLoaded, setPrefsLoaded] = useState(false);

  // Change password modal state
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);

  const siteAuthenticated = authState.authenticated;
  const authChecked = authState.checked;
  const currentUser = authState.user;
  const handleAuthenticated = (user: User) => setAuthState({ authenticated: true, checked: true, user });

  
  // On client side, ensure auth is checked if SSR returned unchecked
  useEffect(() => {
    if (!authState.checked) {
      // Use queueMicrotask to defer state update and satisfy lint rules
      queueMicrotask(() => {
        if (checkUrlAuthToken()) {
          setAuthState({ authenticated: true, checked: true, user: getCurrentUser() });
        } else {
          const isAuth = isSiteAuthenticated();
          setAuthState({ authenticated: isAuth, checked: true, user: isAuth ? getCurrentUser() : null });
        }
      });
    }
  }, [authState.checked]);

  // Generate auth token, track page view, and load preferences when authenticated
  useEffect(() => {
    if (siteAuthenticated) {
      generateAuthToken();
      trackPageView('aset_hub', 'home');

      // Load user preferences
      if (currentUser && !prefsLoaded) {
        getUserPreferences(currentUser.id).then((prefs) => {
          setUserPrefs(prefs);
          setPrefsLoaded(true);
        });
      }
    }
  }, [siteAuthenticated, currentUser, prefsLoaded]);

  
  // Handle walk-on song click - opens user's walk-on song in new tab
  // Only works if user has configured a walk-on song in their preferences
  const handleWalkonSongClick = () => {
    if (!userPrefs?.walkon_song_url) return; // No song configured
    trackButtonClick('aset_hub', 'walkon_song');
    window.open(userPrefs.walkon_song_url, '_blank');
  };

  // Get current walk-on button label
  const walkonButtonLabel = userPrefs?.walkon_button_label || DEFAULT_WALKON_LABEL;

  // Only show walk-on button if user has a song configured
  const showWalkonButton = !!userPrefs?.walkon_song_url;

  // Handle logout
  const handleLogout = () => {
    trackButtonClick('aset_hub', 'logout');
    clearCurrentUser();
    clearPreferencesCache();
    setAuthState({ authenticated: false, checked: true, user: null });
    setUserPrefs(null);
    setPrefsLoaded(false);
  };

  // Case Study Database handler
  const handleCaseStudyClick = () => {
    trackToolOpen('case_study_library');
    const url = getCaseStudyUrl();
    window.location.href = url;
  };

  // Cost Calculator handler
  const handleCostCalculatorClick = () => {
    trackToolOpen('cost_calculator');
    const url = getCostCalculatorUrl();
    window.location.href = url;
  };

  // Territory Map handler (for tracking)
  const handleTerritoryMapClick = () => {
    trackToolOpen('territory_map');
  };

  // Show nothing while checking auth status
  if (!authChecked) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-gradient-to-br from-[#1A1A2E] to-[#2D2D3A]">
        <p className="text-white">Loading...</p>
      </div>
    );
  }

  // Show login screen if not authenticated
  if (!siteAuthenticated) {
    return <SiteLoginScreen onAuthenticated={handleAuthenticated} />;
  }

  // Get hero image - use user's preferences if set, otherwise show gradient placeholder
  const heroImageUrl = getWeeklyHeroFromPrefs(userPrefs);

  // Get profile photo - use user's preferences if set, otherwise null (will show initials)
  const profilePhotoUrl = getProfilePhotoFromPrefs(userPrefs);

  // DEBUG: Log auth and preferences state
  console.log('DEBUG - currentUser:', currentUser);
  console.log('DEBUG - userPrefs:', userPrefs);
  console.log('DEBUG - profilePhotoUrl:', profilePhotoUrl);
  console.log('DEBUG - prefsLoaded:', prefsLoaded);

  return (
    <>
      {/* Change Password Modal */}
      {currentUser && (
        <ChangePasswordModal
          isOpen={showChangePasswordModal}
          userId={currentUser.id}
          onClose={() => setShowChangePasswordModal(false)}
        />
      )}

      <div className="min-h-screen flex flex-col bg-gray-50">
        <header className="relative z-10 bg-[#1A1A2E]">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6 lg:px-8 lg:py-8">
          <div className="flex flex-col items-start">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/ASET-White.png"
              alt="ASET"
              style={{ height: '45px', width: 'auto' }}
            />
            <span className="text-[10px] text-white/50 tracking-wide mt-1">Ailo Sales Enablement Tool</span>
          </div>
          <div className="flex items-center gap-3">
            {currentUser && (
              <>
                {/* Walk-on song button - only shown if user has configured a song */}
                {showWalkonButton && (
                  <button
                    onClick={handleWalkonSongClick}
                    className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#EE0B4F]/20 hover:bg-[#EE0B4F]/30 border border-[#EE0B4F]/30 transition-all group cursor-pointer"
                    title="Play your walk-on song"
                  >
                    <span className="text-sm font-medium text-white">{walkonButtonLabel}</span>
                    <span className="text-base group-hover:animate-pulse">🔥</span>
                  </button>
                )}
                {currentUser.role === 'admin' && (
                  <AdminDropdown />
                )}
                {/* Profile photo or initials */}
                {profilePhotoUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={profilePhotoUrl}
                    alt={currentUser.name}
                    className="h-9 w-9 rounded-full border-2 border-white/20 object-cover"
                  />
                ) : (
                  <div className="h-9 w-9 rounded-full border-2 border-white/20 bg-[#EE0B4F] flex items-center justify-center">
                    <span className="text-sm font-semibold text-white">
                      {getInitials(currentUser.name)}
                    </span>
                  </div>
                )}
                {/* Change Password button */}
                <button
                  onClick={() => setShowChangePasswordModal(true)}
                  className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                  title="Change Password"
                >
                  <KeyRound className="h-5 w-5 text-white/70 hover:text-white" />
                </button>
                {/* Logout button */}
                <button
                  onClick={handleLogout}
                  className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                  title="Logout"
                >
                  <LogOut className="h-5 w-5 text-white/70 hover:text-white" />
                </button>
              </>
            )}
            {!currentUser && (
              <span className="hidden text-sm text-white/70 sm:block">Ailo Sales Team</span>
            )}
          </div>
        </div>
      </header>

      <section className="relative min-h-[400px] lg:min-h-[500px]">
        <div className="flex h-full min-h-[400px] lg:min-h-[500px]">
          {/* Left: Text area - 55% with diagonal light gradient in Ailo colours */}
          <div className="w-full lg:w-[55%] flex items-center px-6 lg:px-12 py-16 lg:py-24 bg-gradient-to-br from-[#EE0B4F]/15 via-[#EE0B4F]/8 via-50% to-[#6e8fcb]/10">
            <div className="max-w-2xl">
              {/* Time-based greeting */}
              {currentUser && (
                <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#EE0B4F]/30 bg-[#EE0B4F]/10 backdrop-blur-sm px-4 py-2">
                  <span className="text-sm font-semibold text-[#EE0B4F]">
                    {getTimeBasedGreeting(currentUser.name.split(' ')[0])}
                  </span>
                </div>
              )}

              <h1 className="max-w-4xl text-balance">
                <span className="block text-5xl font-black tracking-tight text-[#1A1A2E] sm:text-6xl lg:text-7xl xl:text-8xl">
                  Close deals
                </span>
                <span className="block text-5xl font-black tracking-tight text-[#EE0B4F] sm:text-6xl lg:text-7xl xl:text-8xl">
                  faster.
                </span>
              </h1>

              <p className="mt-8 max-w-xl text-lg text-[#1A1A2E]/70 leading-relaxed lg:text-xl">
                Everything you need to prospect, pitch, and win. Built for the Ailo sales team.
              </p>
            </div>
          </div>

          {/* Right: Image area - 45%, anchored to top */}
          <div className="hidden lg:block lg:w-[45%] relative">
            {heroImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={heroImageUrl}
                alt="Inspiration"
                className="absolute inset-0 w-full h-full object-cover object-top"
              />
            ) : (
              /* Fallback: gradient if no image */
              <div className="absolute inset-0 bg-gradient-to-br from-[#EE0B4F]/30 to-[#6e8fcb]/30" />
            )}
            {/* Gradient overlay that continues from text area */}
            <div className="absolute inset-0 bg-gradient-to-r from-[#EE0B4F]/15 via-[#EE0B4F]/8 to-transparent pointer-events-none" />
          </div>
        </div>
      </section>

      <section className="relative flex-1 bg-gray-50 py-16 lg:py-20">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mb-10 flex items-center gap-4">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-gray-500">Your Tools</h2>
            <div className="h-px flex-1 bg-gray-200" />
          </div>

          <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-3 items-stretch">
            {tools.map((tool) => {
              // Determine the click handler based on tool title
              let clickHandler: (() => void) | undefined;
              if (tool.title === 'Case Study Database') {
                clickHandler = handleCaseStudyClick;
              } else if (tool.title === 'True Cost Calculator') {
                clickHandler = handleCostCalculatorClick;
              } else if (tool.title === 'Territory Map') {
                clickHandler = handleTerritoryMapClick;
              }

              return (
                <ToolCard
                  key={tool.title}
                  title={tool.title}
                  description={tool.description}
                  icon={tool.icon}
                  href={tool.href}
                  internal={tool.internal}
                  onExternalClick={!tool.internal ? clickHandler : undefined}
                  onInternalClick={tool.internal ? clickHandler : undefined}
                />
              );
            })}
          </div>
        </div>
      </section>

        <footer className="bg-[#1A1A2E] py-8">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/ASET-White.png" alt="ASET" className="h-6 w-auto opacity-70" />
              <p className="text-sm text-white/50">© 2025 ASET. Built for the Ailo sales team.</p>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
