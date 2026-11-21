"""SQLite persistence for PoliGo. Small, single-file, Docker-volume friendly."""
import json
import os
import sqlite3
from contextlib import contextmanager

DB_PATH = os.environ.get("POLIGO_DB", os.path.join(os.path.dirname(__file__), "..", "data", "poligo.db"))

SCHEMA = """
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,               -- the platform student id, nothing else about the student
    theme TEXT,
    language TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS home_courses (
    id TEXT PRIMARY KEY,
    program TEXT NOT NULL,
    semester INTEGER NOT NULL,
    name TEXT NOT NULL,
    ects INTEGER NOT NULL,
    topics TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'mandatory'
);
CREATE TABLE IF NOT EXISTS universities (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    city TEXT NOT NULL,
    country TEXT NOT NULL,
    country_code TEXT NOT NULL,
    lat REAL NOT NULL,
    lng REAL NOT NULL,
    languages TEXT NOT NULL,
    website TEXT,
    greeting TEXT
);
CREATE TABLE IF NOT EXISTS partner_courses (
    id TEXT PRIMARY KEY,
    university_id TEXT NOT NULL REFERENCES universities(id),
    name TEXT NOT NULL,
    ects INTEGER NOT NULL,
    semester INTEGER NOT NULL,
    language TEXT NOT NULL,
    description TEXT
);
CREATE TABLE IF NOT EXISTS matches (
    program TEXT NOT NULL,
    university_id TEXT NOT NULL REFERENCES universities(id),
    home_course_id TEXT NOT NULL REFERENCES home_courses(id),
    partner_course_id TEXT,
    label TEXT NOT NULL,
    explanation TEXT,
    missing_topics TEXT,
    PRIMARY KEY (university_id, home_course_id)
);
CREATE TABLE IF NOT EXISTS shortlist (
    user_id TEXT NOT NULL REFERENCES users(id),
    university_id TEXT NOT NULL REFERENCES universities(id),
    rank INTEGER NOT NULL,
    PRIMARY KEY (user_id, university_id)
);
-- local mirror of a platform application the student is Titular/Aprobat on;
-- the id is the platform application id, the status is re-read on every visit
CREATE TABLE IF NOT EXISTS mobilities (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    university_id TEXT NOT NULL REFERENCES universities(id),
    start_date TEXT NOT NULL,
    arrival_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
-- only the steps the platform does NOT track (host application, housing,
-- local registration, LA changes) plus the student's own tasks
CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    mobility_id TEXT NOT NULL REFERENCES mobilities(id),
    title TEXT NOT NULL,
    stage TEXT NOT NULL,
    due_date TEXT,
    source TEXT NOT NULL DEFAULT 'template',
    done INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS scanned_docs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    mobility_id TEXT NOT NULL REFERENCES mobilities(id),
    document_type TEXT NOT NULL,
    language TEXT,
    summary TEXT,
    result_json TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
-- Learning Agreement drafts built from the matches (one per student and host)
CREATE TABLE IF NOT EXISTS la_drafts (
    user_id TEXT NOT NULL REFERENCES users(id),
    university_id TEXT NOT NULL REFERENCES universities(id),
    rows_json TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (user_id, university_id)
);
-- what the host Transcript of Records says, per mobility (return check)
CREATE TABLE IF NOT EXISTS transcripts (
    mobility_id TEXT PRIMARY KEY REFERENCES mobilities(id),
    rows_json TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
-- pitch page only
CREATE TABLE IF NOT EXISTS signups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL,
    faculty TEXT,
    wants TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS translations (
    lang TEXT NOT NULL,
    key TEXT NOT NULL,
    text TEXT NOT NULL,
    PRIMARY KEY (lang, key)
);
CREATE TABLE IF NOT EXISTS logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ts TEXT NOT NULL,
    level TEXT NOT NULL,
    category TEXT NOT NULL,
    user_id TEXT,
    event TEXT NOT NULL,
    detail TEXT
);
CREATE INDEX IF NOT EXISTS idx_logs_ts ON logs(id);
CREATE INDEX IF NOT EXISTS idx_tasks_mob ON tasks(mobility_id);
"""


def connect() -> sqlite3.Connection:
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


@contextmanager
def db():
    conn = connect()
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


def init_db():
    with db() as conn:
        conn.executescript(SCHEMA)
        for stmt in MIGRATIONS:
            try:
                conn.execute(stmt)
            except sqlite3.OperationalError:
                pass  # column/table already exists


# Incremental changes for databases created by older versions. PoliGo now
# reads identity, profile, approvals and messages from the mobility platform,
# so the old copies are dropped (GDPR: no second copy of ID data).
MIGRATIONS = [
    "ALTER TABLE users ADD COLUMN theme TEXT",
    "ALTER TABLE users ADD COLUMN language TEXT",
    "DROP TABLE IF EXISTS user_docs",
    "DROP TABLE IF EXISTS auth_codes",
    "DROP TABLE IF EXISTS sessions",
    "DROP TABLE IF EXISTS messages",
    "DROP TABLE IF EXISTS opportunity_scans",
    "DROP TABLE IF EXISTS erasmus_source_checks",
    "ALTER TABLE users DROP COLUMN email",
    "ALTER TABLE users DROP COLUMN faculty",
    "ALTER TABLE users DROP COLUMN program",
    "ALTER TABLE users DROP COLUMN year",
    "ALTER TABLE users DROP COLUMN semester_abroad",
    "ALTER TABLE users DROP COLUMN mode",
    "ALTER TABLE users DROP COLUMN onboarding",
    "ALTER TABLE users DROP COLUMN availability",
]


def j(value) -> str:
    return json.dumps(value, separators=(",", ":"))


def parse(value, default=None):
    return json.loads(value) if value else default
