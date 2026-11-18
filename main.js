// Mobile menu
const burger = document.querySelector('.burger');
const nav = document.getElementById('nav');
function setMenu(open){
  burger.setAttribute('aria-expanded', String(open));
  burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  nav.classList.toggle('open', open);
  document.body.classList.toggle('menu-open', open);
}
burger.addEventListener('click', () => setMenu(burger.getAttribute('aria-expanded') !== 'true'));
nav.addEventListener('click', e => { if (e.target.closest('a')) { setMenu(false); closeDropdowns(); } });

// Dropdowns
const ddBtns = document.querySelectorAll('.nav__btn');
function closeDropdowns(except){
  ddBtns.forEach(b => { if (b !== except){ b.setAttribute('aria-expanded','false'); document.getElementById(b.getAttribute('aria-controls')).classList.remove('open'); } });
}
ddBtns.forEach(b => b.addEventListener('click', e => {
  e.stopPropagation();
  const open = b.getAttribute('aria-expanded') === 'true';
  closeDropdowns(b);
  b.setAttribute('aria-expanded', String(!open));
  document.getElementById(b.getAttribute('aria-controls')).classList.toggle('open', !open);
}));
document.addEventListener('click', e => { if (!e.target.closest('.dd')) closeDropdowns(); });
document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  closeDropdowns();
  if (nav.classList.contains('open')) { setMenu(false); burger.focus(); }
});

// Atlas pins: select a region, update the caption and the "See region" link
const REGIONS = [
  ['Vice City','City · east coast','vice-city'],['Grassrivers','Wetlands · south','grassrivers'],['Leonida Keys','Islands · far south','leonida-keys'],
  ['Port Gellhorn','Port city · west coast','port-gellhorn'],['Ambrosia','Industrial town · inland','ambrosia'],['Kalaga National Park','National park · north','kalaga'],
];
const pins = document.querySelectorAll('.mpin');
function selectRegion(i){
  const [n, m, slug] = REGIONS[i];
  document.getElementById('atlas-name').textContent = n;
  document.getElementById('atlas-meta').textContent = m;
  const see = document.getElementById('atlas-see');
  see.href = '#region-' + slug; see.setAttribute('aria-label', 'See ' + n + ' in the regions list');
  pins.forEach(x => x.setAttribute('aria-pressed', String(+x.dataset.r === i)));
}
pins.forEach(p => p.addEventListener('click', () => selectRegion(+p.dataset.r)));
selectRegion(0);
document.querySelectorAll('.rcard .arrow[data-r]').forEach(b => b.addEventListener('click', () => {
  selectRegion(+b.dataset.r);
  document.getElementById('atlas').scrollIntoView({ behavior: 'smooth', block: 'center' });
  const pin = document.querySelector('.mpin[data-r="' + b.dataset.r + '"]');
  pin.classList.remove('flash'); void pin.offsetWidth; pin.classList.add('flash');
}));

