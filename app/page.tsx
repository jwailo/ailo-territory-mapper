'use client';
// Force rebuild - deployment test 2025-12-11

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  MapPin,
  FolderOpen,
  Calculator,
  ArrowRight,
  Settings,
  BarChart3,
  Users,
  ChevronDown,
  LogOut,
  KeyRound,
  MessageCircleQuestion,
  Network,
  CalendarDays,
  CalendarClock,
  FileText,
  BookOpen,
  DollarSign,
  Bot,
  Rocket,
  Video,
  FolderKanban,
  Globe,
  Plane,
  GraduationCap,
  Shield,
  Sparkles,
  HelpCircle,
  Check,
  Phone,
} from 'lucide-react';
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
import { trackToolOpen, trackButtonClick, trackPageView, trackLinkOpen } from './utils/analytics';
import type { ToolName } from './utils/supabase';
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

// Prospecting reminder messages (rotate daily)
const prospectingMessages = [
  (name: string) => `Hey ${name}, have you done your prospecting today? The best opportunities come to those who reach out first.`,
  (name: string) => `${name}, consistency beats intensity. A little prospecting every day goes a long way.`,
  (name: string) => `${name}, your future self will thank you. Have you made your prospecting calls today?`,
  (name: string) => `Hey ${name}, the deals you close next month start with the calls you make today. Let's go!`,
  (name: string) => `${name}, winners prospect daily. Time to add some new leads to the board!`,
];

// Helper to check if it's after 9:30am Melbourne time
function isAfterProspectingTime(): boolean {
  // Get current time in Melbourne timezone
  const now = new Date();
  const melbourneTime = new Date(now.toLocaleString('en-US', { timeZone: 'Australia/Melbourne' }));
  const hours = melbourneTime.getHours();
  const minutes = melbourneTime.getMinutes();

  // Check if it's after 9:30am
  return hours > 9 || (hours === 9 && minutes >= 30);
}

// Helper to get today's date string in Melbourne timezone (for localStorage key)
function getMelbourneDateString(): string {
  const now = new Date();
  return now.toLocaleDateString('en-AU', { timeZone: 'Australia/Melbourne' });
}

// Helper to get the prospecting message index for today (rotates daily)
function getProspectingMessageIndex(): number {
  // Use the day of year to rotate through messages
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now.getTime() - start.getTime();
  const oneDay = 1000 * 60 * 60 * 24;
  const dayOfYear = Math.floor(diff / oneDay);
  return dayOfYear % prospectingMessages.length;
}

