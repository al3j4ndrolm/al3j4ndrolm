"""
Clip-on tray hook with a tie ring — build123d.

Two variants, same look (flowing outline, one-sided taper, all edges rounded, Ø14 tie ring):
  * hook_skirt (default, recommended for the Stokke Tray) — clips UP onto the bottom edge of the
    tray's downturned outer skirt from underneath. Nothing sits on the eating surface; the ring
    hangs straight below the tray edge.
  * hook_lip — clamps a flat horizontal edge (top arm visible on the tray surface).
Printed flat on its side so the layers run along the clip arms (strongest direction for a clip).

1) Print out/edge_gauge.stl, push a slot onto the skirt's bottom edge, note the snug slot.
2) Set EDGE_T to that value, run  python hook.py,  print out/hook_skirt.stl.
"""
from pathlib import Path
from build123d import *

# ---------------- Fit to the tray (MEASURE) ----------------
EDGE_T = 3.0        # skirt wall thickness, mm (from the gauge). Molded PP trays are typically 2.5-3.5
SKIRT_OUT_L = 11.0  # skirt variant: arm up the outside face (visible) — keep below skirt height (~20 mm)
SKIRT_IN_L = 9.0    # skirt variant: arm up the inside of the skirt (hidden)
GRIP = 0.35         # each ridge pinches this much into the gap (light snap; PETG)

# ---------------- Shape ----------------
WALL = 3.0          # clip wall thickness
UP_L = 11.0         # arm on top of the tray (visible)
LOW_L = 17.0        # arm under the tray
WIDTH = 26.0        # clip width — sized so the part cannot fit the Ø31.7 mm small-parts test cylinder
RING_W = 16.0       # width at the ring (drop-shaped taper)
RING_RI = 7.0       # ring hole Ø14 (> 9.5 mm finger-entrapment range; fits ribbon, cord, carabiner)
RING_BAND = 5.0
NECK_W = 6.0
NECK_DROP = 3.0     # gap between clip bottom and ring top
FILLET_2D = 5.0     # sweep radius blending clip into ring
EDGE_FILLET = 1.2   # rounds every outer edge

OUT = Path(__file__).parent / "out"


def hook_lip(t=EDGE_T):
    c = Vector(0.3, t / 2)                       # nose centre (0.3 mm clearance at the edge tip)
    r_out = t / 2 + WALL
    ring_ro = RING_RI + RING_BAND
    ring_c = Vector(c.X + r_out - ring_ro, -WALL - NECK_DROP - ring_ro)   # right side tangent to spine

    upper = Rectangle(UP_L + c.X, WALL, align=(Align.MAX, Align.MIN)).moved(Location((c.X, t)))
    upper += Circle(WALL / 2).moved(Location((-UP_L, t + WALL / 2)))
    s = Rectangle(LOW_L + c.X, WALL, align=(Align.MAX, Align.MAX)).moved(Location((c.X, 0)))
    s += Circle(WALL / 2).moved(Location((-LOW_L, -WALL / 2)))
    s += Circle(r_out).moved(Location(c)) & Rectangle(r_out, 2 * r_out, align=(Align.MIN, Align.CENTER)).moved(Location(c))
    # spine: the clip's outer face continues straight down, tangent to the ring ("J" silhouette)
    s += Rectangle(NECK_W, c.Y - ring_c.Y, align=(Align.MAX, Align.MAX)).moved(Location((c.X + r_out, c.Y)))
    s += Circle(ring_ro).moved(Location(ring_c))
    # round every inside corner (clip <-> spine <-> ring) with a closing: grow then shrink
    s = offset(offset(s, FILLET_2D, kind=Kind.ARC), -FILLET_2D, kind=Kind.ARC)
    s += upper                                    # added after the blend so the gap mouth stays crisp
    assert len(s.faces()) == 1, 'outline must be one piece'
    face = s.faces()[0]
    # gap for the tray edge + ring hole
    face -= Rectangle(LOW_L + 10, t, align=(Align.MAX, Align.MIN)).moved(Location((c.X, 0)))
    face -= Circle(t / 2).moved(Location(c))
    face -= Circle(RING_RI).moved(Location(ring_c))

    part = extrude(face, WIDTH)
    part = part & _taper_body(t + WALL + 5, -WALL, ring_c.Y - ring_ro)
    try:
        part = fillet(part.edges(), EDGE_FILLET)          # soften every edge
    except ValueError:
        part = fillet(part.edges().filter_by(lambda e: e.center().Z < 1e-3 or e.center().Z > WIDTH - 1e-3), EDGE_FILLET)
    # grip ridges across the width, near the arm tips
    for x, y in ((-UP_L + 3, t + 0.8 - GRIP), (-LOW_L + 4, -0.8 + GRIP)):
        part += Cylinder(0.8, WIDTH - 2 * EDGE_FILLET, align=(Align.CENTER, Align.CENTER, Align.MIN)).moved(
            Location((x, y, EDGE_FILLET)))
    return part


