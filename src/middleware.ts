import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Middleware Supabase client (server-side)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Routes that require specific roles
const PROTECTED_ROUTES = {
  '/settings': ['admin'],
  '/salary': ['admin', 'member'], // member chỉ xem lương của mình
  '/users': ['admin'],
};

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip auth check for login page, static files, and public API routes
  if (
    pathname === '/login' ||
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/api/auth/') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // Get auth token from cookie
  const authToken = request.cookies.get('auth_token')?.value;

  // No token - redirect to login (except for API routes)
  if (!authToken) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Validate session in database
  try {
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: session, error } = await supabase
      .from('sessions')
      .select('*, user:users(*)')
      .eq('token', authToken)
      .gt('expires_at', new Date().toISOString())
      .single();

    // Invalid or expired session
    if (error || !session || !session.user) {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'Session expired' }, { status: 401 });
      }
      // Clear invalid cookie and redirect
      const response = NextResponse.redirect(new URL('/login', request.url));
      response.cookies.set('auth_token', '', { maxAge: 0, path: '/' });
      return response;
    }

    const user = session.user;

    // Check if user is active
    if (!user.is_active) {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'Account disabled' }, { status: 403 });
      }
      const response = NextResponse.redirect(new URL('/login', request.url));
      response.cookies.set('auth_token', '', { maxAge: 0, path: '/' });
      return response;
    }

    // Check role-based access for protected routes
    for (const [route, allowedRoles] of Object.entries(PROTECTED_ROUTES)) {
      if (pathname.startsWith(route)) {
        if (!allowedRoles.includes(user.role)) {
          if (pathname.startsWith('/api/')) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
          }
          // Redirect to home if no access
          return NextResponse.redirect(new URL('/', request.url));
        }
        break;
      }
    }

    // Add user info to headers for API routes
    const response = NextResponse.next();
    response.headers.set('x-user-id', user.id);
    response.headers.set('x-user-role', user.role);
    response.headers.set('x-user-name', user.username);
    if (user.pic_name) {
      response.headers.set('x-user-pic', user.pic_name);
    }
    if (user.project_ids?.length) {
      response.headers.set('x-user-projects', JSON.stringify(user.project_ids));
    }

    return response;
  } catch (error) {
    console.error('Middleware error:', error);
    // On error, allow request but without user context
    return NextResponse.next();
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files with extensions
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
