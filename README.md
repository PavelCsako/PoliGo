# PoliGo

Erasmus companion for Politehnica University Timișoara students, built to live
**inside the UPT mobility platform** (Profil · Abilități lingvistice ·
Aplicații pentru mobilități). It adds two entries to the student menu:

- **Alege destinația** (`#destinatie`, before applying): the faculty's real
  agreements on a globe, course matching against your UPT semester, your level
  from *Abilități lingvistice* compared with the agreement's language of
  instruction ("you have B2 in English, that works" / "you need B1 in
  Portuguese"), the places left in the round, favourites, a **Learning
  Agreement draft (PDF)** built from the matches, and an **Apply to this
  agreement** button that opens the platform's own form.
- **Ghidul mobilității** (`#ghid`, once the platform lists you as *Titular* /
  *Aprobat*): what to do now, the platform's documents explained in plain words
  with their official deadlines, the steps the platform does not track (host
  application, accommodation, local registration, LA changes in the first two
  weeks), a **scanner** for papers received abroad, and at the end the **return
  check**: Learning Agreement vs. the host Transcript of Records.

**Leave on Erasmus. Come back with every credit.**

## What PoliGo does NOT keep

Everything the platform already has is read from it, never stored again:
identity, faculty / year / average, language levels, agreements, application
status (the committee decides in the platform) and official documents. There is
no PoliGo login (the platform session is used), no profile, no copy of ID card /
passport / health card (a GDPR risk with no benefit), no admin approvals and no
inbox (the platform has notifications and chat). Databases from older versions
drop those tables and columns on start (`server/db.py`, `MIGRATIONS`).

PoliGo's own data: favourites, LA drafts, its own steps (done / not done),
scan results (the photo itself is not stored) and the transcript rows of the
return check.

## Architecture

```
server/
  main.py         JSON API + static hosting
  platform.py     adapter for the mobility platform: session, profile, languages,
                  agreements, rounds, applications, documents. Ships a DEMO backend
                  (two fictional students); the real platform API replaces it here.
  scanner.py      Claude vision: explains a document / reads a Transcript of Records
  db.py           SQLite schema + migrations
  seed.py         course catalogue + precomputed matches, PoliGo's own steps
  ical.py         .ics export of the official deadlines + steps
  i18n.py, i18n_ro.py   Romanian table (default language, like the platform)
web/              static PWA, no build step
  js/app.js       screens and router
  js/store.js     state + API client (platform-session based)
  js/stage.js, js/globe.js   the globe (d3-geo, Natural Earth 110m)
```

## Run

```bash
docker compose up --build      # http://localhost:8000
```

Without Docker:

```bash
pip install -r requirements.txt
uvicorn server.main:app --port 8000
```

Environment:

| Variable | Default | Meaning |
| --- | --- | --- |
| `ANTHROPIC_API_KEY` | unset | enables the real scanner (model `claude-opus-5-5`, override with `POLIGO_SCAN_MODEL`). Without it the scanner returns a clearly marked sample. |
| `POLIGO_PLATFORM_MODE` | `demo` | `demo` = fictional students and a demo-session picker. |
| `POLIGO_PLATFORM_URL` | `https://mobilitati.upt.ro` | base for "Apply to this agreement", "Language skills" and document links. |

## Demo path

Open the app without a platform session: a **demo session** picker stands in
for the platform login (presentation only).

1. **Ana Popescu** - round 2 is open. Overview -> Agreements -> Setúbal: 6/6
   courses match, but "you need B1 in Portuguese"; Leuven: "you have B2 in
   English, that works". Favourite it, make the LA draft (the browser's print
   dialog saves it as PDF), "Apply to this agreement" opens the platform form.
   The guide stays locked: she is not Titular.
2. **Radu Ionescu** - Titular at Setúbal. The intro flies Timișoara -> Setúbal,
   then Today / Plan / Documents / Scan / Recognition.

The pitch page (the old landing page) is at `#pitch` only.

## Connecting the real platform

Re-implement the public functions of `server/platform.py` (`current_student`,
`agreements_for`, `applications_for`, `documents_for`, `current_round`,
`round_by_id`, `apply_url`, `documents_url`, `languages_url`) against the
platform's API, forwarding its session cookie. Nothing else reads platform data.

## Expose on a domain (Cloudflare Tunnel)

`docker-compose.yml` ships an optional `cloudflared` connector service. It is
off by default and joins the same network as `poligo`, so the dashboard only
needs the internal name:

1. Cloudflare Zero Trust -> Networks -> Tunnels -> Create tunnel -> copy the connector token.
2. Save it in a `.env` file next to `docker-compose.yml` (`CLOUDFLARE_TOKEN=...`).
   The token is a secret - never commit it.
3. Start everything:
   ```
   docker compose --profile tunnel up -d
   ```
4. Back in the dashboard, add a public hostname for the tunnel ->
   Service: `HTTP` / `poligo:8000`.

Why manual `docker run` recipes often fail on Linux servers:
`host.docker.internal` only exists on Docker Desktop. Inside the compose
network this problem disappears (that is why the service here targets
`poligo:8000` over plain HTTP). For an ad-hoc share without an account:

```
docker run --rm -d --name cloudflared --add-host=host.docker.internal:host-gateway \
  cloudflare/cloudflared:latest tunnel --no-autoupdate --url http://host.docker.internal:8000
```

Quick-URLs are random and die with the container; use a named tunnel for a
real deployment. In demo mode anyone reaching the domain can open a demo
session; set `POLIGO_PLATFORM_MODE` to something else to turn that off.
