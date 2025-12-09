import { NextRequest, NextResponse } from 'next/server';
import { deleteSession, getSessionUser, logActivity } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('auth_token')?.value;

    if (token) {
      // Get user before deleting session
      const user = await getSessionUser(token);

      // Delete session
      await deleteSession(token);

      // Log logout
      if (user) {
        const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0] ||
                          request.headers.get('x-real-ip') ||
                          'unknown';
        const userAgent = request.headers.get('user-agent') || 'unknown';
        await logActivity(user.id, user.username, 'logout', {}, ipAddress, userAgent);
      }
    }

    // Clear cookie
    const response = NextResponse.json({ success: true });
    response.cookies.set('auth_token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: 'Có lỗi xảy ra' },
      { status: 500 }
    );
  }
}
