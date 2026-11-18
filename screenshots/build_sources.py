"""Render sources.md -> sources.html (needs: pip install markdown)."""
import markdown, re, os
os.chdir(os.path.join(os.path.dirname(__file__), '..'))
md = open('sources.md').read()
body = markdown.markdown(md, extensions=['tables', 'fenced_code'])
body = re.sub(r'(?<![">])(https?://[^\s<)"]+)', lambda m: (lambda u, t: f'<a href="{u}" target="_blank" rel="noopener">{u}</a>{t}')(m.group(1).rstrip('.,;:”’'), m.group(1)[len(m.group(1).rstrip('.,;:”’')):]), body)
tpl = open('sources.html').read()
a = tpl.index('<a class="link back" href="index.html">← Back to Neonshore</a>') + len('<a class="link back" href="index.html">← Back to Neonshore</a>')
b = tpl.index('<p class="disclaimer"')
open('sources.html', 'w').write(tpl[:a] + '\n' + body + '\n' + tpl[b:])
print('sources.html updated')
