import { supabase } from './supabase';
import bcrypt from 'bcryptjs';
import { AuthUser, UserRole } from '@/types/auth';

// Generate random token
export function generateToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 64; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

// Hash password
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

// Verify password
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// Create session
export async function createSession(
  userId: string,
  ipAddress?: string,
  userAgent?: string
): Promise<string | null> {
  const token = generateToken();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

  const { error } = await supabase.from('sessions').insert({
    user_id: userId,
    token,
    ip_address: ipAddress || null,
    user_agent: userAgent || null,
    expires_at: expiresAt.toISOString(),
  });

  if (error) {
    console.error('Create session error:', error);
    return null;
  }

  return token;
}

// Get session and user
export async function getSessionUser(token: string): Promise<AuthUser | null> {
  if (!token) return null;

  const { data: session, error: sessionError } = await supabase
    .from('sessions')
    .select('*, user:users(*)')
    .eq('token', token)
    .gt('expires_at', new Date().toISOString())
    .single();

  if (sessionError || !session || !session.user) {
    return null;
  }

  const user = session.user;
  if (!user.is_active) {
    return null;
  }

  return {
    id: user.id,
    username: user.username,
    display_name: user.display_name,
    role: user.role as UserRole,
    pic_name: user.pic_name,
    project_ids: user.project_ids || [],
  };
}

// Delete session (logout)
export async function deleteSession(token: string): Promise<boolean> {
  const { error } = await supabase.from('sessions').delete().eq('token', token);
  return !error;
}

// Clean expired sessions
export async function cleanExpiredSessions(): Promise<void> {
  await supabase.from('sessions').delete().lt('expires_at', new Date().toISOString());
}

// Log activity
export async function logActivity(
  userId: string | null,
  username: string,
  action: string,
  details?: Record<string, unknown>,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  try {
    await supabase.from('activity_logs').insert({
      user_id: userId,
      username,
      action,
      details: details || {},
      ip_address: ipAddress || null,
      user_agent: userAgent || null,
    });
  } catch (error) {
    console.error('Log activity error:', error);
  }
}

// Update last login
export async function updateLastLogin(userId: string): Promise<void> {
  await supabase
    .from('users')
    .update({ last_login: new Date().toISOString() })
    .eq('id', userId);
}
