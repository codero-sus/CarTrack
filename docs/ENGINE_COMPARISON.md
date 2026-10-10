# CarTrack — Engine & Language Comparison

Prepared for: **solo developer**, **3D Asphalt-style arcade racer**, five platforms
(Windows, Linux, macOS, iOS, Android), **closed source**, **no Mac available**.

This is the deep comparison requested. It replaces the short recommendation in `PLAN.md` §5.

---

## 0. First, a correction

In the previous message I offered "No Mac at all → iOS and macOS are effectively off the table."
**That was too strong and I'm retracting it.** iOS builds are achievable without owning a Mac —
you rent macOS hardware per minute through CI. It is the most painful part of the pipeline, but it
is not a blocker. Real options and real prices are in §7.

---

## 1. Scoring method

Eight criteria, scored 1–5, weighted two ways. The weights are the argument — change them and the
answer changes, so both are shown rather than one pretending to be objective.

- **Weighting A — ship-oriented.** Assumes your scarcest resource is time and you want to reach a
  playable build fastest.
- **Weighting B — license-risk-weighted.** Assumes "closed source, no vendor can change terms on
  me" is a hard requirement, which is a defensible reading of your licensing stance.

Scores computed, not estimated by eye. Reproduce with the script at the end of §3.

### Weighting A — ship-oriented

| Rank | Engine | Score / 5 |
|---|---|---|
| 1 | **Unity 6** | **4.05** |
| 2 | Godot 4.7.2 | 3.50 |
| 3 | Unreal 5 | 3.00 |
| 4 | MonoGame / FNA | 2.90 |
| 5 | Bevy 0.20 | 2.75 |

### Weighting B — license-risk-weighted

| Rank | Engine | Score / 5 |
|---|---|---|
| 1 | **Godot 4.7.2** | **3.73** |
| 2 | Unity 6 | 3.70 |
| 3 | MonoGame / FNA | 3.23 |
| 4 | Bevy 0.20 | 3.15 |
| 5 | Unreal 5 | 2.98 |

**Read that honestly: the recommendation flips on your weighting, and under weighting B it is a
dead heat (3.73 vs 3.70).** Anyone who tells you there is one objectively correct engine here is
hiding their assumptions. §9 states what would actually settle it.

### Criterion weights

| Criterion | A | B |
|---|---|---|
| Time to first playable | 0.20 | 0.15 |
| 3D mobile performance + tooling | 0.20 | 0.20 |
| Asset ecosystem (cars, environments) | 0.15 | 0.15 |
| License / cost risk | 0.15 | **0.30** |
| Learning curve | 0.10 | 0.10 |
| Five-platform packaging | 0.10 | 0.05 |
| Profiling / optimisation | 0.05 | 0.025 |
| Community / answers when stuck | 0.05 | 0.025 |
| **Total** | **1.00** | **1.00** |

---

## 2. Unity 6 vs Godot 4.7.2 — dimension by dimension

### 2.1 Licensing and money

| | Unity 6 | Godot 4.7.2 |
|---|---|---|
| Engine licence | Proprietary EULA | **MIT** |
| Free tier | Personal: free under **$200K** annual revenue **and** funding (trailing 12 months) | Free, unconditionally, forever |
| Above the threshold | **Unity Pro, $2,310/seat/year** (after the 12 Jan 2026 5% increase), mandatory | $0 |
| Top tier | Enterprise above $25M revenue, custom pricing | none exists |
| Royalty | None | None |
| Splash screen | **Optional** with Unity 6 (per unity.com) | none exists |
| Console publishing | Requires Pro | Third-party porter only |
| History | Announced a per-install Runtime Fee in 2023; cancelled it in 2024 after backlash | none |
| Closed-source compatibility | Fine — Unity never asks for your source | Fine |

**What matters for you:** as a solo dev you will almost certainly stay under $200K, so Unity costs
$0 today. The real difference is *risk asymmetry*: Godot's terms are fixed by an MIT licence that
cannot change. Unity's are a contract with a vendor that has demonstrably rewritten them once.

### 2.2 3D rendering capability

