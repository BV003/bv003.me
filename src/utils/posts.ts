import { getCollection, type CollectionEntry } from 'astro:content';
import { getReadingTime } from './readingTime';

export type Post = CollectionEntry<'blog'>;

export function getPublishedPosts(): Promise<Post[]> {
  return getCollection('blog', ({ data }) => !data.draft);
}

export function sortByDate(posts: Post[]): Post[] {
  return [...posts].sort((a, b) => b.data.pubDate.getTime() - a.data.pubDate.getTime());
}

/** Pinned posts first, then newest first, each annotated with reading time. */
export function toPostList(posts: Post[]) {
  return sortByDate(posts)
    .sort((a, b) => Number(b.data.pinned) - Number(a.data.pinned))
    .map((post) => ({ ...post, readingTime: getReadingTime(post.body ?? '') }));
}

const MATH_RE = /\$\$|\$[^$\s][^$\n]*\$/;

export function hasMath(body: string | undefined): boolean {
  return MATH_RE.test(body ?? '');
}
