export const TAGS = ['Tech', 'Money', 'Life', 'Fiction'] as const;
export type Tag = (typeof TAGS)[number];
