"""Document scanner: reads a photo or PDF of a paper the student received
abroad and explains it in plain language, with Claude (vision).

Two kinds of scan:
  - "document"   a rental contract, a registration form, a bill... -> what it is,
                 what to do, deadlines, what to bring, what to watch out for
  - "transcript" the host Transcript of Records -> the list of courses with
                 credits and grades, used by the return check

The API key stays on the server (ANTHROPIC_API_KEY). The image is sent to the
model and never stored; only the JSON result is kept. Without a key the
scanner answers with a clearly marked sample result, so the demo still works.
"""
import base64
import json
import os

from server import seed as seedmod

MODEL = os.environ.get("POLIGO_SCAN_MODEL", "claude-opus-5-5")
MEDIA_TYPES = {"image/jpeg", "image/png", "image/gif", "image/webp", "application/pdf"}
MAX_BYTES = 8 * 1024 * 1024


class ScanError(Exception):
    def __init__(self, status, code, message):
        super().__init__(message)
        self.status, self.code, self.message = status, code, message


def configured():
    return bool(os.environ.get("ANTHROPIC_API_KEY") or os.environ.get("ANTHROPIC_AUTH_TOKEN"))


DOCUMENT_SCHEMA = {
    "type": "object",
    "properties": {
        "document_type": {"type": "string"},
        "language": {"type": "string"},
        "summary": {"type": "string"},
        "what": {"type": "string"},
        "steps": {"type": "array", "items": {"type": "string"}},
        "deadlines": {"type": "array", "items": {
            "type": "object",
            "properties": {
                "text": {"type": "string"},
                "title": {"type": "string"},
                "date": {"type": "string"},
                "offset_days": {"type": "integer"},
            },
            "required": ["text", "title", "date", "offset_days"],
            "additionalProperties": False,
        }},
        "bring": {"type": "array", "items": {"type": "string"}},
        "watch_out": {"type": "string"},
        "keywords": {"type": "array", "items": {
            "type": "object",
            "properties": {"term": {"type": "string"}, "meaning": {"type": "string"}},
            "required": ["term", "meaning"],
            "additionalProperties": False,
        }},
    },
    "required": ["document_type", "language", "summary", "what", "steps", "deadlines", "bring", "watch_out", "keywords"],
    "additionalProperties": False,
}

TRANSCRIPT_SCHEMA = {
    "type": "object",
    "properties": {
        "university": {"type": "string"},
        "courses": {"type": "array", "items": {
            "type": "object",
            "properties": {
                "name": {"type": "string"},
                "ects": {"type": "number"},
                "grade": {"type": "string"},
                "passed": {"type": "boolean"},
            },
            "required": ["name", "ects", "grade", "passed"],
            "additionalProperties": False,
        }},
    },
    "required": ["university", "courses"],
    "additionalProperties": False,
}

LANG_NAMES = {"ro": "Romanian", "en": "English"}

SYSTEM = (
    "You help Romanian students from Politehnica University Timișoara (UPT) who are on an "
    "Erasmus+ mobility abroad. They photograph official papers they receive in the host "
    "country, often in a language they do not read well. Be accurate and concrete; never "
    "invent amounts, dates or obligations that are not on the paper. If something is "
    "unreadable, say so instead of guessing."
)

DOCUMENT_TASK = (
    "Explain this document to the student in {lang}, in plain words.\n"
    "- document_type: a short name for the kind of document (e.g. rental contract).\n"
    "- language: the language the document is written in.\n"
    "- summary: one sentence.\n"
    "- what: two or three sentences on what this document is and why the student got it.\n"
    "- steps: what the student has to do, in order. Empty if nothing.\n"
    "- deadlines: every date or time limit on the paper. `date` is YYYY-MM-DD when the paper "
    "gives an exact date, otherwise an empty string; `offset_days` is how many days from today "
    "the deadline is ({today}), your best estimate when only a relative limit is given. `title` "
    "is a short task name for a to-do list.\n"
    "- bring: documents or items the student must bring or attach.\n"
    "- watch_out: the one thing most likely to cost the student money or trouble (fees, "
    "penalties, automatic renewals). Empty string if nothing stands out.\n"
    "- keywords: up to 6 important foreign terms from the paper with their meaning in {lang}.\n"
    "Write every explanation field in {lang}."
)

