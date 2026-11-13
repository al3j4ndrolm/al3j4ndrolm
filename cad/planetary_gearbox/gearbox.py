"""
Parametric planetary ("solar") gearbox — build123d.

Layout: NEMA17 motor -> sun gear -> 3 planets -> fixed ring (housing) -> carrier = output.
Reduction = 1 + Zr/Zs.  Output: 8 mm shaft on a 608 bearing in the lid.
Designed for FDM printing (backlash/clearances below). Exports STEP + STL per part.

Run:  python gearbox.py      (outputs to ./out)
"""
from math import pi, cos, sin, tan, acos, sqrt, radians
from pathlib import Path
from build123d import *

# ---------------- Parameters (mm) ----------------
M = 1.5            # module
PA = radians(20)   # pressure angle
ZS, ZP, ZR = 18, 18, 54   # sun / planet / ring teeth  (ZR = ZS + 2*ZP)
N_PLANETS = 3
FW = 10.0          # gear face width
BACKLASH = 0.15    # tooth thickness reduction at pitch circle (per gear) for printing
PIN_D = 4.0        # planet pins (part of carrier)
PIN_CLR = 0.3      # planet bore clearance
MOTOR_SHAFT_D, MOTOR_SHAFT_FLAT = 5.0, 4.5   # NEMA17 D-shaft
OUT_SHAFT_D = 8.0                             # matches 608 bearing (8x22x7)
BEARING_OD, BEARING_W = 22.0, 7.0
HOUSING_R = 51.0
FLOOR_T = 6.0
LID_T = 8.0
SCREW_PILOT_D = 2.8   # M3 self-tapping into plastic
M3_CLR_D, M3_HEAD_D, M3_HEAD_H = 3.4, 6.2, 3.5

assert ZR == ZS + 2 * ZP, "ring must equal sun + 2*planet"
assert (ZS + ZR) % N_PLANETS == 0, "planets must be equally spaceable"
RATIO = 1 + ZR / ZS
CENTER_DIST = M * (ZS + ZP) / 2

# Z stack
Z_GEAR = FLOOR_T + 1.0                 # bottom of gear zone
Z_CARRIER = Z_GEAR + FW + 0.5          # carrier plate bottom
CARRIER_T = 4.0
Z_HOUSING_TOP = Z_CARRIER + CARRIER_T + 2.5
OUT = Path(__file__).parent / "out"


# ---------------- Involute gear profile ----------------
def inv(a):
    return tan(a) - a


def gear_wire(z, r_tip, r_root, thickness):
    """Closed wire of an involute 'external-shaped' outline.
    thickness = arc tooth thickness at the pitch circle.
    For an internal ring the same function draws the *hole* (ring tooth spaces)."""
    rp = M * z / 2
    rb = rp * cos(PA)
    half = thickness / (2 * rp) + inv(PA)          # half-angle offset at base circle

    def psi(r):  # half angular tooth thickness at radius r
        r = max(r, rb)
        return half - inv(acos(rb / r))

    def pt(r, a):
        return Vector(r * cos(a), r * sin(a))

    r_inv0 = max(r_root, rb)
    radii = [r_inv0 + (r_tip - r_inv0) * (i / 10) ** 1.3 for i in range(11)]
    edges = []
    pitch = 2 * pi / z
    for i in range(z):
        c = i * pitch
        right = [pt(r, c - psi(r)) for r in radii]
        left = [pt(r, c + psi(r)) for r in reversed(radii)]
        if r_root < rb:
            edges.append(Edge.make_line(pt(r_root, c - psi(rb)), right[0]))
        edges.append(Edge.make_spline(right))
        edges.append(Edge.make_three_point_arc(right[-1], pt(r_tip, c), left[0]))
        edges.append(Edge.make_spline(left))
        start = left[-1]
        if r_root < rb:
            edges.append(Edge.make_line(left[-1], pt(r_root, c + psi(rb))))
            start = pt(r_root, c + psi(rb))
        nc = c + pitch
        end = pt(r_root, nc - psi(rb if r_root < rb else r_root))
        edges.append(Edge.make_three_point_arc(start, pt(r_root, c + pitch / 2), end))
    return Wire(edges)


