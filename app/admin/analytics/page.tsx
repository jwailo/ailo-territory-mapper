'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Minus,
  Calendar,
  Activity,
  Users,
  BarChart3,
  Clock,
  X,
} from 'lucide-react';
import { getCurrentUser } from '../../utils/auth';
import {
  getToolStats,
  getUserStats,
  getRecentActivity,
  getUserEvents,
  ToolStats,
  UserStats,
  EventRecord,
} from '../../utils/analytics';
import { ToolName } from '../../utils/supabase';
import { Quote } from '../../data/loadingQuotes';
import { getUserPreferences, getRandomUserQuote } from '../../utils/userPreferences';

// Tool display names and colors
const TOOL_DISPLAY: Record<
  ToolName,
  { name: string; color: string; bgColor: string }
> = {
  territory_map: {
    name: 'Territory Map',
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
  },
  cost_calculator: {
    name: 'Cost Calculator',
    color: 'text-green-600',
    bgColor: 'bg-green-100',
  },
  case_study_library: {
    name: 'Case Study Library',
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
  },
  admin: { name: 'Admin', color: 'text-orange-600', bgColor: 'bg-orange-100' },
  aset_hub: { name: 'ASET Hub', color: 'text-pink-600', bgColor: 'bg-pink-100' },
  internal_calendars: {
    name: 'Internal Calendars',
    color: 'text-cyan-600',
    bgColor: 'bg-cyan-100',
  },
  sales_procedures: {
    name: 'Sales Procedures',
    color: 'text-amber-600',
    bgColor: 'bg-amber-100',
  },
  sales_resources: {
    name: 'Sales Resources',
    color: 'text-lime-600',
    bgColor: 'bg-lime-100',
  },
  landing_pages: {
    name: 'Landing Pages',
    color: 'text-violet-600',
    bgColor: 'bg-violet-100',
  },
  hubspot_kb: {
    name: 'HubSpot KB',
    color: 'text-rose-600',
    bgColor: 'bg-rose-100',
  },
};

// Action display names
const ACTION_DISPLAY: Record<string, string> = {
  page_view: 'viewed',
  tool_open: 'opened',
  button_click: 'clicked',
  login: 'logged in to',
  logout: 'logged out of',
  user_created: 'created user in',
  user_deleted: 'deleted user in',
  password_reset: 'reset password in',
};

// Date range options
type DateRange = 'today' | '7days' | '30days' | 'custom';

function getDateRange(range: DateRange, customStart?: Date, customEnd?: Date) {
  const now = new Date();
  const endDate = new Date(now);
  endDate.setHours(23, 59, 59, 999);

  let startDate: Date;

  switch (range) {
    case 'today':
      startDate = new Date(now);
      startDate.setHours(0, 0, 0, 0);
      break;
    case '7days':
      startDate = new Date(now);
      startDate.setDate(startDate.getDate() - 7);
      startDate.setHours(0, 0, 0, 0);
      break;
    case '30days':
      startDate = new Date(now);
      startDate.setDate(startDate.getDate() - 30);
      startDate.setHours(0, 0, 0, 0);
      break;
    case 'custom':
      startDate = customStart || new Date(now);
      if (customEnd) {
        endDate.setTime(customEnd.getTime());
        endDate.setHours(23, 59, 59, 999);
      }
      break;
  }

  return { startDate, endDate };
}

// Get previous period for comparison
function getPreviousPeriod(startDate: Date, endDate: Date) {
  const duration = endDate.getTime() - startDate.getTime();
  const prevEnd = new Date(startDate.getTime() - 1);
  const prevStart = new Date(prevEnd.getTime() - duration);
  return { startDate: prevStart, endDate: prevEnd };
}

