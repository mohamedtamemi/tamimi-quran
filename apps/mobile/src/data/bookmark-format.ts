export type BookmarkColor = 'olive' | 'gold' | 'blue' | 'rose';

export interface BookmarkDraft {
  surah_id: number;
  ayah_number: number;
  note: string;
  category: string;
  color: BookmarkColor;
}

export function parseBookmarkExport(serialized: string): BookmarkDraft[] {
  let payload: unknown;
  try {
    payload = JSON.parse(serialized);
  } catch {
    throw new Error('Invalid bookmark JSON.');
  }

  if (
    typeof payload !== 'object' ||
    payload === null ||
    !('format' in payload) ||
    payload.format !== 'tamimi-mushaf-bookmarks' ||
    !('version' in payload) ||
    payload.version !== 1 ||
    !('bookmarks' in payload) ||
    !Array.isArray(payload.bookmarks) ||
    payload.bookmarks.length > 6236
  ) {
    throw new Error('Unsupported or invalid bookmark export.');
  }

  const colors = new Set<BookmarkColor>(['olive', 'gold', 'blue', 'rose']);
  const parsed = payload.bookmarks.map((value, index): BookmarkDraft => {
    if (typeof value !== 'object' || value === null) {
      throw new Error(`Invalid bookmark at position ${index + 1}.`);
    }

    const row = value as Record<string, unknown>;
    if (
      !Number.isInteger(row.surah_id) ||
      !Number.isInteger(row.ayah_number) ||
      typeof row.note !== 'string' ||
      row.note.length > 2000 ||
      typeof row.category !== 'string' ||
      row.category.length > 80 ||
      typeof row.color !== 'string' ||
      !colors.has(row.color as BookmarkColor)
    ) {
      throw new Error(`Invalid bookmark at position ${index + 1}.`);
    }

    return {
      surah_id: row.surah_id as number,
      ayah_number: row.ayah_number as number,
      note: row.note,
      category: row.category,
      color: row.color as BookmarkColor,
    };
  });

  const seen = new Set<string>();
  for (const bookmark of parsed) {
    const key = `${bookmark.surah_id}:${bookmark.ayah_number}`;
    if (seen.has(key)) throw new Error('Duplicate ayah in bookmark export.');
    seen.add(key);
  }

  return parsed;
}
