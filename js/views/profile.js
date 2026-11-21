import { icon, esc, fmtDate, toast } from '../ui.js';
import { state, me, myRequest, submitRequest, decide, signOut, deleteMyData, resetDemo } from '../state.js';
import { PROGRAMS, SEMESTERS, UNIVERSITIES } from '../data.js';
import { homeCoursesFor } from '../match.js';
import { go, render } from '../main.js';

const uniById = id => UNIVERSITIES.find(u => u.id === id);

export function profile(view) {
  const u = me(), req = myRequest(), prog = PROGRAMS[u.program];
  const home = homeCoursesFor(u), ects = home.reduce((s, c) => s + c.ects, 0);
  const initials = u.name.split(' ').map(w => w[0]).slice(0, 2).join('');
  view.innerHTML = `<div class="page">
    <div class="row gap16" style="margin:10px 0 22px">
      <div style="width:58px;height:58px;border-radius:50%;background:linear-gradient(135deg,var(--accent),#1E5F8A);display:flex;align-items:center;justify-content:center;font:700 20px var(--display);color:#070B14">${esc(initials)}</div>
      <div><div style="font:600 18px var(--sans);margin-bottom:3px">${esc(u.name)}</div><div class="small muted">${esc(state.session.email)}</div></div>
    </div>
    <div class="card" style="padding:4px 16px;margin-bottom:16px">
      <div class="row between divider" style="padding:12px 0;border:0"><span class="muted small">Program</span><span style="font-weight:500">${esc(prog.short)} · Year ${prog.year}</span></div>
      <div class="row between divider" style="padding:12px 0"><span class="muted small">Semester abroad</span><span style="font-weight:500">${SEMESTERS[u.semester]}</span></div>
      <div class="row between divider" style="padding:12px 0"><span class="muted small">Courses to recognize</span><span class="row gap8" style="font-weight:500">${home.length} · ${ects} ECTS <a href="#/courses">Edit</a></span></div>
    </div>
    ${statusCard(req)}
    <button class="row gap12 muted" id="privacy" style="padding:10px 2px;font-weight:500">${icon('shield', 18)} Privacy &amp; my data</button>
    <button class="row gap12 muted" id="out" style="padding:10px 2px;font-weight:500">${icon('logout', 18)} Sign out</button>
  </div>`;

  view.querySelector('#accepted')?.addEventListener('click', () => acceptedSheet());
  view.querySelector('#again')?.addEventListener('click', () => acceptedSheet());
  view.querySelector('#approve-demo')?.addEventListener('click', () => { decide(req.id, 'confirmed'); toast('Approved by the Erasmus Office (demo)'); go('welcome'); });
  view.querySelector('#privacy').addEventListener('click', privacySheet);
  view.querySelector('#out').addEventListener('click', () => { signOut(); go(''); });
}

function statusCard(req) {
  if (!req) return `
    <div style="border-radius:18px;padding:20px;background:radial-gradient(120% 140% at 100% 0%,rgba(251,191,36,.18),var(--surface) 55%);border:1px solid rgba(251,191,36,.35);margin-bottom:16px">
      <div class="label" style="color:var(--gold);margin-bottom:8px">Going on Erasmus?</div>
      <h3 style="font-size:18px;margin-bottom:6px">Tell us where and when</h3>
      <p class="small" style="margin-bottom:16px">We'll build your timeline and keep your Erasmus documents in one place.</p>
      <button class="btn gold block" id="accepted">I got accepted to Erasmus</button>
    </div>`;
  const x = uniById(req.uniId);
  if (req.status === 'pending') return `
    <div class="wait-banner" style="margin-bottom:16px">
      <div class="row gap8" style="color:var(--gold);font-weight:600;margin-bottom:8px">${icon('clock', 18)} Waiting for the Erasmus Office</div>
      <p class="small" style="margin-bottom:6px"><b style="color:var(--text)">${esc(x.short)}</b>, ${fmtDate(req.start)} – ${fmtDate(req.end)}. Sent ${fmtDate(req.createdAt)}.</p>
      <p class="small">You'll get an email when it's confirmed. Then your timeline unlocks.</p>
      <button class="chip" id="approve-demo" style="margin-top:14px;border-style:dashed">Demo: approve as Erasmus Office</button>
    </div>`;
  if (req.status === 'rejected') return `
    <div class="card pad" style="border-color:rgba(248,113,113,.45);margin-bottom:16px">
      <div class="row gap8" style="color:var(--none);font-weight:600;margin-bottom:8px">${icon('x', 18, 2.4)} Request not confirmed</div>
      <p class="small" style="margin-bottom:14px">Reason from the Erasmus Office: <span style="color:var(--text)">${esc(req.reason || 'not given')}</span></p>
      <button class="btn ghost block" id="again">Send a new request</button>
    </div>`;
  return `<div class="ok-banner" style="margin-bottom:16px;justify-content:space-between"><span class="row gap8">${icon('check', 18, 2.6)}<span><b>${esc(x.short)}</b> · ${fmtDate(req.start)} – ${fmtDate(req.end)}</span></span><a href="#/timeline">Timeline</a></div>`;
}

