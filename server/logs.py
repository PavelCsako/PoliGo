"""Structured logging + uptime.

Server events (errors, scans) are appended to the `logs` table with a level
and category, for whoever operates the server.
"""
from datetime import datetime

from server.db import db

STARTED = datetime.utcnow()

LEVELS = ("INFO", "WARN", "ERROR")


def now() -> str:
    return datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")


def log_event(level, category, event, user_id=None, detail=None, conn=None):
    """Append to the logs table. Pass an open connection when already inside
    a db() transaction, or the second connection deadlocks on the write lock."""
    ts = now()
    sql = "INSERT INTO logs (ts, level, category, user_id, event, detail) VALUES (?,?,?,?,?,?)"
    if conn is not None:
        conn.execute(sql, (ts, level, category, user_id, event, detail))
        return
    with db() as conn:
        conn.execute(sql, (ts, level, category, user_id, event, detail))


def uptime_seconds() -> float:
    return (datetime.utcnow() - STARTED).total_seconds()


def uptime_text() -> str:
    s = int(uptime_seconds())
    return f"{s // 86400}d {s % 86400 // 3600}h {s % 3600 // 60}m {s % 60}s"


def get_logs(limit: int = 200, level: str = ""):
    with db() as conn:
        if level:
            rows = conn.execute(
                "SELECT * FROM logs WHERE level = ? ORDER BY id DESC LIMIT ?", (level, int(limit))
            ).fetchall()
        else:
            rows = conn.execute("SELECT * FROM logs ORDER BY id DESC LIMIT ?", (int(limit),)).fetchall()
    return [dict(r) for r in rows]
