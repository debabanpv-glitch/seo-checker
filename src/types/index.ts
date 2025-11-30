export type CheckStatus = 'pass' | 'warning' | 'fail';

export interface Check {
  id: string;
  name: string;
  status: CheckStatus;
  current: string | number;
  expected: string;
  suggestion: string;
  score: number;
  maxScore: number;
}

export interface Module {
  id: string;
  name: string;
  score: number;
  maxScore: number;
  checks: Check[];
}

export type ArticleType =
  | 'destination'
  | 'food'
  | 'guide'
  | 'review'
  | 'news'
  | 'product'
  | 'faq'
  | 'video'
  | 'article';

export interface SEOCheckRequest {
  url: string;
  keywords: string[];
  brandName: string;
}

export interface SEOCheckResult {
  url: string;
  title: string;
  wordCount: number;
  articleType: ArticleType;
  totalScore: number;
  maxScore: number;
  modules: Module[];
}

export interface PageData {
  url: string;
  html: string;
  title: string;
  metaDescription: string;
  h1: string[];
  h2: string[];
  h3: string[];
  h4: string[];
  h5: string[];
  h6: string[];
  paragraphs: string[];
  images: ImageData[];
  internalLinks: LinkData[];
  externalLinks: LinkData[];
  bodyText: string;
  wordCount: number;
  articleType: ArticleType;
  canonical: string | null;
  ogTitle: string | null;
  ogDescription: string | null;
  ogImage: string | null;
  twitterCard: string | null;
  twitterTitle: string | null;
  twitterDescription: string | null;
  schemas: SchemaData[];
  author: string | null;
  authorLink: string | null;
  publishDate: string | null;
  modifiedDate: string | null;
  hasLazyLoading: boolean;
  lists: ListData[];
  tables: number;
}

export interface ImageData {
  src: string;
  alt: string;
  caption: string | null;
  hasLazyLoading: boolean;
}

export interface LinkData {
  href: string;
  text: string;
  target: string | null;
  position: number; // word position in text
}

export interface SchemaData {
  type: string;
  data: Record<string, unknown>;
}

export interface ListData {
  type: 'ul' | 'ol';
  items: string[];
}

export interface AISuggestionRequest {
  result: SEOCheckResult;
  keywords: string[];
  brandName: string;
}