function modal(html) {
  const m = document.createElement('div');
  m.className = 'modal';
  m.innerHTML = `<div class="panel" role="dialog" aria-modal="true"><div class="row between" style="margin-bottom:8px"><span style="width:40px;height:5px;border-radius:3px;background:#39435A;margin:6px auto 10px"></span></div>${html}</div>`;
  const close = () => m.remove();
  m.addEventListener('click', e => { if (e.target === m) close(); });
  document.addEventListener('keydown', function esc(e) { if (e.key === 'Escape') { close(); document.removeEventListener('keydown', esc); } });
  document.body.appendChild(m);
  return { el: m, close };
}

function acceptedSheet() {
  const u = me();
  const shortlist = u.shortlist.map(uniById).filter(Boolean);
  const others = UNIVERSITIES.filter(x => !u.shortlist.includes(x.id));
  const dates = u.semester === 'spring' ? ['2028-02-15', '2028-06-30'] : ['2027-09-15', '2028-01-31'];
  const opt = x => `<option value="${x.id}">${esc(x.short)}, ${esc(x.country)}</option>`;
  const { el, close } = modal(`
    <div class="label" style="color:var(--gold);margin-bottom:6px">Your Erasmus</div>
    <h2 style="margin-bottom:20px">Where are you going?</h2>
    <label class="field"><span class="label">Host university</span><select class="input" id="uni">
      ${shortlist.length ? `<optgroup label="Your shortlist">${shortlist.map(opt).join('')}</optgroup><optgroup label="All partners">${others.map(opt).join('')}</optgroup>` : UNIVERSITIES.map(opt).join('')}
    </select></label>
    <div class="row gap12"><label class="field" style="flex:1"><span class="label">Starts</span><input class="input" type="date" id="start" value="${dates[0]}"></label>
      <label class="field" style="flex:1"><span class="label">Ends</span><input class="input" type="date" id="end" value="${dates[1]}"></label></div>
    <span class="label" style="display:block;margin-bottom:8px">Acceptance letter</span>
    <label class="drop" for="file"><span class="row gap12" id="fname" style="font-weight:500">${icon('file', 20)}<span class="muted">Choose the PDF from the host university</span></span><span id="fok"></span></label>
    <input type="file" id="file" accept=".pdf,application/pdf,image/*" hidden>
    <div class="row gap8 small quiet" style="margin:10px 0 20px;align-items:flex-start">${icon('shield', 16)}<span>Only the Erasmus Office sees this file. It is deleted after confirmation. In this prototype the file never leaves your device: we only keep its name.</span></div>
    <div class="error" id="err" hidden></div>
    <button class="btn gold block" id="send" disabled>Send to Erasmus Office</button>`);
  let letter = null;
  const f = el.querySelector('#file'), send = el.querySelector('#send'), err = el.querySelector('#err');
  const valid = () => { const s = el.querySelector('#start').value, e = el.querySelector('#end').value; send.disabled = !(letter && s && e && e > s); };
  f.addEventListener('change', () => {
    const file = f.files[0]; if (!file) return;
    letter = { name: file.name, size: file.size };
    el.querySelector('#fname').innerHTML = `<span class="gold" style="color:var(--gold)">${icon('file', 20)}</span><span>${esc(file.name)}</span>`;
    el.querySelector('#fok').innerHTML = `<span style="color:var(--good)">${icon('check', 18, 2.6)}</span>`;
    valid();
  });
  el.querySelectorAll('input[type=date]').forEach(i => i.addEventListener('input', () => { valid(); const s = el.querySelector('#start').value, e = el.querySelector('#end').value; err.hidden = !(s && e && e <= s); err.textContent = 'The end date must be after the start date.'; }));
  send.addEventListener('click', () => {
    submitRequest({ uniId: el.querySelector('#uni').value, start: el.querySelector('#start').value, end: el.querySelector('#end').value, letter });
    close(); toast('Sent to the Erasmus Office'); render();
  });
}

function privacySheet() {
  const { el, close } = modal(`
    <h2 style="margin-bottom:14px">Privacy &amp; my data</h2>
    <div class="stack small">
      <p><b style="color:var(--text)">What PoliGo keeps:</b> your UPT email, program, semester, the courses you picked, your shortlist and, after acceptance, your host university, dates and task checkmarks.</p>
      <p><b style="color:var(--text)">What it never asks for:</b> CNP, ID card or passport numbers.</p>
      <p><b style="color:var(--text)">Acceptance letter:</b> only the Erasmus Office sees it, and it is deleted after a decision.</p>
      <p><b style="color:var(--text)">In this prototype</b> everything stays in this browser. Nothing is sent to a server.</p>
    </div>
    <button class="btn ghost block" id="del" style="margin-top:20px;color:var(--none);border-color:rgba(248,113,113,.4)">${icon('trash', 18)} Delete my data</button>
    <button class="btn ghost block" id="reset" style="margin-top:10px">Reset the whole demo</button>`);
  el.querySelector('#del').addEventListener('click', () => { deleteMyData(); close(); go(''); });
  el.querySelector('#reset').addEventListener('click', () => { resetDemo(); close(); go(''); });
}
