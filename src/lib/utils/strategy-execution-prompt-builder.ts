export function generateDefaultAiPrompt(action: {
  title: string;
  description?: string;
  category?: string;
  priority?: string;
  platform_type?: string;
}): string {
  const categoryContext: Record<string, string> = {
    technical_seo: 'Đây là task Technical SEO. Hãy phân tích và đưa ra hướng dẫn kỹ thuật chi tiết.',
    on_page: 'Đây là task On-Page SEO. Tập trung vào tối ưu nội dung, meta tags, heading structure.',
    off_page: 'Đây là task Off-Page SEO. Tập trung vào link building, outreach, và authority.',
    content: 'Đây là task Content SEO. Tập trung vào chiến lược nội dung, keyword mapping, content gap.',
    geo: 'Đây là task GEO (Generative Engine Optimization). Tối ưu cho AI search engines.',
    aio: 'Đây là task AIO (AI Optimization). Tối ưu website cho AI crawlers và LLM.',
    aeo: 'Đây là task AEO (Answer Engine Optimization). Tối ưu cho featured snippets, PAA.',
    eeat: 'Đây là task E-E-A-T. Tăng Experience, Expertise, Authoritativeness, Trustworthiness.',
    sxo: 'Đây là task SXO (Search Experience Optimization). Kết hợp SEO + UX.',
  };

  const lines: string[] = [];
  lines.push('Hãy thực hiện nhiệm vụ SEO sau:');
  lines.push('');
  lines.push(`**Nhiệm vụ:** ${action.title}`);
  if (action.description) lines.push(`**Mô tả:** ${action.description}`);
  lines.push('');

  const categoryKey = action.category?.toLowerCase().replace(/[\s\-]/g, '_') ?? '';
  const ctx = categoryContext[categoryKey];
  if (ctx) lines.push(ctx);

  if (action.platform_type) {
    lines.push(`**Platform:** ${action.platform_type}`);
    if (action.platform_type === 'wordpress') {
      lines.push('Sử dụng WordPress REST API nếu cần thao tác trên website.');
    }
  }

  lines.push('');
  lines.push('**Yêu cầu output:**');
  lines.push('1. Phân tích tình trạng hiện tại');
  lines.push('2. Đề xuất các bước thực hiện cụ thể');
  lines.push('3. Checklist kiểm tra sau khi hoàn thành');
  lines.push('4. Ghi chú rủi ro hoặc lưu ý (nếu có)');

  return lines.join('\n');
}

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
  lines.push(`Dự án: ${params.project.name}${params.project.domain ? ` (${params.project.domain})` : ''}`);
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
