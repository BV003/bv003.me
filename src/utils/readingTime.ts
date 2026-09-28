export function getReadingTime(content: string): number {
  const chineseCharactersPerMinute = 400;
  const wordsPerMinute = 200;

  const chineseCharacters = content.match(/\p{Script=Han}/gu)?.length ?? 0;
  const contentWithoutChinese = content.replace(/\p{Script=Han}/gu, ' ');
  const words =
    contentWithoutChinese.match(/[\p{L}\p{N}]+(?:['’.-][\p{L}\p{N}]+)*/gu)
      ?.length ?? 0;

  const minutes =
    chineseCharacters / chineseCharactersPerMinute + words / wordsPerMinute;

  return Math.max(1, Math.ceil(minutes));
}
