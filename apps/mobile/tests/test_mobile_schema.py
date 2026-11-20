import re
import shutil
import sqlite3
import tempfile
import unittest
from pathlib import Path


MOBILE_ROOT = Path(__file__).resolve().parents[1]


class MobileSchemaTests(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        database_path = Path(self.temp_dir.name) / "quran.db"
        shutil.copyfile(MOBILE_ROOT / "assets" / "quran.db", database_path)
        self.connection = sqlite3.connect(database_path)

        source = (MOBILE_ROOT / "src" / "data" / "quran-repository.ts").read_text(
            encoding="utf-8"
        )
        schema = re.search(
            r"await db\.execAsync\(`(.*?)`\);",
            source,
            flags=re.DOTALL,
        )
        if schema is None:
            self.fail("Could not locate the mobile repository schema.")
        self.connection.executescript(schema.group(1))

    def tearDown(self):
        self.connection.close()
        self.temp_dir.cleanup()

    def test_bookmarks_reference_real_ayahs_and_reject_duplicates(self):
        self.connection.execute(
            "INSERT INTO bookmarks (surah_id, ayah_number, note) VALUES (1, 1, 'note')"
        )
        with self.assertRaises(sqlite3.IntegrityError):
            self.connection.execute(
                "INSERT INTO bookmarks (surah_id, ayah_number) VALUES (1, 1)"
            )
        with self.assertRaises(sqlite3.IntegrityError):
            self.connection.execute(
                "INSERT INTO bookmarks (surah_id, ayah_number) VALUES (115, 1)"
            )

    def test_commentary_entries_require_license_and_https_attribution(self):
        with self.assertRaises(sqlite3.IntegrityError):
            self.connection.execute(
                """INSERT INTO tafsir_entries
                   (source_id, source_name, license, source_url, surah_id,
                    start_ayah, end_ayah, text)
                   VALUES ('sample', 'Sample', '', 'https://example.org',
                           1, 1, 1, 'sample text')"""
            )
        with self.assertRaises(sqlite3.IntegrityError):
            self.connection.execute(
                """INSERT INTO irab_entries
                   (source_id, source_name, license, source_url, surah_id,
                    ayah_number, text)
                   VALUES ('sample', 'Sample', 'CC BY 4.0',
                           'http://example.org', 1, 1, 'sample text')"""
            )

    def test_local_recitation_tracks_reference_real_surahs_and_are_unique(self):
        self.connection.execute(
            """INSERT INTO recitation_tracks
               (surah_id, reciter_name, file_uri, file_size)
               VALUES (1, 'Local reciter', 'file:///audio/1.mp3', 1024)"""
        )
        with self.assertRaises(sqlite3.IntegrityError):
            self.connection.execute(
                """INSERT INTO recitation_tracks
                   (surah_id, reciter_name, file_uri, file_size)
                   VALUES (1, 'Local reciter', 'file:///audio/2.mp3', 2048)"""
            )
        with self.assertRaises(sqlite3.IntegrityError):
            self.connection.execute(
                """INSERT INTO recitation_tracks
                   (surah_id, reciter_name, file_uri, file_size)
                   VALUES (115, 'Unknown', 'file:///audio/3.mp3', 2048)"""
            )
        with self.assertRaises(sqlite3.IntegrityError):
            self.connection.execute(
                """INSERT INTO recitation_tracks
                   (surah_id, reciter_name, file_uri, file_size)
                   VALUES (2, 'Invalid size', 'file:///audio/4.mp3', -1)"""
            )


if __name__ == "__main__":
    unittest.main()
