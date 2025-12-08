import { NextRequest, NextResponse } from 'next/server';

const APP_PASSWORD = process.env.APP_PASSWORD || 'Deba@2023';

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json();

    if (password === APP_PASSWORD) {
      // Generate simple token (in production, use proper JWT)
      const token = Buffer.from(`${Date.now()}-${APP_PASSWORD}`).toString('base64');

      return NextResponse.json({
        success: true,
        token,
      });
    }

    return NextResponse.json(
      { error: 'Mật khẩu không đúng' },
      { status: 401 }
    );
  } catch {
    return NextResponse.json(
      { error: 'Có lỗi xảy ra' },
      { status: 500 }
    );
  }
}

// Verify token
export async function GET(request: NextRequest) {
  try {
    const authCookie = request.cookies.get('auth');

    if (!authCookie?.value) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    // Simple verification - check if token contains valid timestamp
    const decoded = Buffer.from(authCookie.value, 'base64').toString();
    const timestamp = parseInt(decoded.split('-')[0]);

    // Token valid for 7 days
    const isValid = Date.now() - timestamp < 7 * 24 * 60 * 60 * 1000;

    if (isValid) {
      return NextResponse.json({ authenticated: true });
    }

    return NextResponse.json({ authenticated: false }, { status: 401 });
  } catch {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
}
