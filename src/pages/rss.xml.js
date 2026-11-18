import rss from '@astrojs/rss';
import { getPublishedPosts, sortByDate } from '../utils/posts';

export async function GET(context) {
  const sortedPosts = sortByDate(await getPublishedPosts());

  return rss({
    title: 'Michael Liu',
    description: 'Personal blog of Michael Liu - AI research, engineering, and more.',
    site: context.site,
    items: sortedPosts.map((post) => ({
      title: post.data.title,
      pubDate: post.data.pubDate,
      link: `/blog/${post.data.slug}/`,
    })),
  });
}
