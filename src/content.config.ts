import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const blog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    slug: z.string(),
    pubDate: z.coerce.date(),
    description: z.string().optional(),
    pinned: z.boolean().optional().default(false),
  }),
});

export const collections = { blog };
