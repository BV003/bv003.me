# bv003.me

Personal blog of Weiqi Liu (Michael) - built with Astro.

## Features

- ⚡ **Fast** - Static site generation with Astro
- ✍️ **Markdown** - Write posts in Markdown
- 📱 **Responsive** - Clean, minimalist design
- 🎨 **Your Style** - Simple black text on white background
- 📡 **RSS Feed** - Auto-generated at `/rss.xml`
- 🗺️ **Sitemap** - SEO-friendly sitemap generation
- ⏱️ **Reading Time** - Calculated for each post

## Project Structure

```
├── src/
│   ├── components/     # Reusable UI components
│   ├── content/blog/   # Blog posts (Markdown)
│   ├── layouts/        # Page layouts
│   ├── pages/          # Routes
│   ├── styles/         # Global styles
│   └── utils/          # Utility functions
├── public/             # Static assets
└── dist/               # Build output
```

## Commands

| Command           | Action                                       |
|:------------------|:---------------------------------------------|
| `npm install`     | Installs dependencies                        |
| `npm run dev`     | Starts local dev server at `localhost:4321`  |
| `npm run build`   | Build your production site to `./dist/`      |
| `npm run preview` | Preview your build locally, before deploying |

## Adding a New Blog Post

1. Create a new `.md` file in `src/content/blog/YYYY/` (e.g., `src/content/blog/2026/my-post.md`)
2. Add frontmatter:

```markdown
---
title: "Your Post Title"
slug: "your-post-slug"
pubDate: 2026-01-31
description: "Brief description of your post"
---

Your content here...
```

3. Run `npm run build` to generate the static site

## Deployment

This site is configured for GitHub Pages. Push to your repository and enable GitHub Pages in settings.

## Customization

- **Colors**: Edit the CSS variables in `src/layouts/Layout.astro`
- **Content**: Update your About page in `src/pages/index.astro`
- **Links**: Update social links in `src/components/Footer.astro`

## Credits

Inspired by [steipete.me](https://steipete.me) - built with the same technology stack (Astro) but with a personal minimalist style.
