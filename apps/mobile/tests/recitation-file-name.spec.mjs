import assert from 'node:assert/strict';
import test from 'node:test';

import { createRecitationFileName } from '../src/audio/file-name.ts';

test('recitation filenames cannot escape the local audio directory', () => {
  const fileName = createRecitationFileName(2, '../../ قارئ /..', 'mp3');

  assert.match(fileName, /^2-قارئ-[a-z0-9]+\.mp3$/u);
  assert.equal(fileName.includes('..'), false);
  assert.equal(fileName.includes('/'), false);
});
