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
`index.html`, `sources.html`, `styles.css`, `main.js`, `assets/logo.svg`, `favicon.svg`, `screenshots/`

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
