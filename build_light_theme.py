#!/usr/bin/env python3
"""
VANTAGE: build theme.css (the light theme)

Reads styles.css and mobile.css, finds every declaration that uses a dark-theme colour
(text, background, border, shadow) and writes a light twin of it under
html[data-theme="light"]. The night (dark) theme itself is never touched.

Run it again after you change colours in styles.css or mobile.css:
    python3 tools/build_light_theme.py
Hand-written parts (toggle button, switch effect, light colour tokens) live in
tools/theme.head.css and tools/theme.tail.css and are copied into theme.css.
"""
import re, colorsys, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
PFX = 'html[data-theme="light"]'
TEXT_PROPS = {'-webkit-text-fill-color', 'color', 'caret-color', 'text-decoration-color', 'fill', 'stroke'}

# ---------- colour helpers ----------
def parse(tok):
    t = tok.strip().lower()
    if t.startswith('#'):
        h = t[1:]
        if len(h) == 3: h = ''.join(c * 2 for c in h)
        return int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16), 1.0
    m = re.match(r'rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+)\s*)?\)', t)
    if m:
        return float(m[1]), float(m[2]), float(m[3]), float(m[4]) if m[4] else 1.0
    return None

def hsl(r, g, b):
    h, l, s = colorsys.rgb_to_hls(r / 255, g / 255, b / 255)
    return h, s, l

def rgb(h, s, l):
    r, g, b = colorsys.hls_to_rgb(h, l, s)
    return round(r * 255), round(g * 255), round(b * 255)

def fmt(r, g, b, a):
    if a >= 0.999: return '#%02x%02x%02x' % (r, g, b)
    return 'rgba(%d,%d,%d,%s)' % (r, g, b, ('%.3f' % a).rstrip('0').rstrip('.'))

def surface(c):          # dark surface / border -> light
    r, g, b, a = c
    h, s, l = hsl(r, g, b)
    if l > 0.62: return None                        # already light / bright accent: keep
    if r == g == b == 0: return None                # pure black is handled by the shadow rules
    if l > 0.38 and s > 0.45: return None           # saturated mid-tone accent: keep
    return fmt(*rgb(h, min(s, 0.9) * 0.55, 1 - l * 0.55), a)

def white_overlay(c):    # translucent white glass on dark -> translucent navy on light
    r, g, b, a = c
    return fmt(20, 40, 80, a) if min(r, g, b) >= 235 else None

def text(c):
    r, g, b, a = c
    h, s, l = hsl(r, g, b)
    if l < 0.30: return None                        # already dark text (sits on an accent fill)
    a = max(a, 0.92) if a < 1 else a                # keep text solid enough to read on light surfaces
    if s < 0.28:                                    # neutral greys and whites
        return fmt(*rgb(h, min(s, 0.3), min(max(1 - l, 0.10), 0.36)), a)
    return fmt(*rgb(h, min(s, 0.85), 0.22 if l > 0.5 else l), a)   # bright accent text -> deeper shade

def shadow(c):
    r, g, b, a = c
    h, s, l = hsl(r, g, b)
    if l < 0.30 or (r == g == b == 0): return fmt(24, 48, 92, round(a * 0.4, 3))
    return fmt(r, g, b, round(a * 0.65, 3))        # coloured glow: calmer

COL = re.compile(r'#(?:[0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b|rgba?\([^)]*\)')

def recolor(value, fn):
    changed = False
    def sub(m):
        nonlocal changed
        c = parse(m.group(0))
        if not c: return m.group(0)
        out = fn(c)
        if out and out != m.group(0):
            changed = True
            return out
        return m.group(0)
    return COL.sub(sub, value), changed

def convert(prop, value, whole):
    p = prop.strip().lower()
    if p.startswith('--') or 'url(' in value or 'mask' in p: return None
    if p in ('box-shadow', 'text-shadow', 'filter'):
        v, ch = recolor(value, shadow); return v if ch else None
    if p.startswith('border') or p.startswith('outline') or p == 'column-rule':
        v, ch = recolor(value, lambda c: white_overlay(c) or surface(c)); return v if ch else None
    if p in ('fill', 'stroke'):                     # SVG paint: dark fills become light, bright ones deepen
        v, ch = recolor(value, lambda c: surface(c) if hsl(*c[:3])[2] < 0.30 else text(c)); return v if ch else None
    if p in TEXT_PROPS:
        v, ch = recolor(value, text); return v if ch else None
    if p.startswith('background'):
        if re.search(r'background-clip\s*:\s*text', whole): v, ch = recolor(value, text)
        else: v, ch = recolor(value, lambda c: white_overlay(c) or surface(c))
        return v if ch else None
    return None

