"""Click-audit every interactive element on Neonshore (desktop + mobile)."""
import subprocess, sys, json
from urllib.parse import urljoin
from playwright.sync_api import sync_playwright
BASE = sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:4322/'
UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36'
fails, externals, notes = [], set(), []
def fail(m): fails.append(m); print('FAIL', m)

def settle(pg):
    last = None
    for _ in range(40):
        pg.wait_for_timeout(120); y = pg.evaluate('scrollY')
        if y == last: return
        last = y

def audit(pw, name, vp, mobile):
    b = pw.chromium.launch(executable_path='/usr/bin/google-chrome', headless=True)
    ctx = b.new_context(viewport=vp, is_mobile=mobile, has_touch=mobile, user_agent=UA)
    pg = ctx.new_page(); errs = []
    pg.on('console', lambda m: m.type == 'error' and errs.append(m.text + ' @' + (m.location or {}).get('url', '')))
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(BASE, wait_until='networkidle')
    st = pg.evaluate('''() => ({forms: document.querySelectorAll('form').length,
      bad: [...document.querySelectorAll('a')].map(a=>a.getAttribute('href')).filter(h=>!h||h==='#'||h.startsWith('javascript')),
      text: /sign\\s?in|log\\s?in|sign\\s?up|join free|create account|radio/i.test(document.body.innerText),
      inputs: [...document.querySelectorAll('input')].map(i=>i.id)})''')
    if st['forms']: fail(f'{name}: {st["forms"]} forms')
    if st['bad']: fail(f'{name}: bad hrefs {st["bad"]}')
    if st['text']: fail(f'{name}: account/radio text still present')
    print(name, 'inputs:', st['inputs'])
    links = pg.evaluate('''() => [...document.querySelectorAll('a')].map((a,i)=>({i, href:a.getAttribute('href'), t:a.textContent.trim().slice(0,40), tgt:a.target, rel:a.rel}))''')
    def open_menu_if_needed(i):
        if not mobile: return
        inNav = pg.evaluate(f'document.querySelectorAll("a")[{i}].closest("#nav") !== null')
        if inNav:
            if pg.get_attribute('.burger', 'aria-expanded') != 'true': pg.click('.burger')
            dd = pg.evaluate(f'(()=>{{const m=document.querySelectorAll("a")[{i}].closest(".dd__menu");return m?m.id:null}})()')
            if dd and pg.get_attribute(f'[aria-controls="{dd}"]', 'aria-expanded') != 'true': pg.click(f'[aria-controls="{dd}"]')
    for L in links:
        h = L['href']
        if h.startswith('#'):
            if not pg.evaluate(f'!!document.getElementById({json.dumps(h[1:])})'): fail(f'{name}: {L["t"]} -> {h} missing target'); continue
            pg.evaluate('window.scrollTo(0,0)'); pg.wait_for_timeout(50)
            if not mobile:
                dd = pg.evaluate(f'(()=>{{const m=document.querySelectorAll("a")[{L["i"]}].closest(".dd__menu");return m?m.id:null}})()')
                if dd: pg.click(f'[aria-controls="{dd}"]')
            open_menu_if_needed(L['i'])
            el = pg.locator('a').nth(L['i'])
            if 'skip' in (el.get_attribute('class') or ''): el.focus(); pg.keyboard.press('Enter')
            else: el.click()
            settle(pg)
            ok = pg.evaluate(f'''(()=>{{const r=document.getElementById({json.dumps(h[1:])}).getBoundingClientRect();return r.top < innerHeight && r.bottom > 0}})()''')
            if not ok: fail(f'{name}: {L["t"]} -> {h} not in view after click')
            if mobile and pg.get_attribute('.burger', 'aria-expanded') == 'true': fail(f'{name}: menu stayed open after {L["t"]}')
        elif h.startswith('http'):
            externals.add(h)
            if L['tgt'] != '_blank' or 'noopener' not in L['rel']: fail(f'{name}: {h} missing target/rel')
        else:
            r = pg.request.get(urljoin(BASE, h))
            if r.status != 200: fail(f'{name}: local {h} -> {r.status}')
    pg.evaluate('window.scrollTo(0,0)')
    # dropdowns + burger
    for dd in ['dd-explore', 'dd-latest']:
        if mobile:
            pg.click('.burger'); assert pg.get_attribute('.burger','aria-expanded') == 'true'
            if not pg.is_visible('#nav'): fail('mobile nav not visible')
        pg.click(f'[aria-controls="{dd}"]'); pg.wait_for_timeout(200)
        if not pg.is_visible(f'#{dd} a'): fail(f'{name}: dropdown {dd} did not open')
        pg.keyboard.press('Escape')
    if mobile and pg.get_attribute('.burger','aria-expanded') == 'true': fail('Escape did not close menu')
    # pins
    for r in range(6):
        pg.click(f'.mpin[data-r="{r}"]')
        nm = pg.text_content('#atlas-name'); see = pg.get_attribute('#atlas-see', 'href')
        if pg.get_attribute(f'.mpin[data-r="{r}"]', 'aria-pressed') != 'true' or not pg.evaluate(f'!!document.querySelector({json.dumps(see)})'): fail(f'{name}: pin {r}')
        pg.click('#atlas-see'); settle(pg)
        if not pg.evaluate(f'(()=>{{const r=document.querySelector({json.dumps(see)}).getBoundingClientRect();return r.top<innerHeight&&r.bottom>0}})()'): fail(f'{name}: see region {see} not in view')
        if pg.text_content(f'{see} h3') != nm: fail(f'{name}: see region mismatch {nm} vs {see}')
    # region arrows
    for r in range(6):
        pg.locator(f'.rcard .arrow[data-r="{r}"]').click(); settle(pg)
        if pg.get_attribute(f'.mpin[data-r="{r}"]', 'aria-pressed') != 'true': fail(f'{name}: arrow {r} did not select pin')
        if not pg.evaluate('(()=>{const r=document.getElementById("atlas").getBoundingClientRect();return r.top<innerHeight&&r.bottom>0})()'): fail(f'{name}: arrow {r} atlas not in view')
    # search
    pg.evaluate('window.scrollTo(0,0)')
    for q, want in [('keys', 'region-leonida-keys'), ('trailer 2', 'video-2'), ('pre-load', 'news-'), ('privacy', 'privacy'), ('music', 'official-3')]:
        pg.fill('#q', q); pg.wait_for_timeout(150)
        if not pg.is_visible('#q-results .search__hit'): fail(f'{name}: search {q} no results'); continue
        pg.keyboard.press('Enter'); settle(pg)
        msg = pg.text_content('#q-msg')
        if not msg.startswith('Jumped'): fail(f'{name}: search {q} msg {msg}')
        notes.append(f'{name} search "{q}" -> {msg}')
    pg.evaluate('window.scrollTo(0,0)'); settle(pg)
    pg.fill('#q', 'zzzz'); pg.click('#q-go')
    if 'No matches' not in (pg.text_content('#q-msg') or ''): fail(f'{name}: no-match message: {pg.text_content("#q-msg")!r}')
    # trailers
    for i in range(pg.locator('.yt').count()):
        btn = pg.locator('.yt').first; vid = btn.get_attribute('data-yt'); btn.scroll_into_view_if_needed(); btn.click()
        fr = pg.wait_for_selector(f'iframe[src*="youtube-nocookie.com/embed/{vid}"]', timeout=5000)
        f = fr.content_frame(); f.wait_for_load_state('load', timeout=30000)
        f.wait_for_selector('#movie_player, .ytp-cued-thumbnail-overlay, .html5-video-player', timeout=30000, state='attached')
        t = f.title(); body = f.inner_text('body')
        pg.wait_for_timeout(2500); body = f.inner_text('body')
        if 'Grand Theft Auto VI' not in t or any(k in body.lower() for k in ('age-restricted', 'error 15', 'unavailable', 'configuration error')): fail(f'{name}: iframe {vid} not playable: {t!r} {body[:120]!r}')
        notes.append(f'{name} iframe {vid} loaded, title="{t}"')
    pg.wait_for_timeout(1500)
    real = [e for e in errs if not any(k in e.lower() for k in ('youtube', 'googlevideo', 'doubleclick', 'ytimg', 'compute-pressure'))]
    if real: fail(f'{name}: console errors {real}')
    yterrs = [e for e in errs if e not in real]
    if yterrs: notes.append(f'{name}: {len(yterrs)} console messages from inside YouTube iframes (third party)')
    # sources page
    pg.goto(urljoin(BASE, 'sources.html'), wait_until='networkidle')
    for h in pg.evaluate('[...document.querySelectorAll("a")].map(a=>a.getAttribute("href"))'):
        if h.startswith('http'): externals.add(h)
        elif pg.request.get(urljoin(BASE + 'sources.html', h)).status != 200: fail(f'sources.html local {h}')
    b.close()

with sync_playwright() as pw:
    audit(pw, 'desktop', {'width': 1440, 'height': 900}, False)
    audit(pw, 'mobile', {'width': 390, 'height': 844}, True)
for u in sorted(externals):
    code = subprocess.run(['curl', '-s', '-o', '/dev/null', '-w', '%{http_code}', '-A', UA, '--max-time', '25', u], capture_output=True, text=True).stdout
    print(code, u)
    if not (code.startswith('2') or code.startswith('3')): fail(f'external {u} -> {code}')
print('\n'.join(notes))
print('RESULT:', 'PASS' if not fails else f'{len(fails)} FAILS')