def hook_skirt(t=EDGE_T):
    """Skirt wall occupies x in [-t, 0] (outside face at x=0), its bottom edge at y=0, rising +y."""
    c = Vector(-t / 2, -0.3)                     # bend centre, 0.3 mm under the skirt's bottom edge
    r_out = t / 2 + WALL
    ring_ro = RING_RI + RING_BAND
    ring_c = Vector(c.X, c.Y - r_out - NECK_DROP - ring_ro)   # pendant: ring centred under the bend

    body = Circle(r_out).moved(Location(c)) & Rectangle(2 * r_out, r_out, align=(Align.CENTER, Align.MAX)).moved(Location(c))
    body += Rectangle(NECK_W, c.Y - ring_c.Y, align=(Align.CENTER, Align.MAX)).moved(Location(c))
    body += Circle(ring_ro).moved(Location(ring_c))
    body = offset(offset(body, FILLET_2D, kind=Kind.ARC), -FILLET_2D, kind=Kind.ARC)
    # arms added after the blend so the gap stays crisp
    for x0, L in ((0.0, SKIRT_OUT_L), (-t - WALL, SKIRT_IN_L)):
        body += Rectangle(WALL, L - c.Y, align=(Align.MIN, Align.MIN)).moved(Location((x0, c.Y)))
        body += Circle(WALL / 2).moved(Location((x0 + WALL / 2, L)))
    assert len(body.faces()) == 1, "outline must be one piece"
    face = body.faces()[0]
    face -= Rectangle(t, 60, align=(Align.MIN, Align.MIN)).moved(Location((-t, c.Y)))
    face -= Circle(t / 2).moved(Location(c))
    face -= Circle(RING_RI).moved(Location(ring_c))

    part = extrude(face, WIDTH)
    part = part & _taper_body(max(SKIRT_OUT_L, SKIRT_IN_L) + 5, c.Y - r_out, ring_c.Y - ring_ro)
    part = fillet(part.edges(), EDGE_FILLET)
    # grip ridges near the arm tips, pinching GRIP into the gap from each side
    for x, y in ((0.8 - GRIP, SKIRT_OUT_L - 3), (-t - 0.8 + GRIP, SKIRT_IN_L - 3)):
        part += Cylinder(0.8, WIDTH - 2 * EDGE_FILLET, align=(Align.CENTER, Align.CENTER, Align.MIN)).moved(
            Location((x, y, EDGE_FILLET)))
    return part


def _taper_body(y_top, y0, y1):
    """Width envelope: full WIDTH above y0 (the clip), easing to RING_W at y1 (ring bottom)."""
    from math import cos, pi
    def hw(y):
        if y >= y0: return WIDTH / 2
        k = min(1.0, (y0 - y) / (y0 - y1))
        return RING_W / 2 + (WIDTH - RING_W) / 4 * (1 + cos(pi * k))
    ys = [y_top] + [y0 - (y0 - y1 + 10) * i / 24 for i in range(25)]
    # back face (print bed) stays flat; only the front face tapers -> support-free print
    pts = [(2 * hw(y), y) for y in ys] + [(-1.0, ys[-1]), (-1.0, ys[0])]
    face = Polygon(*pts, align=None)                    # in XY: x = width axis, y = up
    env = extrude(face, 120).rotate(Axis.Y, -90)        # width -> +Z, extrusion -> +X
    # map envelope x(width) -> part Z
    return env.moved(Location((-60, 0, 0)))


def edge_gauge(sizes=tuple(x / 2 for x in range(5, 17))):   # 2.5 ... 8.0 mm
    tooth, depth, base, th = 3.0, 12.0, 9.0, 5.0
    x, g = 0.0, Part()
    for sz in sizes:
        g += Box(tooth, depth + base, th, align=(Align.MIN, Align.MIN, Align.MIN)).moved(Location((x, 0, 0)))
        x += tooth
        g += Box(sz, base, th, align=(Align.MIN, Align.MIN, Align.MIN)).moved(Location((x, 0, 0)))
        lbl = extrude(Text(f"{sz:g}", 3.2, rotation=90), 0.6).moved(Location((x + sz / 2, base / 2, th - 0.6)))
        g -= lbl
        x += sz
    g += Box(tooth, depth + base, th, align=(Align.MIN, Align.MIN, Align.MIN)).moved(Location((x, 0, 0)))
    return g


def build():
    OUT.mkdir(exist_ok=True)
    h, lip, gauge = hook_skirt(), hook_lip(), edge_gauge()
    for name, p in (("hook_skirt", h), ("hook_lip", lip), ("edge_gauge", gauge)):
        export_step(p, OUT / f"{name}.step")
        export_stl(p, OUT / f"{name}.stl", tolerance=0.01, angular_tolerance=0.1)
    bb = h.bounding_box()
    print(f"hook_skirt {bb.size.X:.1f} x {bb.size.Y:.1f} x {bb.size.Z:.1f} mm | valid={h.is_valid} | edge T={EDGE_T}")


if __name__ == "__main__":
    build()
