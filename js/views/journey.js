// Journey mode (after the Erasmus Office confirms): intro animation, Today, Timeline.
import { icon, esc, fmtDate, addDays, today as todayIso, daysBetween } from '../ui.js';
import { me, update, myRequest } from '../state.js';
import { UNIVERSITIES, HOME, TIMELINE, STAGES } from '../data.js';
import { Globe, COLORS } from '../globe.js';
import { go } from '../main.js';

const uniById = id => UNIVERSITIES.find(u => u.id === id);
const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];

function journeyGlobe(box, x, opts = {}) {
  const from = [HOME.lon, HOME.lat], to = [x.lon, x.lat];
  const g = new Globe(box, { center: mid(from, to), radius: (w, h) => Math.min(Math.max(w, h) * 1.1, w * 1.8), halo: COLORS.gold, ...opts });
  g.setHighlights([{ iso3: HOME.iso3, color: COLORS.cyan, alpha: 0.3 }, { iso3: x.iso3, color: COLORS.gold, alpha: 0.42 }]);
  g.setPoints([
    { lon: x.lon, lat: x.lat, color: COLORS.gold, r: 5, pulse: true, label: x.city, showLabel: true, anchor: 'middle', dx: 0, dy: 22 },
    { lon: HOME.lon, lat: HOME.lat, color: COLORS.cyan, r: 4, label: HOME.name, showLabel: true, anchor: 'middle', dx: 0, dy: 20 },
  ]);
  return { g, from, to };
}

export function tasksFor(req, user) {
  const S = req.start, E = req.end, A = addDays(S, -3);
  const base = { S, E, A };
  const t = TIMELINE.map(x => ({ id: x.id, stage: x.stage, title: x.title, due: addDays(base[x.from], x.days), src: 'Template' }));
  const stageOf = d => (d < A ? 'before' : d <= addDays(A, 14) ? 'arrival' : d < addDays(E, -14) ? 'during' : d <= E ? 'return' : 'after');
  const custom = (user.custom ?? []).map(c => ({ ...c, stage: stageOf(c.due), src: 'Added by you' }));
  return [...t, ...custom].map(x => ({ ...x, done: !!user.done[x.id] })).sort((a, b) => a.due.localeCompare(b.due));
}

const dueChip = (t, now) => {
  if (t.done) return '<span class="pill soft">Done</span>';
  const d = daysBetween(now, t.due);
  if (d < 0) return `<span class="pill red">Overdue · ${fmtDate(t.due)}</span>`;
  if (d <= 14) return `<span class="pill gold">${d === 0 ? 'Today' : `In ${d} day${d === 1 ? '' : 's'}`}</span>`;
  return `<span class="pill ${d <= 45 ? 'gold' : 'soft'}">${fmtDate(t.due)}</span>`;
};
const taskRow = (t, now) => `<div class="task ${t.done ? 'done' : ''}"><button class="check ${t.done ? 'on' : ''}" data-t="${t.id}" aria-label="Mark done">${t.done ? icon('check', 15, 3) : ''}</button><div style="flex:1"><div class="tt" style="font-weight:500">${esc(t.title)}</div><div class="meta">${dueChip(t, now)}<span class="src">${t.src}</span></div></div></div>`;
const bindChecks = (root, redraw) => root.querySelectorAll('[data-t]').forEach(b => b.addEventListener('click', () => { update(u => { u.done[b.dataset.t] = !u.done[b.dataset.t]; }); redraw(); }));

// ---------- Intro: the moment the interface turns gold ----------
export function intro(view) {
  const req = myRequest(), x = uniById(req.uniId);
  view.innerHTML = `<div class="intro"><div class="globe-box"></div>
    <div class="msg"><div class="label" style="color:var(--gold);margin-bottom:10px">Confirmed by the UPT Erasmus Office</div>
      <div class="greet">${esc(x.greeting)}</div>
      <p style="margin:8px 0 22px">Your journey to ${esc(x.city)} starts now.</p>
      <button class="btn gold" id="start" style="min-width:240px">Start my journey ${icon('arrow', 18, 2.2)}</button></div></div>`;
  const { g, from, to } = journeyGlobe(view.querySelector('.globe-box'), x, { center: [HOME.lon, HOME.lat - 6], zoom: 1.3, offsetY: -60 });
  g.arc = { from, to }; g.arcProgress = 0;
  (async () => {
    await new Promise(r => setTimeout(r, 400));
    await g.flyTo(mid(from, to).map((v, i) => (i ? v - 6 : v)), 0.95, 1300);
    await g.setArc({ from, to }, { animate: true, duration: 1300 });
    view.querySelector('.greet')?.classList.add('show');
  })();
  view.querySelector('#start').addEventListener('click', () => { update(u => { u.seenIntro = true; }); go('today'); });
}

