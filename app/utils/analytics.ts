import { supabase, ToolName, EventAction, DbEvent } from './supabase';
import { getCurrentUser } from './auth';

/**
 * Track an analytics event
 * Automatically includes current user info from session
 */
export async function trackEvent(
  toolName: ToolName,
  action: EventAction,
  metadata?: Record<string, unknown>
): Promise<void> {
  try {
    const user = getCurrentUser();

    const event = {
      user_id: user?.id || null,
      user_email: user?.email || null,
      user_name: user?.name || null,
      tool_name: toolName,
      action,
      metadata: metadata || null,
    };

    const { error } = await supabase.from('events').insert(event);

    if (error) {
      console.error('Failed to track event:', error);
    }
  } catch (err) {
    // Silently fail - analytics shouldn't break the app
    console.error('Analytics error:', err);
  }
}

/**
 * Track a page view event
 */
export function trackPageView(toolName: ToolName, pageName?: string): void {
  trackEvent(toolName, 'page_view', pageName ? { page: pageName } : undefined);
}

/**
 * Track a tool being opened
 */
export function trackToolOpen(toolName: ToolName): void {
  trackEvent(toolName, 'tool_open');
}

/**
 * Track a button click
 */
export function trackButtonClick(toolName: ToolName, buttonName: string): void {
  trackEvent(toolName, 'button_click', { button: buttonName });
}

/**
 * Track login event
 */
export function trackLogin(userEmail: string, userName: string): void {
  // For login, we pass user info directly since session may not be set yet
  supabase.from('events').insert({
    user_id: null,
    user_email: userEmail,
    user_name: userName,
    tool_name: 'aset_hub',
    action: 'login',
    metadata: null,
  }).then(({ error }) => {
    if (error) console.error('Failed to track login:', error);
  });
}

/**
 * Track logout event
 */
export function trackLogout(): void {
  trackEvent('aset_hub', 'logout');
}

// ============ Analytics Data Fetching Functions ============

export interface EventRecord {
  id: string;
  user_id: string | null;
  user_email: string | null;
  user_name: string | null;
  tool_name: ToolName;
  action: EventAction;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface ToolStats {
  tool_name: ToolName;
  count: number;
  previousCount?: number;
}

export interface UserStats {
  user_id: string | null;
  user_email: string | null;
  user_name: string | null;
  total_actions: number;
  last_active: string;
  most_used_tool: ToolName | null;
}

/**
 * Get events within a date range
 */
export async function getEvents(
  startDate: Date,
  endDate: Date,
  limit?: number
): Promise<EventRecord[]> {
  let query = supabase
    .from('events')
    .select('*')
    .gte('created_at', startDate.toISOString())
    .lte('created_at', endDate.toISOString())
    .order('created_at', { ascending: false });

  if (limit) {
    query = query.limit(limit);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching events:', error);
    return [];
  }

  return (data || []) as EventRecord[];
}

/**
 * Get tool usage statistics
 */
export async function getToolStats(
  startDate: Date,
  endDate: Date
): Promise<ToolStats[]> {
  const { data, error } = await supabase
    .from('events')
    .select('tool_name')
    .gte('created_at', startDate.toISOString())
    .lte('created_at', endDate.toISOString());

  if (error) {
    console.error('Error fetching tool stats:', error);
    return [];
  }

  // Count by tool
  const counts: Record<string, number> = {};
  for (const event of data || []) {
    counts[event.tool_name] = (counts[event.tool_name] || 0) + 1;
  }

  // Convert to array and sort by count
  return Object.entries(counts)
    .map(([tool_name, count]) => ({ tool_name: tool_name as ToolName, count }))
    .sort((a, b) => b.count - a.count);
}

/**
 * Get user activity statistics
 */
export async function getUserStats(
  startDate: Date,
  endDate: Date
): Promise<UserStats[]> {
  const { data, error } = await supabase
    .from('events')
    .select('user_id, user_email, user_name, tool_name, created_at')
    .gte('created_at', startDate.toISOString())
    .lte('created_at', endDate.toISOString());

  if (error) {
    console.error('Error fetching user stats:', error);
    return [];
  }

  // Group by user
  const userMap: Record<string, {
    user_id: string | null;
    user_email: string | null;
    user_name: string | null;
    actions: number;
    last_active: string;
    toolCounts: Record<string, number>;
  }> = {};

  for (const event of data || []) {
    const key = event.user_email || 'anonymous';
    if (!userMap[key]) {
      userMap[key] = {
        user_id: event.user_id,
        user_email: event.user_email,
        user_name: event.user_name,
        actions: 0,
        last_active: event.created_at,
        toolCounts: {},
      };
    }

    userMap[key].actions++;
    if (event.created_at > userMap[key].last_active) {
      userMap[key].last_active = event.created_at;
    }
    userMap[key].toolCounts[event.tool_name] = (userMap[key].toolCounts[event.tool_name] || 0) + 1;
  }

  // Convert to array
  return Object.values(userMap).map((u) => {
    // Find most used tool
    let mostUsedTool: ToolName | null = null;
    let maxCount = 0;
    for (const [tool, count] of Object.entries(u.toolCounts)) {
      if (count > maxCount) {
        maxCount = count;
        mostUsedTool = tool as ToolName;
      }
    }

    return {
      user_id: u.user_id,
      user_email: u.user_email,
      user_name: u.user_name,
      total_actions: u.actions,
      last_active: u.last_active,
      most_used_tool: mostUsedTool,
    };
  }).sort((a, b) => b.total_actions - a.total_actions);
}

/**
 * Get events for a specific user
 */
export async function getUserEvents(
  userEmail: string,
  startDate: Date,
  endDate: Date,
  limit?: number
): Promise<EventRecord[]> {
  let query = supabase
    .from('events')
    .select('*')
    .eq('user_email', userEmail)
    .gte('created_at', startDate.toISOString())
    .lte('created_at', endDate.toISOString())
    .order('created_at', { ascending: false });

  if (limit) {
    query = query.limit(limit);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching user events:', error);
    return [];
  }

  return (data || []) as EventRecord[];
}

/**
 * Get recent activity feed
 */
export async function getRecentActivity(limit: number = 50): Promise<EventRecord[]> {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching recent activity:', error);
    return [];
  }

  return (data || []) as EventRecord[];
}