| | Unity 6 | Godot 4.7.2 |
|---|---|---|
| Pipelines | URP (mobile/mid), HDRP (high-end, ray tracing), Built-in | Forward+ / Mobile / Compatibility (OpenGL ES 3.0) |
| GI | Realtime GI, lightmapping, APV | SDFGI, VoxelGI |
| Volumetric fog | yes | yes |
| Terrain tools | built-in + Terrain Tools | basic, community plugins |
| Shader authoring | Shader Graph + HLSL + ShaderLab | GLSL-like shader language, visual editor |
| HDR | yes | added in 4.7 |
| Ceiling | near-AAA | mid-tier, stylised |

For an arcade racer you do not need HDRP. Both clear the bar. The gap shows in *tooling*, not raw
capability.

### 2.3 Measured performance (published 2026 benchmarks — see §10 for provenance)

| Test | Godot | Unity | Delta |
|---|---|---|---|
| 100K-tri outdoor, 2 realtime directional lights, baked GI, dynamic skybox (Forward+ vs URP, 1080p) | 248 fps | 312 fps | **Unity +26%** |
| Same, Godot on Mobile renderer | — | — | gap narrows to ~12%, loses lighting features |
| Particle system, 100K particles | 38 fps | 52 fps | **Unity +37%** |
| Shadow maps, 1024 lights | 44 fps | 61 fps | **Unity +39%** |
| Static 3D scene, PBR materials | 118 fps | 112 fps | Godot +5% |
| 500 physics bodies (CPU sim) | 72 fps | 78 fps | Unity +8% |
| Open-world scene load | 6.0 s | 4.0 s | Unity 33% faster |

**Why this matters for CarTrack specifically:** the three rows where Unity leads hardest —
particles, shadows, physics — are precisely what an Asphalt-style racer spends its frame budget on.
Nitro plumes, tyre smoke, sparks, debris, speed lines, dynamic street lighting. This is not an
abstract benchmark win; it lands on your exact workload.

### 2.4 Mobile footprint

| | Unity 6 | Godot 4.7.2 |
|---|---|---|
| Empty Linux x64 export | ~80 MB (IL2CPP) to ~200 MB (Mono + URP) | **~30 MB** |
| Simple 2D game, Android | 35–60 MB | 25–40 MB |
| Runtime memory | 80–150 MB | 40–80 MB |

**Godot wins this decisively.** Build size drives mobile store conversion, and on low-end Android
Godot's smaller memory footprint means fewer devices reject your app. If minimum-spec reach matters
more to you than visual fidelity, this row argues for Godot.

### 2.5 Iteration speed

| | Unity 6 | Godot 4.7.2 |
|---|---|---|
| Editor cold start | ~9.2 s | **~1.4 s** |
| Script hot-reload | ~2.5 s | **~0.3 s** |
| Editor footprint | 15 GB+ with modules | ~120 MB |

**Godot wins decisively.** For a solo developer this compounds: dozens of restarts a day, over
months. It is the strongest quality-of-life argument for Godot.

### 2.6 Asset ecosystem — likely the deciding practical factor

| | Unity Asset Store | Godot Asset Library |
|---|---|---|
| Assets | 70,000+ | ~3,000 |
| Detailed car models | hundreds, production-quality | scarce |
| Arcade vehicle controllers | multiple, reviewed, tuned | few |
| City / street environment kits | many | few |
| VFX packs | extensive | limited |

**And the import problem, which most comparisons skip:** FBX/GLB files purchased for Unity **lose
their materials when imported into Godot**, because Unity's Standard/URP/HDRP shaders have no
Godot equivalent. Meshes arrive with no shader assigned and must be remapped to
`StandardMaterial3D`. Skeletons need re-validation because bone naming conventions differ, and
Unity's humanoid Avatar system has no Godot counterpart.

For a game whose cost is dominated by 3D art, this is not a footnote — it is a tax on every asset
you buy, for as long as you buy assets.

### 2.7 Profiling and optimisation

Unity's Profiler and Frame Debugger are mature and battle-tested. Godot's 3D profiling is usable but
less developed, and hitting an equivalent frame target takes more manual tuning. When you are
chasing dropped frames on a mid-range Android phone at milestone 5, this gap costs you days.

