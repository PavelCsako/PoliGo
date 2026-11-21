"""PoliGo server: FastAPI + SQLite, running inside the UPT mobility platform.

The student is whoever the platform session says (server/platform.py) - there
is no PoliGo account. PoliGo stores only what the platform does not have:
favourites, Learning Agreement drafts, the practical steps around the official
documents, scans of papers received abroad and the return check. Everything
reusable is cached on the device by the service worker.
"""
import json
from contextlib import asynccontextmanager
from datetime import date, timedelta
import os

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse, Response
from pydantic import BaseModel

from server import ical as icalmod
from server import logs as logsmod
from server import platform as plat
from server import scanner as scanmod
from server import seed as seedmod
from server.anim import streams as anim_streams
from server.db import db, init_db, j, parse

WEB_DIR = os.path.join(os.path.dirname(__file__), "..", "web")


@asynccontextmanager
async def lifespan(app: FastAPI):
    seedmod.seed()
    logsmod.log_event("INFO", "server", f"server started - platform mode: {plat.MODE}")
    yield
    logsmod.log_event("INFO", "server", "server stopped")


app = FastAPI(title="PoliGo", version="0.2.0", lifespan=lifespan)
app.add_middleware(GZipMiddleware, minimum_size=512)
app.include_router(anim_streams.router)


@app.exception_handler(HTTPException)
async def http_error(request, exc: HTTPException):
    if isinstance(exc.detail, dict) and "error" in exc.detail:
        if exc.status_code != 401:
            level = "ERROR" if exc.status_code >= 500 else "WARN"
            logsmod.log_event(level, "http", f"{request.method} {request.url.path} -> {exc.status_code} {exc.detail['error']}",
                              detail=str(exc.detail.get("message", "")))
        return JSONResponse(status_code=exc.status_code, content=exc.detail)
    code = f"ERR_HTTP_{exc.status_code}"
    return JSONResponse(status_code=exc.status_code, content={"error": code, "message": str(exc.detail)})


@app.exception_handler(Exception)
async def unhandled_error(request, exc: Exception):
    logsmod.log_event("ERROR", "http", f"{request.method} {request.url.path} crashed", detail=f"{type(exc).__name__}: {exc}")
    return JSONResponse(status_code=500, content={"error": "ERR_INTERNAL", "message": f"{type(exc).__name__}: {exc}"})


def row(r):
    if r is None:
        return None
    d = dict(r)
    for k in ("topics", "languages", "missing_topics"):
        if isinstance(d.get(k), str):
            d[k] = parse(d[k], [])
    return d


def student_of(request: Request, conn):
    """The platform student + make sure PoliGo has a row for its own data."""
    s = plat.current_student(request)
    conn.execute("INSERT OR IGNORE INTO users (id) VALUES (?)", (s["id"],))
    return s


def summaries(conn):
    rows = conn.execute(
        "SELECT m.university_id, m.label, m.partner_course_id, hc.ects "
        "FROM matches m JOIN home_courses hc ON hc.id = m.home_course_id WHERE m.program = ?",
        (seedmod.PROGRAM,),
    ).fetchall()
    out = {}
    for r in rows:
        u = out.setdefault(r["university_id"], {"matched": 0, "total": 0, "labels": [], "ects_covered": 0})
        u["total"] += 1
        if r["label"] != "none" and r["partner_course_id"]:
            u["matched"] += 1
            u["labels"].append(r["label"])
            u["ects_covered"] += r["ects"]
    return out


def agreement_rows(conn, student):
    """Universities the student's faculty has an agreement with, each with the
    agreement (language, places, apply link) and the course match summary."""
    sums = summaries(conn)
    out = []
    for a in plat.agreements_for(student):
        u = row(conn.execute("SELECT * FROM universities WHERE id = ?", (a["university_id"],)).fetchone())
        if not u:
            continue
        u["agreement"] = a
        u["summary"] = sums.get(u["id"], {"matched": 0, "total": 0, "labels": [], "ects_covered": 0})
        out.append(u)
    return out


def guide_application(student):
    return next((a for a in plat.applications_for(student) if a["guide"]), None)


