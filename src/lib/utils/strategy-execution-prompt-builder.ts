// ─── Detailed category-specific instructions ─────────────────────────────────
const CATEGORY_INSTRUCTIONS: Record<string, { tools: string; steps: string[] }> = {
  technical_seo: {
    tools: 'Google Search Console, Screaming Frog, PageSpeed Insights, Chrome DevTools',
    steps: [
      'Kiểm tra hiện trạng kỹ thuật website (crawl errors, sitemap, robots.txt)',
      'Phân tích cụ thể vấn đề liên quan đến task',
      'Đưa ra code/config cần thay đổi (nếu có)',
      'Hướng dẫn verify sau khi fix',
    ],
  },
  on_page: {
    tools: 'Screaming Frog, Surfer SEO, Google Search Console',
    steps: [
      'Audit trang hiện tại: title, meta description, H1, heading structure',
      'Phân tích keyword density và semantic relevance',
      'Đề xuất nội dung cần tối ưu (viết lại title/meta/headings cụ thể)',
      'Kiểm tra internal linking opportunities',
    ],
  },
  off_page: {
    tools: 'Ahrefs, Majestic, Google Alerts, BuzzSumo',
    steps: [
      'Phân tích backlink profile hiện tại',
      'Xác định target websites cho link building',
      'Soạn outreach email template',
      'Lập kế hoạch link building theo tháng',
    ],
  },
  content: {
    tools: 'Google Search Console, Surfer SEO, ChatGPT/Claude, Google Trends',
    steps: [
      'Research keyword cluster cho topic',
      'Phân tích top 10 SERP competitors',
      'Outline bài viết với heading structure + word count target',
      'Viết content draft hoặc content brief chi tiết',
    ],
  },
  geo: {
    tools: 'ChatGPT, Perplexity, Google SGE, Bing Copilot',
    steps: [
      'Kiểm tra website có hiển thị trong AI search results không',
      'Tối ưu structured data (FAQ, HowTo, Article schema)',
      'Viết content dạng Q&A tự nhiên',
      'Thêm citations và sources cho factual claims',
    ],
  },
  aio: {
    tools: 'Chrome DevTools, Screaming Frog, Schema Markup Validator',
    steps: [
      'Kiểm tra AI crawler access (robots.txt rules cho GPTBot, ClaudeBot...)',
      'Tối ưu structured data cho AI understanding',
      'Đảm bảo content có format machine-readable',
      'Test với AI tools xem content có được index đúng không',
    ],
  },
  aeo: {
    tools: 'Google Search Console, AnswerThePublic, AlsoAsked',
    steps: [
      'Research câu hỏi phổ biến trong niche (PAA, FAQ)',
      'Viết content dạng trả lời trực tiếp (40-60 words cho featured snippet)',
      'Thêm FAQ schema markup',
      'Tối ưu heading structure cho answer boxes',
    ],
  },
  eeat: {
    tools: 'Google Search Console, LinkedIn, About page',
    steps: [
      'Audit author profiles và credentials',
      'Thêm/cập nhật trang About, Contact, Author bio',
      'Tạo author schema markup',
      'Thu thập reviews, testimonials, case studies',
    ],
  },
  sxo: {
    tools: 'Google Analytics, Hotjar, PageSpeed Insights, Core Web Vitals',
    steps: [
      'Phân tích user behavior metrics (bounce rate, time on page)',
      'Kiểm tra Core Web Vitals (LCP, FID, CLS)',
      'Tối ưu UX cho landing pages quan trọng',
      'A/B test CTA và layout improvements',
    ],
  },
};

