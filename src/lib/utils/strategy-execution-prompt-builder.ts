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
