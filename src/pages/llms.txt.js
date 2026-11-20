// /llms.txt: a plain-text map of the blog for AI assistants (https://llmstxt.org)
import { getPublishedPosts, sortByDate } from '../utils/posts';
import { SITE_DESCRIPTION, excerpt } from '../utils/seo';

export async function GET(context) {
  const posts = sortByDate(await getPublishedPosts());
  const site = context.site.href.replace(/\/$/, '');
  const date = (d) => d.toISOString().slice(0, 10);

  const lines = [
    "# Michael Liu's Blog",
    '',
    `> ${SITE_DESCRIPTION}`,
    '',
    'Author: Michael Liu (Weiqi Liu, 刘玮祺). Engineer who builds software and AI systems; M.S. student in ECE at the University of Washington.',
    'About the author: https://bv003.github.io/llms.txt',
    `RSS: ${site}/rss.xml`,
    '',
    '## Posts',
    '',
    ...posts.map((post) => {
      const tags = post.data.tags.length ? ` [${post.data.tags.join(', ')}]` : '';
      return `- [${post.data.title}](${site}/blog/${post.data.slug}/) (${date(post.data.pubDate)})${tags}: ${excerpt(post.body ?? '')}`;
    }),
    '',
  ];

  return new Response(lines.join('\n'), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
