# bv003.me

A personal blog built with [Astro](https://astro.build). 

Live site: https://bv003me.vercel.app

## Build Your Own Blog

Ask your coding agent; it will tell you how to do this.

## How to Name

An example

```
File: table-manager-cache-manager-diff.md
Slug: table-manager-cache-manager-diff
Title: Key Differences Between TableManager and CacheManager
```

## Images

Images for a post live in `public/images/<slug>/`, named in English, and are referenced with absolute paths:

```md
![Architecture](/images/directkv/architecture.png)
```

- `npm run images`: compress oversized images (>1600px wide or >500KB) and strip EXIF. Safe to re-run.
- `npm run check:images`: also runs automatically before every build. A missing image fails the build; an image in the wrong folder, an unused image, or an oversized file produces a warning.
