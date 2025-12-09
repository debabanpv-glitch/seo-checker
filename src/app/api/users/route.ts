import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { hashPassword, getSessionUser, logActivity } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// GET: List all users (admin only)
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth_token')?.value;
    const currentUser = await getSessionUser(token || '');

    if (!currentUser || currentUser.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data: users, error } = await supabase
      .from('users')
      .select('id, username, display_name, role, pic_name, project_ids, is_active, created_at, last_login')
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return NextResponse.json({ users: users || [] });
  } catch (error) {
    console.error('Get users error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST: Create new user (admin only)
export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('auth_token')?.value;
    const currentUser = await getSessionUser(token || '');

    if (!currentUser || currentUser.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { username, password, display_name, role, pic_name, project_ids } = body;

    // Validate
    if (!username || !password || !display_name || !role) {
      return NextResponse.json(
        { error: 'Username, password, display_name và role là bắt buộc' },
        { status: 400 }
      );
    }

    if (!['admin', 'seo', 'member'].includes(role)) {
      return NextResponse.json(
        { error: 'Role không hợp lệ' },
        { status: 400 }
      );
    }

    // Check if username exists
    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('username', username.toLowerCase().trim())
      .single();

    if (existing) {
      return NextResponse.json(
        { error: 'Username đã tồn tại' },
        { status: 400 }
      );
    }

    // Hash password
    const password_hash = await hashPassword(password);

    // Create user
    const { data: newUser, error } = await supabase
      .from('users')
      .insert({
        username: username.toLowerCase().trim(),
        password_hash,
        display_name,
        role,
        pic_name: pic_name || null,
        project_ids: project_ids || [],
        is_active: true,
      })
      .select('id, username, display_name, role, pic_name, project_ids, is_active, created_at')
      .single();

    if (error) {
      throw error;
    }

    // Log activity
    const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown';
    await logActivity(
      currentUser.id,
      currentUser.username,
      'create_user',
      { created_user: username, role },
      ipAddress
    );

    return NextResponse.json({ success: true, user: newUser });
  } catch (error) {
    console.error('Create user error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT: Update user (admin only)
export async function PUT(request: NextRequest) {
  try {
    const token = request.cookies.get('auth_token')?.value;
    const currentUser = await getSessionUser(token || '');

    if (!currentUser || currentUser.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { id, display_name, role, pic_name, project_ids, is_active, password } = body;

    if (!id) {
      return NextResponse.json({ error: 'User ID là bắt buộc' }, { status: 400 });
    }

    // Build update object
    const updateData: Record<string, unknown> = {};
    if (display_name !== undefined) updateData.display_name = display_name;
    if (role !== undefined) updateData.role = role;
    if (pic_name !== undefined) updateData.pic_name = pic_name;
    if (project_ids !== undefined) updateData.project_ids = project_ids;
    if (is_active !== undefined) updateData.is_active = is_active;
    if (password) {
      updateData.password_hash = await hashPassword(password);
    }

    const { data: updatedUser, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', id)
      .select('id, username, display_name, role, pic_name, project_ids, is_active, created_at, last_login')
      .single();

    if (error) {
      throw error;
    }

    // Log activity
    const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown';
    await logActivity(
      currentUser.id,
      currentUser.username,
      'update_user',
      { updated_user_id: id, changes: Object.keys(updateData) },
      ipAddress
    );

    return NextResponse.json({ success: true, user: updatedUser });
  } catch (error) {
    console.error('Update user error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE: Delete user (admin only)
export async function DELETE(request: NextRequest) {
  try {
    const token = request.cookies.get('auth_token')?.value;
    const currentUser = await getSessionUser(token || '');

    if (!currentUser || currentUser.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'User ID là bắt buộc' }, { status: 400 });
    }

    // Cannot delete self
    if (id === currentUser.id) {
      return NextResponse.json(
        { error: 'Không thể xóa tài khoản của chính mình' },
        { status: 400 }
      );
    }

    // Get user info for logging
    const { data: userToDelete } = await supabase
      .from('users')
      .select('username')
      .eq('id', id)
      .single();

    // Delete sessions first
    await supabase.from('sessions').delete().eq('user_id', id);

    // Delete user
    const { error } = await supabase.from('users').delete().eq('id', id);

    if (error) {
      throw error;
    }

    // Log activity
    const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown';
    await logActivity(
      currentUser.id,
      currentUser.username,
      'delete_user',
      { deleted_user: userToDelete?.username || id },
      ipAddress
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete user error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
