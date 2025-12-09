-- =====================================================
-- HỆ THỐNG PHÂN QUYỀN - CONTENT TRACKER
-- =====================================================

-- Bảng users - Quản lý tài khoản
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'member', -- admin, seo, member
  pic_name VARCHAR(100), -- Tên PIC trong tasks để map (cho member)
  project_ids UUID[] DEFAULT '{}', -- Dự án được phép xem (cho member)
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_login TIMESTAMPTZ
);

-- Bảng sessions - Quản lý phiên đăng nhập
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(255) UNIQUE NOT NULL,
  ip_address VARCHAR(45),
  user_agent TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bảng activity_logs - Lưu log hoạt động
CREATE TABLE IF NOT EXISTS activity_logs (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  username VARCHAR(50), -- Lưu username để giữ log khi user bị xóa
  action VARCHAR(100) NOT NULL, -- login, logout, sync, check_seo, view_salary, etc.
  details JSONB DEFAULT '{}',
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action ON activity_logs(action);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created ON activity_logs(created_at DESC);

-- =====================================================
-- TẠO TÀI KHOẢN MẪU
-- Password mặc định: admin123
-- =====================================================

-- Admin account (full quyền)
INSERT INTO users (username, password_hash, display_name, role, pic_name)
VALUES ('admin', '$2b$10$zrhFB5Aae5veBiUtSbHU.udiByzoIsIpsAkuIKHjcoX6RQzOYF18.', 'Administrator', 'admin', NULL)
ON CONFLICT (username) DO NOTHING;

-- SEO account (không xem Settings, Salary)
INSERT INTO users (username, password_hash, display_name, role, pic_name)
VALUES ('seo', '$2b$10$zrhFB5Aae5veBiUtSbHU.udiByzoIsIpsAkuIKHjcoX6RQzOYF18.', 'SEO Team', 'seo', NULL)
ON CONFLICT (username) DO NOTHING;

-- Ví dụ Member account (chỉ xem dự án của mình)
-- INSERT INTO users (username, password_hash, display_name, role, pic_name)
-- VALUES ('member1', '$2b$10$zrhFB5Aae5veBiUtSbHU.udiByzoIsIpsAkuIKHjcoX6RQzOYF18.', 'Nguyễn Văn A', 'member', 'Nguyễn Văn A')
-- ON CONFLICT (username) DO NOTHING;

-- =====================================================
-- TRIGGER cập nhật updated_at
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- CLEANUP expired sessions (chạy định kỳ)
-- =====================================================
-- DELETE FROM sessions WHERE expires_at < NOW();
