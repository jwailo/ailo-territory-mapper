'use client';

import { useState, FormEvent } from 'react';
import { loginUser, User } from '../utils/auth';

interface SiteLoginScreenProps {
  onAuthenticated: (user: User) => void;
}

export default function SiteLoginScreen({ onAuthenticated }: SiteLoginScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    const result = await loginUser(email, password);

    if (result.success && result.user) {
      onAuthenticated(result.user);
    } else {
      setError(result.error || 'Login failed');
      setPassword('');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-[#1A1A2E] to-[#2D2D3A] flex items-center justify-center z-50">
      <div className="w-full max-w-md mx-4">
        <div className="text-center mb-8">
          {/* ASET Logo - White version on dark background */}
          <img
            src="/ASET-White.png"
            alt="ASET"
            className="mx-auto mb-4"
            style={{ width: '180px', height: 'auto' }}
          />
          <p className="text-gray-400 text-lg">Ailo Sales Enablement Toolkit</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="sr-only">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email address"
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg focus:ring-2 focus:ring-[#EE0B4F] focus:border-[#EE0B4F] text-white placeholder-gray-400"
              autoFocus
              autoComplete="email"
              disabled={isSubmitting}
            />
          </div>

          <div>
            <label htmlFor="password" className="sr-only">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg focus:ring-2 focus:ring-[#EE0B4F] focus:border-[#EE0B4F] text-white placeholder-gray-400"
              autoComplete="current-password"
              disabled={isSubmitting}
            />
          </div>

          {error && (
            <div className="bg-[#EE0B4F]/20 border border-[#EE0B4F] border-l-4 text-[#EE0B4F] px-4 py-3 rounded-lg text-sm flex items-center gap-2">
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
            disabled={!email || !password || isSubmitting}
            className="w-full bg-[#EE0B4F] hover:bg-[#c4093f] disabled:bg-[#f5839f] disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition-colors"
          >
            {isSubmitting ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}
