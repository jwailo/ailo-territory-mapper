'use client';

import { useState, FormEvent, useEffect, useRef } from 'react';
import { checkAdminPassword, setAdminAuthenticated } from '../utils/auth';

interface AdminPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthenticated: () => void;
}

export default function AdminPasswordModal({
  isOpen,
  onClose,
  onAuthenticated,
}: AdminPasswordModalProps) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setPassword('');
      setError('');
      setIsSubmitting(false);
      // Focus input after modal opens
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    if (checkAdminPassword(password)) {
      setAdminAuthenticated();
      onAuthenticated();
      onClose();
    } else {
      setError('Incorrect password');
      setPassword('');
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-start justify-center pt-20 z-50">
      <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm mx-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900">Admin Access Required</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <p className="text-sm text-gray-600 mb-4">
          Enter the admin password to access Admin Mode.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="admin-password" className="sr-only">
              Admin Password
            </label>
            <input
              ref={inputRef}
              id="admin-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter admin password"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#EE0B4F] focus:border-[#EE0B4F] text-gray-900 placeholder-gray-400 text-sm"
              disabled={isSubmitting}
            />
          </div>

          {error && (
            <div className="bg-[#FEE2E8] border border-[#EF4444] border-l-4 text-[#EF4444] px-3 py-2 rounded-lg text-sm flex items-center gap-2">
              <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2.5 px-4 rounded-lg transition-colors text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!password || isSubmitting}
              className="flex-1 bg-[#EE0B4F] hover:bg-[#c4093f] disabled:bg-[#f5839f] disabled:cursor-not-allowed text-white font-medium py-2.5 px-4 rounded-lg transition-colors text-sm"
            >
              {isSubmitting ? 'Verifying...' : 'Enter Admin'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
