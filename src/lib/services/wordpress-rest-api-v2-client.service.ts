// ---------------------------------------------------------------------------
// WordPress REST API v2 Service
// ---------------------------------------------------------------------------

export interface WPPost {
  id: number;
  title: { rendered: string };
  slug: string;
  status: string;
  date: string;
  link: string;
  content?: { rendered: string };
  excerpt?: { rendered: string };
  categories?: number[];
  yoast_head_json?: {
    title?: string;
    description?: string;
    og_title?: string;
    og_description?: string;
  };
}

export interface WPCategory {
  id: number;
  name: string;
  slug: string;
  count: number;
}

export class WordPressAPI {
  private baseUrl: string;
  private authHeader: string;

  constructor(siteUrl: string, username: string, appPassword: string) {
    this.baseUrl = siteUrl.replace(/\/$/, '') + '/wp-json/wp/v2';
    this.authHeader = 'Basic ' + Buffer.from(`${username}:${appPassword}`).toString('base64');
  }

  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': this.authHeader,
        ...options?.headers,
      },
    });
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`WP API Error ${res.status}: ${errorText}`);
    }
    return res.json();
  }

  // --- Read operations ---

  async getPosts(params?: { per_page?: number; page?: number; search?: string; status?: string }): Promise<WPPost[]> {
    const qs = new URLSearchParams();
    if (params?.per_page) qs.set('per_page', String(params.per_page));
    if (params?.page) qs.set('page', String(params.page));
    if (params?.search) qs.set('search', params.search);
    if (params?.status) qs.set('status', params.status);
    return this.request<WPPost[]>(`/posts?${qs.toString()}`);
  }

  async getPages(params?: { per_page?: number }): Promise<WPPost[]> {
    const qs = new URLSearchParams();
    if (params?.per_page) qs.set('per_page', String(params.per_page));
    return this.request<WPPost[]>(`/pages?${qs.toString()}`);
  }

  async getCategories(): Promise<WPCategory[]> {
    return this.request<WPCategory[]>('/categories?per_page=100');
  }

  async getPost(id: number): Promise<WPPost> {
    return this.request<WPPost>(`/posts/${id}`);
  }

  // --- Write operations ---

  async createPost(data: { title: string; content: string; status?: string; categories?: number[] }): Promise<WPPost> {
    return this.request<WPPost>('/posts', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updatePost(id: number, data: Partial<{ title: string; content: string; status: string; categories: number[] }>): Promise<WPPost> {
    return this.request<WPPost>(`/posts/${id}`, {
      method: 'POST', // WP uses POST for updates too
      body: JSON.stringify(data),
    });
  }

  // SEO meta update via Yoast REST API
  async updateSeoMeta(postId: number, meta: { _yoast_wpseo_title?: string; _yoast_wpseo_metadesc?: string; _yoast_wpseo_focuskw?: string }): Promise<WPPost> {
    return this.request<WPPost>(`/posts/${postId}`, {
      method: 'POST',
      body: JSON.stringify({ meta }),
    });
  }

  // Test connection
  async testConnection(): Promise<boolean> {
    try {
      await this.request('/posts?per_page=1');
      return true;
    } catch {
      return false;
    }
  }
}
