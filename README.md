# Neonshore: unofficial GTA VI fan hub

Static site (plain HTML, CSS and JS, no build step), all in English. **Not published or deployed.**

## Run the preview
```bash
cd /workspace/sites/gta6-community
python3 -m http.server 4322 --bind 127.0.0.1
```
Then open http://127.0.0.1:4322/

To regenerate the screenshots (needs the Python `playwright` package and Chrome at /usr/bin/google-chrome):
```bash
python3 screenshots/shoot.py
```

## Reference
- Layout reference: **https://leonida-files.com/**, linked from the X post https://x.com/GTALeonidaFiles/status/2122497246876885295 and from the @GTALeonidaFiles profile.
- `_reference/` holds my study material (their homepage HTML and screenshots I took). It is **not part of the site**: leave it out of any deploy. `python3 -m http.server` will still serve it locally.
- Mirrored: the header (logo, beta badge, Explore/Latest dropdowns, Map, Radio, Media, Community pill, Sign in and Join buttons, mobile burger menu); the two-column hero (script wordmark plus subtitle, two-line headline with a pink second line, intro, community line, search, primary CTA plus text links, stats, source note, a "scroll" chip, a map card with pins and the region name, and a launch countdown card); the 3×2 regions grid; four category cards; a "confirmed news" block with a timeline; a 2×2 media card grid (in the slot where their store section sits); a community card; and a footer with logo, links and the disclaimer. (Their Sign in/Join, Radio, socials and waitlist were later removed: nothing here pretends to work.)
- Not copied: their name, logo, copy, images, map image and fonts. Every word here is original, and every visual is original CSS or SVG.

## Files
`index.html`, `sources.html`, `styles.css`, `main.js`, `assets/logo.svg`, `favicon.svg`, `screenshots/`, `shop/` (see below)

## Images & map
15 official GTA VI images (14 Rockstar screenshots or artwork plus 1 Launch Trailer frame) and the community map are documented in `sources.md`, with each file's exact source URL and the license notes. Every image shows the caption “© Rockstar Games, used for fan commentary”. The map is YANIS V17 by the GTA VI Mapping Community / GTADB.org (CC BY 4.0), credited under it. The user chose V17, which is reported to incorporate the leaked map; see `sources.md`.

## Interactive elements (cleanup pass, 17 Nov 2026)
- No accounts, sign-in, sign-up, forms, socials or Radio. The site collects nothing.
- Search: a client-side filter over the regions, news, trailers, official pages and sections on this page. Picking a result scrolls to it and highlights it.
- Atlas pins update the caption, and "See region" jumps to that region's card. The ↗ on each region card selects its pin and scrolls to the atlas.
- The "Go to the source" cards, "All news", the news sources and the community links open official Rockstar or GTADB pages in a new tab.
- Trailers are click-to-play youtube-nocookie embeds of official Rockstar videos. IDs are listed in `sources.md`.
- About, Sources and Privacy are real sections. `sources.html` is rendered from `sources.md`; regenerate it with `python3 screenshots/build_sources.py`.
- Verify with: `python3 screenshots/audit.py` (needs the preview on port 4322).

## Still not "real"
- Nothing is labelled as an example any more. The region blurbs and news summaries are original fan copy.
- Two of the news dates are inferred (see `sources.md`).
- Countdown: counts to 00:00 ET on 19 Nov 2026 = 2026-11-19T05:00:00Z, the US release moment. Rockstar says "midnight local time", so ET is an assumption; sources are in `sources.md`. After launch the card shows "Out now".

The only external dependency is Google Fonts. `_reference/` holds study material and must be left out of any deploy.

## Two sections: Community and Shop (18 Nov 2026)
Every page header has a **Community | Shop** switch (`.nav__sections`, styled in `styles.css`), and every footer links to Shop. `sources.html` got the same header and footer; `screenshots/build_sources.py` keeps them when it regenerates the page.

```
shop/
  index.html                 store listing (one product card)
  sunset-job/index.html      product page: Sunset Job — Stream Overlay Pack
  shop.css                   shop-only styles (loads after ../styles.css)
  shop.js                    mobile menu + gallery thumbnails. No purchase logic.
  img/sunset-job-*.webp      web copies (1600 px + 640 px thumbs, panels 320 px)
  design/sunset-job/         source material, untouched (NOT part of the site; leave out of any deploy)
```

- Images are WebP copies of the **sale edition** previews (`design/sunset-job/previews/sale/*.png`, `previews/contact-sheet-sale.png`, `sale/static/10-banner-1200x480.png`, `sale/static/10-panels/*.png`). Originals are kept. The branded edition (CAOS/VENENO, "not for sale") and its contact sheet are not used. No Rockstar images are used anywhere in `shop/`.
- Pack contents on the product page come from the pack README (`design/sunset-job/src/docs/README-sale.md`) and the actual files: 13 WebM, 15 PNG pieces + 8 panels, 3 widgets.
- Price: $24 one-time, struck $39, "-38% launch" badge.
- "GTA 6-inspired" appears only once in body copy, never in titles, headings, meta/og tags, paths or file names.

### Launch switch (do this ONLY when the user says "launch")
The product is hidden. The buy button is a disabled `<button>` reading "Coming soon"; there is no active Whop link and no JS that opens checkout. To launch, in `shop/sunset-job/index.html` (an HTML comment marks the spot):
1. Replace `<button class="btn buy" type="button" disabled aria-disabled="true">Coming soon</button>` with
   `<a class="btn btn--pink buy" href="https://whop.com/checkout/plan_tcxdwXYYkaxUN" rel="noopener">Buy now — $24</a>`
2. Remove the "Coming soon" tags (product page and `shop/index.html`), and update the note under the button and the note on `shop/index.html`.
3. Re-run `python3 screenshots/shop_audit.py` (its "buy button disabled" checks will then fail by design; update them).

### Verify
`python3 screenshots/shop_audit.py` (preview must be running on port 4322): console errors, internal links/assets 200, anchors, buy button disabled and inert, no Whop link/JS, naming rules, exact disclaimer, screenshots 11–16.
