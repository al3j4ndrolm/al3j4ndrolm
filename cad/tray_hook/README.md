# Clip-on tray hook with tie ring

![preview](preview.png)

A clip-on pendant hook for a high-chair tray (designed with the Stokke® Tray in mind), with a Ø14 mm ring for tying a toy or a pacifier strap.
Parametric build123d model: `hook.py`.

## Tray geometry (from Stokke's product photos)
Stokke publishes no edge dimensions. The product photos show a **small raised bead** around the top surface and a **deep, rounded outer edge that turns down into a skirt** (about 20–25 mm tall), with a hollow molded underside.
Retailer listings put the tray at about 44 × 41 cm and 4 cm tall.

| Variant | How it mounts | Use when |
|---|---|---|
| **`hook_skirt`** (recommended) | clips **up onto the bottom edge of the skirt** from underneath; the ring hangs straight below | the outer edge is a downturned skirt (Stokke Tray). Nothing sits on the eating surface. |
| `hook_lip` | clamps a flat horizontal edge; one arm sits on top of the tray | trays with a flat overhanging lip |

## 1. Measure the tray edge (the instruction sheet has no dimensions)
1. Print `out/edge_gauge.stl`. It's a comb with slots from 2.5 to 8 mm in 0.5 mm steps, and takes about 10 minutes.
2. From underneath, push a slot up onto the **bottom edge of the skirt**. Note the **smallest slot that slides on**.
3. Also check the skirt height (default arms: 11 mm outside, 9 mm inside). If the inside of the skirt is shallower than 9 mm, lower `SKIRT_IN_L`.
4. Set `EDGE_T` in `hook.py` to the slot value, run `python hook.py`, and print `out/hook_skirt.stl`.

If the edge isn't a flat lip (for example a rolled or hollow rim), send a photo of the edge from the side with a ruler, and the profile can be adapted.

## 2. Print
- **PETG** recommended. It's tougher than PLA for a snap clip and survives a 60 °C dishwasher; PLA softens around 55 °C. Hand-wash either way.
- The STL is already oriented: flat back face down, no supports, layers running along the clip arms (strongest direction for a clip).
- 0.2 mm layers, 4 walls, 40 % infill.

## 3. Fit tuning
| Parameter | Default | If… |
|---|---|---|
| `EDGE_T` | 3.0 mm | from the gauge |
| `SKIRT_OUT_L` / `SKIRT_IN_L` | 11 / 9 mm | arm lengths; keep below the skirt height |
| `GRIP` | 0.35 mm | too hard to slide on → 0.2, falls off → 0.5 |

## Child-safety notes (read before use)
- **Short tethers only.** Keep any cord or strap tied to the ring under **22 cm** (the EN 12586 pacifier-holder limit). Never use loops or anything that can go around a neck.
- **Loads:** light toys only. The tray's own warning says hanging weight on the tray can tip the chair. Never let the child hang or pull on it.
- **Small parts:** the hook is sized (26 mm wide) so it can't fit the Ø31.7 mm small-parts test cylinder. Still, inspect it for cracks and throw it away if damaged.
- **Finger entrapment:** the ring hole (Ø14) is above the 5–9.5 mm finger-entrapment range.
- 3D-printed plastic is porous and not certified for mouthing or food contact. Supervise use.
