// Neonshore shared scroll FX + 3D hero controller.
// Usage on any page: <body data-hero3d="community|shop|product"> plus the .x3-stage / .x3-hero markup,
// then <script type="module" src="(relative)/assets/js/scrollfx.js">.
const root = document.documentElement;
const body = document.body;
const stage = document.querySelector('.x3-stage');
const canvas = document.getElementById('x3-scene');
const hero = document.querySelector('.x3-hero');
const after = hero && hero.nextElementSibling;      // the first section, which still floats over the scene
const header = document.querySelector('.hdr');
const mq = q => window.matchMedia(q).matches;

const reduced = root.classList.contains('reduced-motion');
const small = mq('(max-width: 860px)') || mq('(pointer: coarse)');
const lowPower = (navigator.hardwareConcurrency || 8) <= 4 || !!(navigator.connection && navigator.connection.saveData);
const tier = !hero ? 'none' : root.classList.contains('no-webgl') ? 'static' : reduced ? 'reduced' : (small || lowPower) ? 'lite' : 'full';
root.dataset.x3Tier = tier;
const status = window.__x3 = { tier, variant: body.dataset.hero3d || 'community', mode: 'pending', frames: 0, errors: [] };
window.addEventListener('error', e => status.errors.push(String(e.message)));

// ---------- scroll progress ----------
let p = 0;
function readScroll() {
  if (!hero) return;
  const vh = window.innerHeight;
  const span = Math.max(1, hero.offsetHeight + (after ? after.offsetHeight * 0.6 : 0) - vh);
  p = Math.min(1, Math.max(0, window.scrollY / span));
  root.style.setProperty('--x3-p', p.toFixed(4));
  if (header) header.classList.toggle('is-solid', window.scrollY > hero.offsetHeight - 80);
}

// ---------- HUD ----------
const sky = document.getElementById('x3-sky'), clock = document.getElementById('x3-time');
function hud() {
  if (clock) clock.textContent = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  if (sky) sky.textContent = p < 0.25 ? 'Golden hour' : p < 0.6 ? 'Dusk' : 'Neon night';
}

// ---------- render loop lifecycle ----------
let api = null, animate = false, inView = true, raf = 0;
function frame() {
  raf = 0;
  if (!api || !inView || document.hidden) return;
  api.setScroll(p); api.render(); status.frames++;
  if (animate) raf = requestAnimationFrame(frame);
}
function kick() { if (!raf && api && inView && !document.hidden) raf = requestAnimationFrame(frame); }
function fallback(reason) { stage && stage.classList.add('is-fallback'); status.mode = 'static'; status.reason = reason; animate = false; }

if (tier === 'static') fallback('no-webgl');
else if (tier !== 'none' && canvas) {
  import('./hero3d.js').then(({ createHero3D }) => {
    const panels = (body.dataset.hero3dPanels || '').split(',').map(x => x.trim()).filter(Boolean);
    api = createHero3D(canvas, { variant: status.variant, lite: tier !== 'full', reduced,
      panels: tier === 'full' ? panels : panels.slice(0, 3), onAsset: () => { status.assets = (status.assets || 0) + 1; kick(); } });
    canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); fallback('context-lost'); });
    status.mode = 'webgl'; status.info = api.info;
    Object.defineProperty(status, 'fps', { get: () => api.fps });
    Object.defineProperty(status, 'dpr', { get: () => api.dpr });
    animate = !reduced;            // reduced motion: draw only when scrolling/resizing
    readScroll(); kick();
  }).catch(err => { status.errors.push(String(err)); fallback('init-error'); });
}

// pause rendering once the scene can no longer be seen: the hero is gone and the first section's
// see-through top (about a quarter of it; the rest fades to solid) has scrolled out of view
function checkView() {
  if (!hero) return;
  const hb = hero.getBoundingClientRect().bottom;
  const ar = after ? after.getBoundingClientRect() : null;
  const vis = hb > 0 || (ar && ar.top + ar.height * 0.25 > 0);
  if (vis !== inView || status.paused === undefined) {
    inView = vis; status.paused = !vis;
    if (stage) stage.style.visibility = vis ? 'visible' : 'hidden';
    kick();
  }
}
document.addEventListener('visibilitychange', () => { status.hidden = document.hidden; kick(); });

