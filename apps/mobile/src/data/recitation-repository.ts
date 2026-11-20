import type { SQLiteDatabase } from 'expo-sqlite';

export interface RecitationTrack {
  id: number;
  surah_id: number;
  surah_name_ar: string;
  reciter_name: string;
  file_uri: string;
  file_size: number;
  added_at: string;
}

export interface RecitationRepository {
  listTracks(): Promise<RecitationTrack[]>;
  getTrack(surahId: number, reciterName: string): Promise<RecitationTrack | null>;
  saveTrack(
    surahId: number,
    reciterName: string,
    fileUri: string,
    fileSize: number,
  ): Promise<void>;
  removeTrack(id: number): Promise<void>;
}

export function createRecitationRepository(
  db: SQLiteDatabase,
): RecitationRepository {
  const trackQuery = `
    SELECT tracks.id, tracks.surah_id, surahs.name_ar AS surah_name_ar,
           tracks.reciter_name, tracks.file_uri, tracks.file_size, tracks.added_at
    FROM recitation_tracks AS tracks
    JOIN surahs ON surahs.id = tracks.surah_id
  `;

  return {
    listTracks() {
      return db.getAllAsync<RecitationTrack>(
        `${trackQuery} ORDER BY tracks.surah_id, tracks.reciter_name COLLATE NOCASE`,
      );
    },

    getTrack(surahId, reciterName) {
      return db.getFirstAsync<RecitationTrack>(
        `${trackQuery} WHERE tracks.surah_id = ? AND tracks.reciter_name = ?`,
        surahId,
        reciterName,
      );
    },

    async saveTrack(surahId, reciterName, fileUri, fileSize) {
      await db.runAsync(
        `INSERT INTO recitation_tracks
           (surah_id, reciter_name, file_uri, file_size)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(surah_id, reciter_name) DO UPDATE SET
           file_uri = excluded.file_uri,
           file_size = excluded.file_size,
           added_at = CURRENT_TIMESTAMP`,
        surahId,
        reciterName.trim(),
        fileUri,
        fileSize,
      );
    },

    async removeTrack(id) {
      await db.runAsync('DELETE FROM recitation_tracks WHERE id = ?', id);
    },
  };
}
