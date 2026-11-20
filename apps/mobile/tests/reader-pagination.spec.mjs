import assert from 'node:assert/strict';
import test from 'node:test';

import { findJuzNumber, paginateByLines } from '../src/reader/pagination.ts';

test('pagination keeps ayahs in order and fills each page to its line capacity', () => {
  assert.deepEqual(
    paginateByLines([2, 1, 2, 1, 1], 3, 3),
    [
      { start: 0, end: 2 },
      { start: 2, end: 4 },
      { start: 4, end: 5 },
    ],
  );
});

test('the first page can reserve space for the surah heading', () => {
  assert.deepEqual(
    paginateByLines([2, 2, 1], 2, 4),
    [
      { start: 0, end: 1 },
      { start: 1, end: 3 },
    ],
  );
});

test('a long ayah stays intact on its own page', () => {
  assert.deepEqual(paginateByLines([1, 6, 1], 2, 3), [
    { start: 0, end: 1 },
    { start: 1, end: 2 },
    { start: 2, end: 3 },
  ]);
});

test('pagination waits for complete positive line measurements', () => {
  assert.deepEqual(paginateByLines([], 10, 10), []);
  assert.deepEqual(paginateByLines([1, 0, 2], 10, 10), []);
});

test('juz lookup handles boundaries before, within, and after the surah', () => {
  const boundaries = [
    { juz_number: 1, surah_id: 1, ayah_number: 1 },
    { juz_number: 2, surah_id: 2, ayah_number: 142 },
    { juz_number: 3, surah_id: 2, ayah_number: 253 },
  ];
  assert.equal(findJuzNumber(boundaries, 2, 141), 1);
  assert.equal(findJuzNumber(boundaries, 2, 200), 2);
  assert.equal(findJuzNumber(boundaries, 2, 286), 3);
});
