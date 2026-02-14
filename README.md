# bv003.me

A minimal, beautiful personal blog built with [Astro](https://astro.build). Features clean typography, math formula support (KaTeX), RSS feed, and automatic sitemap generation.

**Live site:** https://bv003me.vercel.app

## Features

- ⚡ **Fast** - Static site generation
- ✍️ **Markdown** - Write posts in Markdown with frontmatter
- 📐 **Math Support** - KaTeX for `$inline$` and `$$block$$` math
- 📝 **Typography** - Beautiful heading hierarchy and spacing
- 📡 **RSS Feed** - Auto-generated at `/rss.xml`
- 🗺️ **Sitemap** - SEO-friendly
- 🎨 **Minimal Design** - Clean black text on white background

## Project Structure

```
├── src/
│   ├── components/          # Reusable components (Header, PostCard)
│   ├── content/blog/        # Blog posts organized by year
│   │   └── 2026/
│   │       ├── first-post.md
│   │       └── another-post.md
│   ├── layouts/
│   │   └── Layout.astro     # Base HTML layout with global styles
│   ├── pages/
│   │   ├── index.astro      # Homepage with post list
│   │   ├── blog/[slug].astro # Individual post pages
│   │   └── rss.xml.js       # RSS feed generation
│   └── utils/               # Helper functions (date, reading time)
├── public/
│   ├── profile.png          # Your favicon/site icon
│   └── images/              # Blog images
├── astro.config.mjs         # Astro configuration
└── package.json
```

## Build Your Own Blog

### 1. Fork This Repository

Click the "Fork" button on GitHub to create your own copy.

### 2. Clone and Setup

```bash
git clone https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
cd YOUR_REPO_NAME
npm install
```

### 3. Customize

**Update site info in `astro.config.mjs`:**
```javascript
site: 'https://your-site-url.vercel.app',
```

**Replace favicon:**
- Put your image as `public/profile.png`

**Update header links in `src/components/Header.astro`:**
```astro
<a href="https://your-website.com">Website</a>
```

### 4. Add Your First Post

Create a file in `src/content/blog/2026/my-first-post.md`:

```markdown
---
title: "My First Post"
slug: "my-first-post"
pubDate: 2026-02-07
description: "A brief description of this post"
---

## Introduction

Write your content here using **Markdown**.

### Math Example

Inline math: $E = mc^2$

Block math:
$$
\int_{-\infty}^{\infty} e^{-x^2} dx = \sqrt{\pi}
$$

### Lists

- Item 1
- Item 2
- Item 3
```

**Frontmatter fields:**
- `title` - Post title (required)
- `slug` - URL-friendly identifier (required)
- `pubDate` - Publication date (YYYY-MM-DD format)
- `description` - Brief summary

### 5. Local Development

```bash
npm run dev
```

Visit `http://localhost:4321` to preview.

### 6. Deploy to Vercel

**Option A: Vercel CLI (Quick)**

```bash
# Install Vercel CLI
npm i -g vercel

# Login (opens browser)
vercel login

# Deploy
vercel --prod
```

**Option B: GitHub Integration (Recommended)**

1. Push your code to GitHub:
```bash
git add .
git commit -m "Initial blog setup"
git push origin main

```

2. Go to [vercel.com](https://vercel.com), sign up with GitHub
3. Click "Add New Project"
4. Import your repository
5. Vercel auto-detects Astro, click "Deploy"
6. **Enable auto-deploy:** Project Settings → Git → Enable "Auto-deploy on push"

Now every `git push` automatically deploys your blog!

## Add Images to Posts

1. Place images in `public/images/`
2. Reference in Markdown:

```markdown
![Alt text](/images/my-photo.jpg)
```

## Update Your Blog

**To add a new post:**
```bash
# Create new post file
# Edit in your favorite editor
# Deploy
vercel --prod
```

**Or with Git auto-deploy:**
```bash
git add .
git commit -m "Add new post"
git push origin main  # Auto-deploys!
```

## Custom Domain (Optional)

1. In Vercel dashboard: Project → Settings → Domains
2. Add your domain
3. Update `astro.config.mjs`:
```javascript
site: 'https://yourdomain.com',
```

## Commands Reference

| Command | Action |
|:--------|:-------|
| `npm run dev` | Start dev server at `localhost:4321` |
| `npm run build` | Build production site to `./dist/` |
| `npm run preview` | Preview build locally |
| `vercel --prod` | Deploy to production |

## Credits

Built with [Astro](https://astro.build) + [KaTeX](https://katex.org) + [Tailwind CSS](https://tailwindcss.com)
