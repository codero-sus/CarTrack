# CarTrack — Technology Plan

Status: **stack recommended, awaiting confirmation** (see §10)
Scope: one codebase shipping to **Windows, Linux, macOS, iOS, Android**.
Genre: **3D arcade street racer** (Asphalt-style), single-player first.
License posture: **proprietary / closed source, All Rights Reserved** (see `LICENSE`).

---

## 1. Decision record

| Question | Answer | Source |
|---|---|---|
| 2D or 3D? | **3D** | you |
| Genre | **"Something like Asphalt"** — arcade 3D street racing | you |
| Platforms | Windows, Linux, macOS, iOS, Android | you |
| Licensing | Closed source, All Rights Reserved | you, and `LICENSE` |
| Stack | **Recommended below — Unity 6 + C# (URP)** | §5 |

### A note on "like Asphalt"

`Asphalt Legends` (formerly *Asphalt 9: Legends*) runs on Gameloft's **proprietary "Jet Engine"**
with the **Bullet** physics library. That engine is not available to license, buy, or download —
there is nothing to adopt. "Like Asphalt" therefore means we replicate the *feel*: arcade handling,
nitro, jumps, near-miss traffic, cinematic chase camera, heavy VFX. The technology choice is
entirely ours.

Also worth stating plainly: Asphalt is made by Gameloft Barcelona and ships 180+ cars. The scope
gap versus a solo or small team is enormous, so §7 proposes a vertical slice rather than the whole
thing.

---

## 2. Verified environment constraints

Measured in this workspace, not assumed.

### 2.1 Toolchains present

| Tool | Version | Tool | Status |
|---|---|---|---|
| node | v22.22.3 | dotnet | **absent** |
| npm | 10.9.8 | rustc / cargo | **absent** |
| yarn | 1.22.22 | java / gradle | **absent** |
| python3 | 3.11.2 | godot | **absent** |
| pip3 | 23.0.1 | swift / xcodebuild | **absent** |
| gcc / g++ | 12.2.0 | clang | **absent** |

Host: `Linux 6.1.158+ x86_64`, Debian 12 container.

### 2.2 Network allowlist (outbound)

| Host | Result | | Host | Result |
|---|---|---|---|---|
| `registry.npmjs.org` | 200 | | `flutter.dev` | unreachable |
| `pypi.org` | 200 | | `dotnet.microsoft.com` | unreachable |
| `api.github.com` | 200 | | `static.rust-lang.org` | unreachable |
| | | | `deb.debian.org` | unreachable |
| | | | `objects.githubusercontent.com` | unreachable |

`apt-get` cannot work (deb.debian.org unreachable), and no engine SDK can be downloaded.

### 2.3 Proven working here

- **TypeScript** — installed from npm, compiled a strict-mode probe with `tsc 7.0.2`, ran it on Node.
- **Python** — venv + `pygame-ce 2.5.8` (SDL 2.32.10), created a 320×240 dummy surface.
- **npm availability** — `phaser 4.2.1`, `pixi.js 8.22.0`, `electron 44.7.0`.

### 2.4 Consequences you need to accept

1. **No iOS build is possible on any Linux machine.** Apple requires macOS + Xcode. You need a Mac
   or a `macos-latest` CI runner. Not a sandbox limitation — a platform rule.
2. **No Android build here** — needs JDK + Android SDK + NDK; absent and unreachable.
3. **No engine SDK can be installed here.** I cannot compile or run Unity, Godot, Unreal, Flutter,
   .NET, or Rust code in this workspace.
4. **No GPU, no display.** Only headless rendering.

> **This is the direct cost of choosing 3D.** The TypeScript + Phaser route was the only stack I
> could have built and run for you in this environment. It is a 2D-only stack, so it is now off the
> table. With 3D chosen, my role becomes: writing and reviewing C# gameplay code, shaders, editor
> tooling, and CI config — while the editor and all builds run on your machine.

---

## 3. The full language survey

Legend: ✅ mature · ⚠️ caveats · ❌ unsupported

### Viable for a **3D** game on all five platforms