// Prospecting Reminder Component
function ProspectingReminder({ firstName, onDismiss }: { firstName: string; onDismiss: () => void }) {
  const messageIndex = getProspectingMessageIndex();
  const message = prospectingMessages[messageIndex](firstName);

  return (
    <div className="absolute top-4 right-4 z-20 max-w-sm animate-in slide-in-from-right duration-300">
      <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-xl border border-[#EE0B4F]/20 p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 h-10 w-10 rounded-full bg-[#EE0B4F]/10 flex items-center justify-center">
            <Phone className="h-5 w-5 text-[#EE0B4F]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 leading-relaxed">
              {message}
            </p>
          </div>
        </div>
        <div className="mt-3 flex justify-end">
          <button
            onClick={onDismiss}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#EE0B4F] hover:bg-[#d10a47] text-white text-sm font-medium transition-colors"
          >
            <Check className="h-4 w-4" />
            <span>Done</span>
          </button>
        </div>
      </div>
    </div>
  );
}

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

// Link item type
interface LinkItem {
  title: string;
  description: string;
  icon: LucideIcon;
  href: string;
  internal?: boolean; // true = internal Next.js link, false = external
  comingSoon?: boolean;
  authPassthrough?: boolean; // true = needs auth token passthrough
  specialHandler?: 'case-studies' | 'cost-calculator' | 'territory-map';
}

// Category type
interface Category {
  title: string;
  icon: LucideIcon;
  collapsible: boolean;
  defaultOpen: boolean;
  trackingCategory?: ToolName; // Analytics tracking category for this section
  links: LinkItem[];
}

// Define all categories and their links
const categories: Category[] = [
  {
    title: 'Tools',
    icon: Settings,
    collapsible: false,
    defaultOpen: true,
    links: [
      {
        title: 'Territory Mapper',
        description: 'Visualise territories on an interactive map with company data from HubSpot.',
        icon: MapPin,
        href: '/map',
        internal: true,
        specialHandler: 'territory-map',
      },
      {
        title: 'True Cost Calculator',
        description: 'Calculate the true cost of property management for prospects.',
        icon: Calculator,
        href: 'cost-calculator',
        internal: false,
        authPassthrough: true,
        specialHandler: 'cost-calculator',
      },
      {
        title: 'Case Study Database',
        description: 'Browse and search customer success stories and case studies.',
        icon: FolderOpen,
        href: 'case-studies',
        internal: false,
        authPassthrough: true,
        specialHandler: 'case-studies',
      },
    ],
  },
  {
    title: 'Internal Calendars / Schedules',
    icon: CalendarDays,
    collapsible: true,
    defaultOpen: false,
    trackingCategory: 'internal_calendars',
    links: [
      {
        title: 'Slack Guide & Questions',
        description: 'Guidelines for using Slack channels and asking questions.',
        icon: MessageCircleQuestion,
        href: 'https://docs.google.com/document/d/1oGcmmfPVf_Bkc8PevSRFBsNOYDh_7VjUsKO63ICnvRM/edit?tab=t.0#heading=h.bqmeuzxvajp',
        internal: false,
      },
      {
        title: 'Org Chart',
        description: 'View the Ailo organisational structure and team hierarchy.',
        icon: Network,
        href: 'https://ailohq.bamboohr.com/employees/orgchart.php',
        internal: false,
      },
      {
        title: '2026 Go Live Schedule',
        description: 'Upcoming customer go-live dates and implementation timeline.',
        icon: CalendarClock,
        href: 'https://docs.google.com/spreadsheets/d/1PXpDo1FvxjZmKqG434rj1xgcWq1NmD-nHAjqnOMKE4g/edit?gid=481126026#gid=481126026',
        internal: false,
      },
      {
        title: '2026 MECCA Event Calendar',
        description: 'Scheduled MECCA events and sales activities for 2026.',
        icon: CalendarDays,
        href: '#',
        internal: false,
        comingSoon: true,
      },
      {
        title: 'Case Study Submission Form',
        description: 'Submit new customer success stories for the case study database.',
        icon: FileText,
        href: 'https://docs.google.com/forms/d/e/1FAIpQLSdZGKCcjE6C2JBPeJ9DpfBYoQbzIG5Mdsw4vrVCDN6xwxDlLA/viewform',
        internal: false,
      },
    ],
  },
  {
    title: 'Sales Procedures',
    icon: BookOpen,
    collapsible: true,
    defaultOpen: false,
    trackingCategory: 'sales_procedures',
    links: [
      {
        title: 'Ailo Sales Procedure Manual',
        description: 'Complete guide to the Ailo sales process and procedures.',
        icon: BookOpen,
        href: 'https://docs.google.com/document/d/1pKFbbw7DG5UejwGOIlW-Em6ZvGlqvHaiuuHyu_WQKIs/edit?tab=t.0',
        internal: false,
      },
      {
        title: 'Pricing Outline',
        description: 'Current pricing structure and packaging information.',
        icon: DollarSign,
        href: 'https://docs.google.com/document/d/1gimbrDPvI02J3-kljupuiIDHbknq0uZY9Xp-f0iftGg/edit?tab=t.0#heading=h.o44vkal88k89',
        internal: false,
      },
      {
        title: 'Ailo Meeting Summary GPT',
        description: 'AI assistant to help summarise sales meetings and calls.',
        icon: Bot,
        href: 'https://chatgpt.com/g/g-692e739f479c8191894b0858445a7fc5-ailo-meeting-summary',
        internal: false,
      },
      {
        title: 'Ailo Accelerate + Sales Playbook',
        description: 'Accelerate program details and sales playbook strategies.',
        icon: Rocket,
        href: 'https://docs.google.com/document/d/1eXeN-dfBLfsjb3dc9tgQL4ndhXYwt5Q4Y8WEIC_aYnA/edit?tab=t.0#heading=h.y4kxj41p3t4p',
        internal: false,
      },
    ],
  },
  {
    title: 'Sales Resources',
    icon: FolderKanban,
    collapsible: true,
    defaultOpen: false,
    trackingCategory: 'sales_resources',
    links: [
      {
        title: 'True Cost Calculator (Public)',
        description: 'Public-facing cost calculator to share with prospects.',
        icon: Calculator,
        href: 'https://true-cost-calculator.ailo.io/',
        internal: false,
      },
      {
        title: 'True Cost Industry Benchmark',
        description: 'Industry benchmark data for property management costs.',
        icon: BarChart3,
        href: 'https://true-cost-industry-benchmark.ailo.io/',
        internal: false,
      },
      {
        title: 'Why Now Video Library',
        description: 'Videos explaining why now is the right time to switch.',
        icon: Video,
        href: 'https://ailo.io/why-now',
        internal: false,
      },
      {
        title: 'Ailo Overview Video Library',
        description: 'Product overview and demonstration videos.',
        icon: Video,
        href: 'https://ailo.io/ailo-overview',
        internal: false,
      },
      {
        title: 'Sales Collateral Folder',
        description: 'Presentations, brochures, and marketing materials.',
        icon: FolderKanban,
        href: 'https://drive.google.com/drive/folders/1lpQq880z8Aco-fg32gvous89HfesjScc?usp=drive_link',
        internal: false,
      },
    ],
  },
  {
    title: 'Ailo Landing Pages',
    icon: Globe,
    collapsible: true,
    defaultOpen: false,
    trackingCategory: 'landing_pages',
    links: [
      {
        title: 'Accelerate Landing Page',
        description: 'Landing page for the Ailo Accelerate program.',
        icon: Rocket,
        href: 'https://ailo.io/accelerate-plan',
        internal: false,
      },
      {
        title: 'Migrating to Ailo',
        description: 'Information about the migration process for prospects.',
        icon: Plane,
        href: 'https://ailo.io/handbook-migration',
        internal: false,
      },
      {
        title: 'Training & Onboarding',
        description: 'Training and onboarding resources for new customers.',
        icon: GraduationCap,
        href: 'https://ailo.io/handbook-training-onboarding',
        internal: false,
      },
      {
        title: 'Compliance',
        description: 'Property compliance features and capabilities.',
        icon: Shield,
        href: 'https://ailo.io/property-managers/property-compliance',
        internal: false,
      },
      {
        title: "What's New",
        description: 'Latest product updates and feature releases.',
        icon: Sparkles,
        href: 'https://ailo.io/whats-new',
        internal: false,
      },
    ],
  },
  {
    title: 'HubSpot Knowledge Base',
    icon: HelpCircle,
    collapsible: true,
    defaultOpen: false,
    trackingCategory: 'hubspot_kb',
    links: [
      {
        title: 'Teams vs Permission Sets',
        description: 'Understanding HubSpot teams and permission configurations.',
        icon: Users,
        href: 'https://drive.google.com/file/d/1eURBLgE4hHH3MUpo1go0KCgF-okCU7C5/view?usp=sharing',
        internal: false,
      },
    ],
  },
];

// Link tile component - exact original ToolCard styling with spinning icon on click
function LinkTile({
  title,
  description,
  icon: Icon,
  href,
  internal,
  comingSoon,
  onClick,
  trackingCategory,
}: {
  title: string;
  description: string;
  icon: LucideIcon;
  href: string;
  internal?: boolean;
  comingSoon?: boolean;
  onClick?: () => void;
  trackingCategory?: ToolName;
}) {
  const [isHovered, setIsHovered] = useState(false);
  const [isClicked, setIsClicked] = useState(false);

  const handleClick = (e: React.MouseEvent) => {
    if (comingSoon) {
      e.preventDefault();
      return;
    }
    // Track external link clicks if trackingCategory is provided
    if (trackingCategory && !internal) {
      trackLinkOpen(trackingCategory, title);
    }
    setIsClicked(true);
    setTimeout(() => {
      setIsClicked(false);
      if (onClick) {
        onClick();
      }
    }, 400);
    if (onClick) {
      e.preventDefault();
    }
  };

  const TileContent = (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`group relative block h-full pt-1 ${comingSoon ? 'cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <div
        className={`relative h-full overflow-hidden rounded-2xl border-2 bg-white p-8 transition-all duration-300 ${
          comingSoon
            ? 'border-gray-200 bg-gray-50'
            : 'border-gray-200 group-hover:border-[#EE0B4F] group-hover:shadow-2xl group-hover:shadow-[#EE0B4F]/20 group-hover:-translate-y-1'
        }`}
      >
        {/* Gradient overlay on hover */}
        {!comingSoon && (
          <div className="absolute inset-0 bg-gradient-to-br from-[#EE0B4F]/10 via-transparent to-[#6e8fcb]/10 opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
        )}

        <div className="relative flex flex-col h-full">
          {/* Icon with spin animation on click */}
          <div className="relative mb-6 inline-flex">
            <div
              className={`flex h-16 w-16 items-center justify-center rounded-xl ${
                comingSoon ? 'bg-gray-200' : ''
              }`}
              style={
                comingSoon
                  ? {}
                  : {
                      backgroundColor: isClicked || isHovered ? '#EE0B4F' : '#1A1A2E',
                      transform: isClicked
                        ? 'scale(1.5) rotate(360deg)'
                        : isHovered
                        ? 'scale(1.1)'
                        : 'scale(1)',
                      transition: 'all 700ms cubic-bezier(0.34, 1.56, 0.64, 1)',
                    }
              }
            >
              <Icon
                className={`h-8 w-8 transition-all duration-500 ${
                  comingSoon ? 'text-gray-400' : isClicked ? 'text-white scale-125' : 'text-white'
                }`}
                strokeWidth={1.5}
              />
            </div>
          </div>

          {/* Title with animated underline */}
          <h3 className="mb-3 text-2xl font-bold text-gray-900">
            {title.split(' ').map((word, i) => (
              <span
                key={i}
                className="inline-block mr-2 transition-all duration-500"
                style={{
                  color: comingSoon ? '#9CA3AF' : isClicked ? '#EE0B4F' : 'inherit',
                  transform: isClicked ? 'translateY(-4px) scale(1.05)' : 'none',
                  transitionDelay: isClicked ? `${i * 100}ms` : '0ms',
                }}
              >
                {word}
              </span>
            ))}
            {!comingSoon && (
              <span className="block h-0.5 w-0 bg-[#EE0B4F] transition-all duration-300 group-hover:w-full" />
            )}
          </h3>

          {/* Description */}
          <p className={`mb-6 leading-relaxed flex-1 ${comingSoon ? 'text-gray-400' : 'text-gray-600'}`}>
            {comingSoon ? 'Coming Soon' : description}
          </p>

          {/* Launch tool text - appears on hover */}
          {!comingSoon && (
            <div className="flex items-center gap-2 text-sm font-semibold text-[#EE0B4F] opacity-0 transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-2">
              <span>Launch tool</span>
              <ArrowRight className="h-4 w-4" />
            </div>
          )}
        </div>
      </div>
    </div>
  );

  if (comingSoon) {
    return <div className="h-full block">{TileContent}</div>;
  }

  if (internal) {
    return (
      <Link href={href} onClick={handleClick} className="h-full block">
        {TileContent}
      </Link>
    );
  }

  // External link - use onClick handler if provided, otherwise open in new tab
  if (onClick) {
    return (
      <button onClick={handleClick} className="h-full block w-full text-left">
        {TileContent}
      </button>
    );
  }

  return (
    <a href={href} target="_blank" rel="noopener noreferrer" onClick={handleClick} className="h-full block">
      {TileContent}
    </a>
  );
}

// Collapsible category section component
function CategorySection({
  category,
  isOpen,
  onToggle,
  onLinkClick,
}: {
  category: Category;
  isOpen: boolean;
  onToggle: () => void;
  onLinkClick: (link: LinkItem) => void;
}) {
  const Icon = category.icon;

  return (
    <div className="mb-6">
      {/* Category Header */}
      {category.collapsible ? (
        <button
          onClick={onToggle}
          className="w-full flex items-center gap-3 mb-4 group"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1A1A2E] group-hover:bg-[#EE0B4F] transition-colors">
            <Icon className="h-4 w-4 text-white" strokeWidth={1.5} />
          </div>
          <h2 className="text-sm font-semibold uppercase tracking-widest text-gray-500 group-hover:text-gray-700 transition-colors">
            {category.title}
          </h2>
          <div className="h-px flex-1 bg-gray-200" />
          <ChevronDown
            className={`h-5 w-5 text-gray-400 transition-transform duration-300 ${
              isOpen ? 'rotate-180' : ''
            }`}
          />
        </button>
      ) : (
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1A1A2E]">
            <Icon className="h-4 w-4 text-white" strokeWidth={1.5} />
          </div>
          <h2 className="text-sm font-semibold uppercase tracking-widest text-gray-500">
            {category.title}
          </h2>
          <div className="h-px flex-1 bg-gray-200" />
        </div>
      )}

      {/* Category Links - 3 per row grid */}
      <div
        className={`grid gap-4 sm:grid-cols-2 lg:grid-cols-3 transition-all duration-300 ease-in-out overflow-hidden ${
          isOpen ? 'max-h-[4000px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        {category.links.map((link) => (
          <LinkTile
            key={link.title}
            title={link.title}
            description={link.description}
            icon={link.icon}
            href={link.href}
            internal={link.internal}
            comingSoon={link.comingSoon}
            trackingCategory={category.trackingCategory}
            onClick={
              link.specialHandler || link.authPassthrough
                ? () => onLinkClick(link)
                : undefined
            }
          />
        ))}
      </div>
    </div>
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

  // Category open states - initialize with default open states
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    categories.forEach((cat) => {
      initial[cat.title] = cat.defaultOpen;
    });
    return initial;
  });

  // Prospecting reminder state
  const [showProspectingReminder, setShowProspectingReminder] = useState(false);

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

  // Check if prospecting reminder should be shown
  useEffect(() => {
    if (siteAuthenticated && currentUser) {
      // Check if it's after 9:30am Melbourne time
      if (!isAfterProspectingTime()) {
        return;
      }

      // Check if already dismissed today
      const dismissedDate = localStorage.getItem('prospecting_reminder_dismissed');
      const today = getMelbourneDateString();

      if (dismissedDate !== today) {
        setShowProspectingReminder(true);
      }
    }
  }, [siteAuthenticated, currentUser]);

  // Handle dismissing the prospecting reminder
  const handleDismissProspectingReminder = useCallback(() => {
    const today = getMelbourneDateString();
    localStorage.setItem('prospecting_reminder_dismissed', today);
    setShowProspectingReminder(false);
  }, []);

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

  // Handle link clicks for special handlers
  const handleLinkClick = (link: LinkItem) => {
    if (link.specialHandler === 'case-studies') {
      trackToolOpen('case_study_library');
      const url = getCaseStudyUrl();
      window.location.href = url;
    } else if (link.specialHandler === 'cost-calculator') {
      trackToolOpen('cost_calculator');
      const url = getCostCalculatorUrl();
      window.location.href = url;
    } else if (link.specialHandler === 'territory-map') {
      trackToolOpen('territory_map');
      // Internal link - navigation handled by Link component
    }
  };

  // Toggle category open state
  const toggleCategory = (title: string) => {
    setOpenCategories((prev) => ({
      ...prev,
      [title]: !prev[title],
    }));
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
            <span className="text-[10px] text-white/50 tracking-wide mt-1">Ailo Sales Enablement Toolkit</span>
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
                You don't get results by focusing on results. You get results by focusing on the habits and behaviours that produce results.
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

            {/* Prospecting Reminder - positioned over hero image */}
            {showProspectingReminder && currentUser && (
              <ProspectingReminder
                firstName={currentUser.name.split(' ')[0]}
                onDismiss={handleDismissProspectingReminder}
              />
            )}
          </div>
        </div>
      </section>

      <section className="relative flex-1 bg-gray-50 py-12 lg:py-16">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          {categories.map((category) => (
            <CategorySection
              key={category.title}
              category={category}
              isOpen={openCategories[category.title]}
              onToggle={() => toggleCategory(category.title)}
              onLinkClick={handleLinkClick}
            />
          ))}
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