// ---------- Today ----------
export function today(view) {
  const u = me(), req = myRequest(), x = uniById(req.uniId), now = todayIso();
  const draw = () => {
    const tasks = tasksFor(req, me());
    const next = tasks.filter(t => !t.done).slice(0, 3);
    const before = tasks.filter(t => t.stage === 'before'), doneB = before.filter(t => t.done).length;
    const toStart = daysBetween(now, req.start), total = daysBetween(req.start, req.end), day = daysBetween(req.start, now) + 1;
    const big = toStart > 0 ? `${toStart} <small>days</small>` : day <= total ? `Day ${day} <small>of ${total}</small>` : 'Welcome back';
    const sub = toStart > 0 ? `until ${esc(x.city)}<br>${fmtDate(req.start)}` : day <= total ? `in ${esc(x.city)}<br>until ${fmtDate(req.end)}` : `from ${esc(x.city)}`;
    view.querySelector('#today-info').innerHTML = `
      <div class="row between" style="align-items:flex-end;margin-bottom:16px"><div><div class="label" style="color:var(--gold);margin-bottom:6px">Your Erasmus</div><div class="big">${big}</div></div><div class="small muted" style="text-align:right">${sub}</div></div>
      <div class="ok-banner" style="margin-bottom:14px">${icon('check', 18, 2.6)}<span style="font-weight:500">Confirmed by the UPT Erasmus Office</span></div>
      <div class="row between"><span class="label">Next up</span><a href="#/timeline" class="small" style="font-weight:600">Timeline</a></div>
      ${next.map(t => taskRow(t, now)).join('') || '<p class="small" style="padding:12px 0">All done. Enjoy your Erasmus!</p>'}
      <div style="margin-top:18px"><div class="row between small muted" style="margin-bottom:8px"><span>Before departure</span><span>${doneB} of ${before.length} done</span></div><div class="bar"><i style="width:${(100 * doneB / before.length).toFixed(0)}%;background:var(--gold)"></i></div></div>`;
    bindChecks(view.querySelector('#today-info'), draw);
  };
  view.innerHTML = `<div class="page wide"><div class="today-wrap"><div class="globe-box today-globe" id="tg"></div><div id="today-info"></div></div></div>`;
  const { g, from, to } = journeyGlobe(view.querySelector('#tg'), x);
  g.setArc({ from, to });
  draw();
}

// ---------- Timeline ----------
export function timeline(view) {
  const req = myRequest(), x = uniById(req.uniId), now = todayIso();
  const open = new Set(['before', 'arrival']);
  let adding = false;
  const draw = () => {
    const tasks = tasksFor(req, me());
    view.innerHTML = `<div class="page">
      <div class="head"><span style="font:600 18px var(--sans)">Timeline</span><button class="chip" id="add">${icon('plus', 14)} Add task</button></div>
      <div class="row gap8 small muted" style="margin-bottom:6px">${icon('calendar', 16)}${fmtDate(req.start)} – ${fmtDate(req.end)} · ${esc(x.short)}</div>
      ${adding ? `<div class="card pad" style="margin:10px 0"><input class="input" id="nt" placeholder="What do you need to do?" style="margin-bottom:10px"><div class="row gap8"><input class="input" type="date" id="nd" value="${addDays(now, 7)}" style="flex:1"><button class="btn" id="save">Add</button></div></div>` : ''}
      ${Object.entries(STAGES).map(([k, name]) => {
        const list = tasks.filter(t => t.stage === k), done = list.filter(t => t.done).length;
        return `<div><button class="stage-h" data-s="${k}"><span class="row gap8"><span style="color:${open.has(k) ? 'var(--gold)' : 'var(--text3)'}">${icon(open.has(k) ? 'down' : 'arrow', 18, 2)}</span>${name}</span><span class="small muted">${done} / ${list.length}</span></button>
          ${open.has(k) ? list.map(t => taskRow(t, now)).join('') : ''}</div>`;
      }).join('')}
      <p class="small quiet" style="margin-top:18px">Deadlines come from a demo template. The Erasmus Office sets the real ones.</p></div>`;
    view.querySelectorAll('[data-s]').forEach(b => b.addEventListener('click', () => { const s = b.dataset.s; open.has(s) ? open.delete(s) : open.add(s); draw(); }));
    view.querySelector('#add').addEventListener('click', () => { adding = !adding; draw(); view.querySelector('#nt')?.focus(); });
    view.querySelector('#save')?.addEventListener('click', () => {
      const title = view.querySelector('#nt').value.trim(), due = view.querySelector('#nd').value;
      if (!title || !due) return;
      update(u => { u.custom = [...(u.custom ?? []), { id: 'c-' + Date.now().toString(36), title, due }]; });
      adding = false; draw();
    });
    bindChecks(view, draw);
  };
  draw();
}
