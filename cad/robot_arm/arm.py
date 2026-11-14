"""
4-axis desktop robot arm + gear gripper, MG90S micro servos — build123d.

Joints: J1 base yaw, J2 shoulder, J3 elbow, J4 wrist pitch, J5 gripper.
Every pitch joint is double-supported: the servo horn press-fits into a pocket in one cheek of
the next link's clevis, and a printed pin on the servo axis carries the opposite cheek.
Hardware = the screws that ship with each MG90S + printed pins. All parts print flat, no supports.

Run:  python arm.py   ->  out/*.step|*.stl (print orientation) + out/assembly.step
"""
from math import pi, cos, sin, tan, acos, radians, degrees, atan2, hypot
from pathlib import Path
from build123d import *

# ======================= Print fits — Elegoo Neptune 4 Pro =======================
CLR = 0.15         # radial clearance, rotating fits (pins in sockets, gear on pin)
PRESS = 0.0        # pin press-fit into its hole (printed holes come out ~0.05-0.1 under)
HORN_FIT = 0.05    # servo horn in its pocket (per side)
SERVO_CLR = 0.15   # servo body in its pocket (per side)
GAP = 0.2          # axial gap between moving parts

# ======================= MG90S (verify with calipers) =======================
# Servo frame: output shaft = +Y axis, horn top face at y=0, body extends along -X from the shaft.
SV_NEAR, SV_FAR = 5.9, 16.9      # body from shaft centre toward +X / -X
SV_HW = 6.1                      # half body width (12.2)
SV_TOP, SV_BOT = -6.0, -28.7     # body top / bottom (y)
TAB_TOP, TAB_BOT = -10.3, -12.8  # mounting tabs
TAB_X = (-21.75, 10.75)
TAB_HOLE_X = (-19.4, 8.4)        # 27.8 mm hole spacing
# Double-arm horn (the long 2-arm horn in the MG90S bag)
HORN_L, HORN_HUB, HORN_W0, HORN_W1, HORN_T = 31.0, 7.5, 6.0, 4.0, 1.6
HORN_SCREW_ACCESS = 5.0

# ======================= Arm geometry =======================
PIN_D, PIN_HEAD_D, PIN_HEAD_T = 5.0, 9.0, 1.5
ZH = 9.5                          # half thickness of every link (print height = 19 mm)
Y_FLOOR_BOT = -32.7               # cradle floor (pin socket side)
Y_FLOOR_TOP = SV_BOT - 0.2
Y_RIM = TAB_BOT                   # tabs rest here
Y_BEAM_TOP = -1.6 - GAP           # links stay inside the next clevis gap
HC = (-1.6, 2.4)                  # horn cheek y-range (pocket depth = HORN_T)
IC = (Y_FLOOR_BOT - GAP - 4.0, Y_FLOOR_BOT - GAP)   # idler cheek y-range
CR_X = (-23.0, 12.5)              # cradle x-range around a servo
YOKE_X = (26.0, 30.0)
L_UPPER, L_FORE, L_GRIP = 75.0, 70.0, 58.0
Y_MID = (IC[0] + HC[1]) / 2       # arm mid-plane (link y) -> global y = 0
Y_OFF = -Y_MID                    # link y=0 sits at global y = Y_OFF

# Base
BASE_R, BASE_T = 55.0, 4.0
TT_R, TT_T = 42.0, 4.0            # turntable
Z_J1_HORN = BASE_T + 0.2 - SV_BOT # J1 horn top (global z)
Z_TT_BOT = Z_J1_HORN - HORN_T
Z_TT_TOP = Z_TT_BOT + TT_T
Z_J2 = Z_TT_TOP + 32.7            # shoulder axis height (clevis sweep clears turntable)

# Gripper gears
G_M, G_Z, G_T = 1.5, 16, 6.0
G_CD = G_M * G_Z                  # centre distance 24
FINGER_L = 56.0

OUT = Path(__file__).parent / "out"


# ======================= helpers =======================
def box(x0, x1, y0, y1, z0, z1):
    return Box(x1 - x0, y1 - y0, z1 - z0, align=(Align.MIN,) * 3).moved(Location((x0, y0, z0)))


