"""Generate the Study book mark. Requires Pillow only when regenerating assets."""
from pathlib import Path
import sys
from PIL import Image, ImageDraw

output = Path(sys.argv[1])
output.mkdir(parents=True, exist_ok=True)

def icon(size, maskable=False):
    scale = 4
    image = Image.new('RGBA', (512 * scale, 512 * scale), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    navy, white, accent = '#111827', '#FFFFFF', '#A5B4FC'
    def polygon(points, fill):
        draw.polygon([(x * scale, y * scale) for x, y in points], fill=fill)
    def line(points, fill, width=10):
        draw.line([(x * scale, y * scale) for x, y in points], fill=fill, width=width * scale, joint='curve')
    draw.rounded_rectangle((0, 0, 512 * scale, 512 * scale), radius=0 if maskable else 104 * scale, fill=navy)
    polygon([(128, 150), (206, 142), (248, 162), (248, 312), (206, 294), (128, 302)], white)
    polygon([(264, 162), (306, 142), (384, 150), (384, 302), (306, 294), (264, 312)], white)
    line([(150, 187), (201, 182), (226, 193)], accent, 8)
    line([(150, 214), (201, 209), (226, 220)], accent, 8)
    line([(286, 193), (311, 182), (362, 187)], accent, 8)
    line([(286, 220), (311, 209), (362, 214)], accent, 8)
    # Small vector lettering, avoiding a host-dependent font asset.
    line([(164, 346), (188, 346)], white, 8)
    line([(176, 346), (176, 384)], white, 8)
    line([(164, 384), (188, 384)], white, 8)
    line([(208, 384), (208, 346), (224, 365), (240, 346), (240, 384)], white, 8)
    line([(260, 384), (276, 346), (292, 384)], white, 8)
    line([(267, 372), (285, 372)], white, 7)
    line([(312, 346), (336, 346)], white, 8)
    line([(324, 346), (324, 384)], white, 8)
    line([(312, 384), (336, 384)], white, 8)
    return image.resize((size, size), Image.Resampling.LANCZOS).quantize(colors=128)

for size in (192, 512):
    icon(size).save(output / f'pwa-{size}x{size}.png', optimize=True)
icon(512, True).save(output / 'pwa-maskable-512x512.png', optimize=True)
icon(180, True).save(output / 'apple-touch-icon.png', optimize=True)
icon(32).save(output / 'favicon-32x32.png', optimize=True)
