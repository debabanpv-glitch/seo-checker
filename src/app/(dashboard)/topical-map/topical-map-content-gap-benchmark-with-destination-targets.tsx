'use client';

import { useState, useEffect, useMemo } from 'react';
import { CheckCircle2, Circle, AlertTriangle, ChevronDown, ChevronRight } from 'lucide-react';

// --- Benchmark data: real target counts per destination ---
// Each destination has target numbers for tour, food, guide/blog, place (điểm đến)
// These represent what a comprehensive travel site SHOULD have

interface BenchmarkTarget {
  name: string;
  // Target content counts (how many articles SHOULD exist)
  targets: {
    tour: number;     // số tour khác nhau cần có
    food: number;     // bài ẩm thực / đặc sản
    guide: number;    // bài hướng dẫn / kinh nghiệm / top điểm đến
    place: number;    // bài review từng điểm đến cụ thể
  };
  // Keywords to match crawled pages
  keywords: string[];
  // Notable places/foods that should be covered (checklist)
  placeChecklist: string[];
  foodChecklist: string[];
}

// Benchmark targets derived from competitor analysis (2026-04-12):
// - saigonstartravel.com: 32 Mekong tours, 40-50 guides, 20-22 food, 30-40 places
// - nucuoimekong.com: 40+ tours, 50-60 guides, 8-10 food, 20-25 places
// Targets = MAX(DLBM actual, best competitor) + ~20% growth buffer
// Source: plans/reports/researcher-260412-1453-mekong-competitor-content-audit.md
const DLBM_BENCHMARKS: BenchmarkTarget[] = [
  {
    name: 'Cần Thơ',
    // DLBM: 36 tour, 11 non-tour | SST: 5-6 tour, 10+ guide, 5+ food | NCM: 4+ tour
    targets: { tour: 10, food: 3, guide: 3, place: 12 },
    keywords: ['cần thơ', 'can-tho', 'cai-rang', 'ninh-kieu', 'cho-noi-cai-rang', 'cho-noi-tra-on'],
    placeChecklist: [
      'Chợ nổi Cái Răng', 'Bến Ninh Kiều', 'Nhà cổ Bình Thủy', 'Thiền viện Trúc Lâm',
      'Vườn trái cây Mỹ Khánh', 'Chợ đêm Ninh Kiều', 'Cồn Sơn', 'Cồn Khương',
      'KDL Phong Điền', 'Vườn cò Bằng Lăng', 'Bảo tàng Cần Thơ', 'Chùa Ông Cần Thơ',
      'KDL Ông Đề', 'Chợ nổi Phong Điền', 'Làng du lịch Mỹ Khánh',
    ],
    foodChecklist: [
      'Ăn gì ở Cần Thơ (tổng hợp)', 'Bánh xèo Cần Thơ', 'Bún riêu cua đồng',
    ],
  },
  {
    name: 'Châu Đốc / An Giang',
    // DLBM: 20 tour, 9 non-tour | SST: 4 tour, 5+ guide, 2+ food | NCM: 3+ tour
    targets: { tour: 6, food: 2, guide: 3, place: 10 },
    keywords: ['châu đốc', 'chau-doc', 'tra-su', 'nui-cam', 'mieu-ba', 'an-giang', 'an giang'],
    placeChecklist: [
      'Miếu Bà Chúa Xứ', 'Rừng tràm Trà Sư', 'Núi Cấm', 'Núi Sam',
      'Chùa Tây An', 'Làng bè Châu Đốc', 'Búng Bình Thiên', 'Chợ Tịnh Biên',
      'Lăng Thoại Ngọc Hầu', 'Rừng tràm Tân Thành', 'Đồi Tức Dụp', 'Cánh đồng Tà Pạ',
    ],
    foodChecklist: [
      'Ăn gì ở Châu Đốc (tổng hợp)', 'Bò bảy món Núi Sam', 'Mắm Châu Đốc',
    ],
  },
  {
    name: 'Cà Mau',
    // DLBM: 21 tour, 8 non-tour | SST: 3-4 tour, 3-4 guide, 2+ food
    targets: { tour: 5, food: 2, guide: 2, place: 8 },
    keywords: ['cà mau', 'ca-mau', 'dat-mui', 'u-minh', 'khai-long', 'huong-tram'],
    placeChecklist: [
      'Đất Mũi Cà Mau', 'Vườn QG U Minh Hạ', 'Hòn Đá Bạc', 'Đầm Thị Tường',
      'KDL Khai Long', 'Sân chim Cà Mau', 'Hòn Khoai', 'KDL sinh thái Hương Tràm',
      'Khu tưởng niệm Bác Hồ', 'Chợ Cà Mau',
    ],
    foodChecklist: [
      'Ăn gì ở Cà Mau (tổng hợp)', 'Ba khía Rạch Gốc',
    ],
  },
  {
    name: 'Bạc Liêu',
    // DLBM: 13 tour, 8 non-tour | SST: 1-2 combo | NCM: ~1 combo
    targets: { tour: 3, food: 2, guide: 2, place: 8 },
    keywords: ['bạc liêu', 'bac-lieu', 'cong-tu', 'xiem-can', 'nha-mat', 'vinh-hung'],
    placeChecklist: [
      'Nhà Công Tử Bạc Liêu', 'Cánh đồng quạt gió', 'Chùa Xiêm Cán',
      'Tháp Vĩnh Hưng', 'KDL Nhà Mát', 'Cánh đồng muối', 'Vườn nhãn cổ',
      'Quán Âm Phật Đài', 'Khu tưởng niệm Cao Văn Lầu', 'Chùa Giác Hoa',
    ],
    foodChecklist: [
      'Ăn gì ở Bạc Liêu (tổng hợp)', 'Bún bò cay Bạc Liêu',
    ],
  },
  {
    name: 'Sóc Trăng',
    // DLBM: 14 tour, 12 non-tour | SST: 1-2 combo | NCM: ~1 combo
    targets: { tour: 3, food: 2, guide: 2, place: 8 },
    keywords: ['sóc trăng', 'soc-trang', 'khmer', 'nga-nam', 'ho-be', 'binh-an'],
    placeChecklist: [
      'Chùa Dơi (Mahatup)', 'Chùa Chén Kiểu (Som Rong)', 'Chợ nổi Ngã Năm',
      'Bảo tàng Khmer', 'KDL Hồ Bể', 'Thiền viện Trúc Lâm ST', 'Chùa Phật Học 2',
      'Vườn cò Tân Long', 'KDL sinh thái Bình An', 'Chùa La Hán',
    ],
    foodChecklist: [
      'Ăn gì ở Sóc Trăng (tổng hợp)', 'Bún nước lèo Sóc Trăng',
    ],
  },
  {
    name: 'Đồng Tháp',
    targets: { tour: 4, food: 2, guide: 2, place: 12 },
    keywords: ['đồng tháp', 'dong-thap', 'sa-dec', 'tram-chim', 'gao-giong', 'go-thap', 'dinh-yen', 'my-phuoc', 'phuong-nam', 'nguyen-sinh'],
    placeChecklist: [
      'Làng hoa Sa Đéc', 'VQG Tràm Chim', 'KDL Gáo Giồng', 'Đầm sen Tháp Mười',
      'Nhà cổ Huỳnh Thủy Lê', 'Chùa Kiến An Cung', 'Khu di tích Gò Tháp',
      'Mộ cụ Nguyễn Sinh Sắc', 'KDL Phương Nam', 'Happy Land Hùng Thy',
      'KDL Mỹ Phước Thành', 'Làng chiếu Định Yên',
    ],
    foodChecklist: [
      'Ăn gì ở Đồng Tháp (tổng hợp)', 'Hủ tiếu Sa Đéc',
    ],
  },
  {
    name: 'Mỹ Tho / Tiền Giang',
    targets: { tour: 4, food: 2, guide: 2, place: 8 },
    keywords: ['mỹ tho', 'my-tho', 'tien-giang', 'thoi-son', 'tan-phong'],
    placeChecklist: [
      'Cù lao Thới Sơn', 'Chùa Vĩnh Tràng', 'Cù lao Tân Phong', 'Cồn Mỹ Phước',
      'Chợ Mỹ Tho', 'Cồn Phụng', 'Trại rắn Đồng Tâm', 'Biển Tân Thành',
    ],
    foodChecklist: [
      'Ăn gì ở Mỹ Tho (tổng hợp)', 'Hủ tiếu Mỹ Tho',
    ],
  },
  {
    name: 'Bến Tre',
    targets: { tour: 4, food: 2, guide: 2, place: 6 },
    keywords: ['bến tre', 'ben-tre', 'keo-dua'],
    placeChecklist: [
      'Cồn Phụng', 'Cồn Quy', 'Làng nghề kẹo dừa', 'Sân chim Vàm Hồ',
      'Vườn dừa Bến Tre', 'KDL Lan Vương',
    ],
    foodChecklist: [
      'Ăn gì ở Bến Tre (tổng hợp)', 'Kẹo dừa Bến Tre',
    ],
  },
  {
    name: 'Vĩnh Long',
    targets: { tour: 3, food: 2, guide: 2, place: 6 },
    keywords: ['vĩnh long', 'vinh-long', 'cai-be', 'cai-cuong', 'tien-chau', 'vinh-sang'],
    placeChecklist: [
      'Chợ nổi Cái Bè', 'KDL Vinh Sang', 'Nhà cổ Cai Cường', 'Chùa Tiên Châu',
      'Vườn hồng Tư Tôn', 'KDL Trường An',
    ],
    foodChecklist: [
      'Ăn gì ở Vĩnh Long (tổng hợp)', 'Cá tai tượng chiên xù',
    ],
  },
  {
    name: 'Phú Quốc',
    // DLBM: 24 tour, 10 non-tour | SST: 5+ tour | NCM: 5+ tour
    targets: { tour: 8, food: 2, guide: 3, place: 12 },
    keywords: ['phú quốc', 'phu-quoc', 'hon-thom', 'bai-sao', 'ham-ninh', 'dinh-cau', 'suoi-tranh', 'hon-mong-tay', 'bai-khem', 'sanato', 'nha-tu-phu'],
    placeChecklist: [
      'Bãi Sao', 'Hòn Thơm', 'Dinh Cậu', 'Grand World', 'Suối Tranh',
      'VQG Phú Quốc', 'Nhà tù Phú Quốc', 'Làng chài Hàm Ninh', 'Bãi Khem',
      'Sunset Sanato', 'Hòn Móng Tay', 'Safari Phú Quốc', 'Rạch Vẹm',
      'Chợ đêm Phú Quốc', 'VinWonders Phú Quốc',
    ],
    foodChecklist: [
      'Ăn gì ở Phú Quốc (tổng hợp)', 'Hải sản Phú Quốc',
    ],
  },
  {
    name: 'Phan Thiết / Mũi Né',
    // DLBM: 14 tour, 8 non-tour | SST: 3+ tour | NCM: 1+ tour
    targets: { tour: 5, food: 2, guide: 2, place: 8 },
    keywords: ['phan thiết', 'phan-thiet', 'mũi né', 'mui-ne', 'hon-rom', 'doi-cat', 'suoi-tien-mui', 'ke-ga', 'lang-chai-mui', 'coco-beach', 'lau-dai-ruou', 'van-thuy-tu'],
    placeChecklist: [
      'Đồi cát bay', 'Suối Tiên Mũi Né', 'Hải đăng Kê Gà', 'KDL Hòn Rơm',
      'Làng chài Mũi Né', 'Bàu Trắng', 'Lâu đài rượu vang RD', 'Coco Beach Camp',
      'Dinh Vạn Thủy Tú', 'Bikini Beach',
    ],
    foodChecklist: [
      'Đặc sản Phan Thiết (tổng hợp)', 'Nước mắm Phan Thiết',
    ],
  },
  {
    name: 'Kiên Giang / Hà Tiên',
    targets: { tour: 4, food: 1, guide: 2, place: 8 },
    keywords: ['kiên giang', 'kien-giang', 'nam-du', 'ha-tien', 'ba-lua', 'hon-son', 'mo-so', 'thach-dong', 'mui-nai', 'nguyen-trung-truc', 'u-minh-thuong'],
    placeChecklist: [
      'Đảo Nam Du', 'Hòn Sơn', 'Quần đảo Bà Lụa', 'Mũi Nai Hà Tiên',
      'Thạch Động', 'Núi Mo So', 'Đình Nguyễn Trung Trực', 'VQG U Minh Thượng',
    ],
    foodChecklist: [
      'Ăn gì ở Kiên Giang (tổng hợp)',
    ],
  },
  {
    name: 'Tây Ninh',
    targets: { tour: 3, food: 2, guide: 1, place: 5 },
    keywords: ['tây ninh', 'tay-ninh', 'nui-ba-den'],
    placeChecklist: [
      'Núi Bà Đen', 'Tòa Thánh Cao Đài', 'KDL Long Điền Sơn', 'Hồ Dầu Tiếng', 'Chùa Gò Kén',
    ],
    foodChecklist: [
      'Ăn gì ở Tây Ninh (tổng hợp)', 'Bánh canh Trảng Bàng',
    ],
  },
  {
    name: 'Vũng Tàu',
    targets: { tour: 4, food: 2, guide: 2, place: 8 },
    keywords: ['vũng tàu', 'vung-tau', 'ho-tram', 'ho-coc', 'binh-chau'],
    placeChecklist: [
      'Bãi Sau', 'Bãi Trước', 'Tượng Chúa Kitô', 'Hải đăng Vũng Tàu',
      'Bạch Dinh', 'Hồ Tràm', 'Hồ Cốc', 'Suối nước nóng Bình Châu',
    ],
    foodChecklist: [
      'Ăn gì ở Vũng Tàu (tổng hợp)', 'Bánh khọt Vũng Tàu',
    ],
  },
  {
    name: 'Côn Đảo',
    targets: { tour: 3, food: 1, guide: 1, place: 5 },
    keywords: ['côn đảo', 'con-dao'],
    placeChecklist: [
      'Nhà tù Côn Đảo', 'Bãi Đầm Trầu', 'VQG Côn Đảo', 'Nghĩa trang Hàng Dương', 'Mũi Cá Mập',
    ],
    foodChecklist: [
      'Ăn gì ở Côn Đảo',
    ],
  },
];