def ycyl(r, y0, y1, x=0.0, z=0.0):
    """Cylinder along +Y from y0 to y1."""
    return Cylinder(r, y1 - y0, align=(Align.CENTER, Align.CENTER, Align.MIN)).rotate(
        Axis.X, -90).moved(Location((x, y0, z)))


def xz_extrude(sketch_xy, y0, y1):
    """Sketch drawn in XY (x = link x, y = -link z) extruded to a slab y0..y1 in link frame."""
    return extrude(sketch_xy, y1 - y0).rotate(Axis.X, -90).moved(Location((0, y0, 0)))


def horn_sketch(fit=0.0):
    half = HORN_L / 2
    w0, w1 = HORN_W0 + 2 * fit, HORN_W1 + 2 * fit
    s = Circle(HORN_HUB / 2 + fit)
    for sgn in (1, -1):
        tip = sgn * (half - w1 / 2)
        s += Polygon((0, -w0 / 2), (tip, -w1 / 2), (tip, w1 / 2), (0, w0 / 2), align=None)
        s += Circle(w1 / 2).moved(Location((tip, 0)))
    return s


# ======================= servo-holding cradle (link frame, servo at origin) =======================
def cradle():
    c = box(*CR_X, Y_FLOOR_BOT, Y_RIM, -ZH, ZH)
    c -= box(-SV_FAR - SERVO_CLR, SV_NEAR + SERVO_CLR, Y_FLOOR_TOP, Y_RIM,
             -SV_HW - SERVO_CLR, SV_HW + SERVO_CLR)
    c -= ycyl(PIN_D / 2 + CLR, Y_FLOOR_BOT, Y_FLOOR_BOT + 3.4)          # idler pin socket
    for x in TAB_HOLE_X:                                                # M2 self-tapping pilots
        c -= ycyl(0.8, Y_RIM - 7, Y_RIM, x=x)
    for x0, x1 in ((CR_X[0], -SV_FAR), (SV_NEAR, CR_X[1])):            # cable slots, both ends
        c -= box(x0 - 1, x1 + 1, Y_FLOOR_TOP, Y_RIM, -2.6, 2.6)
    return c


def clevis():
    """Two cheeks + yoke around a joint at the origin (horn side +y, pin side -y)."""
    prof = Rectangle(YOKE_X[1] + 6.5, 2 * ZH, align=(Align.MIN, Align.CENTER)).moved(
        Location((-6.5, 0))) + Circle(ZH).moved(Location((-6.5, 0)))
    horn_cheek = xz_extrude(prof, *HC)
    horn_cheek -= xz_extrude(horn_sketch(HORN_FIT), HC[0], 0.0)          # horn pocket
    horn_cheek -= ycyl(HORN_SCREW_ACCESS / 2, 0.0, HC[1])               # screwdriver access
    idler_cheek = xz_extrude(prof, *IC) - ycyl(PIN_D / 2 + PRESS, *IC)
    yoke = box(*YOKE_X, IC[0], HC[1], -ZH, ZH)
    return horn_cheek + idler_cheek + yoke


def link(L, beam_from=YOKE_X[1]):
    beam = box(beam_from, L + CR_X[0], Y_FLOOR_BOT, Y_BEAM_TOP, -ZH, ZH)
    if L + CR_X[0] - beam_from > 12:   # lighten longer beams: channel open on top (print side)
        beam -= box(beam_from + 3, L + CR_X[0] - 3, Y_FLOOR_BOT + 2.5, Y_BEAM_TOP - 2.5, -ZH + 2.5, ZH)
    return clevis() + beam + cradle().moved(Location((L, 0, 0)))


# ======================= gears (gripper) =======================
def inv(a):
    return tan(a) - a