def sync_mobility(conn, student, app_):
    """Mirror the platform application locally (ids for tasks / scans) and
    create PoliGo's own steps the first time."""
    rnd = app_["round"]
    start, end = rnd["mobility_start"], rnd["mobility_end"]
    conn.execute(
        "INSERT INTO mobilities (id, user_id, university_id, start_date, arrival_date, end_date, status) "
        "VALUES (?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET university_id=excluded.university_id, "
        "start_date=excluded.start_date, arrival_date=excluded.arrival_date, end_date=excluded.end_date, status=excluded.status",
        (app_["id"], student["id"], app_["university_id"], start, start, end, app_["status"]),
    )
    has = conn.execute("SELECT 1 FROM tasks WHERE mobility_id = ? AND source = 'poligo'", (app_["id"],)).fetchone()
    if not has:
        anchors = {"S": start, "A": start, "E": end}
        conn.executemany(
            "INSERT INTO tasks (mobility_id, title, stage, due_date, source, done) VALUES (?,?,?,?, 'poligo', 0)",
            [(app_["id"], t["title"], t["stage"],
              (date.fromisoformat(anchors[t["anchor"]]) + timedelta(days=t["offset"])).isoformat())
             for t in seedmod.POLIGO_STEPS],
        )
    return {"id": app_["id"], "university_id": app_["university_id"], "status": app_["status"],
            "agreement_code": app_["agreement_code"], "round": rnd,
            "start_date": start, "arrival_date": start, "end_date": end}


def require_mobility(conn, student):
    app_ = guide_application(student)
    if not app_:
        raise HTTPException(403, {"error": "ERR_NOT_TITULAR",
                                  "message": "the mobility guide opens once the platform lists you as Titular"})
    return sync_mobility(conn, student, app_)


# ------------------------------------------------------------------ session

@app.get("/api/platform/info")
def platform_info():
    return {"mode": plat.MODE, "platform_url": plat.PLATFORM_URL, "demo_students": plat.demo_students(),
            "scanner": "claude" if scanmod.configured() else "sample"}


class DemoSessionIn(BaseModel):
    student_id: str


@app.post("/api/platform/demo-session")
def demo_session(payload: DemoSessionIn):
    """Pitch/demo only: stands in for the platform's own login cookie."""
    if plat.MODE != "demo" or payload.student_id not in plat.STUDENTS:
        raise HTTPException(404, {"error": "ERR_NO_DEMO", "message": "no such demo student"})
    res = JSONResponse({"ok": True})
    res.set_cookie(plat.SESSION_COOKIE, payload.student_id, httponly=True, samesite="lax")
    return res


@app.post("/api/platform/demo-logout")
def demo_logout():
    res = JSONResponse({"ok": True})
    res.delete_cookie(plat.SESSION_COOKIE)
    return res


@app.get("/api/me")
def me(request: Request):
    with db() as conn:
        s = student_of(request, conn)
        prefs = row(conn.execute("SELECT theme, language FROM users WHERE id = ?", (s["id"],)).fetchone())
        shortlist = [r["university_id"] for r in conn.execute(
            "SELECT university_id FROM shortlist WHERE user_id = ? ORDER BY rank", (s["id"],))]
        apps = plat.applications_for(s)
        g = next((a for a in apps if a["guide"]), None)
        mobility = sync_mobility(conn, s, g) if g else None
    return {
        "student": {k: s[k] for k in ("id", "name", "faculty", "faculty_name", "program", "year", "average", "languages")},
        "prefs": prefs,
        "round": plat.current_round(),
        "applications": apps,
        "mobility": mobility,
        "shortlist": shortlist,
        "links": {"applications": plat.documents_url(), "languages": plat.languages_url()},
    }


class PrefsIn(BaseModel):
    theme: str | None = None
    language: str | None = None


@app.patch("/api/me/prefs")
def update_prefs(p: PrefsIn, request: Request):
    with db() as conn:
        s = student_of(request, conn)
        if p.theme in ("dark", "light"):
            conn.execute("UPDATE users SET theme = ? WHERE id = ?", (p.theme, s["id"]))
        if p.language in ("ro", "en"):
            conn.execute("UPDATE users SET language = ? WHERE id = ?", (p.language, s["id"]))
    return {"ok": True}


# ------------------------------------------------- choose a destination

@app.get("/api/home-courses")
def home_courses():
    with db() as conn:
        rows = conn.execute("SELECT * FROM home_courses WHERE program = ? ORDER BY id", (seedmod.PROGRAM,)).fetchall()
        return {"program": seedmod.PROGRAM, "total_ects": sum(r["ects"] for r in rows), "courses": [row(r) for r in rows]}


