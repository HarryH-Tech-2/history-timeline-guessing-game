# Store listing experiment assets (2026-09-15)

Built for Play Console → Store presence → Store listing experiments. Run one
variable per experiment: icon first, then screenshots (or vice versa), never
both in the same experiment.

## Icons (`icons/`)

Four concepts against the current `../game-icon-512.png`. See
`icons/icons-contact.png` for all five at 192 px and 48 px.

| File | Concept | Adaptive layers |
| --- | --- | --- |
| `icon-a-timeline-512.png` | Orange needle + dot on a cream ruler track (the slider) | `icon-a-timeline-adaptive-fg/bg.png` |
| `icon-b-minerva-512.png` | Minerva's face, laurel wreath, copper | `icon-b-minerva-adaptive-fg/bg.png` |
| `icon-c-hidden-year-512.png` | "1?85" typographic | `icon-c-hidden-year-adaptive-fg/bg.png` |
| `icon-d-glass-512.png` | One magnifier + ? on the current cream band | `icon-d-glass-adaptive-fg/bg.png` |

Play icon experiments only need the 512 px file. The adaptive layers are for
`app.json` if a winner ships (foreground sized to the 66 % safe zone).
Rebuild: `python scripts/build_icon_concepts.py <renders_dir> <out_dir>`
(renders = magenta-backdrop Higgsfield images `owl.png`, `glass.png`).

## Screenshots (`screenshots/`)

Seven 1080×1920 "dynamic" phone shots from build 10 (versionCode 10):
tilted phone, copper→dark gradient, art bursting past the phone edge, enlarged
UI callouts. Upload in numeric order; the first two carry the experiment.
`contact.png` is the review sheet. Raw device captures are in `captures/`.
Rebuild: `python scripts/compose_dynamic_screenshots.py assets/store/experiment/captures <out_dir>`.

Control = the 2026-08-26 set in `../screenshots/phone/`.
