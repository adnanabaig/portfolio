# Redraws two Silkscreen digits so pixel labels read unambiguously:
#   2  gets a rounded shoulder (Silkscreen's flat-topped 2 reads as Z: "2ND" -> "ZND")
#   0  gets a slash (Silkscreen's 0 and O are the same glyph: "SO101" -> "S0101")
# Everything else is untouched. Silkscreen is OFL 1.1 with no Reserved Font
# Name, so a modified copy may ship under the same license (public/fonts/OFL-Silkscreen.txt).
#
# Needs fontTools + brotli (not an npm dependency; run it in a throwaway venv):
#   python3 -m venv /tmp/ft && /tmp/ft/bin/pip install fonttools brotli
#   f=public/fonts/silkscreen-latin-400-normal.woff2; /tmp/ft/bin/python scripts/patch-silkscreen.py $f $f
# The committed file is already patched; the script is idempotent (it redraws
# the two glyphs outright), so re-running it on its own output changes nothing.
import sys
from fontTools.ttLib import TTFont
from fontTools.pens.ttGlyphPen import TTGlyphPen

PX = 125  # Silkscreen's pixel in font units (1000 upm, 8 px em)
X0 = 1    # glyphs start one pixel in from the origin (left side bearing)

# Rows top to bottom, 4 columns wide, 5 tall (the cap height), like the originals.
GLYPHS = {
    "two": [
        ".##.",
        "#..#",
        "..#.",
        ".#..",
        "####",
    ],
    "zero": [
        ".##.",
        "#..#",
        "#.##",
        "##.#",
        ".##.",
    ],
}


def draw(rows, glyph_set):
    pen = TTGlyphPen(glyph_set)
    top = len(rows)
    for r, row in enumerate(rows):
        y0 = (top - 1 - r) * PX
        c = 0
        while c < len(row):
            if row[c] != "#":
                c += 1
                continue
            start = c
            while c < len(row) and row[c] == "#":
                c += 1
            x0, x1 = (X0 + start) * PX, (X0 + c) * PX
            # Clockwise outer contour (TrueType convention).
            pen.moveTo((x0, y0))
            pen.lineTo((x0, y0 + PX))
            pen.lineTo((x1, y0 + PX))
            pen.lineTo((x1, y0))
            pen.closePath()
    return pen.glyph()


def main(src, dst):
    font = TTFont(src)
    glyf = font["glyf"]
    gs = font.getGlyphSet()
    for name, rows in GLYPHS.items():
        width, _ = font["hmtx"][name]
        g = draw(rows, gs)
        glyf[name] = g
        g.recalcBounds(glyf)
        font["hmtx"][name] = (width, g.xMin)
    font.flavor = "woff2"
    font.save(dst)


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
