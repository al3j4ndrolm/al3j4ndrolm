# Planetary (sun) gearbox: 4:1 hand-crank demo

![preview](preview.png)

3D-printable, **tool-free**: no screws, bearings or glue. Every part prints flat without supports, and they snap together by fit.
Turn the crank (purple) 4 times and the output pointer (red) turns once. Count it against the 30° ticks on the lid.

Parametric [build123d](https://github.com/gumyr/build123d) model. Edit the parameters at the top of `gearbox.py` and run `python gearbox.py`.

## Print list (`out/*.stl`, already in print orientation)
| Part | Qty | Notes |
|---|---|---|
| housing | 1 | ring gear (54T) + twist-lock slots + centring pin |
| sun | 1 | 18T gear + shaft with hex tip, prints gear-down |
| planet | **3** | 18T gear with integral axle stub |
| carrier | 1 | plate + hollow output tube with hex tip |
| lid | 1 | 3-lug bayonet, dial ticks |
| pointer | 1 | press-fits on the carrier hex |
| crank | 1 | press-fits on the sun hex |

Suggested: PLA/PETG, 0.2 mm layers, 0.4 mm nozzle, 3 walls, 20–30 % infill. Ø102 mm footprint.

## Assembly
1. Drop the **sun** into the housing, onto the centre pin.
2. Place the 3 **planets** (stubs up) around the sun, meshing with the ring.
3. Lower the **carrier** over the sun shaft, so the stubs enter the 3 holes.
4. Fit the **lid**: line its lugs up with the 3 slots, push down and **twist ~35° clockwise** to lock.
5. Push the **pointer** onto the large hex and the **crank** onto the small hex.

## Fit tuning (printer-dependent)
| Parameter | Default | If… |
|---|---|---|
| `HEX_FIT` | 0.10 mm | crank/pointer too tight → 0.15, loose → 0.05 |
| `CLR` | 0.25 mm | shafts bind → 0.3 |
| `BACKLASH` | 0.20 mm | gears bind → 0.25, sloppy → 0.15 |

Verified in CAD: all solids valid, no interference through the gear mesh cycle, lid inserts freely when unlocked and is captured when twisted.
`out/assembly.step` contains the assembled model for Onshape (Import → Part Studio).
