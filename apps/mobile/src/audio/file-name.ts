export function createRecitationFileName(
  surahId: number,
  reciterName: string,
  extension: string,
): string {
  const safeReciter = reciterName
    .normalize('NFKC')
    .trim()
    .replace(/[^\p{L}\p{N}_-]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
  return `${surahId}-${safeReciter || 'reciter'}-${Date.now().toString(36)}.${extension}`;
}