### 2.8 Platform reach

| | Unity 6 | Godot 4.7.2 |
|---|---|---|
| Windows / Linux / macOS | ✅ | ✅ |
| iOS / Android | ✅ | ✅ |
| Web | ✅ | ✅ (**not with C#**) |
| Consoles | ✅ native (PS5, Xbox, Switch) | ❌ third-party porter only, $10K+ |
| VR/AR | ✅ mature | ⚠️ basic |

Both cover your five. Unity covers more you did not ask for.

### 2.9 Monetisation and services

Unity has the most mature mobile ad-mediation, IAP, analytics, and remote-config integrations.
Godot relies on community plugins of uneven maintenance. If CarTrack is ever free-to-play with ads,
this row matters. If it is paid or free-with-no-ads, it does not.

### 2.10 Where each one wins outright

**Unity wins:** 3D rendering ceiling · mobile 3D tooling · VFX and shadow throughput · asset
ecosystem · profiling · monetisation SDKs · console and XR reach · tutorial volume.

**Godot wins:** licence (unconditionally) · build size · memory footprint · iteration speed ·
editor weight · 2D pipeline · text-based scenes that diff cleanly in git · zero cost at any revenue.

---

## 3. The scoring script

```python
criteria = [
    ("Time to first playable",     .20, .15,  {"Unity":4,"Godot":4,"Unreal":2,"MonoGame":2,"Bevy":2}),
    ("3D mobile perf + tooling",   .20, .20,  {"Unity":5,"Godot":3,"Unreal":3,"MonoGame":3,"Bevy":3}),
    ("Asset ecosystem",            .15, .15,  {"Unity":5,"Godot":2,"Unreal":4,"MonoGame":2,"Bevy":2}),
    ("License / cost risk",        .15, .30,  {"Unity":2,"Godot":5,"Unreal":3,"MonoGame":5,"Bevy":5}),
    ("Learning curve",             .10, .10,  {"Unity":3,"Godot":4,"Unreal":2,"MonoGame":2,"Bevy":2}),
    ("5-platform packaging",       .10, .05,  {"Unity":4,"Godot":4,"Unreal":3,"MonoGame":4,"Bevy":2}),
    ("Profiling / optimization",   .05, .025, {"Unity":5,"Godot":2,"Unreal":5,"MonoGame":2,"Bevy":3}),
    ("Community / answers at 2am", .05, .025, {"Unity":5,"Godot":3,"Unreal":4,"MonoGame":3,"Bevy":3}),
]
# totals: A -> Unity 4.050, Godot 3.500, Unreal 3.000, MonoGame 2.900, Bevy 2.750
#         B -> Godot 3.725, Unity 3.700, MonoGame 3.225, Bevy 3.150, Unreal 2.975
```

Adjust any cell and re-run. The scores are judgements; the arithmetic is not.

---

## 4. Language comparison (you declined to say what you know)

Since I cannot weight this by your background, here are the languages on their own merits.

| | **C#** (Unity, Godot .NET, MonoGame) | **GDScript** (Godot) | **C++** (Unreal, raylib) | **Rust** (Bevy) |
|---|---|---|---|---|
| Syntax | Java-like, modern | Python-like, minimal | Dense, manual | Modern but strict |
| Typing | Static | Optional static | Static | Static, ownership-checked |
| Time to first working program | weeks of learning the *framework*, not the language | **days** | weeks–months | weeks–months (borrow checker) |
| Runtime performance on mobile | good (IL2CPP compiles to native) | slower — GC'd, partly interpreted | best | best |
| Debugging experience | excellent | good | painful | good compiler, painful errors |
| Error messages | clear | clear | notoriously poor | famously long but precise |
| Hot reload | ~2.5 s | **~0.3 s** | minutes (recompile) | seconds–minutes |
| Career transferability | high | low | high | medium |
| Community answers available | most | growing | many | few for games |
| AI code assistance quality | best (most training data) | good | good | medium |

**Honest read:** if you have never shipped a game, **GDScript is the fastest path to something
playable** — by a wide margin. If you already know C# or Java, **C# in Unity** costs you almost
nothing extra and buys the whole Unity ecosystem. **C++ and Rust are the wrong choice for a solo
first 3D game** — you will spend your time on the toolchain instead of the game.

The trap to avoid: picking a language because it is interesting. Pick the one that gets CarTrack
shipped.

---

## 5. Why the others lose

**Unreal Engine 5 — 3.00 / 2.98.** Lumen and Nanite are **not available on mobile**, so you lose the
reason to choose it on the two platforms that matter most to an Asphalt-style game, while still
paying in build size, battery drain, and C++ complexity. 5% royalty above $1M gross per title, plus
quarterly reporting. Genuinely excellent on desktop and console — wrong tool here.

**MonoGame / FNA — 2.90 / 3.23.** MIT licensed, and unlike .NET MAUI it **does** support Linux.
But you build your own renderer abstractions, asset pipeline, editor tooling, and scene system.
Fine for someone who wants to build an engine. Poor trade for a solo dev who wants a game.

**Bevy 0.20 — 2.75 / 3.15.** Elegant ECS architecture, MIT/Apache-2, and v0.20.0 shipped
2026-10-08 (verified via `api.github.com`). But no editor, mobile support still rough, small game
community. Rewarding if you love Rust. Risky as a shipping vehicle for a solo first project.

**Eliminated outright:** .NET MAUI (no Linux, no browser — Linux is required), Phaser/PixiJS/
Flame/Defold/GameMaker (2D), libGDX (3D far behind for this genre), pygame (no iOS/Android),
Qt (LGPL friction for closed source), Swift/Kotlin native (single vendor).

---

## 6. Engine versions — verified against `api.github.com`

| Engine | Version | How verified |
|---|---|---|
| Godot | **4.7.2-stable** (2026-08-18) | `gh api repos/godotengine/godot/releases/latest` |
| Bevy | **v0.20.0** (2026-10-08) | `gh api repos/bevyengine/bevy/releases/latest` |
| Unity | 6.x LTS (6.4 cited in Aug 2026 sources) | secondary sources — **confirm on unity.com** |
| Unreal | 5.x | secondary sources — **confirm in the Epic launcher** |

Several 2026 comparison articles still state "Godot 4.6.2 is latest." The GitHub API disagrees and
returns 4.7.2-stable. Trust the API.

---

## 7. The no-Mac problem — real options and real prices

Apple requires macOS + Xcode to produce a signed `.ipa`. You do not need to *own* a Mac; you can
rent one per minute.

| Route | Cost | Mac needed | Notes |
|---|---|---|---|
| **GitHub Actions `macos-latest`, public repo** | **$0** | No | macOS minutes are free on public repos |
| GitHub Actions, private repo | ~200 real macOS minutes/mo free (the 2,000 allowance drains at a **10× multiplier**), then **$0.062/min** | No | ≈25–35 iOS builds free per month |
| GitHub `macos-latest-xlarge` (5-core Apple Silicon) | $0.102/min | No | Faster archives |
| Codemagic, personal account | 500 free macOS M2 minutes/mo, then $0.095/min | No | Resets on the 1st |
| Xcode Cloud | 25 compute hours/mo free with the $99 membership | Setup friction | Apple's own |
| Rent a cloud Mac | ~$20–110/mo | Rented | Only if you need interactive Xcode/Simulator |
| Buy a Mac mini | ~$799+ one-time | Yes | Cheapest long-term if iOS is permanent |

**Unavoidable regardless of route: Apple Developer Program, $99/year.** You also need a physical
iOS device (or a rented cloud device farm) to actually test.

### A consequence of your closed-source stance you should decide on now

This repository is **public** — verified: `gh api repos/codero-sus/CarTrack` returns
`"private": false, "visibility": "public"`. So your source is readable by anyone, while the
licence grants them no rights to use it. That is a legitimate position (many proprietary projects
are publicly visible), but if you meant *closed* as in *nobody can read the code*, you need to set
the repository to private.

**And it interacts with CI:** public repos get free macOS minutes; private repos pay. So
"make the repo private" and "get free iOS builds" are in tension. Decide deliberately:

- **Keep it public** → free macOS CI, source visible, legally protected by `LICENSE`.
- **Make it private** → source hidden, macOS CI costs money after ~200 minutes/month.

For a solo hobby project I'd keep it public and take the free CI, but that is your call, not mine.

---

## 8. Twelve-month cost model for a solo developer

Assuming you stay under $200K revenue and use a public repo.

| Item | Unity path | Godot path |
|---|---|---|
| Engine | $0 (Personal) | $0 (MIT) |
| Editor | $0 | $0 |
| macOS CI for iOS builds | $0 (public repo free minutes) | $0 (same) |
| Apple Developer Program | $99/yr | $99/yr |
| Google Play Console | $25 one-time | $25 one-time |
| Steam Direct (optional) | $100/app | $100/app |
| Car models / environment kits | $0–$500 | $0–$500 (less available) |
| Music / SFX | $0–$300 | $0–$300 |
| **Realistic total** | **~$224–$1,024** | **~$224–$1,024** |

Cost is **not** the differentiator at your scale. Both are essentially free. The differentiators
are asset availability, tooling maturity, and licence risk — in that order.

---

## 9. Verdict

**My recommendation, stated with its assumption visible:**

> **Unity 6 + C# on URP** — *if* you can accept a proprietary EULA that a vendor has already
> changed once.
>
> **Godot 4.7.2 + C# (or GDScript)** — *if* "no vendor can ever change my terms" is a genuine
> requirement rather than a preference.

The gap under a ship-oriented weighting is real but not large (4.05 vs 3.50). Under a
licence-weighted one it is a dead heat. So:

**The one question that settles it:** *if Unity announced another Runtime-Fee-style change in 2028,
after you had a year of work in the engine — would you be annoyed, or would you stop?*

- **Annoyed** → Unity. Take the asset store, the profiler, the VFX throughput, and ship.
- **Stop** → Godot. Accept the smaller asset library and weaker mobile profiling, and sleep fine.

**For a solo developer I lean Unity**, because the asset store and the mobile profiler are the two
things that most reduce *your* workload, and your workload is the binding constraint. Godot's
advantages — zero licence risk, tiny builds, fast iteration — are real but they reward a project
with a longer runway more than they rescue one that needs to ship.

**And a scope warning that matters more than the engine choice:** you are one person. Asphalt is
made by Gameloft Barcelona and ships 180+ cars. Build one car on one track and make it *feel*
extraordinary. Milestone 1 in `PLAN.md` §7 gates everything else — if the car does not feel good,
no engine will save the project and no amount of content will hide it.

---

## 10. Provenance — what I verified vs. what I did not

**Verified in this workspace this turn:**
- Godot `4.7.2-stable` (2026-08-18) and Bevy `v0.20.0` (2026-10-08) via `gh api … /releases/latest`
- Repo is public: `gh api repos/codero-sus/CarTrack` → `"private": false`
- Sandbox toolchains: node v22.22.3, npm 10.9.8, python 3.11.2, gcc/g++ 12.2.0; no dotnet, rustc,
  java, godot, swift, clang
- Network allowlist: `registry.npmjs.org`, `pypi.org`, `api.github.com` reachable (HTTP 200);
  `flutter.dev`, `dotnet.microsoft.com`, `static.rust-lang.org`, `deb.debian.org`,
  `objects.githubusercontent.com` unreachable
- Score arithmetic — computed with the script in §3, not estimated

**From secondary sources (2026 articles) — treat as indicative, not contractual:**
- All performance benchmark figures (§2.3)
- Unity pricing and the $200K threshold, splash-screen policy, Pro at $2,310/seat
- Asset-store size comparisons (70,000+ vs ~3,000)
- macOS CI minute pricing
- Unreal's $1M royalty threshold

**Could not verify:**
- The current Unity and Unreal version numbers from a primary source (their hosts are unreachable
  from this sandbox)
- Whether Unity's splash-screen-optional policy applies to every Unity 6 build — one source says
  optional (unity.com), another says required. **Confirm in your Editor settings before you rely
  on it.**
- Any performance figure on your actual target hardware. Nothing here substitutes for profiling a
  real build on a real mid-range Android phone.
