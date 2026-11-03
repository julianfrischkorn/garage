"""Zeichnet das App-Icon: ein Tacho mit Zeiger auf dunklem Grund."""
import math
from pathlib import Path
from PIL import Image, ImageDraw

OUT = Path(__file__).parent / "icons"
OUT.mkdir(exist_ok=True)


def icon(size, maskable=False):
    s = size * 4  # größer zeichnen, dann verkleinern = glatte Kanten
    img = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    bg = (21, 25, 30, 255)
    if maskable:
        d.rectangle([0, 0, s, s], fill=bg)
        scale = 0.62
    else:
        d.rounded_rectangle([0, 0, s - 1, s - 1], radius=int(s * 0.22), fill=bg)
        scale = 0.78
    c, r = s / 2, s * scale / 2
    w = max(4, int(s * 0.055))
    # Skala von 135° bis 405°, erst grau, ab dem roten Bereich rot
    d.arc([c - r, c - r, c + r, c + r], 135, 345, fill=(232, 235, 238, 255), width=w)
    d.arc([c - r, c - r, c + r, c + r], 350, 405, fill=(255, 107, 111, 255), width=w)
    for i in range(9):
        a = math.radians(135 + i * 270 / 8)
        r1, r2 = r * 0.70, r * 0.84
        d.line([c + r1 * math.cos(a), c + r1 * math.sin(a), c + r2 * math.cos(a), c + r2 * math.sin(a)],
               fill=(232, 235, 238, 255), width=max(2, w // 2))
    a = math.radians(300)
    d.line([c, c, c + r * 0.78 * math.cos(a), c + r * 0.78 * math.sin(a)], fill=(255, 181, 71, 255), width=w)
    k = r * 0.12
    d.ellipse([c - k, c - k, c + k, c + k], fill=(232, 235, 238, 255))
    return img.resize((size, size), Image.LANCZOS)


icon(192).save(OUT / "icon-192.png")
icon(512).save(OUT / "icon-512.png")
icon(512, maskable=True).save(OUT / "icon-maskable-512.png")
print("ok")
