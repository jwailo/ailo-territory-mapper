'use client';

import { useState, ReactNode } from 'react';

interface CollapsiblePanelProps {
  title: string;
  children: ReactNode;
  defaultCollapsed?: boolean;
  className?: string;
  badge?: string | number;
}

export default function CollapsiblePanel({
  title,
  children,
  defaultCollapsed = false,
  className = '',
  badge,
}: CollapsiblePanelProps) {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

  return (
    <div className={`bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden ${className}`}>
      {/* Header - always visible */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="w-full bg-gradient-to-r from-[#EE0B4F] to-[#c4093f] px-4 py-2 flex items-center justify-between cursor-pointer hover:brightness-110 transition-all"
      >
        <div className="flex items-center gap-2">
          <h3 className="text-white font-semibold text-sm">{title}</h3>
          {badge !== undefined && (
            <span className="bg-white/20 text-white text-xs px-2 py-0.5 rounded-full">
              {badge}
            </span>
          )}
        </div>
        <svg
          className={`w-4 h-4 text-white transition-transform duration-200 ${
            isCollapsed ? '' : 'rotate-180'
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {/* Content - collapsible */}
      <div
        className={`transition-all duration-300 ease-in-out overflow-hidden ${
          isCollapsed ? 'max-h-0' : 'max-h-[1000px]'
        }`}
      >
        {children}
      </div>
    </div>
  );
}
