# CarTrack

A 3D arcade street racer in the spirit of Asphalt. One TypeScript codebase,
targeting **Windows, Linux, macOS, iOS and Android**.

Current state: **playable vertical slice** — one car, one circuit, three laps,
full race timing, nitro, drifting with skid marks, touch and gamepad support.

## Running it

```bash
npm install
npm run dev        # dev server on http://localhost:5173
```

| Command | What it does |
|---|---|
| `npm run dev` | Vite dev server, bound to 0.0.0.0 |
| `npm run build` | Typecheck, then production build to `dist/` |
| `npm run preview` | Serve the production build |
| `npm test` | Vitest, headless |
| `npm run typecheck` | `tsc --noEmit` |

Requires Node 20+.

## Controls

| Action | Keyboard | Gamepad | Touch |
|---|---|---|---|
| Throttle | `W` / `↑` | Right trigger or A | GAS |
| Brake / reverse | `S` / `↓` | Left trigger or B | BRAKE |
| Steer | `A` `D` / `←` `→` | Left stick | ◀ ▶ |
| Nitro | `Shift` | RB | NITRO |
| Handbrake / drift | `Space` | X | DRIFT |
| Restart | `R` | — | button on the finish card |

## Architecture

```
src/
├── core/        pure TypeScript — no engine imports, fully unit tested
│   ├── car.ts         arcade car physics (fixed timestep)
│   ├── track.ts       Catmull-Rom centreline, projection, on/off track
│   ├── race.ts        lap timing, checkpoints, wrong-way detection
│   ├── fixedStep.ts   accumulator so behaviour is framerate independent
│   ├── math.ts        vectors, damping, angle helpers
│   └── input.ts       shared CarInput shape
├── render/      three.js only — scene, track mesh, car, chase camera, effects
├── platform/    device input collection (keyboard, gamepad, touch)
├── ui/          DOM HUD and on-screen touch controls
└── main.ts      game loop
```

The rule that keeps this maintainable: **`core/` never imports three.js.** That
is what makes the physics testable headless and what will let the simulation be
ported if the renderer ever changes.

### Car handling

Deliberately not a tyre simulation. Real tyre models fight you on drifts and
jumps. Instead: steering lock falls off with speed, yaw comes from a bicycle
model, and the world velocity is re-decomposed against the *new* heading each
step — the residual becomes lateral velocity, which grip then decays. That
residual is the drift; there is no separate drift term to tune.

## Tests

41 tests across 4 files, all headless:

- `car.test.ts` — acceleration, top speed, nitro, braking, reversing, drift,
  off-track grip, determinism, and a regression guard on the steering sign
- `track.test.ts` — spline closure, unit tangents, projection, lateral offsets,
  spawn alignment, on/off-track classification
- `race.test.ts` — lap detection, halfway checkpoint, anti-cheat on reversing
  over the line, best lap, finish, time formatting
- `integration.test.ts` — an autopilot drives the full Harbour Circuit and
  completes all three laps through the real track + car + race stack

## Not yet built

Jumps and ramps, traffic and rivals, damage, a second car or track, engine
audio, and save data. The native shells are generated in CI but not committed;
packaging them for distribution (signed `.ipa`, release `.aab`, desktop
installers) is still open. See [`docs/PLAN.md`](docs/PLAN.md) for the roadmap
and [`docs/ENGINE_COMPARISON.md`](docs/ENGINE_COMPARISON.md) for the stack
decision.

## Continuous integration

Three workflows in `.github/workflows/`, all verified by execution rather than
by inspection:

| Workflow | Triggers | What it does |
| --- | --- | --- |
| `ci.yml` | every push, every PR, manual | typecheck → workflow lint → 41 tests → build, on `ubuntu` / `windows` / `macos` |
| `release.yml` | `v*` tags, manual | builds the web bundle, zips it, and opens a GitHub Release on tags |
| `mobile.yml` | PRs touching `src/`, deps, or itself; manual with a `target` input | builds a real Android APK and an unsigned iOS simulator app via Capacitor |

`scripts/lint-workflows.mjs` runs `actionlint` over the workflow files. It uses
the npm package's Node API, because that package ships no executable for
`npx actionlint` to find.

The Android and iOS shells are bootstrapped on the runner rather than committed.
iOS resolves dependencies with Swift Package Manager — Capacitor 8's default —
so the iOS job has no `pod install` step and builds `App.xcodeproj`, not a
workspace. `mobile.yml` also triggers on `pull_request` because
`workflow_dispatch` only resolves once the file exists on the default branch,
and this workflow is developed on a feature branch.

## License

**Proprietary — closed source. All Rights Reserved.**

CarTrack is not open source. No rights to use, copy, modify, or distribute the
contents of this repository are granted. See [LICENSE](LICENSE) for details.
This repository being publicly visible does not grant any rights to its contents.
