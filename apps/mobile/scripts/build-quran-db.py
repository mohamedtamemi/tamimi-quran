import json
import sqlite3
from pathlib import Path


ROOT = Path(__file__).resolve().parents[3]
HTML_PATH = ROOT / "www" / "index.html"
ASSET_DIR = Path(__file__).resolve().parents[1] / "assets"
DATABASE_PATH = ASSET_DIR / "quran.db"


def extract_array(source: str, marker: str):
    start = source.index(marker) + len(marker)
    end = source.index("\n", start)
    return json.loads(source[start:end].strip().removesuffix(";"))


def main():
    source = HTML_PATH.read_text(encoding="utf-8")
    surahs = extract_array(source, "const D=")
    juz_starts = extract_array(source, "const J=")

    ASSET_DIR.mkdir(parents=True, exist_ok=True)
    temporary_path = DATABASE_PATH.with_suffix(".db.tmp")
    if temporary_path.exists():
        temporary_path.unlink()

    connection = sqlite3.connect(temporary_path)
    try:
        connection.executescript(
            """
            PRAGMA user_version = 1;
            CREATE TABLE surahs (
              id INTEGER PRIMARY KEY,
              name_ar TEXT NOT NULL,
              transliteration TEXT NOT NULL,
              name_en TEXT NOT NULL,
              revelation TEXT NOT NULL,
              ayah_count INTEGER NOT NULL
            );
            CREATE TABLE ayahs (
              surah_id INTEGER NOT NULL REFERENCES surahs(id),
              ayah_number INTEGER NOT NULL,
              text_ar TEXT NOT NULL,
              PRIMARY KEY (surah_id, ayah_number)
            );
            CREATE TABLE juz_starts (
              juz_number INTEGER PRIMARY KEY,
              surah_id INTEGER NOT NULL,
              ayah_number INTEGER NOT NULL
            );
            CREATE INDEX ayahs_surah_number ON ayahs(surah_id, ayah_number);
            """
        )
        connection.executemany(
            "INSERT INTO surahs VALUES (?, ?, ?, ?, ?, ?)",
            [
                (surah[0], surah[1], surah[2], surah[3], surah[4], len(surah[5]))
                for surah in surahs
            ],
        )
        connection.executemany(
            "INSERT INTO ayahs VALUES (?, ?, ?)",
            [
                (surah[0], number, verse[0])
                for surah in surahs
                for number, verse in enumerate(surah[5], start=1)
            ],
        )
        connection.executemany(
            "INSERT INTO juz_starts VALUES (?, ?, ?)",
            [
                (number, start[0], start[1])
                for number, start in enumerate(juz_starts, start=1)
            ],
        )
        connection.commit()
    finally:
        connection.close()

    temporary_path.replace(DATABASE_PATH)
    print(
        f"Created {DATABASE_PATH} with {len(surahs)} surahs, "
        f"{sum(len(surah[5]) for surah in surahs)} ayahs, "
        f"and {len(juz_starts)} juz starts."
    )


if __name__ == "__main__":
    main()