def external_gear(z, width):
    rp = M * z / 2
    w = gear_wire(z, rp + M, rp - 1.25 * M, pi * M / 2 - BACKLASH)
    return extrude(Face(w), width)


def ring_hole(z, width):
    rp = M * z / 2
    # ring tip points inward (rp - M), ring root outward (rp + 1.25M); space widened by backlash
    w = gear_wire(z, rp + 1.25 * M, rp - M, pi * M / 2 + BACKLASH)
    return extrude(Face(w), width)


def d_bore(d, flat, h):
    s = Cylinder(d / 2, h, align=(Align.CENTER, Align.CENTER, Align.MIN))
    cut = Box(d, d, h, align=(Align.CENTER, Align.MIN, Align.MIN)).moved(Location((0, flat - d / 2, 0)))
    return s - cut


# ---------------- Parts ----------------
def make_sun():
    hub_h = Z_GEAR - 2.5
    g = external_gear(ZS, FW)
    hub = Cylinder(6, hub_h, align=(Align.CENTER, Align.CENTER, Align.MAX))
    part = g + hub
    part -= d_bore(MOTOR_SHAFT_D + 0.15, MOTOR_SHAFT_FLAT + 0.1, FW + hub_h).moved(Location((0, 0, -hub_h)))
    # half-pitch phase so sun spaces face the planets (planet teeth face ring spaces)
    return part.moved(Location((0, 0, Z_GEAR), (0, 0, 180 / ZS)))


def make_planet():
    g = external_gear(ZP, FW)
    g -= Cylinder((PIN_D + PIN_CLR) / 2, FW, align=(Align.CENTER, Align.CENTER, Align.MIN))
    return g


def planet_locations():
    locs = []
    for k in range(N_PLANETS):
        a = 2 * pi * k / N_PLANETS
        # phase: a planet tooth points radially outward into a ring tooth space
        rot = a * 180 / pi
        locs.append(Location((CENTER_DIST * cos(a), CENTER_DIST * sin(a), Z_GEAR + 0.25), (0, 0, rot)))
    return locs


def make_housing():
    h = Z_HOUSING_TOP
    body = Cylinder(HOUSING_R, h, align=(Align.CENTER, Align.CENTER, Align.MIN))
    body -= ring_hole(ZR, h - FLOOR_T).moved(Location((0, 0, FLOOR_T)))
    # NEMA17 mount: 22 mm boss + 4x M3 on 31 mm square, counterbored from inside
    body -= Cylinder(11.5, FLOOR_T, align=(Align.CENTER, Align.CENTER, Align.MIN))
    for x in (-15.5, 15.5):
        for y in (-15.5, 15.5):
            body -= Cylinder(M3_CLR_D / 2, FLOOR_T, align=(Align.CENTER, Align.CENTER, Align.MIN)).moved(Location((x, y, 0)))
            body -= Cylinder(M3_HEAD_D / 2, M3_HEAD_H, align=(Align.CENTER, Align.CENTER, Align.MAX)).moved(Location((x, y, FLOOR_T)))
    # lid screw pilots in the wall
    r_s = (M * ZR / 2 + 1.25 * M + HOUSING_R) / 2
    for k in range(4):
        a = pi / 4 + k * pi / 2
        body -= Cylinder(SCREW_PILOT_D / 2, 12, align=(Align.CENTER, Align.CENTER, Align.MAX)).moved(
            Location((r_s * cos(a), r_s * sin(a), h)))
    return body, r_s


