"""Minimal iCalendar (.ics) feed builder - no external dependencies.

Generates one VCALENDAR with the mobility period, the official deadlines from
the mobility platform and PoliGo's own steps, importable into Google Calendar,
Outlook or Apple Calendar.
"""
import re
from datetime import date, datetime, timedelta

CRLF = "\r\n"


def _esc(text):
    return str(text or "").replace("\\", "\\\\").replace(";", "\\;").replace(",", "\\,").replace("\n", "\\n")


def _fold(line):
    # RFC 5545 content lines are meant to wrap at 75 octets; most clients
    # tolerate longer lines, but folding keeps this feed importable everywhere.
    if len(line) <= 75:
        return line
    out = [line[:75]]
    rest = line[75:]
    while rest:
        out.append(" " + rest[:74])
        rest = rest[74:]
    return "\r\n".join(out)


def _vevent(uid, start, end, summary, description=""):
    dtstart = start.strftime("%Y%m%d")
    dtend = (end + timedelta(days=1)).strftime("%Y%m%d")  # DTEND is exclusive
    lines = [
        "BEGIN:VEVENT",
        f"UID:{uid}@poligo",
        f"DTSTAMP:{datetime.utcnow().strftime('%Y%m%dT%H%M%SZ')}",
        f"DTSTART;VALUE=DATE:{dtstart}",
        f"DTEND;VALUE=DATE:{dtend}",
        f"SUMMARY:{_esc(summary)}",
    ]
    if description:
        lines.append(f"DESCRIPTION:{_esc(description)}")
    lines.append("END:VEVENT")
    return "\r\n".join(_fold(l) for l in lines)


def _slug(text):
    return re.sub(r"[^A-Za-z0-9]+", "-", text or "")[:32].strip("-") or "x"


def build_feed(mobility, tasks, documents):
    """mobility period + the platform's official deadlines + PoliGo steps."""
    events = []
    if mobility and mobility.get("start_date") and mobility.get("end_date"):
        start = date.fromisoformat(mobility["start_date"])
        end = date.fromisoformat(mobility["end_date"])
        title = "Erasmus - " + (mobility.get("university_name") or mobility.get("university_id") or "")
        events.append(_vevent("mobility-" + _slug(mobility.get("id", "")), start, end, title))
    for d in documents or []:
        if not d.get("deadline"):
            continue
        day = date.fromisoformat(d["deadline"])
        events.append(_vevent("doc-" + _slug(d["id"]), day, day, "Platform deadline: " + d["title"], d.get("what") or ""))
    for t in tasks or []:
        if not t.get("due_date"):
            continue
        day = date.fromisoformat(t["due_date"])
        events.append(_vevent("task-" + str(t["id"]), day, day, t["title"]))
    body = CRLF.join([
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//PoliGo//Erasmus Planner//EN",
        "CALSCALE:GREGORIAN",
        *events,
        "END:VCALENDAR",
    ])
    return body + CRLF
