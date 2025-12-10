'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Plus, Key, Trash2, X, Settings } from 'lucide-react';
import { getCurrentUser, hashPassword } from '../../utils/auth';
import { supabase } from '../../utils/supabase';
import { Quote, getRandomQuote } from '../../data/loadingQuotes';
import { getUserPreferences, getRandomUserQuote, UserPreferences } from '../../utils/userPreferences';

interface UserRecord {
  id: string;
  email: string;
  name: string;
  role: 'ae' | 'admin';
  last_login: string | null;
  created_at: string;
}

export default function AdminUsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [resetPasswordUser, setResetPasswordUser] = useState<UserRecord | null>(null);
  const [deleteUser, setDeleteUser] = useState<UserRecord | null>(null);

  // Form states
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<'ae' | 'admin'>('ae');
  const [resetPassword, setResetPassword] = useState('');
  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);
  const [loadingQuote, setLoadingQuote] = useState<Quote | null>(null);

  // Check admin access and load users
  useEffect(() => {
    const user = getCurrentUser();
    if (!user) {
      router.push('/');
      return;
    }
    if (user.role !== 'admin') {
      router.push('/');
      return;
    }

    // Load users and preferences after admin check passes
    const userId = user.id;
    async function loadData() {
      setLoading(true);

      // Load user preferences for quotes
      const prefs = await getUserPreferences(userId);
      const quote = getRandomUserQuote(prefs) || getRandomQuote();
      setLoadingQuote(quote);

      // Load users
      const { data, error } = await supabase
        .from('users')
        .select('id, email, name, role, last_login, created_at')
        .order('name');

      if (error) {
        console.error('Error loading users:', error);
      } else {
        setUsers(data || []);
      }
      setLoading(false);
    }

    loadData();
  }, [router]);

  const refreshUsers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('users')
      .select('id, email, name, role, last_login, created_at')
      .order('name');

    if (error) {
      console.error('Error loading users:', error);
    } else {
      setUsers(data || []);
    }
    setLoading(false);
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormLoading(true);

    try {
      const passwordHash = await hashPassword(newPassword);
      const { error } = await supabase.from('users').insert({
        email: newEmail.toLowerCase().trim(),
        name: newName.trim(),
        password_hash: passwordHash,
        role: newRole,
      });

      if (error) {
        if (error.code === '23505') {
          setFormError('A user with this email already exists');
        } else {
          setFormError(error.message);
        }
      } else {
        setShowAddForm(false);
        setNewName('');
        setNewEmail('');
        setNewPassword('');
        setNewRole('ae');
        refreshUsers();
      }
    } catch (err) {
      setFormError('Failed to create user');
    }
    setFormLoading(false);
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetPasswordUser) return;
    setFormError('');
    setFormLoading(true);

    try {
      const passwordHash = await hashPassword(resetPassword);
      const { error } = await supabase
        .from('users')
        .update({ password_hash: passwordHash })
        .eq('id', resetPasswordUser.id);

      if (error) {
        setFormError(error.message);
      } else {
        setResetPasswordUser(null);
        setResetPassword('');
      }
    } catch (err) {
      setFormError('Failed to reset password');
    }
    setFormLoading(false);
  };

  const handleDeleteUser = async () => {
    if (!deleteUser) return;
    setFormLoading(true);

    const { error } = await supabase.from('users').delete().eq('id', deleteUser.id);

    if (error) {
      console.error('Error deleting user:', error);
    } else {
      setDeleteUser(null);
      refreshUsers();
    }
    setFormLoading(false);
  };

  const formatDate = (date: string | null) => {
    if (!date) return 'Never';
    return new Date(date).toLocaleDateString('en-AU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-[#1A1A2E] to-[#2D2D3A]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/ASET-White.png"
          alt="ASET"
          style={{ height: '60px', width: 'auto', marginBottom: '24px' }}
        />
        <div className="mb-8">
          <div className="relative">
            {/* Outer ring */}
            <div className="h-12 w-12 rounded-full border-4 border-white/20" />
            {/* Spinning arc */}
            <div className="absolute inset-0 h-12 w-12 animate-spin rounded-full border-4 border-transparent border-t-[#EE0B4F]" />
          </div>
        </div>
        <p className="text-white/60 text-xs mb-6">Loading users...</p>
        {/* Quote - only show if we have one */}
        {loadingQuote && (
          <div className="max-w-lg px-6 text-center">
            <p className="text-lg italic text-white/80 leading-relaxed">
              {loadingQuote.attribution ? (
                <>
                  &ldquo;{loadingQuote.content}&rdquo;
                  <span className="mt-3 block text-sm text-white/60 not-italic">
                    — {loadingQuote.attribution}
                  </span>
                </>
              ) : (
                <>&ldquo;{loadingQuote.content}&rdquo;</>
              )}
            </p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-[#1A1A2E] py-6">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/"
                className="flex items-center gap-2 text-white/70 hover:text-white transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
                <span>Back to Dashboard</span>
              </Link>
            </div>
            <img src="/ASET-White.png" alt="ASET" className="h-10 w-auto" />
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-7xl px-6 py-8 lg:px-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-2 bg-[#EE0B4F] hover:bg-[#c4093f] text-white font-semibold py-2 px-4 rounded-lg transition-colors"
          >
            <Plus className="h-5 w-5" />
            Add User
          </button>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left py-4 px-6 text-sm font-semibold text-gray-600">Name</th>
                <th className="text-left py-4 px-6 text-sm font-semibold text-gray-600">Email</th>
                <th className="text-left py-4 px-6 text-sm font-semibold text-gray-600">Role</th>
                <th className="text-left py-4 px-6 text-sm font-semibold text-gray-600">Last Login</th>
                <th className="text-right py-4 px-6 text-sm font-semibold text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="py-4 px-6">
                    <span className="font-medium text-gray-900">{user.name}</span>
                  </td>
                  <td className="py-4 px-6 text-gray-600">{user.email}</td>
                  <td className="py-4 px-6">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        user.role === 'admin'
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {user.role.toUpperCase()}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-gray-500 text-sm">{formatDate(user.last_login)}</td>
                  <td className="py-4 px-6">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/admin/users/${user.id}`}
                        className="p-2 text-gray-500 hover:text-[#EE0B4F] hover:bg-gray-100 rounded-lg transition-colors"
                        title="Edit Personalisation"
                      >
                        <Settings className="h-4 w-4" />
                      </Link>
                      <button
                        onClick={() => setResetPasswordUser(user)}
                        className="p-2 text-gray-500 hover:text-[#EE0B4F] hover:bg-gray-100 rounded-lg transition-colors"
                        title="Reset Password"
                      >
                        <Key className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setDeleteUser(user)}
                        className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete User"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>

      {/* Add User Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Add New User</h2>
              <button
                onClick={() => {
                  setShowAddForm(false);
                  setFormError('');
                }}
                className="p-2 text-gray-500 hover:text-gray-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#EE0B4F] focus:border-[#EE0B4F]"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#EE0B4F] focus:border-[#EE0B4F]"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Temporary Password
                </label>
                <input
                  type="text"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#EE0B4F] focus:border-[#EE0B4F]"
                  required
                  minLength={6}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as 'ae' | 'admin')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#EE0B4F] focus:border-[#EE0B4F]"
                >
                  <option value="ae">AE (Account Executive)</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              {formError && (
                <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{formError}</p>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddForm(false);
                    setFormError('');
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="flex-1 px-4 py-2 bg-[#EE0B4F] hover:bg-[#c4093f] text-white rounded-lg disabled:opacity-50"
                >
                  {formLoading ? 'Adding...' : 'Add User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {resetPasswordUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Reset Password</h2>
              <button
                onClick={() => {
                  setResetPasswordUser(null);
                  setFormError('');
                  setResetPassword('');
                }}
                className="p-2 text-gray-500 hover:text-gray-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-gray-600 mb-4">
              Set a new password for <strong>{resetPasswordUser.name}</strong>
            </p>

            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  New Password
                </label>
                <input
                  type="text"
                  value={resetPassword}
                  onChange={(e) => setResetPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#EE0B4F] focus:border-[#EE0B4F]"
                  required
                  minLength={6}
                />
              </div>

              {formError && (
                <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{formError}</p>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setResetPasswordUser(null);
                    setFormError('');
                    setResetPassword('');
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="flex-1 px-4 py-2 bg-[#EE0B4F] hover:bg-[#c4093f] text-white rounded-lg disabled:opacity-50"
                >
                  {formLoading ? 'Resetting...' : 'Reset Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Delete User</h2>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete <strong>{deleteUser.name}</strong>? This action cannot
              be undone.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setDeleteUser(null)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteUser}
                disabled={formLoading}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg disabled:opacity-50"
              >
                {formLoading ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
