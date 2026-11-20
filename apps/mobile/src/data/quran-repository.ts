import type { SQLiteDatabase } from 'expo-sqlite';

import {
  getSearchTerms,
  matchesSearchTerms,
  normalizeSearch,
} from '../utils/arabic';
import {
  parseBookmarkExport,
  type BookmarkColor,
  type BookmarkDraft,
} from './bookmark-format';

export type { BookmarkColor, BookmarkDraft } from './bookmark-format';

export interface SurahSummary {
  id: number;
  name_ar: string;
  transliteration: string;
  name_en: string;
  revelation: 'meccan' | 'medinan';
  ayah_count: number;
}

export interface Ayah {
  surah_id: number;
  ayah_number: number;
  text_ar: string;
}

export interface Surah extends SurahSummary {
  ayahs: Ayah[];
}

export interface JuzStart {
  juz_number: number;
  surah_id: number;
  ayah_number: number;
}

export interface ReadingProgress {
  surah_id: number;
  ayah_number: number;
  updated_at: string;
}

export interface Bookmark {
  id: number;
  surah_id: number;
  ayah_number: number;
  note: string;
  category: string;
  color: BookmarkColor;
  created_at: string;
}

export interface BookmarkWithSurah extends Bookmark {
  surah_name_ar: string;
  surah_name_en: string;
  text_ar: string;
}

export interface SearchResult extends Ayah {
  surah_name_ar: string;
  transliteration: string;
  name_en: string;
}

export interface CommentaryEntry {
  source_id: string;
  source_name: string;
  license: string;
  source_url: string;
  start_ayah: number;
  end_ayah: number;
  text: string;
}

export interface QuranRepository {
  listSurahs(search?: string): Promise<SurahSummary[]>;
  listJuzStarts(): Promise<JuzStart[]>;
  getSurah(surahId: number): Promise<Surah | null>;
  getBasmala(): Promise<string>;
  getJuzNumber(surahId: number, ayahNumber: number): Promise<number>;
  getReadingProgress(): Promise<ReadingProgress | null>;
  saveReadingProgress(surahId: number, ayahNumber: number): Promise<void>;
  searchAyahs(query: string): Promise<SearchResult[]>;
  getBookmark(surahId: number, ayahNumber: number): Promise<Bookmark | null>;
  listBookmarks(): Promise<BookmarkWithSurah[]>;
  saveBookmark(bookmark: BookmarkDraft): Promise<void>;
  removeBookmark(surahId: number, ayahNumber: number): Promise<void>;
  exportBookmarks(): Promise<string>;
  importBookmarks(serialized: string): Promise<number>;
  getTafsir(
    surahId: number,
    ayahNumber: number,
    sourceId: string,
  ): Promise<CommentaryEntry | null>;
  getIrab(surahId: number, ayahNumber: number): Promise<CommentaryEntry | null>;
}

