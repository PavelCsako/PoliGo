"""Adapter for the UPT mobility platform (Profil · Abilități lingvistice ·
Aplicații pentru mobilități).

PoliGo lives inside the platform, so everything the platform already knows is
READ from here and never stored again by PoliGo:

  - who the student is (the platform session - there is no PoliGo login)
  - faculty, programme, year, average                (Profil)
  - language levels                                   (Abilități lingvistice)
  - the faculty's agreements, places per round        (acorduri / runde)
  - the student's applications and their status       (Titular / Aprobat ...)
  - the official documents and their deadlines        (documente pre/post mobilitate)

Identity documents (ID card, passport, health card) are NOT exposed here on
purpose: PoliGo has no use for them, and holding a second copy is only a GDPR
risk.

This prototype ships a DEMO backend (POLIGO_PLATFORM_MODE=demo, the default):
two fictional students and one faculty's agreements, so the app can be shown
without the real platform. Replacing the demo means re-implementing the public
functions below (current_student, agreements_for, applications_for,
documents_for, round_by_id, current_round, apply_url, documents_url) against
the platform's API, forwarding the platform session cookie. Nothing else in
PoliGo reads platform data directly.
"""
import os
from datetime import date, timedelta

from fastapi import HTTPException, Request

MODE = os.environ.get("POLIGO_PLATFORM_MODE", "demo")
PLATFORM_URL = os.environ.get("POLIGO_PLATFORM_URL", "https://mobilitati.upt.ro").rstrip("/")
SESSION_COOKIE = "platform_session"

CEFR = ["A1", "A2", "B1", "B2", "C1", "C2"]
GUIDE_STATUSES = ("Titular", "Aprobat")

# ---------------------------------------------------------------- demo data

ROUNDS = {
    "2027-S2-R1": {
        "id": "2027-S2-R1",
        "name": "Round 1 - study mobilities, semester 2, 2026/2027",
        "applications_open": "2026-09-22",
        "applications_close": "2026-10-17",
        "results": "2026-10-30",
        "mobility_start": "2027-02-15",
        "mobility_end": "2027-07-10",
    },
    "2027-S2-R2": {
        "id": "2027-S2-R2",
        "name": "Round 2 (remaining places) - semester 2, 2026/2027",
        "applications_open": "2026-11-10",
        "applications_close": "2026-12-05",
        "results": "2026-12-18",
        "mobility_start": "2027-02-15",
        "mobility_end": "2027-07-10",
    },
}
CURRENT_ROUND = "2027-S2-R2"

# Agreements of the AC faculty (Automatică și Calculatoare). The language is the
# language of instruction written in the agreement, with the minimum level.
# `places` = places still open in the current round.
AGREEMENTS = {
    "AC": [
        {"code": "A-ST-POLTE02", "university_id": "stpolten", "isced": "0613", "language": "German", "level": "B1", "places": 1, "months": 5},
        {"code": "P-SETUBAL01", "university_id": "setubal", "isced": "0613", "language": "Portuguese", "level": "B1", "places": 2, "months": 5},
        {"code": "B-LEUVEN18", "university_id": "leuven", "isced": "0613", "language": "English", "level": "B2", "places": 1, "months": 5},
        {"code": "LV-VALMIER01", "university_id": "vidzeme", "isced": "0613", "language": "English", "level": "B1", "places": 2, "months": 5},
        {"code": "NL-ENSCHED03", "university_id": "saxion", "isced": "0613", "language": "English", "level": "B2", "places": 0, "months": 5},
        {"code": "D-FULDA01", "university_id": "fulda", "isced": "0613", "language": "English", "level": "B2", "places": 1, "months": 5},
        {"code": "SF-JYVASKY11", "university_id": "jamk", "isced": "0613", "language": "English", "level": "B2", "places": 3, "months": 5},
        {"code": "HU-GODOLLO01", "university_id": "mate", "isced": "0613", "language": "English", "level": "B1", "places": 2, "months": 5},
    ],
}
ISCED_NAMES = {"0613": "0613 - Software and applications development and analysis"}

# Fictional demo students. In production this is the platform's own profile.
STUDENTS = {
    "demo-candidat": {
        "id": "demo-candidat",
        "name": "Ana Popescu",
        "faculty": "AC",
        "faculty_name": "Facultatea de Automatică și Calculatoare",
        "program": "Computer Science",
        "year": 3,
        "average": 9.12,
        "languages": [{"language": "English", "level": "B2"}, {"language": "German", "level": "A2"}],
        "applications": [],
    },
    "demo-titular": {
        "id": "demo-titular",
        "name": "Radu Ionescu",
        "faculty": "AC",
        "faculty_name": "Facultatea de Automatică și Calculatoare",
        "program": "Computer Science",
        "year": 3,
        "average": 9.47,
        "languages": [{"language": "English", "level": "C1"}, {"language": "Portuguese", "level": "B1"}],
        "applications": [
            {"id": "APL-2026-0118", "agreement_code": "P-SETUBAL01", "university_id": "setubal",
             "round_id": "2027-S2-R1", "status": "Titular"},
        ],
    },
}
DEMO_LABELS = {
    "demo-candidat": "Student before applying (round 2 is open)",
    "demo-titular": "Student selected as Titular (Setúbal)",
}