@app.get("/api/agreements")
def agreements(request: Request):
    with db() as conn:
        s = student_of(request, conn)
        return {"universities": agreement_rows(conn, s)}


def match_rows(conn, university_id):
    return [row(r) for r in conn.execute(
        "SELECT m.label, m.explanation, m.missing_topics, m.partner_course_id, m.home_course_id, "
        "hc.name AS home_name, hc.ects AS home_ects, "
        "pc.name AS partner_name, pc.ects AS partner_ects, pc.language AS partner_language "
        "FROM matches m JOIN home_courses hc ON hc.id = m.home_course_id "
        "LEFT JOIN partner_courses pc ON pc.id = m.partner_course_id "
        "WHERE m.university_id = ? AND m.program = ? ORDER BY hc.id",
        (university_id, seedmod.PROGRAM),
    )]


@app.get("/api/agreements/{university_id}")
def agreement_detail(university_id: str, request: Request):
    with db() as conn:
        s = student_of(request, conn)
        u = next((x for x in agreement_rows(conn, s) if x["id"] == university_id), None)
        if not u:
            raise HTTPException(404, {"error": "ERR_NO_AGREEMENT", "message": "your faculty has no agreement with this university"})
        u["matches"] = match_rows(conn, university_id)
        return u


class ShortlistIn(BaseModel):
    university_id: str


@app.post("/api/shortlist")
def add_shortlist(p: ShortlistIn, request: Request):
    with db() as conn:
        s = student_of(request, conn)
        if not any(a["university_id"] == p.university_id for a in plat.agreements_for(s)):
            raise HTTPException(404, {"error": "ERR_NO_AGREEMENT", "message": "your faculty has no agreement with this university"})
        rank = conn.execute("SELECT COALESCE(MAX(rank), 0) FROM shortlist WHERE user_id = ?", (s["id"],)).fetchone()[0] + 1
        conn.execute("INSERT OR IGNORE INTO shortlist (user_id, university_id, rank) VALUES (?,?,?)", (s["id"], p.university_id, rank))
    return {"ok": True}


@app.delete("/api/shortlist/{university_id}")
def remove_shortlist(university_id: str, request: Request):
    with db() as conn:
        s = student_of(request, conn)
        conn.execute("DELETE FROM shortlist WHERE user_id = ? AND university_id = ?", (s["id"], university_id))
    return {"ok": True}


# ----------------------------------------------- Learning Agreement draft

def default_la(conn, university_id):
    """Table A / Table B straight from the matches: every good or partial match."""
    return [{"home_course_id": m["home_course_id"], "home_name": m["home_name"], "home_ects": m["home_ects"],
             "partner_course_id": m["partner_course_id"], "partner_name": m["partner_name"],
             "partner_ects": m["partner_ects"], "partner_language": m["partner_language"], "label": m["label"]}
            for m in match_rows(conn, university_id) if m["label"] != "none" and m["partner_course_id"]]


@app.get("/api/la/{university_id}")
def get_la(university_id: str, request: Request):
    with db() as conn:
        s = student_of(request, conn)
        r = conn.execute("SELECT rows_json, updated_at FROM la_drafts WHERE user_id = ? AND university_id = ?",
                         (s["id"], university_id)).fetchone()
        options = [m for m in match_rows(conn, university_id) if m["partner_course_id"]]
        if r:
            return {"rows": parse(r["rows_json"], []), "saved": r["updated_at"], "options": options}
        return {"rows": default_la(conn, university_id), "saved": None, "options": options}


class LaIn(BaseModel):
    home_course_ids: list[str]


@app.put("/api/la/{university_id}")
def save_la(university_id: str, p: LaIn, request: Request):
    with db() as conn:
        s = student_of(request, conn)
        picked = set(p.home_course_ids)
        rows = [r for r in [
            {"home_course_id": m["home_course_id"], "home_name": m["home_name"], "home_ects": m["home_ects"],
             "partner_course_id": m["partner_course_id"], "partner_name": m["partner_name"],
             "partner_ects": m["partner_ects"], "partner_language": m["partner_language"], "label": m["label"]}
            for m in match_rows(conn, university_id) if m["partner_course_id"]
        ] if r["home_course_id"] in picked]
        conn.execute(
            "INSERT INTO la_drafts (user_id, university_id, rows_json, updated_at) VALUES (?,?,?, datetime('now')) "
            "ON CONFLICT(user_id, university_id) DO UPDATE SET rows_json = excluded.rows_json, updated_at = excluded.updated_at",
            (s["id"], university_id, j(rows)),
        )
    return {"rows": rows}