def gear_face(z, m, phase_deg=0.0, backlash=0.15, pa=radians(20)):
    rp, rt, rr = m * z / 2, m * z / 2 + m, m * z / 2 - 1.25 * m
    rb = rp * cos(pa)
    half = (pi * m / 2 - backlash) / (2 * rp) + inv(pa)
    psi = lambda r: half - inv(acos(rb / max(r, rb)))
    pt = lambda r, a: Vector(r * cos(a), r * sin(a))
    r0 = max(rr, rb)
    radii = [r0 + (rt - r0) * (i / 8) ** 1.3 for i in range(9)]
    edges, p = [], 2 * pi / z
    ph = radians(phase_deg)
    for i in range(z):
        c = i * p + ph
        R = [pt(r, c - psi(r)) for r in radii]
        Lf = [pt(r, c + psi(r)) for r in reversed(radii)]
        if rr < rb:
            edges.append(Edge.make_line(pt(rr, c - psi(rb)), R[0]))
        edges += [Edge.make_spline(R), Edge.make_three_point_arc(R[-1], pt(rt, c), Lf[0]), Edge.make_spline(Lf)]
        s = Lf[-1]
        if rr < rb:
            s = pt(rr, c + psi(rb)); edges.append(Edge.make_line(Lf[-1], s))
        e = pt(rr, c + p - psi(rb if rr < rb else rr))
        edges.append(Edge.make_three_point_arc(s, pt(rr, c + p / 2), e))
    return Face(Wire(edges))


def finger_sketch(mirror=False):
    """Finger in gear-local XY. Closing line is local y = -G_CD/2 (toward the other gear)."""
    sg = -1 if mirror else 1
    tip = Vector(FINGER_L - 8, sg * -7.5)
    d = (tip - Vector(0, 0)).normalized(); n = Vector(-d.Y, d.X) * 3.5
    s = Polygon(n, tip + n, tip - n, -n, align=None)
    y_in = sg * -(G_CD / 2 - 0.4)           # pad face 0.4 mm from centre line when closed
    y_out = sg * -3.5
    s += Polygon((FINGER_L - 18, y_in), (FINGER_L, y_in), (FINGER_L, y_out),
                 (FINGER_L - 18, y_out), align=None)
    for k in range(4):                       # grip grooves
        x = FINGER_L - 16 + k * 4
        s -= Rectangle(1.2, 1.2).moved(Location((x, y_in + sg * 0.3)))
    return s


def gripper_gear(driven):
    g = gear_face(G_Z, G_M, 0.0 if driven else 180 / G_Z)
    sk = Sketch() + g + finger_sketch(mirror=not driven)
    part = extrude(sk, G_T, dir=(0, 0, 1))
    if driven:   # horn pocket on the servo side + screw access
        part -= extrude(horn_sketch(HORN_FIT), HORN_T)
        part -= Cylinder(HORN_SCREW_ACCESS / 2, G_T, align=(Align.CENTER, Align.CENTER, Align.MIN))
    else:
        part -= Cylinder(PIN_D / 2 + CLR, G_T, align=(Align.CENTER, Align.CENTER, Align.MIN))
    # local XY -> link XZ (local y -> link -z), extrusion -> link +y, starting at horn pocket bottom
    return part.rotate(Axis.X, -90).moved(Location((0, -HORN_T, 0)))


def pin(length):
    p = Cylinder(PIN_HEAD_D / 2, PIN_HEAD_T, align=(Align.CENTER, Align.CENTER, Align.MIN))
    p += Cylinder(PIN_D / 2, length, align=(Align.CENTER, Align.CENTER, Align.MIN)).moved(Location((0, 0, PIN_HEAD_T)))
    return chamfer(p.edges().sort_by(Axis.Z)[-1], 0.4)


# ======================= parts (link / local frames) =======================
def make_base():
    """Global frame. J1 servo vertical (servo +Y -> global +Z), shaft on the Z axis."""
    to_g = lambda s: s.rotate(Axis.X, 90).moved(Location((0, 0, Z_J1_HORN)))
    b = Cylinder(BASE_R, BASE_T, align=(Align.CENTER, Align.CENTER, Align.MIN))
    ring_h = Z_TT_BOT - GAP - BASE_T
    b += (Cylinder(TT_R, ring_h, align=(Align.CENTER, Align.CENTER, Align.MIN))
          - Cylinder(TT_R - 3, ring_h, align=(Align.CENTER, Align.CENTER, Align.MIN))).moved(Location((0, 0, BASE_T)))
    blk = box(*CR_X, Y_FLOOR_TOP, Y_RIM, -ZH, ZH)
    blk -= box(-SV_FAR - SERVO_CLR, SV_NEAR + SERVO_CLR, Y_FLOOR_TOP, Y_RIM, -SV_HW - SERVO_CLR, SV_HW + SERVO_CLR)
    for x in TAB_HOLE_X:
        blk -= ycyl(0.8, Y_RIM - 7, Y_RIM, x=x)
    b += to_g(blk)
    b -= to_g(box(CR_X[0] - 1, -SV_FAR + 1, Y_FLOOR_TOP, Y_RIM, -2.6, 2.6))         # cable slot
    b -= box(-TT_R - 1, -TT_R + 4, -5, 5, BASE_T, BASE_T + 8)                      # cable exit
    for k in range(4):                                                             # bolt-down holes
        a = pi / 4 + k * pi / 2
        b -= Cylinder(2.25, BASE_T, align=(Align.CENTER, Align.CENTER, Align.MIN)).moved(
            Location((49 * cos(a), 49 * sin(a), 0)))
    return b


