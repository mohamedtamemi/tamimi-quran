import json
import sqlite3
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[3]
DATABASE_PATH = Path(__file__).resolve().parents[1] / "assets" / "quran.db"
SOURCE_PATH = ROOT / "www" / "index.html"


def extract_array(source: str, marker: str):
    start = source.index(marker) + len(marker)
    end = source.index("\n", start)
    return json.loads(source[start:end].strip().removesuffix(";"))


class QuranDatabaseIntegrityTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        source = SOURCE_PATH.read_text(encoding="utf-8")
        cls.surahs = extract_array(source, "const D=")
        cls.connection = sqlite3.connect(DATABASE_PATH)

    @classmethod
    def tearDownClass(cls):
        cls.connection.close()

    def test_database_has_complete_surah_and_ayah_counts(self):
        surah_count, ayah_count = self.connection.execute(
            "SELECT (SELECT COUNT(*) FROM surahs), "
            "(SELECT COUNT(*) FROM ayahs)"
        ).fetchone()
        self.assertEqual(surah_count, 114)
        self.assertEqual(ayah_count, 6236)

    def test_database_arabic_text_matches_bundled_corpus_exactly(self):
        database_ayahs = self.connection.execute(
            "SELECT surah_id, ayah_number, text_ar "
            "FROM ayahs ORDER BY surah_id, ayah_number"
        ).fetchall()
        source_ayahs = [
            (surah[0], ayah_number, ayah[0])
            for surah in self.surahs
            for ayah_number, ayah in enumerate(surah[5], start=1)
        ]
        self.assertEqual(database_ayahs, source_ayahs)

    def test_database_has_all_thirty_juz_starts(self):
        juz_count = self.connection.execute(
            "SELECT COUNT(*) FROM juz_starts"
        ).fetchone()[0]
        self.assertEqual(juz_count, 30)

    def test_database_does_not_bundle_unlicensed_english_translation(self):
        columns = {
            row[1]
            for row in self.connection.execute("PRAGMA table_info(ayahs)")
        }
        self.assertNotIn("translation_en", columns)


if __name__ == "__main__":
    unittest.main()
