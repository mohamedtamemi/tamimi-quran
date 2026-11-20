import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createOnlineTrack,
  getOnlineRecitationUrl,
  ONLINE_RECITERS,
} from '../src/audio/online-recitation.ts';

test('online recitation URLs use three-digit surah filenames', () => {
  const reciter = ONLINE_RECITERS[0];
  assert.equal(
    getOnlineRecitationUrl(reciter, 2),
    'https://download.quranicaudio.com/quran/mishaari_raashid_al_3afaasee/002.mp3',
  );
  assert.equal(
    getOnlineRecitationUrl(reciter, 114),
    'https://download.quranicaudio.com/quran/mishaari_raashid_al_3afaasee/114.mp3',
  );
});

test('online recitation rejects surah IDs outside the canonical index', () => {
  for (const surahId of [0, 115, 1.5, Number.NaN]) {
    assert.throws(() => getOnlineRecitationUrl(ONLINE_RECITERS[0], surahId));
  }
});

test('online tracks are marked as streams and retain reciter attribution', () => {
  const track = createOnlineTrack(ONLINE_RECITERS[1], {
    id: 2,
    name_ar: 'البقرة',
  });
  assert.equal(track.source, 'stream');
  assert.equal(track.reciter_name, 'محمد صديق المنشاوي');
  assert.equal(track.file_uri.endsWith('/002.mp3'), true);
});
