'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { MapPin, FolderOpen, Calculator, ArrowRight, Sparkles } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import {
  isSiteAuthenticated,
  getCaseStudyUrl,
  checkUrlAuthToken,
  generateAuthToken,
} from './utils/auth';
import SiteLoginScreen from './components/SiteLoginScreen';

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
    description: 'See all True Cost Calculator completions',
    icon: Calculator,
    href: '#',
    internal: true,
    comingSoon: true,
  },
];

function ToolCard({
  title,
  description,
  icon: Icon,
  href,
  internal,
  comingSoon,
  onCaseStudyClick,
}: {
  title: string;
  description: string;
  icon: LucideIcon;
  href: string;
  internal: boolean;
  comingSoon?: boolean;
  onCaseStudyClick?: () => void;
}) {
  const [isHovered, setIsHovered] = useState(false);
  const [isClicked, setIsClicked] = useState(false);

  const handleClick = (e: React.MouseEvent) => {
    if (comingSoon) {
      e.preventDefault();
      return;
    }

    if (!internal && onCaseStudyClick) {
      e.preventDefault();
      setIsClicked(true);
      setTimeout(() => {
        setIsClicked(false);
        onCaseStudyClick();
      }, 400);
      return;
    }

    if (internal) {
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
      className={`group relative block h-full ${comingSoon ? 'cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <div className={`relative h-full overflow-hidden rounded-2xl border-2 border-gray-200 bg-white p-8 transition-all duration-300 ${
        comingSoon
          ? 'opacity-60'
          : 'group-hover:border-[#EE0B4F] group-hover:shadow-2xl group-hover:shadow-[#EE0B4F]/20 group-hover:-translate-y-1'
      }`}>
        <div className={`absolute inset-0 bg-gradient-to-br from-[#EE0B4F]/10 via-transparent to-[#6e8fcb]/10 opacity-0 transition-opacity duration-500 ${!comingSoon && 'group-hover:opacity-100'}`} />

        <div className="relative flex flex-col h-full">
          <div className="relative mb-6 inline-flex">
            <div
              className={`flex h-16 w-16 items-center justify-center rounded-xl transition-all duration-700 ease-out ${
                isClicked ? 'bg-[#EE0B4F] scale-150' : isHovered && !comingSoon ? 'bg-[#EE0B4F] scale-110' : 'bg-[#1A1A2E]'
              }`}
              style={{
                transform: isClicked ? 'scale(1.5) rotate(360deg)' : isHovered && !comingSoon ? 'scale(1.1)' : 'scale(1)',
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
            <span className={`block h-0.5 w-0 bg-[#EE0B4F] transition-all duration-300 ${!comingSoon && 'group-hover:w-full'}`} />
          </h3>

          <p className="mb-6 text-gray-600 leading-relaxed flex-1">{description}</p>

          {comingSoon ? (
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-400">
              <span>Coming soon</span>
            </div>
          ) : (
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
    return <div className="h-full">{CardContent}</div>;
  }

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

export default function Home() {
  // Use lazy initialization to check auth status synchronously on first render
  const [authState, setAuthState] = useState<{ authenticated: boolean; checked: boolean }>(() => {
    if (typeof window === 'undefined') {
      return { authenticated: false, checked: false };
    }
    // First check for auth token in URL (cross-app authentication)
    if (checkUrlAuthToken()) {
      return { authenticated: true, checked: true };
    }
    // Fall back to session storage check
    return { authenticated: isSiteAuthenticated(), checked: true };
  });

  const siteAuthenticated = authState.authenticated;
  const authChecked = authState.checked;
  const setSiteAuthenticated = (val: boolean) => setAuthState((prev) => ({ ...prev, authenticated: val }));

  // On client side, ensure auth is checked if SSR returned unchecked
  useEffect(() => {
    if (!authState.checked) {
      // Use queueMicrotask to defer state update and satisfy lint rules
      queueMicrotask(() => {
        if (checkUrlAuthToken()) {
          setAuthState({ authenticated: true, checked: true });
        } else {
          setAuthState({ authenticated: isSiteAuthenticated(), checked: true });
        }
      });
    }
  }, [authState.checked]);

  // Generate auth token when authenticated
  useEffect(() => {
    if (siteAuthenticated) {
      generateAuthToken();
    }
  }, [siteAuthenticated]);

  // Case Study Database handler
  const handleCaseStudyClick = () => {
    const url = getCaseStudyUrl();
    window.location.href = url;
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
    return <SiteLoginScreen onAuthenticated={() => setSiteAuthenticated(true)} />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header className="relative z-10 bg-[#1A1A2E]">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6 lg:px-8 lg:py-8">
          <div className="flex items-center gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/ASET-White.png" alt="ASET" className="h-12 w-auto lg:h-14" />
          </div>
          <div className="flex items-center gap-6">
            <span className="hidden text-sm text-white/70 sm:block">Ailo Sales Team</span>
          </div>
        </div>
      </header>

      <section className="relative bg-gradient-to-br from-[#EE0B4F]/15 via-[#EE0B4F]/8 via-50% to-[#6e8fcb]/10">
        {/* Soft radial overlay for smoother blending */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-[#6e8fcb]/10 via-transparent to-transparent" />

        {/* Decorative elements with feathered edges */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -right-1/4 top-0 h-full w-3/4 bg-gradient-to-l from-[#6e8fcb]/8 via-[#6e8fcb]/4 to-transparent skew-x-12 blur-sm" />
          <div className="absolute -left-1/4 bottom-0 h-2/3 w-2/3 bg-gradient-to-r from-[#EE0B4F]/8 via-[#EE0B4F]/4 to-transparent -skew-x-12 blur-sm" />
        </div>

        <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
          <div className="py-16 lg:py-24">
            <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-[#EE0B4F]/20 bg-white/80 backdrop-blur-sm px-4 py-2">
              <Sparkles className="h-4 w-4 text-[#EE0B4F]" />
              <span className="text-sm font-medium text-gray-600">Your sales toolkit</span>
            </div>

            <h1 className="max-w-4xl text-balance">
              <span className="block text-5xl font-black tracking-tight text-[#1A1A2E] sm:text-6xl lg:text-7xl xl:text-8xl">
                Close deals
              </span>
              <span className="block text-5xl font-black tracking-tight text-[#EE0B4F] sm:text-6xl lg:text-7xl xl:text-8xl">
                faster.
              </span>
            </h1>

            <p className="mt-8 max-w-xl text-lg text-gray-600 leading-relaxed lg:text-xl">
              Everything you need to prospect, pitch, and win. Built for the Ailo sales team.
            </p>
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
            {tools.map((tool) => (
              <ToolCard
                key={tool.title}
                title={tool.title}
                description={tool.description}
                icon={tool.icon}
                href={tool.href}
                internal={tool.internal}
                comingSoon={tool.comingSoon}
                onCaseStudyClick={tool.title === 'Case Study Database' ? handleCaseStudyClick : undefined}
              />
            ))}
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
  );
}
