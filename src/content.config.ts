import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';
import { TAGS } from './consts';

// Treat `YYYY-M-D` dates as UTC midnight. JS parses non-zero-padded dates in the
// build machine's local timezone, which can shift the displayed day.
const utcDate = z.preprocess((value) => {
  const m = typeof value === 'string' && value.trim().match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  return m ? new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])) : value;
}, z.coerce.date());

const blog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    slug: z.string(),
    pubDate: utcDate,
    draft: z.boolean().optional().default(false),
    pinned: z.boolean().optional().default(false),
    tags: z.enum(TAGS).array().optional().default([]),
  }),
});

export const collections = { blog };