# ------------------------------------------------------- mobility guide

@app.get("/api/guide")
def guide(request: Request):
    with db() as conn:
        s = student_of(request, conn)
        mob = require_mobility(conn, s)
        tasks = [row(r) for r in conn.execute("SELECT * FROM tasks WHERE mobility_id = ? ORDER BY due_date", (mob["id"],))]
    app_ = guide_application(s)
    return {"mobility": mob, "documents": plat.documents_for(s, app_), "tasks": tasks,
            "platform_documents_url": plat.documents_url()}


class TaskIn(BaseModel):
    title: str
    stage: str = "during"
    due_date: str | None = None
    source: str = "user"


@app.post("/api/tasks")
def add_task(task: TaskIn, request: Request):
    if not task.title.strip():
        raise HTTPException(400, {"error": "ERR_EMPTY_TASK", "message": "the task needs a title"})
    if task.stage not in seedmod.STAGES:
        raise HTTPException(400, {"error": "ERR_BAD_STAGE", "message": "unknown stage"})
    with db() as conn:
        s = student_of(request, conn)
        mob = require_mobility(conn, s)
        cur = conn.execute(
            "INSERT INTO tasks (mobility_id, title, stage, due_date, source, done) VALUES (?,?,?,?,?,0)",
            (mob["id"], task.title.strip(), task.stage, task.due_date, "scan" if task.source == "scan" else "user"),
        )
        return row(conn.execute("SELECT * FROM tasks WHERE id = ?", (cur.lastrowid,)).fetchone())


@app.patch("/api/tasks/{task_id}")
def patch_task(task_id: int, done: bool, request: Request):
    with db() as conn:
        s = student_of(request, conn)
        r = conn.execute("SELECT t.id FROM tasks t JOIN mobilities m ON m.id = t.mobility_id "
                         "WHERE t.id = ? AND m.user_id = ?", (task_id, s["id"])).fetchone()
        if not r:
            raise HTTPException(404, {"error": "ERR_NO_TASK", "message": "unknown task"})
        conn.execute("UPDATE tasks SET done = ? WHERE id = ?", (1 if done else 0, task_id))
        return row(conn.execute("SELECT * FROM tasks WHERE id = ?", (task_id,)).fetchone())


# ------------------------------------------------------------- scanner

class ScanIn(BaseModel):
    data: str            # base64, no data: prefix
    media_type: str
    language: str = "ro"


def _scan_error(e: scanmod.ScanError):
    return HTTPException(e.status, {"error": e.code, "message": e.message})


@app.post("/api/scan")
def scan(p: ScanIn, request: Request):
    """A paper received abroad -> plain explanation. Only the JSON result is
    stored; the image goes to the model and is not kept."""
    with db() as conn:
        s = student_of(request, conn)
        mob = require_mobility(conn, s)
    try:
        result, sample = scanmod.explain_document(p.data, p.media_type, p.language, date.today().isoformat())
    except scanmod.ScanError as e:
        raise _scan_error(e)
    with db() as conn:
        cur = conn.execute(
            "INSERT INTO scanned_docs (mobility_id, document_type, language, summary, result_json) VALUES (?,?,?,?,?)",
            (mob["id"], result.get("document_type", ""), result.get("language", ""), result.get("summary", ""),
             j({**result, "sample": sample})),
        )
        out = row(conn.execute("SELECT * FROM scanned_docs WHERE id = ?", (cur.lastrowid,)).fetchone())
    logsmod.log_event("INFO", "scan", f"document scanned ({'sample' if sample else 'claude'})", user_id=s["id"])
    return {**out, "sample": sample}


@app.get("/api/scans")
def scans(request: Request):
    with db() as conn:
        s = student_of(request, conn)
        mob = require_mobility(conn, s)
        rows = conn.execute("SELECT * FROM scanned_docs WHERE mobility_id = ? ORDER BY id DESC", (mob["id"],)).fetchall()
        return {"scans": [row(r) for r in rows]}


