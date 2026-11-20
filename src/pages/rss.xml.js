import rss from '@astrojs/rss';
import { getPublishedPosts, sortByDate } from '../utils/posts';
import { SITE_DESCRIPTION, excerpt } from '../utils/seo';

export async function GET(context) {
  const sortedPosts = sortByDate(await getPublishedPosts());

  return rss({
    title: 'Michael Liu',
    description: SITE_DESCRIPTION,
    site: context.site,
    items: sortedPosts.map((post) => ({
      title: post.data.title,
      pubDate: post.data.pubDate,
      description: excerpt(post.body ?? ''),
      link: `/blog/${post.data.slug}/`,
    })),
  });
}
