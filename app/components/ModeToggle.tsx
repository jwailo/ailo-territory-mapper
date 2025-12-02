'use client';

import { AppMode } from '../types';

interface ModeToggleProps {
  mode: AppMode;
  isAdminAuthenticated: boolean;
  onModeChange: (mode: AppMode) => void;
  onAdminClick: () => void;
}

export default function ModeToggle({
  mode,
  isAdminAuthenticated,
  onModeChange,
  onAdminClick,
}: ModeToggleProps) {
  const handleAdminClick = () => {
    if (mode === 'admin') {
      // Already in admin mode, switch to view
      onModeChange('view');
    } else if (isAdminAuthenticated) {
      // Already authenticated, switch directly to admin
      onModeChange('admin');
    } else {
      // Need to authenticate first
      onAdminClick();
    }
  };

  return (
    <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg">
      <button
        onClick={() => onModeChange('view')}
        className={`
          px-4 py-2 rounded-md text-sm font-medium transition-all duration-200
          ${
            mode === 'view'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          }
        `}
      >
        <span className="flex items-center gap-2">
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
            />
          </svg>
          View Mode
        </span>
      </button>
      <button
        onClick={handleAdminClick}
        className={`
          px-4 py-2 rounded-md text-sm font-medium transition-all duration-200
          ${
            mode === 'admin'
              ? 'bg-white text-purple-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          }
        `}
      >
        <span className="flex items-center gap-2">
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
          Admin Mode
          {!isAdminAuthenticated && mode !== 'admin' && (
            <svg className="w-3 h-3 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                clipRule="evenodd"
              />
            </svg>
          )}
        </span>
      </button>
    </div>
  );
}