| Language | Engine | Win | Lin | mac | iOS | And | Cost / license | Verdict for CarTrack |
|---|---|---|---|---|---|---|---|---|
| **C#** | **Unity 6 (URP)** | ✅ | ✅ | ✅ | ✅ | ✅ | Proprietary; free < $200K revenue | **Recommended.** §5 |
| GDScript | Godot 4.7.2 | ✅ | ✅ | ✅ | ✅ | ✅ | MIT — free, no royalty | **Strong runner-up.** §5.2 |
| **C#** | **Godot 4.7.2 (.NET)** | ✅ | ✅ | ✅ | ✅ | ✅ | MIT | Runner-up, if you prefer C# + MIT. No web export. |
| C++ / Blueprints | Unreal Engine 5 | ✅ | ✅ | ✅ | ✅ | ✅ | Free to $1M, then 5% royalty | Only if desktop/console fidelity beats mobile reach. §5.3 |
| Rust | Bevy v0.20.0 | ✅ | ✅ | ✅ | ⚠️ | ⚠️ | MIT / Apache-2 | ECS is elegant; no editor, mobile rough. Hobby-grade risk for this scope. |
| C++ | raylib / SDL3 | ✅ | ✅ | ✅ | ⚠️ | ⚠️ | zlib | You write the renderer, asset pipeline, and editor. Months of work before you have a game. |
| C# | MonoGame / FNA | ✅ | ✅ | ✅ | ✅ | ✅ | MIT | Full Linux support (unlike MAUI), but 3D is low-level and you build everything. |
| C++ | Custom + OpenGL/Vulkan | ✅ | ✅ | ✅ | ✅ | ✅ | yours | What Gameloft did. Only sane for a funded engine team. |

### Eliminated by the 3D requirement

| Language | Stack | Why eliminated |
|---|---|---|
| TypeScript | Phaser 4, PixiJS 8 | 2D-only renderers. *(Was the only stack buildable in this sandbox.)* |
| Dart | Flutter + Flame | 2D engine; `flame_3d` is experimental |
| Lua | Defold | 2D-focused |
| GML | GameMaker | 2D, minimal 3D |
| TS/JS | Cocos Creator | Weak Linux support, and Linux is in your matrix |
| Java / Kotlin | libGDX | 3D is functional but a long way behind Unity for this genre |
| C# | Avalonia | UI framework, not a 3D game engine |

### Eliminated regardless of dimension

| Language | Stack | Why eliminated |
|---|---|---|
| C# | **.NET MAUI** | **No Linux support and no browser target.** Microsoft states Linux is "not planned." Linux is required, so MAUI is disqualified outright. |
| C# | Xamarin | Superseded by MAUI |
| Python | pygame-ce | No iOS, no Android |
| Python | Kivy | Not suited to 3D racing performance |
| C++ / Python | Qt / QML | Not game-oriented; LGPL relinking friction for a closed-source product |
| Swift | SpriteKit / SceneKit | Apple platforms only |
| Kotlin | Android native | Android only |

---

## 4. Current engine versions (checked against `api.github.com`)

| Engine | Version | Verified how |
|---|---|---|
| Godot | **4.7.2-stable** (2026-08-18) | `gh api repos/godotengine/godot/releases/latest` |
| Bevy | **v0.20.0** (2026-10-08) | `gh api repos/bevyengine/bevy/releases/latest` |
| Unity | Unity 6.x (6.4 cited in Aug 2026 comparisons) | secondary sources — **check unity.com for the current LTS** |
| Unreal | Unreal Engine 5.x | secondary sources — **check the launcher** |

Note: some comparison articles still cite "Godot 4.6.2" as latest. The GitHub API is authoritative
here and returns 4.7.2-stable.

---

## 5. Recommendation

### 5.1 Primary — **Unity 6 + C# on the Universal Render Pipeline**

For a **3D, mobile-first arcade racer**, Unity is the right call. In order of weight:

1. **URP was designed for mobile 3D.** This genre lives or dies on holding 60 fps on mid-range
   Android, and URP's mobile variants, shader stripping, and texture-compression pipeline are the
   most battle-tested available.
2. **VFX throughput.** An Asphalt-style game is nitro plumes, tyre smoke, sparks, debris, speed
   lines. Published 2026 benchmarks put Unity ~37% ahead of Godot at 100K particles (52 vs 38 fps)
   and ~39% ahead on shadow-heavy scenes (61 vs 44 fps at 1024 lights). That gap lands exactly on
   the effects this genre depends on.
3. **The asset store is the real argument.** CarTrack's cost is dominated by 3D art — car models,
   city kits, road props, VFX, sound. Unity's store has thousands of production-quality car meshes
   and arcade vehicle controllers. Godot's library is far smaller.
4. **Assets import cleanly — into Unity.** FBX/GLB files bought for Unity lose their materials when
   imported into Godot, because Unity's Standard/URP/HDRP shaders have no Godot equivalent; meshes
   arrive with no shader assigned and skeletons need re-validation. If you buy assets, this is real
   recurring cost.
5. **Profiling.** Unity's Profiler and Frame Debugger are mature. Godot's 3D profiling is usable but
   less developed, and hitting the same frame target takes more manual tuning.
6. **Monetisation SDKs** — if you go free-to-play with ads/IAP, Unity's integrations are the most
   mature on mobile.
7. **Closed source is fully compatible.** Unity never asks for your source.

**What you pay for it:**

