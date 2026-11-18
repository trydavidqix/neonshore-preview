// Neonshore Shop: mobile menu and product gallery. No purchase logic lives here:
// the product is not launched, so nothing in this file opens a checkout.
const burger = document.querySelector('.burger');
const nav = document.getElementById('nav');
function setMenu(open){
  burger.setAttribute('aria-expanded', String(open));
  burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  nav.classList.toggle('open', open);
  document.body.classList.toggle('menu-open', open);
}
burger.addEventListener('click', () => setMenu(burger.getAttribute('aria-expanded') !== 'true'));
nav.addEventListener('click', e => { if (e.target.closest('a')) setMenu(false); });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && nav.classList.contains('open')) { setMenu(false); burger.focus(); } });

const main = document.getElementById('gallery-img');
if (main) {
  const cap = document.getElementById('gallery-cap');
  const thumbs = document.querySelectorAll('.thumbs button');
  thumbs.forEach(b => b.addEventListener('click', () => {
    main.src = b.dataset.full;
    main.alt = b.querySelector('img').alt;
    cap.textContent = b.dataset.cap;
    thumbs.forEach(t => t.setAttribute('aria-pressed', String(t === b)));
  }));
}
