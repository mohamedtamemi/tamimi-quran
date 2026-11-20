import assert from 'node:assert/strict';
import test from 'node:test';

import { parseBookmarkExport } from '../src/data/bookmark-format.ts';
import {
  getSearchTerms,
  matchesSearchTerms,
  normalizeSearch,
} from '../src/utils/arabic.ts';

test('normalizes Quran diacritics and common alif spellings', () => {
  assert.equal(normalizeSearch('الْفَاتِحَة'), 'الفاتحة');
  assert.equal(normalizeSearch('إِنَّكَ'), 'انك');
});

test('normalizes transliteration and ayah references for search', () => {
  assert.equal(normalizeSearch('Al-Fātihah'), 'al fatihah');
  assert.equal(normalizeSearch('2:255'), '2 255');
  assert.equal(normalizeSearch('٢:٢٥٥'), '2 255');
  assert.equal(normalizeSearch('۲:۲۵۵'), '2 255');
});

test('returns no query when input contains only marks and punctuation', () => {
  assert.equal(normalizeSearch('ـَ،؟'), '');
});

test('matches all normalized search terms in Arabic text and references', () => {
  const corpus = [
    {
      reference: '1:1',
      text: normalizeSearch(
        'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ الْفَاتِحَة 1:1',
      ),
    },
    {
      reference: '2:255',
      text: normalizeSearch('اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ الْبَقَرَة 2:255'),
    },
  ];

  assert.deepEqual(
    corpus
      .filter((ayah) =>
        matchesSearchTerms(getSearchTerms('بسم الرحمن'), ayah.text),
      )
      .map((ayah) => ayah.reference),
    ['1:1'],
  );
  assert.deepEqual(
    corpus
      .filter((ayah) =>
        matchesSearchTerms(getSearchTerms('٢:٢٥٥'), ayah.text),
      )
      .map((ayah) => ayah.reference),
    ['2:255'],
  );
});

test('validates bookmark exports and rejects duplicate or malformed entries', () => {
  const validExport = JSON.stringify({
    format: 'tamimi-mushaf-bookmarks',
    version: 1,
    bookmarks: [
      {
        surah_id: 1,
        ayah_number: 1,
        note: '',
        category: '',
        color: 'olive',
      },
    ],
  });
  assert.deepEqual(parseBookmarkExport(validExport), [
    {
      surah_id: 1,
      ayah_number: 1,
      note: '',
      category: '',
      color: 'olive',
    },
  ]);

  const duplicateExport = JSON.stringify({
    format: 'tamimi-mushaf-bookmarks',
    version: 1,
    bookmarks: [
      { surah_id: 1, ayah_number: 1, note: '', category: '', color: 'olive' },
      { surah_id: 1, ayah_number: 1, note: '', category: '', color: 'gold' },
    ],
  });
  const malformedExport = JSON.stringify({
    format: 'tamimi-mushaf-bookmarks',
    version: 1,
    bookmarks: [
      {
        surah_id: 1,
        ayah_number: 1,
        note: 'note',
        category: '',
        color: 'not-a-color',
      },
    ],
  });

  assert.throws(() => parseBookmarkExport(duplicateExport));
  assert.throws(() => parseBookmarkExport(malformedExport));
});
