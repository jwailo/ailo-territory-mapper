'use client';

import { useState, FormEvent } from 'react';
import { checkSitePassword, setSiteAuthenticated } from '../utils/auth';

interface SiteLoginScreenProps {
  onAuthenticated: () => void;
}

export default function SiteLoginScreen({ onAuthenticated }: SiteLoginScreenProps) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    if (checkSitePassword(password)) {
      setSiteAuthenticated();
      onAuthenticated();
    } else {
      setError('Incorrect password');
      setPassword('');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-[#1A1A2E] to-[#2D2D3A] flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md mx-4">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
            <svg
              className="w-8 h-8 text-[#EE0B4F]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            Australian Postcode Territory Manager
          </h1>
          <p className="text-gray-500 mt-2">Enter password to access the application</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="password" className="sr-only">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#EE0B4F] focus:border-[#EE0B4F] text-gray-900 placeholder-gray-400"
              autoFocus
              disabled={isSubmitting}
            />
          </div>

          {error && (
            <div className="bg-[#FEE2E8] border border-[#EF4444] border-l-4 text-[#EF4444] px-4 py-3 rounded-lg text-sm flex items-center gap-2">
              <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={!password || isSubmitting}
            className="w-full bg-[#EE0B4F] hover:bg-[#c4093f] disabled:bg-[#f5839f] disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition-colors"
          >
            {isSubmitting ? 'Authenticating...' : 'Enter'}
          </button>
        </form>
      </div>
    </div>
  );
}
