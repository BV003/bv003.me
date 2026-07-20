import { getCollection } from 'astro:content';

export async function GET() {
  const posts = await getCollection('blog');

  const index = posts.map((post) => ({
    title: post.data.title,
    slug: post.data.slug,
    pubDate: post.data.pubDate,
    body: post.body || '',
  }));

  return new Response(JSON.stringify(index), {
    headers: { 'Content-Type': 'application/json' },
  });
}
