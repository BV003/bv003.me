// Helpers for search engines and AI crawlers: post summaries, language, and the author identity.

/** The author, shared by every page's structured data. `@id` matches the homepage's Person entity. */
export const AUTHOR = {
  '@type': 'Person',
  '@id': 'https://bv003.github.io/#person',
  name: 'Michael Liu',
  alternateName: ['Weiqi Liu', '刘玮祺'],
  url: 'https://bv003.github.io/',
} as const;

export const SITE_DESCRIPTION =
  "Michael Liu (刘玮祺)'s blog on tech, money, life, and fiction, in English and Chinese.";

const CJK_RE = /[㐀-鿿]/g;

/** Plain-text summary of a Markdown post, for meta descriptions and llms.txt. */
export function excerpt(markdown: string, maxChars = 160): string {
  const text = markdown
    .replace(/```[\s\S]*?```/g, ' ') // code blocks
    .replace(/\$\$[\s\S]*?\$\$/g, ' ') // display math
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ') // images
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1') // links -> link text
    .replace(/<[^>]+>/g, ' ') // inline HTML
    .replace(/^\s{0,3}#{1,6}\s.*$/gm, ' ') // headings: snippets should start with prose
    .replace(/^\s{0,3}(>|[-*+]|\d+\.)\s+/gm, '') // quotes, list markers
    .replace(/[*_`~|]/g, '') // emphasis, code ticks, table pipes
    .replace(/\s+/g, ' ')
    .trim();
  // Chinese packs more meaning per character, so use about half the length
  const limit = isChinese(text) ? Math.round(maxChars / 2) : maxChars;
  if (text.length <= limit) return text;
  const cut = text.slice(0, limit);
  const lastSpace = cut.lastIndexOf(' ');
  return (lastSpace > limit * 0.6 ? cut.slice(0, lastSpace) : cut).trim() + '…';
}

/** True when CJK characters make up a meaningful share of the text. */
export function isChinese(text: string): boolean {
  const sample = text.slice(0, 2000);
  const cjk = sample.match(CJK_RE)?.length ?? 0;
  const letters = sample.replace(/\s/g, '').length || 1;
  return cjk / letters > 0.2;
}
