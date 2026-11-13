"""
Parametric 4:1 planetary gearbox — hand-crank demo, 3D-printable, tool-free assembly.

Power path: crank -> sun gear (hex shaft) -> 3 planets -> fixed ring (in housing)
            -> carrier (hollow output tube, concentric around the sun shaft) -> pointer.
Crank and output pointer are both on top: 4 crank turns = 1 pointer turn.

Fits (FDM standard practice):
  - running fits: CLR radial clearance
  - push-fit hex couplings: HEX_FIT clearance (tight, friction held)
  - lid: 3-lug twist-lock (bayonet), no screws
All parts print flat, no supports. Run:  python gearbox.py  -> ./out/*.step|*.stl
"""
from math import pi, cos, sin, tan, acos, radians, degrees
from pathlib import Path
from build123d import *

# ---------------- Gear parameters ----------------
M = 1.5
PA = radians(20)
ZS, ZP, ZR = 18, 18, 54          # ZR = ZS + 2*ZP
N_PLANETS = 3
FW = 10.0
BACKLASH = 0.2                   # tooth-thickness reduction at pitch circle, per gear

# ---------------- Print fits (mm) ----------------
CLR = 0.25        # radial clearance on rotating fits
HEX_FIT = 0.10    # per-side clearance for push-fit hex couplings (raise to 0.15 if too tight)
AXIAL_GAP = 0.3   # vertical gap between moving parts

# ---------------- Geometry ----------------
HOUSING_R = 51.0
FLOOR_T = 3.0
SUN_SHAFT_D = 8.0
SUN_HEX_AF = 6.5          # crank coupling
STUB_D = 5.0              # planet axle stubs
CARRIER_T = 3.3
TUBE_OD = 15.0            # carrier output tube
TUBE_HEX_AF = 12.0        # pointer coupling
LID_T = 3.0
BORE_R = 44.0             # housing bore for the lid spigot (above ring teeth)
LUG_OUT = 46.2            # lug outer radius
LUG_DEG, SLOT_DEG, TWIST_DEG = 12, 16, 35

assert ZR == ZS + 2 * ZP and (ZS + ZR) % N_PLANETS == 0
RATIO = 1 + ZR / ZS
CENTER_DIST = M * (ZS + ZP) / 2

# Z stack (assembled)
Z_GEAR = FLOOR_T + AXIAL_GAP                 # gears bottom
Z_CARRIER = Z_GEAR + FW + 0.4                # carrier plate bottom
Z_SPIGOT = Z_CARRIER + CARRIER_T + 0.2       # top of ring teeth / start of lid bore
Z_TOP = Z_SPIGOT + 6.3                       # housing top
Z_LID_TOP = Z_TOP + LID_T
Z_TUBE_HEX = Z_LID_TOP + 1.0                 # pointer seat
POINTER_T = 5.0
Z_SUN_HEX = Z_TUBE_HEX + POINTER_T + 2.0     # crank seat (shoulder)
CRANK_T = 5.0
OUT = Path(__file__).parent / "out"

UP = (Align.CENTER, Align.CENTER, Align.MIN)
DOWN = (Align.CENTER, Align.CENTER, Align.MAX)


# ---------------- Involute profile ----------------
def inv(a):
    return tan(a) - a


def gear_wire(z, r_tip, r_root, thickness):
    """Involute outline; for the ring this draws the hole (tooth spaces)."""
    rp = M * z / 2
    rb = rp * cos(PA)
    half = thickness / (2 * rp) + inv(PA)

    def psi(r):
        return half - inv(acos(rb / max(r, rb)))

    def pt(r, a):
        return Vector(r * cos(a), r * sin(a))

    r0 = max(r_root, rb)
    radii = [r0 + (r_tip - r0) * (i / 10) ** 1.3 for i in range(11)]
    edges, pitch = [], 2 * pi / z
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
            start = pt(r_root, c + psi(rb))
            edges.append(Edge.make_line(left[-1], start))
        end = pt(r_root, c + pitch - psi(rb if r_root < rb else r_root))
        edges.append(Edge.make_three_point_arc(start, pt(r_root, c + pitch / 2), end))
    return Wire(edges)


def external_gear(z, width):
    rp = M * z / 2
    return extrude(Face(gear_wire(z, rp + M, rp - 1.25 * M, pi * M / 2 - BACKLASH)), width)