// Content type labels + colors
const TYPE_CONFIG = {
  tour: { label: 'Tour', color: 'text-blue-400', bg: 'bg-blue-500/15' },
  food: { label: 'Ẩm thực', color: 'text-orange-400', bg: 'bg-orange-500/15' },
  guide: { label: 'Guide', color: 'text-purple-400', bg: 'bg-purple-500/15' },
  place: { label: 'Điểm đến', color: 'text-green-400', bg: 'bg-green-500/15' },
} as const;

interface CrawledCluster {
  name: string;
  tour: number;
  food: number;
  guide: number;
  place: number;
  content: number;
  total: number;
  pages: Array<{ url: string; title: string; type: string }>;
}

export function TopicalMapContentGapBenchmark({ projectId }: { projectId: string }) {
  const [clusters, setClusters] = useState<CrawledCluster[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedCluster, setExpandedCluster] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId) return;
    setLoading(true);
    fetch(`/api/v1/crawl?projectId=${projectId}&topicalClusters=true`)
      .then(r => r.json())
      .then(d => setClusters(d.clusters || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [projectId]);

  // Match crawled data with benchmarks
  const gapAnalysis = useMemo(() => {
    return DLBM_BENCHMARKS.map(bench => {
      // Find matching crawled cluster (fuzzy match by name)
      const crawled = clusters.find(c =>
        c.name.toLowerCase().includes(bench.name.split('/')[0].trim().toLowerCase()) ||
        bench.name.toLowerCase().includes(c.name.split('/')[0].trim().toLowerCase())
      );

      const actual = {
        tour: crawled?.tour || 0,
        food: crawled?.food || 0,
        guide: crawled?.guide || 0,
        place: crawled?.place || 0,
      };

      // Check which places/foods are covered
      const allPageTitles = (crawled?.pages || []).map(p => p.title.toLowerCase()).join(' | ');
      const allPageUrls = (crawled?.pages || []).map(p => p.url.toLowerCase()).join(' | ');
      const combined = allPageTitles + ' ' + allPageUrls;

      const placeStatus = bench.placeChecklist.map(item => ({
        name: item,
        done: combined.includes(item.toLowerCase().split(' ')[0]) ||
              combined.includes(item.toLowerCase().replace(/\s+/g, '-').normalize('NFD').replace(/[\u0300-\u036f]/g, '')),
      }));

      const foodStatus = bench.foodChecklist.map(item => ({
        name: item,
        done: combined.includes(item.toLowerCase().split('(')[0].trim().split(' ')[0]) ||
              combined.includes('an-gi'),
      }));

      const totalTargets = bench.targets.tour + bench.targets.food + bench.targets.guide + bench.targets.place;
      const totalActual = actual.tour + actual.food + actual.guide + actual.place;
      const completion = Math.min(100, Math.round((totalActual / totalTargets) * 100));

      return {
        ...bench,
        actual,
        placeStatus,
        foodStatus,
        completion,
        crawledPages: crawled?.pages || [],
        totalActual,
      };
    });
  }, [clusters]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin w-8 h-8 border-2 border-[var(--border)] border-t-[var(--text-primary)] rounded-full" />
      </div>
    );
  }

  if (!clusters.length) {
    return (
      <div className="text-center py-16 text-[var(--text-secondary)]">
        Chưa có dữ liệu crawl. Chạy crawler trước.
      </div>
    );
  }

  // Overall stats
  const totalTarget = gapAnalysis.reduce((s, g) => s + g.targets.tour + g.targets.food + g.targets.guide + g.targets.place, 0);
  const totalDone = gapAnalysis.reduce((s, g) => s + g.totalActual, 0);
  const overallCompletion = Math.round((totalDone / totalTarget) * 100);

  return (
    <div className="space-y-4">
      {/* Overall progress */}
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-[var(--text-primary)]">Tổng tiến độ content</span>
          <span className="text-sm text-[var(--text-secondary)]">{totalDone}/{totalTarget} bài ({overallCompletion}%)</span>
        </div>
        <div className="w-full bg-[var(--bg-accent)] rounded-full h-3">
          <div
            className="h-3 rounded-full transition-all bg-gradient-to-r from-blue-500 to-green-500"
            style={{ width: `${overallCompletion}%` }}
          />
        </div>
        <div className="flex gap-4 mt-3 text-xs text-[var(--text-secondary)]">
          {Object.entries(TYPE_CONFIG).map(([key, cfg]) => {
            const target = gapAnalysis.reduce((s, g) => s + g.targets[key as keyof typeof g.targets], 0);
            const actual = gapAnalysis.reduce((s, g) => s + g.actual[key as keyof typeof g.actual], 0);
            return (
              <span key={key} className={cfg.color}>
                {cfg.label}: {actual}/{target}
              </span>
            );
          })}
        </div>
      </div>

      {/* Cluster rows */}
      {gapAnalysis.map(gap => (
        <div key={gap.name} className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg overflow-hidden">
          {/* Header row */}
          <button
            onClick={() => setExpandedCluster(expandedCluster === gap.name ? null : gap.name)}
            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[var(--bg-accent)] transition-colors"
          >
            {expandedCluster === gap.name
              ? <ChevronDown className="w-4 h-4 text-[var(--text-secondary)] shrink-0" />
              : <ChevronRight className="w-4 h-4 text-[var(--text-secondary)] shrink-0" />
            }
            <span className="font-medium text-[var(--text-primary)] text-sm">{gap.name}</span>

            {/* Mini progress bar */}
            <div className="flex-1 max-w-[200px]">
              <div className="w-full bg-[var(--bg-accent)] rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${
                    gap.completion >= 80 ? 'bg-green-500' : gap.completion >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${gap.completion}%` }}
                />
              </div>
            </div>
            <span className="text-xs text-[var(--text-secondary)] w-[40px] text-right">{gap.completion}%</span>

            {/* Type counts */}
            <div className="flex gap-2 text-xs">
              {Object.entries(TYPE_CONFIG).map(([key, cfg]) => {
                const target = gap.targets[key as keyof typeof gap.targets];
                const actual = gap.actual[key as keyof typeof gap.actual];
                const isDone = actual >= target;
                return (
                  <span key={key} className={`px-1.5 py-0.5 rounded ${cfg.bg} ${isDone ? cfg.color : 'text-[var(--text-secondary)]'}`}>
                    {cfg.label}: {actual}/{target}
                  </span>
                );
              })}
            </div>
          </button>

          {/* Expanded detail */}
          {expandedCluster === gap.name && (
            <div className="border-t border-[var(--border)] px-4 py-3 space-y-3">
              {/* Place checklist */}
              <div>
                <h4 className="text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                  Điểm đến ({gap.placeStatus.filter(p => p.done).length}/{gap.placeStatus.length})
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-1">
                  {gap.placeStatus.map(item => (
                    <div key={item.name} className="flex items-center gap-1.5 text-xs">
                      {item.done
                        ? <CheckCircle2 className="w-3.5 h-3.5 text-green-400 shrink-0" />
                        : <Circle className="w-3.5 h-3.5 text-[var(--text-secondary)] shrink-0" />
                      }
                      <span className={item.done ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}>
                        {item.name}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Food checklist */}
              <div>
                <h4 className="text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                  Ẩm thực ({gap.foodStatus.filter(p => p.done).length}/{gap.foodStatus.length})
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-1">
                  {gap.foodStatus.map(item => (
                    <div key={item.name} className="flex items-center gap-1.5 text-xs">
                      {item.done
                        ? <CheckCircle2 className="w-3.5 h-3.5 text-green-400 shrink-0" />
                        : <Circle className="w-3.5 h-3.5 text-[var(--text-secondary)] shrink-0" />
                      }
                      <span className={item.done ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}>
                        {item.name}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Missing warnings */}
              {gap.completion < 50 && (
                <div className="flex items-start gap-2 p-2 bg-yellow-500/10 border border-yellow-500/30 rounded text-xs text-yellow-400">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>
                    Cụm này còn thiếu nhiều content.
                    {gap.actual.food === 0 && ' Chưa có bài ẩm thực.'}
                    {gap.actual.guide === 0 && ' Chưa có bài hướng dẫn/top điểm đến.'}
                    {gap.actual.place < 3 && ' Cần thêm bài review điểm đến cụ thể.'}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