| Cost | Detail |
|---|---|
| Money | Free under $200K revenue; paid seats above (Pro cited at ~$2,310/yr per seat in 2026) |
| License risk | Proprietary EULA that Unity has changed before — the 2023 runtime-fee episode is the cautionary tale |
| Build size | An empty Unity project exports at ~80 MB (IL2CPP) to ~200 MB (Mono+URP) vs Godot's ~30 MB. Matters for mobile download conversion. |
| Iteration | Editor cold start ~9.2 s vs Godot's ~1.4 s |
| Lock-in | Moving off Unity later means a rewrite |

### 5.2 Runner-up — **Godot 4.7.2** (GDScript or C#/.NET)

Pick this if **license risk is a dealbreaker**. MIT means no fees, no royalties, no revenue
threshold, and no EULA a vendor can change under you — permanently.

Godot 4's 3D is genuinely capable: Vulkan Forward+/Mobile/Compatibility renderers, PBR, SDFGI,
volumetric fog, HDR in 4.7. It handles stylised and mid-scope 3D well, and it wins decisively on
build size (~30 MB vs 80–200 MB) and iteration speed.

What you accept: roughly 12–26% lower frame rates than URP on complex scenes, less mature mobile
3D tooling and profiling, a much smaller asset ecosystem, asset-import material loss, and no
official console export. For a solo developer who values zero license exposure over raw capability,
this is a legitimate and defensible choice.

### 5.3 Not recommended here — **Unreal Engine 5**

Unreal's headline features — **Lumen and Nanite — are not available on mobile**. So on the two
platforms that matter most for an Asphalt-style game you lose the reason to pick Unreal, while
still paying for it in build size, battery drain, and a steeper C++ learning curve. Add the 5%
royalty above $1M lifetime gross and quarterly reporting. Choose Unreal only if desktop/console
visual fidelity outranks mobile reach.

### 5.4 Decision summary

| If your priority is… | Choose |
|---|---|
| Shipping a 3D mobile racer with the least friction | **Unity 6 + C# + URP** |
| Zero license fees and zero EULA risk, forever | **Godot 4.7.2 + C#** |
| Maximum desktop/console visual fidelity | Unreal 5 + C++ |
| Having me build and test it in this sandbox | *No longer possible at 3D — see §2.4* |

---

## 6. Proposed Unity stack and architecture

### 6.1 Packages

| Concern | Choice | Why |
|---|---|---|
| Render pipeline | **URP** | Mobile-first, scalable quality tiers |
| Language | **C#** | Unity's primary; IL2CPP for mobile |
| Input | **Input System** + Input Actions assets | One action map → keyboard, gamepad, touch, tilt |
| Camera | **Cinemachine** | Chase camera, shake on impact, nitro FOV punch |
| UI | **UI Toolkit** or **uGUI + TextMeshPro** | Menus, HUD, speedo, touch controls |
| Asset streaming | **Addressables** | Car/track bundles, patchable content |
| Localisation | **Localization package** | Strings + asset variants from day one |
| Post-processing | **URP Volume** | Bloom, motion blur, chromatic aberration, vignette, colour grading |
| Analytics | Unity Analytics | Retention and funnel |
| Monetisation | Unity IAP + ad mediation | Only if free-to-play |

### 6.2 Car handling — the most important technical decision

Do **not** use Unity's `WheelCollider` for an Asphalt-style game. It simulates real tyres and feels
wrong for arcade handling — it fights you on drifts, jumps, and mid-air control.

Instead: a **custom arcade controller** —
- raycast suspension (4 rays, spring/damper per corner)
- scripted acceleration/braking curves per car class, not engine simulation
- lateral grip as a tunable curve, not a friction model
- explicit drift, air-control, and nitro-boost states in a state machine
- landing detection with squash/stretch and camera shake

This is what gives you the "feels good immediately, tunable forever" behaviour the genre needs.

### 6.3 Repository layout

```
CarTrack/
├── LICENSE, README.md, docs/
├── Assets/
│   ├── _Project/            # everything we author — keep third-party separate
│   │   ├── Scripts/
│   │   │   ├── Core/        # pure C#, no UnityEngine → unit-testable headless
│   │   │   ├── Vehicles/    # arcade controller, suspension, nitro, damage
│   │   │   ├── Race/        # race director, laps, positions, checkpoints
│   │   │   ├── AI/          # traffic + rival drivers
│   │   │   ├── Camera/      # chase cam, shake, FOV punch
│   │   │   └── UI/
│   │   ├── Prefabs/ Scenes/ Shaders/ ScriptableObjects/ Input/
│   ├── Art/                 # or Git LFS / separate asset repo
│   └── Plugins/             # third-party, versioned separately
├── Packages/manifest.json
├── ProjectSettings/
├── Builds/                  # per-target build scripts
└── .github/workflows/       # CI
```

