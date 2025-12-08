// Format số tiền VNĐ
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount) + 'đ';
}

// Format ngày DD/MM/YYYY
export function formatDate(dateString: string | null): string {
  if (!dateString) return '-';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

// Format ngày ngắn DD/MM
export function formatShortDate(dateString: string | null): string {
  if (!dateString) return '-';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
  });
}

// Kiểm tra trễ deadline
export function isOverdue(deadline: string | null): boolean {
  if (!deadline) return false;
  const deadlineDate = new Date(deadline);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return deadlineDate < today;
}

// Kiểm tra sắp đến hạn (<=3 ngày)
export function isDueSoon(deadline: string | null): boolean {
  if (!deadline) return false;
  const deadlineDate = new Date(deadline);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.ceil((deadlineDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  return diffDays >= 0 && diffDays <= 3;
}

// Tính lương
export function calculateSalary(publishedCount: number) {
  if (publishedCount < 20) {
    return {
      baseSalary: publishedCount * 125000,
      kpiBonus: 0,
      extraCount: 0,
      extraAmount: 0,
      total: publishedCount * 125000,
      note: `Chưa đủ 20 bài (${publishedCount}/20)`,
      isKpiMet: false,
    };
  } else {
    const extraCount = publishedCount - 20;
    return {
      baseSalary: 2500000,
      kpiBonus: 500000,
      extraCount,
      extraAmount: extraCount * 120000,
      total: 2500000 + 500000 + extraCount * 120000,
      note: extraCount > 0 ? `Vượt ${extraCount} bài` : 'Đạt KPI',
      isKpiMet: true,
    };
  }
}

// Lấy tháng/năm hiện tại
export function getCurrentMonthYear() {
  const now = new Date();
  return {
    month: now.getMonth() + 1,
    year: now.getFullYear(),
  };
}

// Tạo danh sách tháng cho dropdown
export function getMonthOptions() {
  const months = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      value: `${date.getMonth() + 1}-${date.getFullYear()}`,
      label: `Tháng ${date.getMonth() + 1}/${date.getFullYear()}`,
      month: date.getMonth() + 1,
      year: date.getFullYear(),
    });
  }
  return months;
}

// Lấy màu status
export function getStatusColor(status: string): string {
  const statusLower = status?.toLowerCase() || '';

  if (statusLower.includes('publish') || statusLower.includes('done qc')) {
    return 'bg-success/20 text-success';
  }
  if (statusLower.includes('fixing') || statusLower.includes('fix')) {
    return 'bg-warning/20 text-warning';
  }
  if (statusLower.includes('qc')) {
    return 'bg-accent/20 text-accent';
  }
  if (statusLower.includes('doing')) {
    return 'bg-blue-500/20 text-blue-400';
  }
  return 'bg-gray-500/20 text-gray-400';
}

// Parse Google Sheet date
export function parseSheetDate(dateStr: string): string | null {
  if (!dateStr) return null;

  // Try DD/MM/YYYY format
  const match = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (match) {
    const [, day, month, year] = match;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  // Try YYYY-MM-DD format
  if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
    return dateStr;
  }

  return null;
}

// Truncate text
export function truncate(text: string, maxLength: number): string {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}

// Class name helper
export function cn(...classes: (string | boolean | undefined)[]): string {
  return classes.filter(Boolean).join(' ');
}
