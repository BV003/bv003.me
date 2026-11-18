import { getPublishedPosts } from '../utils/posts';

// Reduce markdown to plain searchable text so the index stays small.
function toPlainText(md) {
  return md
    .replace(/```[\s\S]*?```/g, ' ') // fenced code blocks
    .replace(/\$\$[\s\S]*?\$\$/g, ' ') // display math
    .replace(/<[^>]+>/g, ' ') // html tags
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1') // images -> alt
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1') // links -> text
    .replace(/\[\^[^\]]*\]:?/g, ' ') // footnote refs
    .replace(/^\s{0,3}(#{1,6}|>|[-*+]|\d+\.)\s+/gm, '') // block markers
    .replace(/[*_~`|]+/g, ' ') // inline formatting, table pipes
    .replace(/\s+/g, ' ')
    .trim();
}

export async function GET() {
  const posts = await getPublishedPosts();

  const index = posts.map((post) => ({
    title: post.data.title,
    slug: post.data.slug,
    pubDate: post.data.pubDate,
    body: toPlainText(post.body ?? '').toLowerCase(),
  }));

  return new Response(JSON.stringify(index), {
    headers: { 'Content-Type': 'application/json' },
  });
}