// ---------- pointer parallax ----------
if (!reduced && !small) {
  window.addEventListener('pointermove', e => {
    const mx = (e.clientX / innerWidth) * 2 - 1, my = (e.clientY / innerHeight) * 2 - 1;
    root.style.setProperty('--x3-mx', mx.toFixed(3)); root.style.setProperty('--x3-my', my.toFixed(3));
    api && api.setPointer(mx, -my); kick();
  }, { passive: true });
  document.querySelectorAll('.x3-pillar').forEach(card => {
    card.addEventListener('pointermove', e => {
      const r = card.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
      card.style.transform = `perspective(900px) rotateY(${x * 8}deg) rotateX(${-y * 8}deg)`;
    });
    card.addEventListener('pointerleave', () => { card.style.transform = ''; });
  });
}

let rt;
window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { api && api.resize(); readScroll(); checkView(); kick(); }, 120); });
window.addEventListener('scroll', () => { readScroll(); checkView(); hud(); kick(); }, { passive: true });
readScroll(); checkView(); hud(); setInterval(hud, 30000);

// ---------- reveals & counters ----------
// Opt-in markup: data-x3-reveal on one element, data-x3-stagger on a list (children reveal one after another).
document.querySelectorAll('[data-x3-reveal]').forEach(el => el.classList.add('x3-reveal'));
document.querySelectorAll('[data-x3-stagger]').forEach(list => [...list.children].forEach((c, i) => { c.classList.add('x3-reveal'); c.style.setProperty('--d', i % 6); }));
const launchEl = document.getElementById('x3-launch');
function launchHours() {
  const ms = Date.parse(launchEl.dataset.launch) - Date.now();
  if (ms <= 0) { document.getElementById('x3-launch-k').textContent = 'Out now in the US'; return null; }
  return Math.ceil(ms / 3600000);
}
if (launchEl) { const h = launchHours(); launchEl.dataset.to = h === null ? '0' : String(h); if (h === null) launchEl.textContent = '✓'; }
function count(el) {
  if (el.textContent === '✓') return;
  const to = +el.dataset.to, from = +(el.dataset.from || 0);
  if (reduced) { el.textContent = to; return; }
  const t0 = performance.now(), dur = 1400;
  const step = now => { const t = Math.min(1, (now - t0) / dur); el.textContent = Math.round(from + (to - from) * (1 - Math.pow(1 - t, 3))); if (t < 1) requestAnimationFrame(step); };
  el.textContent = String(from); requestAnimationFrame(step);
}
const rio = new IntersectionObserver(entries => entries.forEach(e => {
  if (!e.isIntersecting) return;
  e.target.classList.add('is-in'); e.target.querySelectorAll('.x3-count').forEach(count); rio.unobserve(e.target);
}), { threshold: 0.2 });
document.querySelectorAll('.x3-reveal').forEach(el => rio.observe(el));

// ---------- in-page parallax: [data-x3-par="0.08"] drifts against the scroll ----------
const parEls = [...document.querySelectorAll('[data-x3-par]')];
if (parEls.length && !reduced && !small) {
  let pending = false;
  const update = () => {
    pending = false; const vh = innerHeight;
    for (const el of parEls) {
      const r = el.parentElement.getBoundingClientRect();
      if (r.bottom < -100 || r.top > vh + 100) continue;
      const off = (r.top + r.height / 2 - vh / 2) * -(+el.dataset.x3Par);
      el.style.transform = `translate3d(0,${off.toFixed(1)}px,0) scale(1.12)`;
    }
  };
  window.addEventListener('scroll', () => { if (!pending) { pending = true; requestAnimationFrame(update); } }, { passive: true });
  update();
}
// whole-page progress (header bar + night layer below the 3D block)
const setPage = () => root.style.setProperty('--x3-page', (scrollY / Math.max(1, document.documentElement.scrollHeight - innerHeight)).toFixed(4));
window.addEventListener('scroll', setPage, { passive: true }); setPage();
