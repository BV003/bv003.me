// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeImageAttrs from './src/plugins/rehype-image-attrs.mjs';

// https://astro.build/config
export default defineConfig({
  site: 'https://bv003me.vercel.app',
  integrations: [sitemap()],
  markdown: {
    remarkPlugins: [remarkMath],
    rehypePlugins: [rehypeKatex, rehypeImageAttrs],
    syntaxHighlight: 'shiki',
    shikiConfig: {
      theme: 'github-light',
    },
  },
  // Optional: Configure output directory
  outDir: './dist',
});
