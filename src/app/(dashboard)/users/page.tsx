'use client';

import { useState, useEffect } from 'react';
import {
  UserCog,
  Plus,
  Pencil,
  Trash2,
  Check,
  X,
  Shield,
  Search as SearchIcon,
  Eye,
  EyeOff,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { PageLoading } from '@/components/LoadingSpinner';
import { useAuth } from '@/contexts/AuthContext';
import { User, UserRole } from '@/types/auth';
import { cn } from '@/lib/utils';

interface Project {
  id: string;
  name: string;
}

const roleOptions: { value: UserRole; label: string; color: string }[] = [
  { value: 'admin', label: 'Admin - Full quyền', color: 'text-danger' },
  { value: 'seo', label: 'SEO - Không xem Settings/Lương', color: 'text-accent' },
  { value: 'member', label: 'Member - Chỉ xem dự án/lương của mình', color: 'text-success' },
];

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  // Form states
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    display_name: '',
    role: 'member' as UserRole,
    pic_name: '',
    project_ids: [] as string[],
    is_active: true,
  });
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [usersRes, projectsRes] = await Promise.all([
        fetch('/api/users'),
        fetch('/api/projects'),
      ]);

      const usersData = await usersRes.json();
      const projectsData = await projectsRes.json();

      setUsers(usersData.users || []);
      setProjects(projectsData.projects || []);
    } catch (error) {
      console.error('Fetch error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingUser(null);
    setFormData({
      username: '',
      password: '',
      display_name: '',
      role: 'member',
      pic_name: '',
      project_ids: [],
      is_active: true,
    });
    setError('');
    setIsModalOpen(true);
  };

  const openEditModal = (user: User) => {
    setEditingUser(user);
    setFormData({
      username: user.username,
      password: '',
      display_name: user.display_name,
      role: user.role,
      pic_name: user.pic_name || '',
      project_ids: user.project_ids || [],
      is_active: user.is_active,
    });
    setError('');
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    setError('');

    // Validate
    if (!formData.display_name) {
      setError('Tên hiển thị là bắt buộc');
      return;
    }

    if (!editingUser && (!formData.username || !formData.password)) {
      setError('Username và password là bắt buộc khi tạo mới');
      return;
    }

    setIsSaving(true);

    try {
      const url = '/api/users';
      const method = editingUser ? 'PUT' : 'POST';
      const body = editingUser
        ? {
            id: editingUser.id,
            display_name: formData.display_name,
            role: formData.role,
            pic_name: formData.pic_name || null,
            project_ids: formData.project_ids,
            is_active: formData.is_active,
            ...(formData.password ? { password: formData.password } : {}),
          }
        : {
            username: formData.username,
            password: formData.password,
            display_name: formData.display_name,
            role: formData.role,
            pic_name: formData.pic_name || null,
            project_ids: formData.project_ids,
          };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Có lỗi xảy ra');
        return;
      }

      setIsModalOpen(false);
      fetchData();
    } catch {
      setError('Có lỗi xảy ra');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (user: User) => {
    if (!confirm(`Bạn có chắc muốn xóa user "${user.display_name}"?`)) return;

    try {
      const res = await fetch(`/api/users?id=${user.id}`, { method: 'DELETE' });
      if (res.ok) {
        setUsers(users.filter((u) => u.id !== user.id));
      } else {
        const data = await res.json();
        alert(data.error || 'Xóa thất bại');
      }
    } catch {
      alert('Có lỗi xảy ra');
    }
  };

  const toggleProjectSelection = (projectId: string) => {
    setFormData((prev) => ({
      ...prev,
      project_ids: prev.project_ids.includes(projectId)
        ? prev.project_ids.filter((id) => id !== projectId)
        : [...prev.project_ids, projectId],
    }));
  };

  // Filter users
  const filteredUsers = users.filter(
    (u) =>
      u.username.toLowerCase().includes(search.toLowerCase()) ||
      u.display_name.toLowerCase().includes(search.toLowerCase())
  );

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getRoleBadge = (role: UserRole) => {
    const colors: Record<UserRole, string> = {
      admin: 'bg-danger/20 text-danger',
      seo: 'bg-accent/20 text-accent',
      member: 'bg-success/20 text-success',
    };
    const labels: Record<UserRole, string> = {
      admin: 'Admin',
      seo: 'SEO',
      member: 'Member',
    };
    return (
      <span className={cn('px-2 py-1 rounded text-xs font-medium', colors[role])}>
        {labels[role]}
      </span>
    );
  };

  if (isLoading) {
    return <PageLoading />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Quản lý Users</h1>
          <p className="text-[#8888a0] text-sm">Quản lý tài khoản và phân quyền</p>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent/90 rounded-lg text-white font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          Thêm User
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#8888a0]" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Tìm kiếm user..."
          className="w-full pl-10 pr-4 py-2 bg-secondary border border-border rounded-lg text-white placeholder-[#8888a0]"
        />
      </div>

      {/* Users Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <table className="w-full">
          <thead className="bg-secondary">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-[#8888a0]">User</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-[#8888a0]">Role</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-[#8888a0]">PIC Name</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-[#8888a0]">Dự án</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-[#8888a0]">Đăng nhập cuối</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-[#8888a0]">Trạng thái</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-[#8888a0]">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filteredUsers.map((user) => (
              <tr key={user.id} className="hover:bg-secondary/50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-accent/20 rounded-lg flex items-center justify-center">
                      <Shield className="w-4 h-4 text-accent" />
                    </div>
                    <div>
                      <p className="text-white font-medium">{user.display_name}</p>
                      <p className="text-[#8888a0] text-sm">@{user.username}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">{getRoleBadge(user.role)}</td>
                <td className="px-4 py-3 text-[#8888a0] text-sm">{user.pic_name || '-'}</td>
                <td className="px-4 py-3 text-[#8888a0] text-sm">
                  {user.project_ids?.length
                    ? user.project_ids
                        .map((id) => projects.find((p) => p.id === id)?.name || id)
                        .join(', ')
                    : user.role === 'member'
                    ? 'Chưa gán'
                    : 'Tất cả'}
                </td>
                <td className="px-4 py-3 text-[#8888a0] text-sm">{formatDate(user.last_login)}</td>
                <td className="px-4 py-3">
                  {user.is_active ? (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-success/20 text-success rounded text-xs">
                      <Check className="w-3 h-3" />
                      Active
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-danger/20 text-danger rounded text-xs">
                      <X className="w-3 h-3" />
                      Disabled
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => openEditModal(user)}
                      className="p-2 text-[#8888a0] hover:text-accent transition-colors"
                      title="Sửa"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    {user.id !== currentUser?.id && (
                      <button
                        onClick={() => handleDelete(user)}
                        className="p-2 text-[#8888a0] hover:text-danger transition-colors"
                        title="Xóa"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredUsers.length === 0 && (
          <div className="p-8 text-center text-[#8888a0]">
            {search ? 'Không tìm thấy user nào' : 'Chưa có user nào'}
          </div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-accent/20 rounded-lg flex items-center justify-center">
                  <UserCog className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white">
                    {editingUser ? 'Sửa User' : 'Thêm User mới'}
                  </h2>
                  <p className="text-sm text-[#8888a0]">
                    {editingUser ? `@${editingUser.username}` : 'Tạo tài khoản mới'}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {error && (
                <div className="flex items-center gap-2 p-3 bg-danger/10 border border-danger/20 rounded-lg text-danger text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {error}
                </div>
              )}

              {/* Username - chỉ khi tạo mới */}
              {!editingUser && (
                <div>
                  <label className="block text-sm text-[#8888a0] mb-2">Username *</label>
                  <input
                    type="text"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    className="w-full px-4 py-2 bg-secondary border border-border rounded-lg text-white"
                    placeholder="Nhập username"
                  />
                </div>
              )}

              {/* Password */}
              <div>
                <label className="block text-sm text-[#8888a0] mb-2">
                  {editingUser ? 'Mật khẩu mới (để trống nếu không đổi)' : 'Mật khẩu *'}
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-4 py-2 pr-10 bg-secondary border border-border rounded-lg text-white"
                    placeholder={editingUser ? 'Nhập mật khẩu mới...' : 'Nhập mật khẩu'}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8888a0] hover:text-white"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Display Name */}
              <div>
                <label className="block text-sm text-[#8888a0] mb-2">Tên hiển thị *</label>
                <input
                  type="text"
                  value={formData.display_name}
                  onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                  className="w-full px-4 py-2 bg-secondary border border-border rounded-lg text-white"
                  placeholder="Nguyễn Văn A"
                />
              </div>

              {/* Role */}
              <div>
                <label className="block text-sm text-[#8888a0] mb-2">Quyền *</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                  className="w-full px-4 py-2 bg-secondary border border-border rounded-lg text-white"
                >
                  {roleOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* PIC Name - cho member */}
              {formData.role === 'member' && (
                <div>
                  <label className="block text-sm text-[#8888a0] mb-2">
                    Tên PIC (khớp với tên trong Tasks)
                  </label>
                  <input
                    type="text"
                    value={formData.pic_name}
                    onChange={(e) => setFormData({ ...formData, pic_name: e.target.value })}
                    className="w-full px-4 py-2 bg-secondary border border-border rounded-lg text-white"
                    placeholder="Tên PIC trong Google Sheets"
                  />
                </div>
              )}

              {/* Projects - cho member */}
              {formData.role === 'member' && (
                <div>
                  <label className="block text-sm text-[#8888a0] mb-2">Dự án được xem</label>
                  <div className="space-y-2 max-h-40 overflow-y-auto p-3 bg-secondary rounded-lg">
                    {projects.map((project) => (
                      <label
                        key={project.id}
                        className="flex items-center gap-2 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={formData.project_ids.includes(project.id)}
                          onChange={() => toggleProjectSelection(project.id)}
                          className="rounded border-border bg-primary text-accent focus:ring-accent"
                        />
                        <span className="text-white text-sm">{project.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Active - khi edit */}
              {editingUser && (
                <div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.is_active}
                      onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                      className="rounded border-border bg-primary text-accent focus:ring-accent"
                    />
                    <span className="text-white text-sm">Tài khoản đang hoạt động</span>
                  </label>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-border flex justify-end gap-3">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-[#8888a0] hover:text-white transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent/90 disabled:bg-accent/50 rounded-lg text-white font-medium transition-colors"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Đang lưu...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    {editingUser ? 'Cập nhật' : 'Tạo mới'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