export default function AdminAnalyticsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange>('7days');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [showCustomDatePicker, setShowCustomDatePicker] = useState(false);

  // Data states
  const [toolStats, setToolStats] = useState<ToolStats[]>([]);
  const [userStats, setUserStats] = useState<UserStats[]>([]);
  const [recentActivity, setRecentActivity] = useState<EventRecord[]>([]);

  // User detail modal
  const [selectedUser, setSelectedUser] = useState<UserStats | null>(null);
  const [userEvents, setUserEvents] = useState<EventRecord[]>([]);
  const [loadingUserEvents, setLoadingUserEvents] = useState(false);

  // Sorting
  const [userSortField, setUserSortField] = useState<
    'total_actions' | 'last_active' | 'user_name'
  >('total_actions');
  const [userSortDir, setUserSortDir] = useState<'asc' | 'desc'>('desc');

  const [loadingQuote, setLoadingQuote] = useState<Quote | null>(null);

  // Check admin access and load user preferences for quotes
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

    // Load user preferences for quotes - NO FALLBACK
    async function loadQuote() {
      if (!user) return;
      const prefs = await getUserPreferences(user.id);
      const quote = getRandomUserQuote(prefs);
      setLoadingQuote(quote);
    }
    loadQuote();
  }, [router]);

  // Load data when date range changes
  useEffect(() => {
    async function loadData() {
      setLoading(true);

      const customStart = customStartDate ? new Date(customStartDate) : undefined;
      const customEnd = customEndDate ? new Date(customEndDate) : undefined;
      const { startDate, endDate } = getDateRange(dateRange, customStart, customEnd);
      const prevPeriod = getPreviousPeriod(startDate, endDate);

      // Load all data in parallel
      const [currentToolStats, prevToolStats, currentUserStats, activity] =
        await Promise.all([
          getToolStats(startDate, endDate),
          getToolStats(prevPeriod.startDate, prevPeriod.endDate),
          getUserStats(startDate, endDate),
          getRecentActivity(100),
        ]);

      // Add previous counts to tool stats for trend calculation
      const toolStatsWithTrend = currentToolStats.map((stat) => {
        const prevStat = prevToolStats.find((p) => p.tool_name === stat.tool_name);
        return {
          ...stat,
          previousCount: prevStat?.count || 0,
        };
      });

      setToolStats(toolStatsWithTrend);
      setUserStats(currentUserStats);
      setRecentActivity(activity);
      setLoading(false);
    }

    loadData();
  }, [dateRange, customStartDate, customEndDate]);

  // Load user events when user is selected
  useEffect(() => {
    async function loadUserEvents() {
      if (!selectedUser?.user_email) return;

      setLoadingUserEvents(true);
      const customStart = customStartDate ? new Date(customStartDate) : undefined;
      const customEnd = customEndDate ? new Date(customEndDate) : undefined;
      const { startDate, endDate } = getDateRange(dateRange, customStart, customEnd);

      const events = await getUserEvents(selectedUser.user_email, startDate, endDate, 200);
      setUserEvents(events);
      setLoadingUserEvents(false);
    }

    loadUserEvents();
  }, [selectedUser, dateRange, customStartDate, customEndDate]);

  const handleDateRangeChange = (range: DateRange) => {
    if (range === 'custom') {
      setShowCustomDatePicker(true);
    } else {
      setDateRange(range);
      setShowCustomDatePicker(false);
    }
  };

  const handleCustomDateSubmit = () => {
    if (customStartDate && customEndDate) {
      setDateRange('custom');
      setShowCustomDatePicker(false);
    }
  };

  // Sort users
  const sortedUsers = [...userStats].sort((a, b) => {
    let aVal: string | number | null;
    let bVal: string | number | null;

    switch (userSortField) {
      case 'total_actions':
        aVal = a.total_actions;
        bVal = b.total_actions;
        break;
      case 'last_active':
        aVal = a.last_active;
        bVal = b.last_active;
        break;
      case 'user_name':
        aVal = a.user_name || '';
        bVal = b.user_name || '';
        break;
    }

    if (aVal === null) aVal = userSortDir === 'asc' ? Infinity : -Infinity;
    if (bVal === null) bVal = userSortDir === 'asc' ? Infinity : -Infinity;

    if (typeof aVal === 'string' && typeof bVal === 'string') {
      return userSortDir === 'asc'
        ? aVal.localeCompare(bVal)
        : bVal.localeCompare(aVal);
    }

    return userSortDir === 'asc'
      ? (aVal as number) - (bVal as number)
      : (bVal as number) - (aVal as number);
  });

  const handleSort = (field: typeof userSortField) => {
    if (userSortField === field) {
      setUserSortDir(userSortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setUserSortField(field);
      setUserSortDir('desc');
    }
  };

  const formatRelativeTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString('en-AU', {
      day: 'numeric',
      month: 'short',
    });
  };

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-AU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getTrendIcon = (current: number, previous: number) => {
    if (previous === 0 && current > 0) {
      return <TrendingUp className="h-4 w-4 text-green-500" />;
    }
    if (current > previous) {
      return <TrendingUp className="h-4 w-4 text-green-500" />;
    }
    if (current < previous) {
      return <TrendingDown className="h-4 w-4 text-red-500" />;
    }
    return <Minus className="h-4 w-4 text-gray-400" />;
  };

  const getTrendPercent = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 'New' : '0%';
    const change = ((current - previous) / previous) * 100;
    return change >= 0 ? `+${change.toFixed(0)}%` : `${change.toFixed(0)}%`;
  };

  // Get user initials for avatar
  const getUserInitials = (name: string | null) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
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
            <div className="h-12 w-12 rounded-full border-4 border-white/20" />
            <div className="absolute inset-0 h-12 w-12 animate-spin rounded-full border-4 border-transparent border-t-[#EE0B4F]" />
          </div>
        </div>
        <p className="text-white/60 text-xs mb-6">Loading analytics...</p>
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
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/ASET-White.png" alt="ASET" className="h-10 w-auto" />
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-7xl px-6 py-8 lg:px-8">
        {/* Title and Date Filter */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Analytics</h1>
            <p className="text-gray-500 mt-1">Track tool usage and user activity</p>
          </div>

          {/* Date Range Buttons */}
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-gray-400" />
            <div className="flex rounded-lg overflow-hidden border border-gray-200">
              {(['today', '7days', '30days', 'custom'] as DateRange[]).map(
                (range) => (
                  <button
                    key={range}
                    onClick={() => handleDateRangeChange(range)}
                    className={`px-3 py-2 text-sm font-medium transition-colors ${
                      dateRange === range
                        ? 'bg-[#EE0B4F] text-white'
                        : 'bg-white text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {range === 'today'
                      ? 'Today'
                      : range === '7days'
                      ? '7 Days'
                      : range === '30days'
                      ? '30 Days'
                      : 'Custom'}
                  </button>
                )
              )}
            </div>
          </div>
        </div>

        {/* Custom Date Picker */}
        {showCustomDatePicker && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
            <div className="flex flex-wrap items-end gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#EE0B4F] focus:border-[#EE0B4F]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#EE0B4F] focus:border-[#EE0B4F]"
                />
              </div>
              <button
                onClick={handleCustomDateSubmit}
                disabled={!customStartDate || !customEndDate}
                className="px-4 py-2 bg-[#EE0B4F] hover:bg-[#c4093f] text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Apply
              </button>
              <button
                onClick={() => setShowCustomDatePicker(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Section A: Tool Leaderboard */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="h-5 w-5 text-[#EE0B4F]" />
              <h2 className="text-lg font-semibold text-gray-900">
                Tool Leaderboard
              </h2>
            </div>

            {toolStats.length === 0 ? (
              <p className="text-gray-500 text-sm py-4">No data for this period</p>
            ) : (
              <div className="space-y-3">
                {toolStats.map((stat, index) => {
                  const tool = TOOL_DISPLAY[stat.tool_name];
                  const prevCount = stat.previousCount || 0;
                  return (
                    <div
                      key={stat.tool_name}
                      className="flex items-center gap-3 p-3 rounded-lg bg-gray-50"
                    >
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-200 text-gray-600 font-bold text-sm">
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`font-medium ${tool.color}`}>{tool.name}</p>
                        <p className="text-sm text-gray-500">
                          {stat.count} {stat.count === 1 ? 'action' : 'actions'}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        {getTrendIcon(stat.count, prevCount)}
                        <span
                          className={`text-xs ${
                            stat.count > prevCount
                              ? 'text-green-600'
                              : stat.count < prevCount
                              ? 'text-red-600'
                              : 'text-gray-500'
                          }`}
                        >
                          {getTrendPercent(stat.count, prevCount)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Section B: User Activity */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Users className="h-5 w-5 text-[#EE0B4F]" />
              <h2 className="text-lg font-semibold text-gray-900">User Activity</h2>
            </div>

            {userStats.length === 0 ? (
              <p className="text-gray-500 text-sm py-4">No data for this period</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left py-2 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        User
                      </th>
                      <th
                        className="text-left py-2 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700"
                        onClick={() => handleSort('total_actions')}
                      >
                        Actions{' '}
                        {userSortField === 'total_actions' &&
                          (userSortDir === 'desc' ? '↓' : '↑')}
                      </th>
                      <th
                        className="text-left py-2 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700"
                        onClick={() => handleSort('last_active')}
                      >
                        Last Active{' '}
                        {userSortField === 'last_active' &&
                          (userSortDir === 'desc' ? '↓' : '↑')}
                      </th>
                      <th className="text-left py-2 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Top Tool
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {sortedUsers.slice(0, 10).map((user) => {
                      const topTool = user.most_used_tool
                        ? TOOL_DISPLAY[user.most_used_tool]
                        : null;
                      return (
                        <tr
                          key={user.user_email || 'anonymous'}
                          className="hover:bg-gray-50 cursor-pointer"
                          onClick={() => setSelectedUser(user)}
                        >
                          <td className="py-3 px-2">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-[#EE0B4F] text-white flex items-center justify-center text-xs font-medium">
                                {getUserInitials(user.user_name)}
                              </div>
                              <div className="min-w-0">
                                <p className="font-medium text-gray-900 truncate">
                                  {user.user_name || 'Anonymous'}
                                </p>
                                <p className="text-xs text-gray-500 truncate">
                                  {user.user_email || 'No email'}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-2">
                            <span className="font-semibold text-gray-900">
                              {user.total_actions}
                            </span>
                          </td>
                          <td className="py-3 px-2 text-sm text-gray-600">
                            {formatRelativeTime(user.last_active)}
                          </td>
                          <td className="py-3 px-2">
                            {topTool && (
                              <span
                                className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${topTool.bgColor} ${topTool.color}`}
                              >
                                {topTool.name}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Section C: Recent Activity Feed */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="h-5 w-5 text-[#EE0B4F]" />
            <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
          </div>

          {recentActivity.length === 0 ? (
            <p className="text-gray-500 text-sm py-4">No recent activity</p>
          ) : (
            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {recentActivity.map((event) => {
                const tool = TOOL_DISPLAY[event.tool_name];
                const action = ACTION_DISPLAY[event.action] || event.action;
                return (
                  <div
                    key={event.id}
                    className="flex items-center gap-3 p-3 rounded-lg bg-gray-50"
                  >
                    <div className="w-8 h-8 rounded-full bg-[#EE0B4F] text-white flex items-center justify-center text-xs font-medium flex-shrink-0">
                      {getUserInitials(event.user_name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900">
                        <span className="font-medium">
                          {event.user_name || 'Anonymous'}
                        </span>{' '}
                        {action}{' '}
                        <span className={`font-medium ${tool.color}`}>
                          {event.metadata && 'link' in event.metadata
                            ? String(event.metadata.link)
                            : tool.name}
                        </span>
                        {event.metadata && 'button' in event.metadata && (
                          <span className="text-gray-500">
                            {' '}
                            ({String(event.metadata.button)})
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-gray-500 flex-shrink-0">
                      <Clock className="h-3 w-3" />
                      {formatRelativeTime(event.created_at)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* User Detail Modal */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-[#EE0B4F] text-white flex items-center justify-center text-lg font-medium">
                  {getUserInitials(selectedUser.user_name)}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    {selectedUser.user_name || 'Anonymous'}
                  </h2>
                  <p className="text-sm text-gray-500">
                    {selectedUser.user_email || 'No email'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedUser(null)}
                className="p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6">
              <div className="flex gap-6 mb-6">
                <div className="bg-gray-50 rounded-lg p-4 flex-1">
                  <p className="text-sm text-gray-500">Total Actions</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {selectedUser.total_actions}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 flex-1">
                  <p className="text-sm text-gray-500">Most Used Tool</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {selectedUser.most_used_tool
                      ? TOOL_DISPLAY[selectedUser.most_used_tool].name
                      : 'N/A'}
                  </p>
                </div>
              </div>

              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
                Activity Log
              </h3>

              {loadingUserEvents ? (
                <div className="flex items-center justify-center py-8">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-[#EE0B4F]" />
                </div>
              ) : userEvents.length === 0 ? (
                <p className="text-gray-500 text-sm py-4">
                  No activity for this period
                </p>
              ) : (
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {userEvents.map((event) => {
                    const tool = TOOL_DISPLAY[event.tool_name];
                    const action = ACTION_DISPLAY[event.action] || event.action;
                    return (
                      <div
                        key={event.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-gray-50"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${tool.bgColor} ${tool.color}`}
                          >
                            {tool.name}
                          </span>
                          <span className="text-sm text-gray-600">
                            {action}
                            {event.metadata && 'button' in event.metadata && (
                              <span className="text-gray-400">
                                {' '}
                                ({String(event.metadata.button)})
                              </span>
                            )}
                          </span>
                        </div>
                        <span className="text-xs text-gray-500">
                          {formatDateTime(event.created_at)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
