# Pockett Stage: design system for the 3D demos

Every interactive demo (Turbo Garage, Launch Control, Beat Lab and any future project) follows
this baseline so they look like one product. The code lives in
[`src/engine/stage-style.ts`](../src/engine/stage-style.ts) (3D) and the `.hud-*` classes in
[`src/app/components.css`](../src/app/components.css) (overlays).

## Principles

1. **Neutral world, one accent.** Structure is neutral grey with no hue. Lime (`ACCENT`) means one
   thing only: *your code made this work*. If a part isn't powered by the learner's code, it isn't lime.
2. **Light, not glow.** Readability comes from the key light and shadows. Emissive glow is a
   highlight, not a wash.
3. **Calm by default, loud on events.** Steady states are quiet; unlocks, gates and launches get a
   short flash, then decay.
4. **Same darkness everywhere.** Every scene sits in `ROLE.void` (#0a0a0a) with matching fog, so
   the stage blends into the stage frame and HUD.

## Colour

| Token | Use |
| --- | --- |
| `ROLE.void` | background and fog |
| `ROLE.floor` | ground plane (via `createFloor`) |
| `NEUTRAL[800–600]` | structure: walls, posts, decks, road surface |
| `NEUTRAL[300–100]` | markings, trim, light parts |
| `ACCENT[400]` | powered parts, blueprint wireframes, active state |
| `ACCENT[200–300]` | small highlights on powered parts (LEDs, trails) |
| `ACCENT[700]` | large lime surfaces (keeps big areas from shouting) |
| `SIGNAL.danger` | crashes, aborts, failures |
| `SIGNAL.warning` | caution states (low fuel, near-limit) |
| `SIGNAL.heat` / `heatCore` | real light sources: headlights, flames, exhaust |

The learner may pick some colours themselves (car paint, rocket livery). Those are the only
off-palette colours allowed.

## Glow levels (`GLOW`)

| Level | Intensity | When |
| --- | --- | --- |
| `faint` | 0.12 | indicator surfaces that are on but unimportant |
| `soft` | 0.3 | steady powered parts (wall strips, pads that are on) |
| `medium` | 0.6 | **one** focal element per scene (playhead, the live gate) |
| `strong` | 1.1 | transient feedback, decays within ~600 ms |
| `flash` | 2.2 | single-frame peaks (unlock burst, ignition) |

Bloom baseline: strength 0.3, radius 0.4, threshold 0.86 (`applyBloom`). Events may add a boost up
to +0.35, which must decay.

## Materials (`material.*`)

`matte` (ground, rubber), `satin` (paint, plastic, panels), `metal` (rims, rails, nozzles),
`paint` (hero surface the learner colours), `glass`, `glow(hex, level)`, `blueprint`, `ghost`, `line`.

## Lighting and environment

`setupStage(ctx, { shadowExtent, fog, keyFrom, reflections })` sets the background, fog,
image-based reflections and the shared rig: hemisphere fill, one shadow-casting white key light, and
a faint lime rim. Don't add coloured lights except real light sources (headlights, flames).

`createFloor(ctx, { size, cell })` is the ground grid. Never use `THREE.GridHelper` for floors:
1px lines shimmer (moiré) at grazing angles.

## HUD overlays

Use the shared classes. Don't hand-roll panel styles.

- `.hud-panel`: every floating panel (console, telemetry, lap board)
- `.hud-title`, `.hud-label`, `.hud-value`, `.hud-accent`, `.hud-muted`, `.hud-danger`, `.hud-warning`
- `.hud-log` + `.hud-log-line`: program output lines
- `.hud-bar > span`: meters (fuel, throttle)
- `.hud-tag`: small labels pinned to 3D objects (name tags)
- `.hud-btn`, `.hud-btn-on`: stage buttons (camera, autopilot, sound)

Type: labels are 10px uppercase at 45% white, values are mono and tabular. Weights are 500 to 600
only; nothing bold-black. Corners are 10px for panels and full pills for buttons and tags.
