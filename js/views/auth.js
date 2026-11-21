import { icon, lockup, esc } from '../ui.js';
import { state, save, roleFor, signIn } from '../state.js';
import { Globe, COLORS } from '../globe.js';
import { HOME } from '../data.js';
import { go } from '../main.js';

function backdrop(view) {
  const box = view.querySelector('.globe-box');
  const g = new Globe(box, { center: [12, 40], radius: (w, h) => Math.max(w, h) * 1.05, autoRotate: 0.03, interactive: false });
  g.setHighlights([{ iso3: HOME.iso3, color: COLORS.cyan }]);
  g.setPoints([{ lon: HOME.lon, lat: HOME.lat, color: COLORS.cyan, r: 4, pulse: true }]);
}

export function login(view) {
  const prefill = state.pending?.email ?? '';
  view.innerHTML = `
  <div class="auth">
    <div class="globe-box"></div>
    <div class="auth-top"><a href="#/">${lockup(30)}</a></div>
    <form class="auth-body" novalidate>
      <h1 style="margin-bottom:12px">Find the partner university where your courses count.</h1>
      <p style="margin-bottom:26px">Sign in with your UPT student account to see your matches.</p>
      <label class="field"><span class="label">UPT email</span>
        <input class="input" id="email" type="email" inputmode="email" autocomplete="email" placeholder="name.surname@student.upt.ro" value="${esc(prefill)}" required></label>
      <div class="error" id="err" hidden></div>
      <button class="btn block" type="submit" style="margin:6px 0 16px">${icon('mail', 19, 2)} Send sign-in link</button>
      <div class="row gap8 small quiet" style="align-items:flex-start">${icon('shield', 16)}<span>Only @student.upt.ro accounts. No ID documents. Erasmus Office staff sign in with their @upt.ro address.</span></div>
    </form>
  </div>`;
  backdrop(view);
  const form = view.querySelector('form'), input = view.querySelector('#email'), err = view.querySelector('#err');
  form.addEventListener('submit', e => {
    e.preventDefault();
    const email = input.value.trim().toLowerCase();
    if (!roleFor(email)) { err.textContent = 'Use your @student.upt.ro account (or @upt.ro if you work at the Erasmus Office).'; err.hidden = false; input.focus(); return; }
    state.pending = { email }; save();
    go('check');
  });
}

export function check(view) {
  const email = state.pending?.email;
  if (!email) return go('login');
  view.innerHTML = `
  <div class="auth">
    <div class="globe-box"></div>
    <div class="auth-top"><a href="#/">${lockup(30)}</a></div>
    <div class="auth-body">
      <div style="width:56px;height:56px;border-radius:16px;background:rgba(var(--accent-rgb),.12);color:var(--accent);display:flex;align-items:center;justify-content:center;margin-bottom:20px">${icon('mail', 28)}</div>
      <h1 style="margin-bottom:12px">Check your inbox</h1>
      <p style="margin-bottom:22px">We sent a sign-in link to <b style="color:var(--text)">${esc(email)}</b>. Open it on this device to continue.</p>
      <div class="card pad small" style="margin-bottom:18px;border-style:dashed;background:transparent"><b>Demo mode:</b> <span class="muted">no email is sent in this prototype. Tap the button to continue as if you opened the link.</span></div>
      <button class="btn block" id="open">Open the sign-in link ${icon('arrow', 18, 2.2)}</button>
      <button class="btn ghost block" id="other" style="margin-top:10px">Use another email</button>
    </div>
  </div>`;
  backdrop(view);
  view.querySelector('#open').addEventListener('click', () => { signIn(email); go(''); });
  view.querySelector('#other').addEventListener('click', () => go('login'));
}
