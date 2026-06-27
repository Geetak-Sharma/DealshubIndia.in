import { getCollection } from 'astro:content';

export async function GET() {
  try {
    // 1. Get Blog Posts
    const blogPosts = await getCollection('blog');
    const blogResults = blogPosts.map(post => ({
      type: 'blog',
      title: post.data.title,
      url: `/blog/${post.slug}`,
      date: post.data.pubDate,
      category: post.data.category
    }));

    // 2. Sample of latest Deals (for search autocomplete)
    // In a real prod env, we might fetch from DB, but we'll use a mocked/latest variety here
    // For now, let's keep it minimal or fetch a fixed set for the index
    
    return new Response(JSON.stringify({
      blogs: blogResults
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json"
      }
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: "Failed to fetch index" }), { status: 500 });
  }
}