def make_turntable_shoulder():
    """Global frame. Turntable on the J1 horn + upright cradle holding J2 (shaft along +Y)."""
    stand = cradle() + box(Z_TT_TOP - Z_J2, CR_X[0], Y_FLOOR_BOT, Y_BEAM_TOP, -ZH, ZH)
    # J1 horn-screw access channel along the stand (link frame) — global axis x=y=0
    stand -= Cylinder(2.75, Z_J2 - Z_TT_TOP - SV_FAR + 0.1, align=(Align.CENTER, Align.CENTER, Align.MIN)).rotate(
        Axis.Y, 90).moved(Location((Z_TT_TOP - Z_J2, -Y_OFF, 0)))
    g = stand.moved(Location((0, Y_OFF, Z_J2), (0, -90, 0)))
    tt = Cylinder(TT_R, TT_T, align=(Align.CENTER, Align.CENTER, Align.MIN)).moved(Location((0, 0, Z_TT_BOT)))
    tt -= extrude(horn_sketch(HORN_FIT), HORN_T).moved(Location((0, 0, Z_TT_BOT)))
    tt -= Cylinder(2.75, TT_T, align=(Align.CENTER, Align.CENTER, Align.MIN)).moved(Location((0, 0, Z_TT_BOT)))
    return tt + g


def make_upper_arm():
    return link(L_UPPER)


def make_forearm():
    return link(L_FORE)


def make_gripper_body():
    body = link(L_GRIP)
    # ear carrying the idler gear pin, beside the J5 servo (link +z side)
    ear = box(L_GRIP - 8, L_GRIP + 8, Y_FLOOR_BOT, Y_BEAM_TOP, ZH - 1, G_CD + 7)
    ear -= ycyl(PIN_D / 2 + PRESS, Y_BEAM_TOP - 5, Y_BEAM_TOP, x=L_GRIP, z=G_CD)
    ear -= box(L_GRIP - SV_FAR - 1, L_GRIP + SV_NEAR + 1, Y_FLOOR_TOP, Y_BEAM_TOP + 1,
               -SV_HW - SERVO_CLR, SV_HW + SERVO_CLR)   # keep servo pocket clear
    return body + ear


def servo_dummy():
    s = box(-SV_FAR, SV_NEAR, SV_BOT, SV_TOP, -SV_HW, SV_HW)
    s += box(TAB_X[0], TAB_X[1], TAB_BOT, TAB_TOP, -SV_HW, SV_HW)
    s += ycyl(SV_HW, SV_TOP, -4.0) + ycyl(2.4, -4.0, -0.5)
    return s


def horn_dummy():
    """Servo horn — turns with the driven part, so it is placed in that part's frame."""
    return xz_extrude(horn_sketch(), -HORN_T, 0.0) + ycyl(HORN_HUB / 2, -4.0, 0.0) - ycyl(2.4, -4.0, -0.5)


# ======================= assembly / kinematics =======================
def link_loc(origin_xz, theta_deg):
    return Location((origin_xz[0], Y_OFF, origin_xz[1]), (0, -theta_deg, 0))


