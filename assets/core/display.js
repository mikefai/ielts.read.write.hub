// Display settings: theme, text size, hide timer. Import this at the top of a page's module script so it runs before first paint.
import { loadPref, savePref } from './prefs.js';

export const SCALE = { min: 0.9, max: 1.5, step: 0.1 };
export const clampScale = v => { const n = Number(v); return Number.isFinite(n) ? Math.round(Math.min(SCALE.max, Math.max(SCALE.min, n)) * 10) / 10 : 1; };
export const resolveTheme = (theme, prefersDark) => theme === 'light' || theme === 'dark' ? theme : prefersDark ? 'dark' : 'light';

const dark = () => typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: dark)');
let watching = false;

export function applyDisplay() {
  if (typeof document === 'undefined') return;
  const root = document.documentElement, mq = dark();
  root.dataset.theme = resolveTheme(loadPref('theme', 'auto'), !!mq && mq.matches);
  root.style.setProperty('--uiscale', String(clampScale(loadPref('fontScale', 1))));
  root.classList.toggle('hide-timer', !!loadPref('hideTimer', false));
  if (!document.querySelector('link[data-display]')) {
    const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = new URL('./display.css', import.meta.url).href; l.dataset.display = ''; document.head.append(l);
  }
  if (mq && !watching) { watching = true; mq.addEventListener?.('change', () => applyDisplay()); }
}

export function mountDisplayMenu(container) {
  const wrap = document.createElement('span'); wrap.className = 'dispmenu';
  wrap.innerHTML = `<button type="button" class="btn mini dispbtn" aria-expanded="false" aria-haspopup="true">Display</button>
    <div class="disppop" role="group" aria-label="Display settings" hidden>
      <div class="dprow"><span class="dplabel">Theme</span><span class="dpbtns" data-k="theme">${[['light', 'Light'], ['dark', 'Dark'], ['auto', 'Auto']].map(([v, t]) => `<button type="button" class="btn mini" data-v="${v}" aria-pressed="false">${t}</button>`).join('')}</span></div>
      <div class="dprow"><span class="dplabel">Text size</span><span class="dpbtns"><button type="button" class="btn mini" data-s="-1" aria-label="Smaller text">A&minus;</button><output class="dpval" aria-live="polite"></output><button type="button" class="btn mini" data-s="1" aria-label="Larger text">A+</button><button type="button" class="btn mini" data-s="0">Reset</button></span></div>
      <label class="dprow dpcheck"><input type="checkbox" class="dptimer"> Hide timer</label>
    </div>`;
  container.append(wrap);
  const btn = wrap.querySelector('.dispbtn'), pop = wrap.querySelector('.disppop'), out = wrap.querySelector('output'), chk = wrap.querySelector('.dptimer');
  const sync = () => {
    const t = loadPref('theme', 'auto');
    wrap.querySelectorAll('[data-k=theme] button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.v === t)));
    out.textContent = Math.round(clampScale(loadPref('fontScale', 1)) * 100) + '%';
    chk.checked = !!loadPref('hideTimer', false);
  };
  const set = open => { pop.hidden = !open; btn.setAttribute('aria-expanded', String(open)); };
  btn.addEventListener('click', () => set(pop.hidden));
  wrap.addEventListener('keydown', e => { if (e.key === 'Escape' && !pop.hidden) { set(false); btn.focus(); } });
  document.addEventListener('click', e => { if (!wrap.contains(e.target)) set(false); });
  pop.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.v) savePref('theme', b.dataset.v);
    else if (b.dataset.s !== undefined) savePref('fontScale', b.dataset.s === '0' ? 1 : clampScale(loadPref('fontScale', 1) + SCALE.step * Number(b.dataset.s)));
    applyDisplay(); sync();
  });
  chk.addEventListener('change', () => { savePref('hideTimer', chk.checked); applyDisplay(); });
  sync();
  return wrap;
}

applyDisplay();