export async function initializeDatabase(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS reading_progress (
      singleton INTEGER PRIMARY KEY CHECK (singleton = 1),
      surah_id INTEGER NOT NULL,
      ayah_number INTEGER NOT NULL,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS bookmarks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      surah_id INTEGER NOT NULL,
      ayah_number INTEGER NOT NULL,
      note TEXT NOT NULL DEFAULT '',
      category TEXT NOT NULL DEFAULT '',
      color TEXT NOT NULL DEFAULT 'olive'
        CHECK (color IN ('olive', 'gold', 'blue', 'rose')),
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (surah_id, ayah_number),
      FOREIGN KEY (surah_id, ayah_number)
        REFERENCES ayahs (surah_id, ayah_number) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS tafsir_entries (
      source_id TEXT NOT NULL,
      source_name TEXT NOT NULL,
      license TEXT NOT NULL CHECK (length(trim(license)) > 0),
      source_url TEXT NOT NULL CHECK (source_url LIKE 'https://%'),
      surah_id INTEGER NOT NULL,
      start_ayah INTEGER NOT NULL,
      end_ayah INTEGER NOT NULL CHECK (end_ayah >= start_ayah),
      text TEXT NOT NULL,
      PRIMARY KEY (source_id, surah_id, start_ayah, end_ayah)
    );
    CREATE INDEX IF NOT EXISTS tafsir_entries_lookup
      ON tafsir_entries (source_id, surah_id, start_ayah, end_ayah);
    CREATE TABLE IF NOT EXISTS irab_entries (
      source_id TEXT NOT NULL,
      source_name TEXT NOT NULL,
      license TEXT NOT NULL CHECK (length(trim(license)) > 0),
      source_url TEXT NOT NULL CHECK (source_url LIKE 'https://%'),
      surah_id INTEGER NOT NULL,
      ayah_number INTEGER NOT NULL,
      text TEXT NOT NULL,
      PRIMARY KEY (source_id, surah_id, ayah_number)
    );
    CREATE INDEX IF NOT EXISTS irab_entries_lookup
      ON irab_entries (surah_id, ayah_number);
    CREATE TABLE IF NOT EXISTS recitation_tracks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      surah_id INTEGER NOT NULL,
      reciter_name TEXT NOT NULL CHECK (length(trim(reciter_name)) > 0),
      file_uri TEXT NOT NULL,
      file_size INTEGER NOT NULL CHECK (file_size >= 0),
      added_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (surah_id, reciter_name),
      FOREIGN KEY (surah_id) REFERENCES surahs (id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS recitation_tracks_surah
      ON recitation_tracks (surah_id, reciter_name);
  `);
}

export function createQuranRepository(db: SQLiteDatabase): QuranRepository {
  let searchCorpus: Promise<(SearchResult & { normalizedText: string })[]> | null =
    null;

  return {
    async listSurahs(search = '') {
      const query = search.trim();
      if (!query) {
        return db.getAllAsync<SurahSummary>(
          'SELECT * FROM surahs ORDER BY id',
        );
      }

      const pattern = `%${query}%`;
      return db.getAllAsync<SurahSummary>(
        `SELECT * FROM surahs
         WHERE CAST(id AS TEXT) LIKE ?
           OR name_ar LIKE ?
           OR transliteration LIKE ?
           OR name_en LIKE ?
         ORDER BY id`,
        pattern,
        pattern,
        pattern,
        pattern,
      );
    },

    listJuzStarts() {
      return db.getAllAsync<JuzStart>(
        'SELECT * FROM juz_starts ORDER BY juz_number',
      );
    },

    async getSurah(surahId) {
      const surah = await db.getFirstAsync<SurahSummary>(
        'SELECT * FROM surahs WHERE id = ?',
        surahId,
      );
      if (!surah) return null;

      const ayahs = await db.getAllAsync<Ayah>(
        'SELECT * FROM ayahs WHERE surah_id = ? ORDER BY ayah_number',
        surahId,
      );
      return { ...surah, ayahs };
    },

    async getBasmala() {
      const ayah = await db.getFirstAsync<{ text_ar: string }>(
        'SELECT text_ar FROM ayahs WHERE surah_id = 1 AND ayah_number = 1',
      );
      if (!ayah) throw new Error('The bundled Quran database is missing Al-Fatiha 1:1.');
      return ayah.text_ar;
    },

    async getJuzNumber(surahId, ayahNumber) {
      const row = await db.getFirstAsync<{ juz_number: number }>(
        `SELECT juz_number FROM juz_starts
         WHERE surah_id < ? OR (surah_id = ? AND ayah_number <= ?)
         ORDER BY juz_number DESC LIMIT 1`,
        surahId,
        surahId,
        ayahNumber,
      );
      return row?.juz_number ?? 1;
    },

    getReadingProgress() {
      return db.getFirstAsync<ReadingProgress>(
        'SELECT surah_id, ayah_number, updated_at FROM reading_progress WHERE singleton = 1',
      );
    },

    async saveReadingProgress(surahId, ayahNumber) {
      await db.runAsync(
        `INSERT INTO reading_progress (singleton, surah_id, ayah_number, updated_at)
         VALUES (1, ?, ?, CURRENT_TIMESTAMP)
         ON CONFLICT(singleton) DO UPDATE SET
           surah_id = excluded.surah_id,
           ayah_number = excluded.ayah_number,
           updated_at = CURRENT_TIMESTAMP`,
        surahId,
        ayahNumber,
      );
    },

    async searchAyahs(query) {
      const terms = getSearchTerms(query);
      if (terms.length === 0) return [];

      if (!searchCorpus) {
        searchCorpus = db
          .getAllAsync<SearchResult>(
            `SELECT ayahs.surah_id, ayahs.ayah_number, ayahs.text_ar,
                    surahs.name_ar AS surah_name_ar,
                    surahs.transliteration, surahs.name_en
             FROM ayahs
             JOIN surahs ON surahs.id = ayahs.surah_id
             ORDER BY ayahs.surah_id, ayahs.ayah_number`,
          )
          .then((ayahs) =>
            ayahs.map((ayah) => ({
              ...ayah,
              normalizedText: normalizeSearch(
                `${ayah.text_ar} ${ayah.surah_name_ar} ${ayah.transliteration} ${ayah.name_en} ${ayah.surah_id}:${ayah.ayah_number}`,
              ),
            })),
          )
          .catch((error: unknown) => {
            searchCorpus = null;
            throw error;
          });
      }

      const corpus = await searchCorpus;
      return corpus
        .filter((ayah) =>
          matchesSearchTerms(terms, ayah.normalizedText),
        )
        .slice(0, 100)
        .map(({ normalizedText: _normalizedText, ...ayah }) => ayah);
    },

    getBookmark(surahId, ayahNumber) {
      return db.getFirstAsync<Bookmark>(
        `SELECT id, surah_id, ayah_number, note, category, color, created_at
         FROM bookmarks WHERE surah_id = ? AND ayah_number = ?`,
        surahId,
        ayahNumber,
      );
    },

    listBookmarks() {
      return db.getAllAsync<BookmarkWithSurah>(
        `SELECT bookmarks.id, bookmarks.surah_id, bookmarks.ayah_number,
                bookmarks.note, bookmarks.category, bookmarks.color,
                bookmarks.created_at, surahs.name_ar AS surah_name_ar,
                surahs.name_en AS surah_name_en, ayahs.text_ar
         FROM bookmarks
         JOIN surahs ON surahs.id = bookmarks.surah_id
         JOIN ayahs ON ayahs.surah_id = bookmarks.surah_id
                   AND ayahs.ayah_number = bookmarks.ayah_number
         ORDER BY bookmarks.updated_at DESC, bookmarks.id DESC`,
      );
    },

    async saveBookmark(bookmark) {
      await db.runAsync(
        `INSERT INTO bookmarks
           (surah_id, ayah_number, note, category, color, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         ON CONFLICT(surah_id, ayah_number) DO UPDATE SET
           note = excluded.note,
           category = excluded.category,
           color = excluded.color,
           updated_at = CURRENT_TIMESTAMP`,
        bookmark.surah_id,
        bookmark.ayah_number,
        bookmark.note,
        bookmark.category,
        bookmark.color,
      );
    },

    async removeBookmark(surahId, ayahNumber) {
      await db.runAsync(
        'DELETE FROM bookmarks WHERE surah_id = ? AND ayah_number = ?',
        surahId,
        ayahNumber,
      );
    },

    async exportBookmarks() {
      const bookmarks = await db.getAllAsync<Bookmark>(
        `SELECT surah_id, ayah_number, note, category, color, created_at
         FROM bookmarks ORDER BY surah_id, ayah_number`,
      );
      return JSON.stringify(
        {
          format: 'tamimi-mushaf-bookmarks',
          version: 1,
          bookmarks: bookmarks.map(
            ({ surah_id, ayah_number, note, category, color, created_at }) => ({
              surah_id,
              ayah_number,
              note,
              category,
              color,
              created_at,
            }),
          ),
        },
        null,
        2,
      );
    },

    async importBookmarks(serialized) {
      const parsed = parseBookmarkExport(serialized);
      for (const bookmark of parsed) {
        const key = `${bookmark.surah_id}:${bookmark.ayah_number}`;
        const exists = await db.getFirstAsync<{ exists: number }>(
          `SELECT 1 AS exists FROM ayahs
           WHERE surah_id = ? AND ayah_number = ?`,
          bookmark.surah_id,
          bookmark.ayah_number,
        );
        if (!exists) throw new Error(`Ayah ${key} does not exist in this Quran.`);
      }

      for (const bookmark of parsed) {
        await db.runAsync(
          `INSERT INTO bookmarks
             (surah_id, ayah_number, note, category, color, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
           ON CONFLICT(surah_id, ayah_number) DO UPDATE SET
             note = excluded.note,
             category = excluded.category,
             color = excluded.color,
             updated_at = CURRENT_TIMESTAMP`,
          bookmark.surah_id,
          bookmark.ayah_number,
          bookmark.note,
          bookmark.category,
          bookmark.color,
        );
      }

      return parsed.length;
    },

    getTafsir(surahId, ayahNumber, sourceId) {
      return db.getFirstAsync<CommentaryEntry>(
        `SELECT source_id, source_name, license, source_url,
                start_ayah, end_ayah, text
         FROM tafsir_entries
         WHERE source_id = ? AND surah_id = ?
           AND start_ayah <= ? AND end_ayah >= ?
         ORDER BY start_ayah DESC LIMIT 1`,
        sourceId,
        surahId,
        ayahNumber,
        ayahNumber,
      );
    },

    async getIrab(surahId, ayahNumber) {
      const entry = await db.getFirstAsync<
        Omit<CommentaryEntry, 'start_ayah' | 'end_ayah'> & {
          ayah_number: number;
        }
      >(
        `SELECT source_id, source_name, license, source_url, ayah_number, text
         FROM irab_entries WHERE surah_id = ? AND ayah_number = ?
         ORDER BY source_id LIMIT 1`,
        surahId,
        ayahNumber,
      );
      if (!entry) return null;
      return {
        ...entry,
        start_ayah: entry.ayah_number,
        end_ayah: entry.ayah_number,
      };
    },
  };
}
