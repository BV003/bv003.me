// Markdown turns a soft line break into whitespace, which browsers render as a
// visible space between Chinese sentences. Drop the break when it sits after
// CJK punctuation or between two CJK characters; other breaks stay spaces.
const CJK = '\\p{Script=Han}\\u3000-\\u303f\\uff00-\\uffef';
const CJK_PUNCT = '\\u3000-\\u303f\\uff01-\\uff0f\\uff1a-\\uff1f\\uff3b-\\uff40\\uff5b-\\uff65';
const BREAK_RE = new RegExp(`(?<=[${CJK_PUNCT}])[ \\t]*\\n[ \\t]*|(?<=[${CJK}])[ \\t]*\\n[ \\t]*(?=[${CJK}])`, 'gu');
const SKIP = new Set(['pre', 'code', 'script', 'style']);

function walk(node) {
  if (node.type === 'text') {
    if (node.value.includes('\n')) node.value = node.value.replace(BREAK_RE, '');
    return;
  }
  if (node.type === 'element' && SKIP.has(node.tagName)) return;
  for (const child of node.children ?? []) walk(child);
}

export default function rehypeCjkLinebreak() {
  return (tree) => walk(tree);
}