def _plus(iso, days):
    return (date.fromisoformat(iso) + timedelta(days=days)).isoformat()


def _demo_documents(app, rnd):
    """The official documents the platform asks for, with its own deadlines.
    `status` is what the platform shows: validated / uploaded / missing / not_yet."""
    s, e = rnd["mobility_start"], rnd["mobility_end"]
    return [
        {"id": "la-before", "phase": "before", "title": "Learning Agreement - before the mobility",
         "deadline": "2027-01-15", "status": "missing",
         "what": "The list of courses you will take abroad (Table A) and the UPT courses they replace (Table B). It is the contract that guarantees your credits are recognised.",
         "who": "You, the UPT faculty coordinator and the host coordinator sign it.",
         "where": "Upload the signed PDF in the platform: Mobility applications > Documents."},
        {"id": "grant", "phase": "before", "title": "Grant agreement",
         "deadline": "2027-01-29", "status": "not_yet",
         "what": "The contract for your Erasmus+ grant: monthly amount, payment in two instalments, and what you must return if the mobility is cut short.",
         "who": "You and the UPT international relations office sign it. You need a bank account (IBAN) in your name.",
         "where": "The platform generates it after the Learning Agreement is validated."},
        {"id": "arrival", "phase": "arrival", "title": "Certificate of arrival",
         "deadline": _plus(s, 5), "status": "not_yet",
         "what": "Confirms the day you actually started at the host. Your grant is calculated from this date.",
         "who": "The host international office signs and stamps it.",
         "where": "Photograph it and upload it in the platform in your first week."},
        {"id": "confirmation", "phase": "after", "title": "Letter of confirmation (period of stay)",
         "deadline": _plus(e, 15), "status": "not_yet",
         "what": "Confirms the exact start and end dates of your stay. If the period is shorter than the grant agreement, part of the grant is returned.",
         "who": "The host international office, on your last days there.",
         "where": "Get it signed before you leave, then upload it in the platform."},
        {"id": "tor", "phase": "after", "title": "Transcript of Records (host)",
         "deadline": _plus(e, 35), "status": "not_yet",
         "what": "Your grades and the credits you obtained abroad. UPT recognises your courses from this paper.",
         "who": "The host university issues it, usually up to 5 weeks after the exam session.",
         "where": "Upload it in the platform; PoliGo compares it with your Learning Agreement."},
        {"id": "report", "phase": "after", "title": "Participant report (EU Survey)",
         "deadline": _plus(e, 30), "status": "not_yet",
         "what": "A questionnaire from the European Commission about your mobility. The last grant instalment is paid only after you submit it.",
         "who": "Only you. The link arrives by e-mail from the EU Survey system.",
         "where": "Online, from the e-mail; the platform marks it as received."},
    ]


# ------------------------------------------------------------- public API

def current_student(request: Request):
    """The student behind the platform session. Raises 401 without one."""
    sid = request.cookies.get(SESSION_COOKIE, "")
    student = STUDENTS.get(sid) if MODE == "demo" else None
    if not student:
        raise HTTPException(401, {"error": "ERR_NO_PLATFORM_SESSION",
                                  "message": "open PoliGo from the mobility platform"})
    return student


def demo_students():
    if MODE != "demo":
        return []
    return [{"id": k, "name": v["name"], "label": DEMO_LABELS.get(k, "")} for k, v in STUDENTS.items()]


def current_round():
    return ROUNDS[CURRENT_ROUND]


def round_by_id(rid):
    return ROUNDS.get(rid)


def agreements_for(student):
    out = []
    for a in AGREEMENTS.get(student["faculty"], []):
        a = dict(a)
        a["isced_name"] = ISCED_NAMES.get(a["isced"], a["isced"])
        a["apply_url"] = apply_url(a["code"])
        a["language_fit"] = language_fit(student, a["language"], a["level"])
        out.append(a)
    return out


def applications_for(student):
    out = []
    for app in student.get("applications", []):
        rnd = round_by_id(app["round_id"])
        out.append({**app, "round": rnd, "guide": app["status"] in GUIDE_STATUSES})
    return out


def documents_for(student, application):
    rnd = round_by_id(application["round_id"])
    return _demo_documents(application, rnd)


def apply_url(agreement_code):
    return f"{PLATFORM_URL}/student/aplicatii/noua?acord={agreement_code}"


def documents_url():
    return f"{PLATFORM_URL}/student/aplicatii"


def languages_url():
    return f"{PLATFORM_URL}/student/abilitati-lingvistice"


def language_fit(student, language, need):
    """Compare the level from 'Abilități lingvistice' with the agreement's
    language of instruction. ok=True -> the student already meets it."""
    have = next((l["level"] for l in student.get("languages", []) if l["language"] == language), None)
    ok = have is not None and CEFR.index(have) >= CEFR.index(need)
    return {"language": language, "need": need, "have": have, "ok": ok}