TRANSCRIPT_TASK = (
    "This is a Transcript of Records issued by a university abroad. List every course on it "
    "exactly as written (original name), with the ECTS credits, the grade as written, and "
    "whether it was passed (false for a failing grade, 'not passed', 'absent' or no credits "
    "awarded). `university` is the issuing university."
)


def _client():
    import anthropic
    return anthropic.Anthropic()


def _content_block(data_b64, media_type):
    if media_type == "application/pdf":
        return {"type": "document", "source": {"type": "base64", "media_type": media_type, "data": data_b64}}
    return {"type": "image", "source": {"type": "base64", "media_type": media_type, "data": data_b64}}


def _validate(data_b64, media_type):
    if media_type not in MEDIA_TYPES:
        raise ScanError(415, "ERR_SCAN_TYPE", "send a JPEG, PNG, WebP, GIF photo or a PDF")
    try:
        raw = base64.b64decode(data_b64, validate=True)
    except Exception:
        raise ScanError(400, "ERR_SCAN_DATA", "the file could not be read")
    if not raw:
        raise ScanError(400, "ERR_SCAN_DATA", "the file is empty")
    if len(raw) > MAX_BYTES:
        raise ScanError(413, "ERR_SCAN_TOO_BIG", "the file is larger than 8 MB")


def _ask(block, task, schema):
    import anthropic
    try:
        response = _client().beta.messages.create(
            model=MODEL,
            max_tokens=16000,
            betas=["server-side-fallback-2026-07-01"],
            fallbacks="default",
            system=SYSTEM,
            messages=[{"role": "user", "content": [block, {"type": "text", "text": task}]}],
            output_config={"format": {"type": "json_schema", "schema": schema}},
        )
    except anthropic.AuthenticationError:
        raise ScanError(502, "ERR_SCAN_AUTH", "the scanner's API key is not valid")
    except anthropic.RateLimitError:
        raise ScanError(503, "ERR_SCAN_BUSY", "the scanner is busy - try again in a minute")
    except anthropic.BadRequestError as e:
        raise ScanError(400, "ERR_SCAN_REJECTED", f"the document could not be processed: {e.message}")
    except anthropic.APIStatusError as e:
        raise ScanError(502, "ERR_SCAN_UPSTREAM", f"the scanner failed ({e.status_code})")
    except anthropic.APIConnectionError:
        raise ScanError(502, "ERR_SCAN_OFFLINE", "the scanner could not reach the model")
    if response.stop_reason == "refusal":
        raise ScanError(422, "ERR_SCAN_REFUSED", "the model declined to read this document")
    if response.stop_reason == "max_tokens":
        raise ScanError(502, "ERR_SCAN_TRUNCATED", "the answer was cut short - try a clearer photo")
    text = next((b.text for b in response.content if b.type == "text"), "")
    try:
        return json.loads(text)
    except ValueError:
        raise ScanError(502, "ERR_SCAN_UPSTREAM", "the scanner returned an unreadable answer")


def explain_document(data_b64, media_type, ui_lang, today):
    """Returns (result_dict, is_sample)."""
    _validate(data_b64, media_type)
    if not configured():
        doc = seedmod.WELCOME_DOC
        return {"document_type": doc["document_type"], "language": doc["language"],
                "summary": doc["summary"], **doc["result"]}, True
    task = DOCUMENT_TASK.format(lang=LANG_NAMES.get(ui_lang, "English"), today=today)
    return _ask(_content_block(data_b64, media_type), task, DOCUMENT_SCHEMA), False


def read_transcript(data_b64, media_type, sample_rows):
    """Returns (result_dict, is_sample). sample_rows: used without an API key."""
    _validate(data_b64, media_type)
    if not configured():
        return {"university": "", "courses": sample_rows}, True
    return _ask(_content_block(data_b64, media_type), TRANSCRIPT_TASK, TRANSCRIPT_SCHEMA), False