Rules: `Core/` has no `UnityEngine` imports so it can be tested headless; fixed-timestep physics
with render interpolation; no hardcoded resolution (virtual resolution + letterbox); versioned JSON
saves in the platform app-data directory.

### 6.4 Per-platform build matrix

| Target | Backend | Signing | Build machine |
|---|---|---|---|
| Windows x64 | IL2CPP | optional cert | any |
| Linux x64 | IL2CPP | none | any |
| macOS (arm64 + x64) | IL2CPP, universal | Apple Developer ID | **macOS only** |
| iOS | IL2CPP, ARM64, ASTC | Apple Developer Program | **macOS only** |
| Android | IL2CPP, ARM64 (required), ASTC/ETC2 | Play App Signing | Linux or macOS |

**CI:** `game-ci/unity-builder` GitHub Action, or Unity Cloud Build. Note that CI needs a Unity
license (Personal works but requires activation flow). Linux runner for Win/Linux/Android on every
push; macOS runner for macOS/iOS on tags only — macOS minutes are billed at 10×.

---

## 7. Roadmap — vertical slice first

Asphalt has 180+ cars and a studio behind it. Target a **vertical slice** that proves the feel
before adding volume.

| # | Milestone | Deliverable | Exit criteria |
|---|---|---|---|
| 0 | Setup | Unity 6 LTS, URP, repo, `.gitignore`, CI, LFS decision | Empty project builds for Win/Linux |
| 1 | **Car feel** | 1 car, 1 flat test track, arcade controller | Driving feels good with a keyboard. **Do not proceed until it does.** |
| 2 | Camera + juice | Chase cam, shake, nitro VFX, speed lines, motion blur | 30-second clip you would watch twice |
| 3 | Race loop | Laps, checkpoints, positions, countdown, results | Win/lose a full race |
| 4 | One real track | 1 designed city circuit, traffic, jumps, ramps | Playable start to finish |
| 5 | Android port | Touch controls, quality tiers, ASTC, ARM64 | 60 fps on a mid-range physical phone |
| 6 | iOS port | Xcode, provisioning, TestFlight | Playable via TestFlight |
| 7 | Desktop polish | Settings, save/load, controller support, localisation | Feature-complete |
| 8 | Release | Store pages, icons, screenshots, trailers | Shipped |

**Milestone 1 is the whole game.** If the car does not feel good, nothing after it matters. Budget
the most time there and resist adding content until it is right.

---

## 8. Asset strategy (the real cost)

For a 3D racer, art dominates effort and budget. Plan it explicitly.

| Source | Cost | Notes |
|---|---|---|
| Unity Asset Store | $0–$200 per car / environment kit | Fastest path. Check each licence for redistribution and "AI training" clauses. |
| Quaternius, Kenney, Poly Haven | Free (CC0 / CC-BY) | Stylised low-poly; good for prototyping |
| Blender + your own modelling | Your time | Total control, highest cost |
| Outsourced | $ | Only once the art direction is locked |

**Track every third-party asset in `docs/THIRD_PARTY.md` from the first one you add.** Your game
being closed source does not exempt you from asset licences, and a missing attribution is a real
legal exposure at ship time.

---

## 9. Risks

| Risk | Impact | Mitigation |
|---|---|---|
| **No Mac available** | Blocks all iOS *and* macOS shipping | Confirm access now, or budget a macOS CI runner |
| **Scope** | An Asphalt-scale game is a studio-sized project | Vertical slice first (§7); 1 car, 1 track |
| **Car feel unsolved late** | Unfixable without a rewrite | Milestone 1 gates everything else |
| **Mobile perf found late** | Render-path rewrite | Port to a physical mid-range phone at M5, not M8 |
| **Unity EULA changes** | Cost at scale | Accept, or choose Godot (§5.2) |
| **Build size** | Poor store conversion | IL2CPP + ASTC + Addressables; strip unused shaders |
| **Asset licences** | Legal exposure | `docs/THIRD_PARTY.md` from asset #1 |
| **I cannot compile Unity code here** | Slower feedback loop | You run the editor; I write/review C#, shaders, CI |

---

## 10. Decisions still needed

1. **Unity or Godot?** — the recommendation is Unity (§5.1); Godot if license risk outweighs it (§5.2).
2. **What languages do you already know?** You selected "advise me" without saying. If C# is
   unfamiliar but GDScript/C++/TS is not, that can flip the recommendation.
3. **Do you have a Mac?** Yes/no determines whether iOS and macOS ship at all.
4. **Solo or team?** Changes the roadmap, not the stack.
5. **Art plan** — buy from the Asset Store, use free CC0 packs, or model your own?
6. **Business model** — paid, free, or free-with-ads/IAP? Ads/IAP is where Unity is furthest ahead.
7. **Online multiplayer later?** Adds networking, servers, and anti-cheat; both engines cope, but
   it should be known before the architecture is set.
