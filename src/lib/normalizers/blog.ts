export interface NormalizedBlog {
  id: string;
  slug: string;
  title: string;
  description: string;
  pubDate: Date;
  author: string;
  image?: string;
  category: string;
  tags: string[];
  readTime: string;
}

export function normalizeBlog(entry: any): NormalizedBlog | null {
  if (!entry || !entry.id) return null;

  // Use the entry ID (which matches filename without path) as the slug parameters
  const rawId = entry.id;
  const slug = rawId.replace(/\.md$/, '').replace(/\\/g, '/');

  const title = entry.data?.title || 'Expert Shopping Guide';
  const description = entry.data?.description || 'Learn how to maximize savings and spot hot loots.';
  const pubDate = entry.data?.pubDate ? new Date(entry.data.pubDate) : new Date();
  const author = entry.data?.author || 'DealsHub Team';
  const category = entry.data?.category || 'General';
  const tags = entry.data?.tags || [];

  // Designed cover visual fallback if cover image is missing
  const fallbackCover = 'https://dummyimage.com/600x400/0f172a/ffffff&text=DealsHub+Insights';
  const image = entry.data?.image || fallbackCover;

  // Simple dynamic read-time calculator based on standard 200 words-per-minute
  const bodyText = entry.body || '';
  const wordCount = bodyText.split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(1, Math.round(wordCount / 200));
  const readTime = `${minutes}-min read`;

  return {
    id: rawId,
    slug,
    title,
    description,
    pubDate,
    author,
    image,
    category,
    tags,
    readTime,
  };
}
