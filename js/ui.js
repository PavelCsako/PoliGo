// Small UI helpers: escaping, icons, logo, score badges.
export const esc = s => String(s ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));

const PATHS = {
  globe: '<circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="3.8" ry="9"/><path d="M3 12h18"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/>',
  bookmark: '<path d="M6.5 3.5h11v17l-5.5-3.6-5.5 3.6z"/>',
  user: '<circle cx="12" cy="8.5" r="3.8"/><path d="M4.5 20.5c1.2-3.8 4-5.5 7.5-5.5s6.3 1.7 7.5 5.5"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6"/>',
  calendar: '<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 9.5h17M8 3v4M16 3v4"/>',
  back: '<path d="M15 5l-7 7 7 7"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  up: '<path d="M6 14l6-6 6 6"/>', down: '<path d="M6 10l6 6 6-6"/>',
  file: '<path d="M7 3.5h7l4.5 4.5v12.5H7z"/><path d="M14 3.5V8h4.5"/>',
  arrow: '<path d="M4 12h15M13 6l6 6-6 6"/>',
  layers: '<path d="M12 3.5l8.5 4.5-8.5 4.5L3.5 8z"/><path d="M3.5 12l8.5 4.5 8.5-4.5"/><path d="M3.5 16l8.5 4.5 8.5-4.5"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  shield: '<path d="M12 3.5l7.5 3v5.5c0 4.4-3.2 7.7-7.5 9-4.3-1.3-7.5-4.6-7.5-9V6.5z"/>',
  mail: '<rect x="3.5" y="5.5" width="17" height="13" rx="2.5"/><path d="M4 7l8 6 8-6"/>',
  inbox: '<path d="M3.5 13.5l3-8h11l3 8v6h-17z"/><path d="M3.5 13.5h5l1 2.5h5l1-2.5h5"/>',
  chart: '<path d="M4 20V10M10 20V4M16 20v-7M21 20H3"/>',
  logout: '<path d="M14 4.5h4.5v15H14"/><path d="M10 8l-4 4 4 4M6 12h10"/>',
  clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  trash: '<path d="M4.5 7h15M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13"/>',
  hand: '<path d="M8 13V5.5a1.5 1.5 0 013 0V11m0-1V4a1.5 1.5 0 013 0v7m0-5.5a1.5 1.5 0 013 0V13c0 4-2.5 7-6.5 7-3 0-4.5-1.5-6-4l-1.8-3a1.5 1.5 0 012.5-1.6L8 13"/>',
};
export const icon = (name, size = 22, sw = 1.8) =>
  `<svg class="ic" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${PATHS[name]}</svg>`;

let uid = 0;
export function logoIcon(size = 30, mono = false) {
  const id = 'lg' + (++uid);
  const c1 = mono ? 'currentColor' : '#38BDF8', c2 = mono ? 'currentColor' : '#FBBF24';
  return `<svg width="${size}" height="${size}" viewBox="0 0 64 64" aria-hidden="true" style="display:block;flex:none"><defs><linearGradient id="${id}" x1="18" y1="46" x2="54" y2="12" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#38BDF8"/><stop offset="1" stop-color="#FBBF24"/></linearGradient></defs><circle cx="29" cy="35" r="20" fill="none" stroke="${c1}" stroke-width="3.2"/><ellipse cx="29" cy="35" rx="8.5" ry="20" fill="none" stroke="${c1}" stroke-width="2" stroke-opacity=".5"/><path d="M9.5 35h39" stroke="${c1}" stroke-width="2" stroke-opacity=".5"/><path d="M19 45 C 22 24, 37 12, 52 13" fill="none" stroke="${mono ? c1 : `url(#${id})`}" stroke-width="3.6" stroke-linecap="round"/><circle cx="19" cy="45" r="3.6" fill="${c1}"/><circle cx="52.5" cy="13" r="5" fill="${c2}"/></svg>`;
}
export const lockup = (size = 30) => `<span class="lockup">${logoIcon(size)}<span class="wordmark" style="font-size:${Math.round(size * 0.72)}px">Poli<span>Go</span></span></span>`;

export const score = (n, d, tier) => `<span class="score ${tier}">${n}<span>/${d}</span></span>`;
export const kindPill = kind => kind === 'good' ? `<span class="pill good">${icon('check', 12, 3)}Good</span>`
  : kind === 'partial' ? `<span class="pill partial">Partial</span>` : `<span class="pill none">${icon('x', 11, 3)}No match</span>`;
export const cc = code => `<span class="cc">${esc(code)}</span>`;

export function ring(n, d, color = 'var(--good)', size = 76) {
  const r = 30, C = 2 * Math.PI * r, f = d ? n / d : 0;
  return `<svg width="${size}" height="${size}" viewBox="0 0 76 76" class="ring" aria-label="${n} of ${d}"><circle cx="38" cy="38" r="${r}" fill="none" stroke="var(--border)" stroke-width="7"/><circle cx="38" cy="38" r="${r}" fill="none" stroke="${color}" stroke-width="7" stroke-linecap="round" stroke-dasharray="${C * f} ${C}" transform="rotate(-90 38 38)"/><text x="38" y="44" text-anchor="middle" class="ring-text">${n}/${d}</text></svg>`;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const fmtDate = iso => { if (!iso) return ''; const [y, m, d] = iso.slice(0, 10).split('-').map(Number); return `${d} ${MONTHS[m - 1]} ${y}`; };
export const addDays = (iso, n) => { const d = new Date(iso + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
export const today = () => { const d = new Date(); return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())).toISOString().slice(0, 10); };
export const daysBetween = (a, b) => Math.round((Date.parse(b + 'T12:00:00Z') - Date.parse(a + 'T12:00:00Z')) / 864e5);

export function toast(msg) {
  const el = document.createElement('div');
  el.className = 'toast'; el.textContent = msg;
  document.body.appendChild(el);
  requestAnimationFrame(() => el.classList.add('show'));
  setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 300); }, 2600);
}
