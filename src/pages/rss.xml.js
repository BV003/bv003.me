import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';

export async function GET(context) {
  const posts = await getCollection('blog');
  
  const sortedPosts = posts.sort((a, b) => b.data.pubDate.getTime() - a.data.pubDate.getTime());

  return rss({
    title: 'Michael Liu',
    description: 'Personal blog of Michael Liu - AI research, engineering, and more.',
    site: context.site,
    items: sortedPosts.map((post) => ({
      title: post.data.title,
      pubDate: post.data.pubDate,
      link: `/blog/${post.data.slug}/`,
      description: post.body ? post.body.slice(0, 300).replace(/[#*`\[\]>!\-]/g, '').replace(/\n+/g, ' ').trim() : '',
      content: post.body ? post.body.slice(0, 2000) : '',
    })),
  });
}
