# Compass

A planner for students, with a sailboat that develops as you make progress.

Each day starts at a calm dawn. Finishing what you planned brings golden hour. Miles logged are never lost.

## Documents

- `docs/compass-master-brief.md`: the founders' brief.
- `docs/compass-art-direction.md`: the approved visual identity and design system.
- `docs/home-screen-spec.md`: the Home screen specification.
- `docs/superpowers/plans/`: build plans.

## Run

```bash
npm install
npm run dev
```

Then open http://localhost:5173. `npm test` runs the unit tests and `npm run build` type-checks and builds.

## Prototypes

The two original explorations are kept unchanged in `prototypes/`:

- `prototypes/compass-intro.html`: the compass logo forming (ring draws, ticks fade in, needle swings and settles).
- `prototypes/compass-boat.html`: Three.js front-view boat and ocean, driven by a streak slider. Its streak-and-storm mechanic has been retired; see the art direction, section 12.

Open either through a local server, for example `python3 -m http.server`. `compass-boat.html` loads Three.js from a CDN.
