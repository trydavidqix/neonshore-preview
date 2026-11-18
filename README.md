# Neonshore 3D (multipage, static)

Local preview: `python3 -m http.server 8000 --bind 127.0.0.1` in this folder, then open http://127.0.0.1:8000/
Fully static, relative paths, works from a GitHub Pages subfolder.

Pages: `index.html` (Community), `shop/index.html` (Shop), `shop/sunset-job/index.html` (product), `sources.html`.

Shared FX modules (reuse on any page):
- `assets/js/hero3d.js`: Three.js hero scene with presets `community`, `shop`, `product` (product/shop show pack artwork on floating panels via `data-hero3d-panels`).
- `assets/js/scrollfx.js`: scroll progress, pin/fade, layered parallax, day-to-night, reveals, counters, render pause, fallbacks.
- `assets/css/fx.css`: x3- prefixed styles.
To add to a page: `<body data-hero3d="shop">`, copy the `.x3-stage` + `.x3-hero` markup, link `fx.css`, load `scrollfx.js` as a module.

Deploy copy for GitHub Pages (repo `neonshore-preview`): 3D hero + scroll effects on Community, Shop and the Sunset Job product page. The buy button is OFF ("Coming soon"); the Whop link lives only in the LAUNCH SWITCH comment in shop/sunset-job/index.html.
`.nojekyll` is present so Pages serves every file as is.
