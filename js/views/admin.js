// Erasmus Office panel: confirm or reject mobility requests.
import { icon, esc, fmtDate, cc, toast } from '../ui.js';
import { state, decide } from '../state.js';
import { UNIVERSITIES } from '../data.js';

const uniById = id => UNIVERSITIES.find(u => u.id === id);

export function admin(view) {
  let filter = 'pending', rejecting = null;
  const draw = () => {
    const all = [...state.requests].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const waiting = all.filter(r => r.status === 'pending').length, confirmed = all.filter(r => r.status === 'confirmed').length;
    const shown = all.filter(r => filter === 'all' || r.status === filter);
    view.innerHTML = `<div class="page wide">
      <div class="row between" style="flex-wrap:wrap;gap:12px;margin:10px 0 20px">
        <div><div class="label" style="margin-bottom:6px">Erasmus Office</div><h2 style="font-size:28px">Mobility requests</h2></div>
        <div class="chips">${[['pending', `Waiting · ${waiting}`], ['confirmed', 'Confirmed'], ['rejected', 'Rejected'], ['all', 'All']].map(([k, l]) => `<button class="chip ${filter === k ? 'on' : ''}" data-f="${k}">${l}</button>`).join('')}</div>
      </div>
      <div class="kpis">
        <div class="card kpi"><b style="color:var(--gold)">${waiting}</b><span class="small muted">Waiting for confirmation</span></div>
        <div class="card kpi"><b style="color:var(--good)">${confirmed}</b><span class="small muted">Confirmed</span></div>
        <div class="card kpi"><b style="color:var(--accent)">${Object.keys(state.users).length}</b><span class="small muted">Student accounts on this device</span></div>
      </div>
      <div class="card">${shown.map(r => {
        const x = uniById(r.uniId);
        const actions = r.status === 'pending'
          ? (rejecting === r.id
            ? `<div class="row gap8" style="flex-wrap:wrap"><input class="input" id="reason" placeholder="Reason, sent to the student" style="flex:1;min-width:200px;height:40px"><button class="btn sm" id="do-reject" style="background:var(--none);box-shadow:none">Reject</button><button class="btn ghost sm" id="cancel">Cancel</button></div>`
            : `<div class="row gap8"><button class="btn green sm" data-ok="${r.id}">${icon('check', 15, 2.6)} Approve</button><button class="btn ghost sm" data-no="${r.id}">Reject</button></div>`)
          : `<span class="row gap8"><span class="pill ${r.status === 'confirmed' ? 'good' : 'red'}" style="height:26px;padding:0 10px">${r.status === 'confirmed' ? 'Confirmed' : 'Rejected'}</span><span class="small quiet">${fmtDate(r.decidedAt)}${r.reason ? ` · ${esc(r.reason)}` : ''}</span></span>`;
        return `<div class="req">
          <div class="row between" style="flex-wrap:wrap;gap:8px"><div><div style="font-weight:600">${esc(r.name)} ${r.demo ? '<span class="demo" style="margin-left:6px">Example</span>' : ''}</div><div class="small quiet">${esc(r.program)} · ${esc(r.email)}</div></div>${actions}</div>
          <div class="row gap16 small muted" style="flex-wrap:wrap"><span class="row gap8">${cc(x.cc)}<span style="color:var(--text)">${esc(x.short)}</span></span><span>${fmtDate(r.start)} – ${fmtDate(r.end)}</span>
          <span class="row gap8" style="color:${r.letter?.deleted ? 'var(--text3)' : 'var(--accent)'}">${icon('file', 16)}${r.letter ? esc(r.letter.name) + (r.letter.deleted ? ' · deleted after decision' : ` · ${Math.round(r.letter.size / 1024)} KB`) : 'No letter'}</span></div>
        </div>`;
      }).join('') || '<p class="small" style="padding:20px">Nothing here.</p>'}</div>
      <div class="row gap8 small quiet" style="margin-top:16px">${icon('shield', 16)} Letters are deleted automatically after a decision. A rejection needs a reason, which the student sees.</div>
    </div>`;
    view.querySelectorAll('[data-f]').forEach(b => b.addEventListener('click', () => { filter = b.dataset.f; draw(); }));
    view.querySelectorAll('[data-ok]').forEach(b => b.addEventListener('click', () => { decide(b.dataset.ok, 'confirmed'); toast('Confirmed. The student’s timeline is unlocked.'); draw(); }));
    view.querySelectorAll('[data-no]').forEach(b => b.addEventListener('click', () => { rejecting = b.dataset.no; draw(); view.querySelector('#reason')?.focus(); }));
    view.querySelector('#cancel')?.addEventListener('click', () => { rejecting = null; draw(); });
    view.querySelector('#do-reject')?.addEventListener('click', () => {
      const reason = view.querySelector('#reason').value.trim();
      if (!reason) { toast('Write a reason for the student.'); return; }
      decide(rejecting, 'rejected', reason); rejecting = null; draw();
    });
  };
  draw();
}