def pose(q2=60.0, q3=-75.0, q4=-45.0, grip=0.0, q1=0.0):
    """Joint angles (deg): q2 shoulder elevation, q3/q4 relative. grip = opening (deg)."""
    a1, a2, a3 = q2, q2 + q3, q2 + q3 + q4
    j2 = (0.0, Z_J2)
    j3 = (j2[0] + L_UPPER * cos(radians(a1)), j2[1] + L_UPPER * sin(radians(a1)))
    j4 = (j3[0] + L_FORE * cos(radians(a2)), j3[1] + L_FORE * sin(radians(a2)))
    j5 = (j4[0] + L_GRIP * cos(radians(a3)), j4[1] + L_GRIP * sin(radians(a3)))
    yaw = Location((0, 0, 0), (0, 0, q1))
    L2, L3, L4, L5 = (link_loc(j2, a1), link_loc(j3, a2), link_loc(j4, a3), link_loc(j5, a3))
    return dict(j=(j2, j3, j4, j5), yaw=yaw, upper=L2, fore=L3, grip=L4, j5=L5,
                gear_a=L5 * Location((0, 0, 0), (0, grip, 0)),
                gear_b=L5 * Location((0, 0, G_CD)) * Location((0, 0, 0), (0, -grip, 0)),
                servo_j2=link_loc(j2, 90), servo_j3=L2 * Location((L_UPPER, 0, 0)),
                servo_j4=L3 * Location((L_FORE, 0, 0)), servo_j5=L4 * Location((L_GRIP, 0, 0)))


def assembled(q=None, with_servos=True):
    q = q or {}
    P = pose(**q)
    parts = {
        "base": make_base(),
        "turntable_shoulder": P["yaw"] * make_turntable_shoulder(),
        "upper_arm": P["yaw"] * P["upper"] * make_upper_arm(),
        "forearm": P["yaw"] * P["fore"] * make_forearm(),
        "gripper_body": P["yaw"] * P["grip"] * make_gripper_body(),
        "gear_driven": P["yaw"] * P["gear_a"] * gripper_gear(True),
        "gear_idler": P["yaw"] * P["gear_b"] * gripper_gear(False),
    }
    if with_servos:
        sv, hn = servo_dummy(), horn_dummy()
        parts["servo_j1"] = sv.rotate(Axis.X, 90).moved(Location((0, 0, Z_J1_HORN)))
        parts["horn_j1"] = P["yaw"] * hn.rotate(Axis.X, 90).moved(Location((0, 0, Z_J1_HORN)))
        for k, frame in (("j2", "upper"), ("j3", "fore"), ("j4", "grip"), ("j5", "gear_a")):
            parts[f"horn_{k}"] = P["yaw"] * P[frame] * hn
        for k in ("j2", "j3", "j4", "j5"):
            loc = P[f"servo_{k}"]
            if k == "j2":
                loc = Location((0, Y_OFF, Z_J2), (0, -90, 0))
            parts[f"servo_{k}"] = P["yaw"] * loc * sv
    return parts


def printables():
    """name -> (solid in print orientation, qty)."""
    def on_bed(p):
        bb = p.bounding_box()
        return p.moved(Location((-bb.center().X, -bb.center().Y, -bb.min.Z)))
    flat = lambda p: on_bed(p)                       # link frame: z already up
    yflip = lambda p: on_bed(p.rotate(Axis.X, -90))  # gears: horn side up
    return {
        "base": (on_bed(make_base()), 1),
        "turntable_shoulder": (on_bed(make_turntable_shoulder()), 1),
        "upper_arm": (flat(make_upper_arm()), 1),
        "forearm": (flat(make_forearm()), 1),
        "gripper_body": (flat(make_gripper_body()), 1),
        "gear_driven": (yflip(gripper_gear(True)), 1),
        "gear_idler": (yflip(gripper_gear(False)), 1),
        "pin_joint": (pin(4.0 + GAP + 3.2), 3),
        "pin_gear": (pin(G_T + GAP + 4.8), 1),
    }


def build():
    OUT.mkdir(exist_ok=True)
    for name, (p, q) in printables().items():
        export_step(p, OUT / f"{name}.step")
        export_stl(p, OUT / f"{name}.stl", tolerance=0.01, angular_tolerance=0.1)
    children = []
    for n, p in assembled().items():
        p.label = n; children.append(p)
    export_step(Compound(children=children, label="robot_arm"), OUT / "assembly.step")
    reach = L_UPPER + L_FORE + L_GRIP + FINGER_L
    print(f"reach ~{reach:.0f} mm from shoulder | shoulder height {Z_J2:.1f} mm")


if __name__ == "__main__":
    build()