# ----------------------------------------- return check: LA vs transcript

def la_for_mobility(conn, s, mob):
    r = conn.execute("SELECT rows_json FROM la_drafts WHERE user_id = ? AND university_id = ?",
                     (s["id"], mob["university_id"])).fetchone()
    return parse(r["rows_json"], []) if r else default_la(conn, mob["university_id"])


@app.get("/api/recognition")
def recognition(request: Request):
    with db() as conn:
        s = student_of(request, conn)
        mob = require_mobility(conn, s)
        la = la_for_mobility(conn, s, mob)
        t = conn.execute("SELECT rows_json, updated_at FROM transcripts WHERE mobility_id = ?", (mob["id"],)).fetchone()
        all_home = [row(r) for r in conn.execute("SELECT id, name, ects FROM home_courses WHERE program = ? ORDER BY id", (seedmod.PROGRAM,))]
    return {"mobility": mob, "la": la, "home_courses": all_home,
            "transcript": parse(t["rows_json"], []) if t else [], "saved": t["updated_at"] if t else None}


class TranscriptRow(BaseModel):
    name: str
    ects: float = 0
    grade: str = ""
    passed: bool = True


class TranscriptIn(BaseModel):
    courses: list[TranscriptRow]


@app.put("/api/recognition")
def save_transcript(p: TranscriptIn, request: Request):
    with db() as conn:
        s = student_of(request, conn)
        mob = require_mobility(conn, s)
        conn.execute(
            "INSERT INTO transcripts (mobility_id, rows_json, updated_at) VALUES (?,?, datetime('now')) "
            "ON CONFLICT(mobility_id) DO UPDATE SET rows_json = excluded.rows_json, updated_at = excluded.updated_at",
            (mob["id"], j([c.model_dump() for c in p.courses])),
        )
    return {"ok": True}


class TranscriptScanIn(BaseModel):
    data: str
    media_type: str


@app.post("/api/recognition/scan")
def scan_transcript(p: TranscriptScanIn, request: Request):
    """Reads the host Transcript of Records. Not saved until the student checks
    the rows and saves them (PUT /api/recognition)."""
    with db() as conn:
        s = student_of(request, conn)
        mob = require_mobility(conn, s)
        sample_rows = [{"name": r["partner_name"], "ects": r["partner_ects"],
                        "grade": "B" if i else "FX", "passed": bool(i)}
                       for i, r in enumerate(la_for_mobility(conn, s, mob))]
    try:
        result, sample = scanmod.read_transcript(p.data, p.media_type, sample_rows)
    except scanmod.ScanError as e:
        raise _scan_error(e)
    return {**result, "sample": sample}


# ------------------------------------------------------------- calendar

@app.get("/api/calendar.ics")
def calendar_ics(request: Request):
    """Official deadlines from the platform + PoliGo steps, as one .ics file."""
    with db() as conn:
        s = student_of(request, conn)
        mob = require_mobility(conn, s)
        tasks = [dict(r) for r in conn.execute("SELECT * FROM tasks WHERE mobility_id = ?", (mob["id"],))]
        uni = conn.execute("SELECT name FROM universities WHERE id = ?", (mob["university_id"],)).fetchone()
    mob["university_name"] = uni["name"] if uni else mob["university_id"]
    docs = plat.documents_for(s, guide_application(s))
    body = icalmod.build_feed(mob, tasks, docs)
    return Response(content=body, media_type="text/calendar; charset=utf-8",
                    headers={"Content-Disposition": 'attachment; filename="poligo.ics"'})


# --------------------------------------------------------------- misc

class SignupIn(BaseModel):
    email: str
    faculty: str | None = None
    wants: str | None = None


@app.post("/api/signups")
def signup(s: SignupIn):
    """Pitch page only."""
    with db() as conn:
        conn.execute("INSERT INTO signups (email, faculty, wants) VALUES (?,?,?)", (s.email, s.faculty, s.wants))
    return {"ok": True}


@app.get("/api/i18n/{lang}")
def get_strings(lang: str):
    from server.i18n import ensure_language
    return ensure_language(lang)


@app.get("/api/health")
def health():
    return {"ok": True, "service": "poligo"}


app.mount("/", StaticFiles(directory=WEB_DIR, html=True), name="web")
init_db()
