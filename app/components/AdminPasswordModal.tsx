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
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-gray-900 placeholder-gray-400 text-sm"
              disabled={isSubmitting}
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">
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
              className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 disabled:cursor-not-allowed text-white font-medium py-2.5 px-4 rounded-lg transition-colors text-sm"
            >
              {isSubmitting ? 'Verifying...' : 'Enter Admin'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
