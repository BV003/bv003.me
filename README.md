# bv003.me

Personal blog of Weiqi Liu (Michael) - built with Astro.

## Features

- ⚡ **Fast** - Static site generation with Astro
- ✍️ **Markdown** - Write posts in Markdown
- 📐 **Math Support** - KaTeX for math formulas
- 📱 **Responsive** - Clean, minimalist design
- 🎨 **Your Style** - Simple black text on white background
- 📡 **RSS Feed** - Auto-generated at `/rss.xml`
- 🗺️ **Sitemap** - SEO-friendly

## Commands

| Command           | Action                                       |
|:------------------|:---------------------------------------------|
| `npm install`     | Installs dependencies                        |
| `npm run dev`     | Starts local dev server at `localhost:4321`  |
| `npm run build`   | Build your production site to `./dist/`      |
| `npm run preview` | Preview your build locally                   |

## Writing Posts

1. Create a new `.md` file in `src/content/blog/YYYY/`
2. Add frontmatter:

```markdown
---
title: "Your Post Title"
slug: "your-post-slug"
pubDate: 2026-01-31
description: "Brief description"
---

Your content here...
```

3. For math formulas, use `$...$` for inline or `$$...$$` for blocks

## Deployment

### Option 1: Connect GitHub to Vercel (Recommended)

1. Push your code to a GitHub repository
2. Go to [vercel.com](https://vercel.com) and sign up/login
3. Click "Add New Project"
4. Import your GitHub repository
5. Vercel will auto-detect Astro and configure everything
6. Click "Deploy"

Your site will be live at `https://your-project.vercel.app`

### Option 2: Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy
vercel

# For production deployment
vercel --prod
```

### Option 3: Git Push (with Vercel Git Integration)

After connecting your repo, every push to `main` branch will auto-deploy!

```bash
git add .
git commit -m "Initial blog setup"
git push origin main
```

## Custom Domain (Optional)

1. In Vercel dashboard, go to your project → Settings → Domains
2. Add your custom domain
3. Follow DNS configuration instructions
4. Update `astro.config.mjs` with your domain:

```js
site: 'https://yourdomain.com',
```

## Project Structure

```
├── src/
│   ├── components/     # UI components
│   ├── content/blog/   # Blog posts (Markdown)
│   ├── layouts/        # Page layouts
│   ├── pages/          # Routes
│   └── utils/          # Helpers
├── public/             # Static assets
└── dist/               # Build output
```

## Credits

Built with [Astro](https://astro.build) + [KaTeX](https://katex.org)




## Next

  🚀 Deploy to Vercel

  Quick Steps:

  1. Push to GitHub

  cd /mnt/d/home/bv003.me

  # Add all files
  git add .

  # Commit
  git commit -m "Initial blog setup with Astro"

  # Push (replace with your repo URL)
  git remote add origin https://github.com/bv003/blog.git
  git push -u origin main

  2. Deploy on Vercel

  # Install Vercel CLI (once)
  npm i -g vercel

  # Login
  vercel login

  # Deploy (from project directory)
  cd /mnt/d/home/bv003.me
  vercel

  Follow the prompts:

  • Set up and deploy? Yes
  • Which scope? Select your account
  • Link to existing project? No
  • Project name? (e.g., bv003-blog)
  • Directory? ./ (current)

  3. Get your URL After deployment, you'll see:

  🔍  Inspect: https://vercel.com/yourname/bv003-blog/xxxxx
  ✅  Production: https://bv003-blog.vercel.app

  🔄 Auto-Deploy Setup

  For automatic deployments on every git push:

  1. Go to vercel.com/dashboard
  2. Find your project → Settings → Git
  3. Connect your GitHub repository
  4. Enable "Auto-deploy on push"

  Now every git push will automatically deploy!

  📝 After Deployment

  Update your site URL in astro.config.mjs:

  site: 'https://bv003-blog.vercel.app',  // Replace with your actual URL

  Then redeploy:

  vercel --prod

  ✅ Files Ready for Deployment

  Your project is ready with:

  • ✅ vercel.json - Vercel configuration
  • ✅ astro.config.mjs - Astro settings
  • ✅ Static output configured
  • ✅ All dependencies in package.json

  Want me to help with anything else?