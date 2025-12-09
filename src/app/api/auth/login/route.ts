import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import {
  verifyPassword,
  createSession,
  logActivity,
  updateLastLogin,
} from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username và password là bắt buộc' },
        { status: 400 }
      );
    }

    // Get IP and User Agent
    const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0] ||
                      request.headers.get('x-real-ip') ||
                      'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Find user
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('username', username.toLowerCase().trim())
      .single();

    if (userError || !user) {
      // Log failed attempt
      await logActivity(null, username, 'login_failed', { reason: 'user_not_found' }, ipAddress, userAgent);
      return NextResponse.json(
        { error: 'Tài khoản không tồn tại' },
        { status: 401 }
      );
    }

    // Check if active
    if (!user.is_active) {
      await logActivity(user.id, username, 'login_failed', { reason: 'account_disabled' }, ipAddress, userAgent);
      return NextResponse.json(
        { error: 'Tài khoản đã bị vô hiệu hóa' },
        { status: 401 }
      );
    }

    // Verify password
    const isValid = await verifyPassword(password, user.password_hash);
    if (!isValid) {
      await logActivity(user.id, username, 'login_failed', { reason: 'wrong_password' }, ipAddress, userAgent);
      return NextResponse.json(
        { error: 'Mật khẩu không đúng' },
        { status: 401 }
      );
    }

    // Create session
    const token = await createSession(user.id, ipAddress, userAgent);
    if (!token) {
      return NextResponse.json(
        { error: 'Không thể tạo phiên đăng nhập' },
        { status: 500 }
      );
    }

    // Update last login
    await updateLastLogin(user.id);

    // Log successful login
    await logActivity(user.id, username, 'login', { role: user.role }, ipAddress, userAgent);

    // Create response with cookie
    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        display_name: user.display_name,
        role: user.role,
        pic_name: user.pic_name,
        project_ids: user.project_ids || [],
      },
    });

    // Set cookie
    response.cookies.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Có lỗi xảy ra' },
      { status: 500 }
    );
  }
}