// ─── Generate detailed AI prompt for a strategy action ────────────────────────
export function generateDefaultAiPrompt(action: {
  title: string;
  description?: string;
  category?: string;
  priority?: string;
  platform_type?: string;
}, context?: {
  projectName?: string;
  projectDomain?: string;
  phaseName?: string;
  phaseDescription?: string;
}): string {
  const lines: string[] = [];
  const catKey = action.category?.toLowerCase().replace(/[\s\-]/g, '_') ?? '';
  const catInfo = CATEGORY_INSTRUCTIONS[catKey];

  // Header with usage instructions
  lines.push('# Hướng dẫn thực thi SEO Action');
  lines.push('> Copy prompt này vào Claude Chat (chat.claude.ai) hoặc Claude Code để thực thi.');
  lines.push('> Sau khi có kết quả, paste lại vào ô "Kết quả thực thi" bên dưới.');
  lines.push('');

  // Project context
  if (context?.projectName || context?.projectDomain) {
    lines.push('## Bối cảnh dự án');
    if (context.projectName) lines.push(`- **Dự án:** ${context.projectName}`);
    if (context.projectDomain) lines.push(`- **Website:** https://${context.projectDomain.replace(/^https?:\/\//, '')}`);
    if (context.phaseName) lines.push(`- **Giai đoạn:** ${context.phaseName}${context.phaseDescription ? ` — ${context.phaseDescription}` : ''}`);
    lines.push('');
  }

  // Task details
  lines.push('## Nhiệm vụ cần thực hiện');
  lines.push(`**${action.title}**`);
  if (action.description) lines.push(`\n${action.description}`);
  if (action.priority) {
    const priorityLabels: Record<string, string> = {
      critical: '🔴 Cấp bách',
      high: '🟠 Cao',
      medium: '🟡 Trung bình',
      low: '🟢 Thấp',
    };
    lines.push(`\nĐộ ưu tiên: ${priorityLabels[action.priority] || action.priority}`);
  }
  lines.push('');

  // Category-specific instructions
  if (catInfo) {
    lines.push('## Công cụ cần dùng');
    lines.push(catInfo.tools);
    lines.push('');
    lines.push('## Các bước thực hiện');
    catInfo.steps.forEach((step, i) => {
      lines.push(`${i + 1}. ${step}`);
    });
    lines.push('');
  }

  // Platform-specific instructions
  if (action.platform_type) {
    lines.push('## Hướng dẫn theo platform');
    switch (action.platform_type) {
      case 'wordpress':
        lines.push('**WordPress** — Có thể thao tác qua:');
        lines.push('- WP Admin → dashboard của website');
        lines.push('- Yoast SEO / Rank Math plugin cho SEO meta');
        lines.push('- WordPress REST API để tự động hóa');
        if (context?.projectDomain) {
          lines.push(`- WP Admin: https://${context.projectDomain.replace(/^https?:\/\//, '')}/wp-admin/`);
        }
        break;
      case 'nextjs':
        lines.push('**Next.js** — Cần chỉnh sửa source code:');
        lines.push('- Metadata: app/layout.tsx hoặc page.tsx (export metadata)');
        lines.push('- Sitemap: app/sitemap.ts');
        lines.push('- Robots: app/robots.ts');
        lines.push('- Structured data: JSON-LD trong components');
        break;
      case 'custom':
        lines.push('**Custom platform** — Ghi chú lại các thay đổi cần làm:');
        lines.push('- File nào cần sửa');
        lines.push('- Code changes cụ thể');
        lines.push('- Cách deploy/publish');
        break;
      default:
        lines.push(`**${action.platform_type}** — Ghi chú hướng dẫn xử lý cụ thể.`);
    }
    lines.push('');
  }

  // Expected output format
  lines.push('## Format kết quả mong đợi');
  lines.push('Trả lời bằng tiếng Việt, format markdown:');
  lines.push('1. **Hiện trạng:** Phân tích tình trạng hiện tại');
  lines.push('2. **Đã thực hiện:** Liệt kê những gì đã làm (nếu có)');
  lines.push('3. **Hướng dẫn chi tiết:** Các bước cần làm tiếp');
  lines.push('4. **Checklist:** ☐ Danh sách kiểm tra');
  lines.push('5. **Lưu ý:** Rủi ro hoặc điều cần chú ý');

  return lines.join('\n');
}

// ─── Build full execution prompt (used by Copy Prompt button) ─────────────────
export function buildExecutionPrompt(params: {
  project: { name: string; domain?: string; industry?: string };
  phase: { name: string; description?: string };
  action: {
    title: string;
    description?: string;
    category?: string;
    priority?: string;
    ai_prompt?: string;
    platform_type?: string;
    implementation_notes?: string;
  };
}): string {
  const lines: string[] = [];

  lines.push('## Bối cảnh');
  lines.push(`Dự án: ${params.project.name}${params.project.domain ? ` (https://${params.project.domain.replace(/^https?:\/\//, '')})` : ''}`);
  if (params.project.industry) lines.push(`Ngành: ${params.project.industry}`);
  lines.push(`Giai đoạn: ${params.phase.name}${params.phase.description ? ` — ${params.phase.description}` : ''}`);
  lines.push('');

  lines.push('## Nhiệm vụ');
  lines.push(params.action.title);
  if (params.action.description) lines.push(params.action.description);
  if (params.action.category) lines.push(`Danh mục: ${params.action.category}`);
  if (params.action.priority) lines.push(`Độ ưu tiên: ${params.action.priority}`);
  lines.push('');

  if (params.action.ai_prompt) {
    lines.push('## Yêu cầu chi tiết');
    lines.push(params.action.ai_prompt);
    lines.push('');
  }

  if (params.action.platform_type) {
    lines.push(`## Platform: ${params.action.platform_type}`);
    lines.push('');
  }

  if (params.action.implementation_notes) {
    lines.push('## Ghi chú triển khai');
    lines.push(params.action.implementation_notes);
    lines.push('');
  }

  lines.push('## Yêu cầu output');
  lines.push('Trả lời bằng tiếng Việt. Nêu rõ các bước đã thực hiện và kết quả cụ thể.');

  return lines.join('\n');
}
