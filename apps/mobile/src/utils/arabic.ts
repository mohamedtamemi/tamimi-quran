const arabicDigits = '٠١٢٣٤٥٦٧٨٩';
const persianDigits = '۰۱۲۳۴۵۶۷۸۹';

export function toArabicDigits(value: number | string): string {
  return String(value).replace(/\d/g, (digit) => arabicDigits[Number(digit)]);
}

export function normalizeSearch(value: string): string {
  return value
    .toLocaleLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036F\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]/g, '')
    .replace(/ـ/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/[٠-٩]/g, (digit) => String(arabicDigits.indexOf(digit)))
    .replace(/[۰-۹]/g, (digit) => String(persianDigits.indexOf(digit)))
    .replace(/[\u0600-\u0605\u0609\u060A\u060C-\u061F\u066A-\u066D\u06D4]/g, ' ')
    .replace(/[^\w\u0600-\u08FF\s]/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

export function getSearchTerms(value: string): string[] {
  return normalizeSearch(value).split(' ').filter(Boolean);
}

export function matchesSearchTerms(
  terms: readonly string[],
  normalizedText: string,
): boolean {
  return terms.length > 0 && terms.every((term) => normalizedText.includes(term));
}