def ring_hole(z, width):
    rp = M * z / 2
    return extrude(Face(gear_wire(z, rp + 1.25 * M, rp - M, pi * M / 2 + BACKLASH)), width)


def cyl(r, h, z=0.0, x=0.0, y=0.0, align=UP):
    return Cylinder(r, h, align=align).moved(Location((x, y, z)))


def hex_prism(af, h, z=0.0):
    return extrude(RegularPolygon(af / 2, 6, major_radius=False), h).moved(Location((0, 0, z)))


def ring_sector(pts_rz, start_deg, span_deg):
    """Revolve an (r, z) polygon around Z over an angular span."""
    face = Plane.XZ * Polygon(*pts_rz, align=None)
    return revolve(face, Axis.Z, span_deg).rotate(Axis.Z, start_deg)


def lug_angles():
    return [k * 360 / 3 for k in range(3)]


# ---------------- Parts (all in assembled position) ----------------
def make_housing():
    body = cyl(HOUSING_R, Z_TOP)
    body -= ring_hole(ZR, Z_SPIGOT - FLOOR_T).moved(Location((0, 0, FLOOR_T)))
    body -= cyl(BORE_R, Z_TOP - Z_SPIGOT, Z_SPIGOT)
    body += cyl(1.7, 1.6, FLOOR_T)                          # sun centring pin
    for a in lug_angles():
        # vertical entry slot
        body -= ring_sector([(BORE_R - 1, Z_SPIGOT), (LUG_OUT + 0.4, Z_SPIGOT),
                             (LUG_OUT + 0.4, Z_TOP), (BORE_R - 1, Z_TOP)],
                            a - SLOT_DEG / 2, SLOT_DEG)
        # locking groove, ceiling chamfered 45deg so it prints without support
        # ceiling sits 0.3 mm above the lug's chamfered top -> 0.3 mm axial play when locked
        ceil_out = Z_SPIGOT + AXIAL_GAP + 1.0 + 0.3 - 0.4
        g = [(BORE_R - 1, Z_SPIGOT), (LUG_OUT + 0.4, Z_SPIGOT), (LUG_OUT + 0.4, ceil_out),
             (BORE_R - 1, ceil_out + (LUG_OUT + 1.4 - BORE_R))]
        body -= ring_sector(g, a - SLOT_DEG / 2, SLOT_DEG + TWIST_DEG)
    body -= grip_flutes(0, Z_TOP)
    return body


def grip_flutes(z, h, n=24):
    """Vertical half-round flutes on the outer rim, for grip when twisting the lid."""
    out = Part()
    for k in range(n):
        a = 2 * pi * (k + 0.5) / n
        out += cyl(1.5, h, z, HOUSING_R * cos(a), HOUSING_R * sin(a))
    return out


def make_sun():
    g = external_gear(ZS, FW)
    shaft = cyl(SUN_SHAFT_D / 2, Z_SUN_HEX - Z_GEAR - FW, FW)
    hexs = hex_prism(SUN_HEX_AF, CRANK_T + 1.5, Z_SUN_HEX - Z_GEAR)
    part = g + shaft + hexs
    part -= cyl(1.7 + CLR, 1.6 + AXIAL_GAP + 0.2)           # socket for the floor pin
    return part.moved(Location((0, 0, Z_GEAR), (0, 0, 180 / ZS)))


def make_planet():
    stub_h = (Z_CARRIER - Z_GEAR - FW) + CARRIER_T - 0.5
    return external_gear(ZP, FW) + cyl(STUB_D / 2, stub_h, FW)


def planet_locations():
    out = []
    for k in range(N_PLANETS):
        a = 2 * pi * k / N_PLANETS
        out.append(Location((CENTER_DIST * cos(a), CENTER_DIST * sin(a), Z_GEAR), (0, 0, degrees(a))))
    return out


def make_carrier():
    r_plate = M * ZR / 2 - M - 3.0                          # clears ring tips
    plate = cyl(r_plate, CARRIER_T)
    tube_top = Z_TUBE_HEX - Z_CARRIER
    tube = cyl(TUBE_OD / 2, tube_top - CARRIER_T, CARRIER_T) + hex_prism(TUBE_HEX_AF, POINTER_T, tube_top)
    part = plate + tube
    part -= cyl(SUN_SHAFT_D / 2 + CLR, tube_top + POINTER_T)  # sun shaft passes through
    for k in range(N_PLANETS):
        a = 2 * pi * k / N_PLANETS
        part -= cyl(STUB_D / 2 + CLR, CARRIER_T, 0, CENTER_DIST * cos(a), CENTER_DIST * sin(a))
    return part.moved(Location((0, 0, Z_CARRIER)))