// Highlight a target card briefly when jumped to
function flashTarget(el){ if (!el) return; el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash'); }
window.addEventListener('hashchange', () => { const el = document.getElementById(location.hash.slice(1)); if (el && el.classList.contains('card')) flashTarget(el); });

// Client-side search over what is on this page
const qIn = document.getElementById('q'), qList = document.getElementById('q-results'), qMsg = document.getElementById('q-msg');
const INDEX = [];
document.querySelectorAll('.rcard').forEach(c => INDEX.push({ t: c.querySelector('h3').textContent, k: 'Region', d: c.querySelector('p').textContent, id: c.id }));
document.querySelectorAll('.timeline li').forEach((c, i) => { c.id = c.id || 'news-' + (i + 1); INDEX.push({ t: c.querySelector('h3').textContent, k: 'News', d: c.querySelector('time').textContent + ' · ' + c.querySelector('p').textContent, id: c.id }); });
document.querySelectorAll('.mcard').forEach((c, i) => { c.id = c.id || 'video-' + (i + 1); INDEX.push({ t: c.querySelector('h3').textContent, k: 'Trailer', d: c.querySelector('.muted').textContent, id: c.id }); });
document.querySelectorAll('.fcard').forEach((c, i) => { const li = c.closest('li'); li.id = li.id || 'official-' + (i + 1); INDEX.push({ t: c.querySelector('.fcard__t').textContent.trim(), k: 'Official page', d: c.querySelector('.fcard__s').textContent.replace('↗','').trim(), id: li.id }); });
[['Community atlas','Map','Interactive V17 community map of Leonida','atlas'],['Launch countdown','Countdown','Time until the US launch on 19 Nov 2026 countdown release date','countdown-card'],
 ['About Neonshore','About','Who runs this fan site','about'],['Sources & credits','About','Image and map credits licence','sources'],['Privacy','About','What this site collects (nothing)','privacy'],['Community','Community','Mapping community and official links','community']]
 .forEach(([t,k,d,id]) => INDEX.push({ t, k, d, id }));
let qHits = [], qSel = -1;
function goTo(hit){
  const el = document.getElementById(hit.id);
  closeSearch(); qIn.value = hit.t;
  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  flashTarget(el.classList.contains('card') ? el : el.querySelector('.card') || el);
  qMsg.textContent = 'Jumped to ' + hit.t + '.';
}
function closeSearch(){ qList.hidden = true; qIn.setAttribute('aria-expanded', 'false'); qSel = -1; }
function render(keepMsg){
  const q = qIn.value.trim().toLowerCase();
  if (!keepMsg) qMsg.textContent = '';
  if (!q) { qHits = []; closeSearch(); return; }
  const words = q.split(/\s+/);
  qHits = INDEX.filter(h => { const hay = (h.t + ' ' + h.k + ' ' + h.d).toLowerCase(); return words.every(w => hay.includes(w)); }).slice(0, 7);
  qList.innerHTML = '';
  if (!qHits.length) { qList.innerHTML = '<li class="search__none">No matches on this page.</li>'; }
  qHits.forEach((h, i) => {
    const li = document.createElement('li'); li.setAttribute('role', 'option'); li.id = 'q-opt-' + i;
    const b = document.createElement('button'); b.type = 'button'; b.className = 'search__hit';
    b.innerHTML = '<span class="search__k"></span><b></b>'; b.querySelector('span').textContent = h.k; b.querySelector('b').textContent = h.t;
    b.addEventListener('click', () => goTo(h)); li.appendChild(b); qList.appendChild(li);
  });
  qList.hidden = false; qIn.setAttribute('aria-expanded', 'true');
}
function mark(){ qList.querySelectorAll('.search__hit').forEach((b, i) => b.classList.toggle('on', i === qSel)); }
qIn.addEventListener('input', () => render());
qIn.addEventListener('focus', () => { if (qIn.value.trim()) render(true); });
qIn.addEventListener('keydown', e => {
  if (e.key === 'ArrowDown' && qHits.length) { e.preventDefault(); qSel = (qSel + 1) % qHits.length; mark(); }
  else if (e.key === 'ArrowUp' && qHits.length) { e.preventDefault(); qSel = (qSel - 1 + qHits.length) % qHits.length; mark(); }
  else if (e.key === 'Enter') { e.preventDefault(); if (!qHits.length) render(); if (qHits.length) goTo(qHits[Math.max(qSel, 0)]); else qMsg.textContent = qIn.value.trim() ? 'No matches on this page.' : 'Type a region, trailer or topic.'; }
  else if (e.key === 'Escape') closeSearch();
});
document.getElementById('q-go').addEventListener('click', () => { render(); if (qHits.length) goTo(qHits[0]); else { qMsg.textContent = qIn.value.trim() ? 'No matches on this page.' : 'Type a region, trailer or topic.'; qIn.focus(); } });
document.addEventListener('click', e => { if (!e.target.closest('.search')) closeSearch(); });

// Click-to-play official Rockstar trailers (nothing loads from YouTube until pressed)
document.querySelectorAll('.yt').forEach(b => b.addEventListener('click', () => {
  const f = document.createElement('iframe');
  f.src = 'https://www.youtube-nocookie.com/embed/' + b.dataset.yt + '?autoplay=1&rel=0';
  f.title = b.dataset.title; f.loading = 'lazy';
  f.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
  f.referrerPolicy = 'strict-origin-when-cross-origin'; f.allowFullscreen = true; f.className = 'yt__frame';
  b.closest('figure').classList.add('playing');
  b.replaceWith(f);
}));

// Countdown: US launch moment. Rockstar: "midnight local time on November 19, 2026".
// We use 00:00 Eastern on 19 Nov 2026. US DST ends 1 Nov 2026, so ET = EST (UTC-5) -> 05:00 UTC.
const LAUNCH = Date.UTC(2026, 10, 19, 5, 0, 0); // 2026-11-19T05:00:00Z
const cells = {}; document.querySelectorAll('#countdown b').forEach(b => cells[b.dataset.u] = b);
const pad = n => String(n).padStart(2, '0');
const localEl = document.getElementById('count-local');
try {
  localEl.textContent = new Date(LAUNCH).toLocaleString(undefined, { year:'numeric', month:'short', day:'numeric', hour:'numeric', minute:'2-digit', timeZoneName:'short' });
} catch (e) { localEl.textContent = new Date(LAUNCH).toLocaleString(); }
let timer;
function tick(){
  let t = Math.floor((LAUNCH - Date.now()) / 1000);
  if (t <= 0) {
    document.getElementById('count-title').textContent = 'GTA VI is out now';
    document.getElementById('countdown').hidden = true;
    document.getElementById('count-out').hidden = false;
    clearInterval(timer); return;
  }
  cells.d.textContent = pad(Math.floor(t / 86400)); t %= 86400;
  cells.h.textContent = pad(Math.floor(t / 3600)); t %= 3600;
  cells.m.textContent = pad(Math.floor(t / 60));
  cells.s.textContent = pad(t % 60);
}
tick(); timer = setInterval(tick, 1000);