def make_carrier():
    r_plate = CENTER_DIST + 6
    plate = Cylinder(r_plate, CARRIER_T, align=(Align.CENTER, Align.CENTER, Align.MIN))
    boss = Cylinder(7, 1.5, align=(Align.CENTER, Align.CENTER, Align.MIN)).moved(Location((0, 0, CARRIER_T)))
    shaft_len = (Z_HOUSING_TOP + LID_T + 13) - (Z_CARRIER + CARRIER_T + 1.5)
    shaft = Cylinder(OUT_SHAFT_D / 2, shaft_len, align=(Align.CENTER, Align.CENTER, Align.MIN)).moved(
        Location((0, 0, CARRIER_T + 1.5)))
    # flat on the last 10 mm of the output shaft
    flat = Box(OUT_SHAFT_D, OUT_SHAFT_D, 10, align=(Align.CENTER, Align.MIN, Align.MAX)).moved(
        Location((0, OUT_SHAFT_D / 2 - 0.5, CARRIER_T + 1.5 + shaft_len)))
    part = plate + boss + shaft - flat
    for k in range(N_PLANETS):
        a = 2 * pi * k / N_PLANETS
        pin = Cylinder(PIN_D / 2, FW + 0.5, align=(Align.CENTER, Align.CENTER, Align.MAX))
        part += pin.moved(Location((CENTER_DIST * cos(a), CENTER_DIST * sin(a), 0)))
    # clearance pocket for motor shaft tip (allows motor shafts up to ~22 mm)
    part -= Cylinder(3, CARRIER_T + 1.0, align=(Align.CENTER, Align.CENTER, Align.MIN))
    return part.moved(Location((0, 0, Z_CARRIER)))


def make_lid(r_s):
    lid = Cylinder(HOUSING_R, LID_T, align=(Align.CENTER, Align.CENTER, Align.MIN))
    lid -= Cylinder(BEARING_OD / 2 + 0.1, BEARING_W, align=(Align.CENTER, Align.CENTER, Align.MAX)).moved(Location((0, 0, LID_T)))
    lid -= Cylinder(OUT_SHAFT_D / 2 + 1.5, LID_T, align=(Align.CENTER, Align.CENTER, Align.MIN))
    for k in range(4):
        a = pi / 4 + k * pi / 2
        loc = Location((r_s * cos(a), r_s * sin(a), 0))
        lid -= Cylinder(M3_CLR_D / 2, LID_T, align=(Align.CENTER, Align.CENTER, Align.MIN)).moved(loc)
        lid -= Cylinder(M3_HEAD_D / 2, 3, align=(Align.CENTER, Align.CENTER, Align.MAX)).moved(loc * Location((0, 0, LID_T)))
    return lid.moved(Location((0, 0, Z_HOUSING_TOP)))


def build():
    OUT.mkdir(exist_ok=True)
    housing, r_s = make_housing()
    sun = make_sun()
    planet = make_planet()
    planets = [planet.moved(l) for l in planet_locations()]
    carrier = make_carrier()
    lid = make_lid(r_s)

    parts = {"housing_ring": housing, "sun": sun, "planet": planet, "carrier": carrier, "lid": lid}
    for name, p in parts.items():
        export_step(p, OUT / f"{name}.step")
        export_stl(p, OUT / f"{name}.stl", tolerance=0.02, angular_tolerance=0.1)

    housing.label, sun.label, carrier.label, lid.label = "housing_ring", "sun", "carrier", "lid"
    for i, p in enumerate(planets):
        p.label = f"planet_{i + 1}"
    assy = Compound(children=[housing, sun, *planets, carrier, lid], label="planetary_gearbox")
    export_step(assy, OUT / "assembly.step")
    print(f"Ratio {RATIO:.2f}:1 | center distance {CENTER_DIST} mm | OD {2 * HOUSING_R} mm | "
          f"height {Z_HOUSING_TOP + LID_T:.1f} mm (+13 mm shaft)")
    return parts, planets


if __name__ == "__main__":
    build()
