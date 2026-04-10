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

export interface WPMedia {
  id: number;
  title: { rendered: string };
  alt_text: string;
  caption: { rendered: string };
  source_url: string;
  media_details?: {
    file?: string;
    width?: number;
    height?: number;
  };
  post: number | null; // parent post ID
  slug: string;
  mime_type: string;
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

  // Helper: request that also returns response headers (for pagination)
  private async requestWithHeaders<T>(endpoint: string, options?: RequestInit): Promise<{ data: T; totalPages: number; total: number }> {
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
    return {
      data: await res.json(),
      totalPages: parseInt(res.headers.get('X-WP-TotalPages') ?? '1', 10),
      total: parseInt(res.headers.get('X-WP-Total') ?? '0', 10),
    };
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

  // --- Media operations ---

  /** Fetch a single page of media items */
  async getMedia(params?: { per_page?: number; page?: number }): Promise<{ items: WPMedia[]; totalPages: number; total: number }> {
    const qs = new URLSearchParams();
    qs.set('per_page', String(params?.per_page ?? 100));
    qs.set('page', String(params?.page ?? 1));
    const { data, totalPages, total } = await this.requestWithHeaders<WPMedia[]>(`/media?${qs.toString()}`);
    return { items: data, totalPages, total };
  }

  /** Fetch ALL media items (auto-paginate) */
  async getAllMedia(): Promise<WPMedia[]> {
    const all: WPMedia[] = [];
    const first = await this.getMedia({ per_page: 100, page: 1 });
    all.push(...first.items);
    for (let page = 2; page <= first.totalPages; page++) {
      const batch = await this.getMedia({ per_page: 100, page });
      all.push(...batch.items);
    }
    return all;
  }

  /** Update media alt_text */
  async updateMediaAltText(mediaId: number, altText: string): Promise<WPMedia> {
    return this.request<WPMedia>(`/media/${mediaId}`, {
      method: 'POST',
      body: JSON.stringify({ alt_text: altText }),
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
