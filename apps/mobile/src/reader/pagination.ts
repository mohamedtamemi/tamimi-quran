export interface AyahPageRange {
  start: number;
  end: number;
}

export interface JuzBoundary {
  juz_number: number;
  surah_id: number;
  ayah_number: number;
}

export function paginateByLines(
  lineCounts: readonly number[],
  firstPageCapacity: number,
  pageCapacity: number,
): AyahPageRange[] {
  if (
    lineCounts.length === 0 ||
    !Number.isInteger(firstPageCapacity) ||
    !Number.isInteger(pageCapacity) ||
    firstPageCapacity < 1 ||
    pageCapacity < 1 ||
    lineCounts.some((count) => !Number.isInteger(count) || count < 1)
  ) {
    return [];
  }

  const pages: AyahPageRange[] = [];
  let start = 0;
  let usedLines = 0;
  let capacity = firstPageCapacity;

  for (let index = 0; index < lineCounts.length; index += 1) {
    const lineCount = lineCounts[index];
    if (index > start && usedLines + lineCount > capacity) {
      pages.push({ start, end: index });
      start = index;
      usedLines = 0;
      capacity = pageCapacity;
    }
    usedLines += lineCount;
  }

  pages.push({ start, end: lineCounts.length });
  return pages;
}

export function findJuzNumber(
  boundaries: readonly JuzBoundary[],
  surahId: number,
  ayahNumber: number,
): number {
  let result = 1;
  for (const boundary of boundaries) {
    if (
      boundary.surah_id < surahId ||
      (boundary.surah_id === surahId && boundary.ayah_number <= ayahNumber)
    ) {
      result = Math.max(result, boundary.juz_number);
    }
  }
  return result;
}