# ---------- CSS walking ----------
def split_top(s, sep):
    out, d, q, cur = [], 0, None, ''
    for ch in s:
        if q:
            cur += ch
            if ch == q: q = None
            continue
        if ch in '"\'': q = ch; cur += ch; continue
        if ch == '(': d += 1
        elif ch == ')': d -= 1
        if ch == sep and d == 0: out.append(cur); cur = ''
        else: cur += ch
    if cur.strip(): out.append(cur)
    return out

def blocks(css):
    i, n = 0, len(css)
    while i < n:
        j = css.find('{', i)
        if j < 0: break
        pre = css[i:j].strip()
        d, k = 1, j + 1
        while k < n and d:
            if css[k] == '{': d += 1
            elif css[k] == '}': d -= 1
            k += 1
        yield pre, css[j + 1:k - 1]
        i = k

SOLID_FILL = re.compile(r'^(?:#38bdf8|var\(--cyan\)|#0ea5e9)$', re.I)

def prefix(sel):
    sel = sel.strip()
    if sel.startswith(':root'): return PFX + sel[5:]
    if re.match(r'^html\b', sel): return PFX + sel[4:]
    return PFX + ' ' + sel

def rule(pre, body):
    decls = [d for d in split_top(body, ';') if ':' in d]
    whole = ';'.join(decls)
    out, solid = [], False
    for d in decls:
        prop, _, val = d.partition(':')
        imp = '!important' in val
        v = val.replace('!important', '').strip()
        if prop.strip().lower() in ('background', 'background-color') and SOLID_FILL.match(v): solid = True
        nv = convert(prop, v, whole)
        if nv: out.append(f'{prop.strip()}:{nv}{" !important" if imp else ""}')
    if solid and re.search(r'(?<![-\w])color\s*:\s*#0[0-9a-f]{5}', whole, re.I):
        out.append('color:#ffffff')                 # solid accent fills get white text in light mode
        if re.search(r'background(?:-color)?\s*:\s*(?:#38bdf8|#0ea5e9)\b', whole, re.I):
            out.append('background-color:#0369a1')  # ...on a deeper blue fill so the contrast holds
    if out and re.search(r'background-clip\s*:\s*text', whole) and any(o.startswith('background:') or o.startswith('background-image:') for o in out):
        out.append('-webkit-background-clip:text;background-clip:text')   # the shorthand above would reset text-clipping
    if not out: return ''
    sels = ',\n'.join(prefix(s) for s in split_top(pre, ','))
    return f'{sels}{{{";".join(out)}}}\n'

def walk(css):
    css = re.sub(r'/\*.*?\*/', '', css, flags=re.S)
    res = ''
    for pre, body in blocks(css):
        if pre.startswith('@media') or pre.startswith('@supports'):
            inner = walk(body)
            if inner.strip(): res += f'{pre}{{\n{inner}}}\n'
        elif pre.startswith('@'):
            continue                                  # keyframes, font-face, ...
        else:
            res += rule(pre, body)
    return res

def main():
    head = (ROOT / 'tools' / 'theme.head.css').read_text(encoding='utf-8')
    base = walk((ROOT / 'styles.css').read_text(encoding='utf-8'))
    mob = walk((ROOT / 'mobile.css').read_text(encoding='utf-8'))
    tail = (ROOT / 'tools' / 'theme.tail.css').read_text(encoding='utf-8')
    out = head + '\n/* ===== Generated from styles.css (do not edit by hand) ===== */\n' + base
    out += '\n/* ===== Generated from mobile.css (phones only) ===== */\n@media (max-width: 767px){\n' + mob + '}\n' + tail
    (ROOT / 'theme.css').write_text(out, encoding='utf-8')
    print('theme.css written:', len(out), 'bytes')

main()