def make_lid():
    z0 = Z_SPIGOT + AXIAL_GAP
    lid = cyl(HOUSING_R, LID_T, Z_TOP)
    lid += cyl(BORE_R - CLR, Z_TOP - z0, z0) - cyl(BORE_R - 5, Z_TOP - z0, z0)
    for a in lug_angles():
        # lug: 45deg chamfer on its top face so it prints upside-down without support
        lug = [(BORE_R - 1, z0), (LUG_OUT, z0), (LUG_OUT, z0 + 1.0),
               (BORE_R - 1, z0 + 1.0 + (LUG_OUT - BORE_R + 1))]
        lid += ring_sector(lug, a - LUG_DEG / 2, LUG_DEG)
    lid -= cyl(TUBE_OD / 2 + CLR, LID_T, Z_TOP)
    lid -= grip_flutes(Z_TOP, LID_T)
    # engraved dial ticks every 30deg (0deg tick is long) to count output rotation
    for k in range(12):
        L = 8 if k == 0 else 4
        tick = Box(L, 1.2, 0.6, align=(Align.MAX, Align.CENTER, Align.MAX)).moved(
            Location((HOUSING_R - 4, 0, Z_LID_TOP)))
        lid -= tick.rotate(Axis.Z, k * 30 + 15)
    return lid


def make_pointer():
    t = POINTER_T
    hub = cyl(10, t)
    arm = Box(40, 6, t, align=(Align.MIN, Align.CENTER, Align.MIN))
    tip = extrude(Polygon((40, -6), (48, 0), (40, 6), align=None), t)
    part = hub + arm + tip
    part -= hex_prism(TUBE_HEX_AF + 2 * HEX_FIT, t)
    return part.moved(Location((0, 0, Z_TUBE_HEX)))


def make_crank():
    t, arm_len = CRANK_T, 36.0
    hub = cyl(8, t)
    arm = Box(arm_len, 10, t, align=(Align.MIN, Align.CENTER, Align.MIN))
    end = cyl(7, t, 0, arm_len)
    handle = cyl(4.5, 22, t, arm_len)                       # finger handle
    part = hub + arm + end + handle
    part -= hex_prism(SUN_HEX_AF + 2 * HEX_FIT, t)
    return part.moved(Location((0, 0, Z_SUN_HEX), (0, 0, 180 + 180 / ZS)))  # hex aligned with sun


def all_parts():
    """name -> (assembled solid, print-orientation solid, qty)."""
    housing, sun, planet = make_housing(), make_sun(), make_planet()
    carrier, lid, pointer, crank = make_carrier(), make_lid(), make_pointer(), make_crank()

    def on_bed(p, flip=False):
        p = p.rotate(Axis.X, 180) if flip else p
        bb = p.bounding_box()
        return p.moved(Location((-bb.center().X, -bb.center().Y, -bb.min.Z)))

    return {
        "housing": (housing, on_bed(housing), 1),
        "sun": (sun, on_bed(sun), 1),
        "planet": (planet, on_bed(planet), 3),
        "carrier": (carrier, on_bed(carrier), 1),
        "lid": (lid, on_bed(lid, flip=True), 1),
        "pointer": (pointer, on_bed(pointer), 1),
        "crank": (crank, on_bed(crank), 1),
    }


def build():
    OUT.mkdir(exist_ok=True)
    parts = all_parts()
    children = []
    for name, (assy, printable, qty) in parts.items():
        export_step(printable, OUT / f"{name}.step")
        export_stl(printable, OUT / f"{name}.stl", tolerance=0.01, angular_tolerance=0.1)
        if name == "planet":
            for i, l in enumerate(planet_locations()):
                p = assy.moved(l); p.label = f"planet_{i + 1}"; children.append(p)
        else:
            assy.label = name; children.append(assy)
    export_step(Compound(children=children, label="planetary_gearbox"), OUT / "assembly.step")
    print(f"Ratio {RATIO:.0f}:1 | OD {2 * HOUSING_R} mm | overall height {Z_SUN_HEX + CRANK_T + 22:.1f} mm")
    return parts


if __name__ == "__main__":
    build()
