# CarTrack — Technology Plan

Status: **proposal, awaiting decisions** (see §8)
Scope: one codebase shipping to **Windows, Linux, macOS, iOS, Android**.
License posture: **proprietary / closed source, All Rights Reserved** (see `LICENSE`).
Every option below permits shipping a closed-source binary; the differences are in *fees,
royalties, and EULA risk*, which §7 covers.

---

## 1. Verified environment constraints

These were measured in this workspace, not assumed. They decide which stacks can actually be
built and tested here.

### 1.1 Toolchains present

| Tool | Version | Notes |
|---|---|---|
| node | v22.22.3 | LTS |
| npm | 10.9.8 | working |
| yarn | 1.22.22 | working |
| python3 | 3.11.2 | working |
| pip3 | 23.0.1 | PEP 668 externally-managed → use a venv |
| gcc / g++ | 12.2.0 | Debian 12 |
| dotnet | — | **not installed** |
| rustc / cargo | — | **not installed** |
| java / javac / gradle | — | **not installed** |
| godot | — | **not installed** |
| swift / xcodebuild | — | **not installed** |
| clang | — | **not installed** |

Host OS: `Linux 6.1.158+ x86_64` (Debian 12 container).

### 1.2 Network allowlist (outbound)

| Host | Result |
|---|---|
| `registry.npmjs.org` | HTTP 200 — reachable |
| `pypi.org` | HTTP 200 — reachable |
| `api.github.com` | HTTP 200 — reachable |
| `flutter.dev` | unreachable |
| `dotnet.microsoft.com` | unreachable |
| `static.rust-lang.org` | unreachable |
| `deb.debian.org` | unreachable (so `apt-get install` cannot work) |
| `objects.githubusercontent.com` | unreachable (so engine release binaries cannot be downloaded) |

### 1.3 Proven working in this sandbox

- **TypeScript**: installed `typescript` from npm, compiled a strict-mode probe with
  `tsc 7.0.2`, and ran it under Node. End-to-end verified.
- **Python**: created a venv, installed `pygame-ce 2.5.8` (bundles SDL 2.32.10), and created a
  320×240 dummy surface. Import and surface creation verified.
- **npm package availability**: `phaser 4.2.1`, `pixi.js 8.22.0`, `electron 44.7.0`.

### 1.4 What this sandbox CANNOT do — read this before choosing

1. **It cannot produce an iOS build. Ever.** Apple requires macOS + Xcode. This is a hard
   platform rule, not a sandbox limitation. You will need a Mac or a CI macOS runner
   (e.g. GitHub Actions `macos-latest`).
2. **It cannot produce an Android build as-is.** That needs a JDK + Android SDK + NDK; none are
   installed and `apt`/`dl.google.com` are unreachable.
3. **It cannot install Godot, Flutter, .NET, Rust, or Java SDKs**, because their download hosts
   are unreachable. I can write and review code in all of them; I cannot compile or run it here.
4. **No GPU / no display.** Only headless (`dummy`) rendering. Real visual verification has to
   happen on your machine.

**Practical consequence:** a **TypeScript** or **Python** core is the only choice I can build,
run, and test for you in this environment today. Everything else I can author and review, but
verification shifts to you / CI.

---

## 2. All suitable languages, with honest platform coverage

Legend: ✅ official & mature · ⚠️ works with caveats · ❌ not supported

### Tier 1 — purpose-built game engines

| Language | Engine | Win | Linux | mac | iOS | Android | Cost / license | Best when |
|---|---|---|---|---|---|---|---|---|
| **GDScript** | **Godot 4.7** | ✅ | ✅ | ✅ | ✅ | ✅ | MIT — free forever, no royalty | 2D or mid-tier 3D, solo/small team. **Top pick.** |
| **C#** | **Godot 4.7 (.NET build)** | ✅ | ✅ | ✅ | ✅ | ✅ | MIT | Same as above but you prefer C#. Note: C# cannot export to web. |
| **C#** | **Unity 6** | ✅ | ✅ | ✅ | ✅ | ✅ | Proprietary. Free under $200K revenue; paid seats above | 3D, mobile-first, ads/IAP SDKs, console, XR |
| **C++** (+Blueprints) | **Unreal Engine 5** | ✅ | ✅ | ✅ | ✅ | ✅ | Free until $1M, then 5% royalty | AAA-fidelity 3D |
| **Lua** | **Defold** | ✅ | ✅ | ✅ | ✅ | ✅ | Free | Tiny mobile builds, 2D, fast iteration |
| **TS/JS** | **Cocos Creator** | ✅ | ⚠️ | ✅ | ✅ | ✅ | Free | Casual mobile/web, big in Asia |
| **GML** | **GameMaker** | ✅ | ✅ | ✅ | ✅ | ✅ | Free non-commercial; Pro ~$99.99 once | 2D pixel-art games |

### Tier 2 — code-first frameworks (no visual editor)

| Language | Framework | Win | Linux | mac | iOS | Android | Cost / license | Notes |
|---|---|---|---|---|---|---|---|---|
| **TypeScript** | **Phaser 4** + Capacitor + Electron/Tauri | ✅ | ✅ | ✅ | ✅ | ✅ | MIT | **Buildable & testable in this sandbox.** Web build is free extra reach. |
| **TypeScript** | **PixiJS 8** (custom engine) | ✅ | ✅ | ✅ | ✅ | ✅ | MIT | Maximum control, more work |
| **Dart** | **Flutter + Flame** | ✅ | ✅ | ✅ | ✅ | ✅ | BSD-3 / MIT | **2D only** (`flame_3d` is experimental) |
| **Rust** | **Bevy** | ✅ | ✅ | ✅ | ⚠️ | ⚠️ | MIT/Apache-2 | ECS, modern; no editor, mobile still rougher |
| **C++** | **raylib** | ✅ | ✅ | ✅ | ⚠️ | ⚠️ | zlib | Simple, learnable, all 5 targets |
| **C/C++** | **SDL3** / **SFML** | ✅ | ✅ | ✅ | ⚠️ | ⚠️ | zlib / zlib | You build the engine yourself |
| **C#** | **MonoGame** / **FNA** | ✅ | ✅ | ✅ | ✅ | ✅ | MIT | Stardew Valley's stack. Full Linux support. |
| **C#** | **Avalonia** (+ game lib) | ✅ | ✅ | ✅ | ✅ | ✅ | MIT | Skia rendering; UI-first, not game-first |
| **Kotlin** | **KorGE** / **libGDX** | ✅ | ✅ | ✅ | ✅ | ✅ | Apache-2 / LGPL | libGDX is Java/Kotlin, proven on mobile |
| **Java** | **libGDX** | ✅ | ✅ | ✅ | ✅ | ✅ | Apache-2 | Mature, less trendy |
| **Python** | **Kivy** | ✅ | ✅ | ✅ | ⚠️ | ⚠️ | MIT | Works, but slow and heavy for real games |
| **Python** | **pygame-ce** | ✅ | ✅ | ✅ | ❌ | ❌ | LGPL | Fine for prototypes. **Not viable for iOS/Android.** |

### Tier 3 — do not use for this

| Language | Framework | Why it is out |
|---|---|---|
| **C#** | **.NET MAUI** | **Does not support Linux, and does not support browser.** Microsoft has said Linux is "not planned". Verified across multiple 2026 sources. Since Linux is in your matrix, MAUI is disqualified. |
| **C#** | **Xamarin** | Superseded by MAUI; effectively dead-end |
| **C++/Python** | **Qt / QML** | Not game-oriented, and LGPL obligations (dynamic linking, user relinking) create friction for a closed-source product unless you buy a commercial license |
| **Swift** | SpriteKit / **Kotlin** native | Single-vendor: covers Apple *or* Android, never all five |
| **HTML/JS** | plain DOM/Canvas | No game loop, no fixed timestep, poor mobile performance |

---

## 3. Recommendation

### Primary: **Godot 4.7 + GDScript**

Why, in order of weight for *this* project:

1. **License fit.** MIT. No fees, no royalties, no revenue threshold, no EULA that a vendor can
   change under you. You can ship CarTrack closed-source with zero obligations. This matters more
   than usual given your licensing stance — Unity and Unreal both impose ongoing commercial terms.
2. **Real five-platform coverage** from one project, plus a free web export.
3. **Dedicated 2D pipeline.** Godot's 2D is a first-class engine, not 3D-space sprites.
4. **Tiny builds** (roughly 25 MB Android / 28 MB iOS for a simple 2D game vs Unity's ~35/40 MB)
   and lower mobile memory use.
5. **Git-friendly**: scenes are text `.tscn`, resources are `.tres`. Clean diffs and reviews.
6. **Fast iteration**: ~0.3 s script hot-reload.

Costs you accept: no official console export (third-party porters only, $10K+), a smaller asset
store than Unity, weaker 3D at the AAA end, and less mature mobile ads/IAP integrations.

### Secondary, pick one of these if…

- **…you want console, XR, or heavy mobile monetisation SDKs** → **Unity 6 + C#**.
- **…you want AAA-fidelity 3D** → **Unreal 5 + C++**.
- **…you want me to build and run it *here*, right now, with real verification** →
  **TypeScript + Phaser 4**, then Capacitor for iOS/Android and Tauri/Electron for desktop.
  This is the only tier-1-tier-2 option I can compile, run, and test in this sandbox.
- **…you already know C# and want Godot's licensing** → **Godot 4.7 C#/.NET**.
- **…you want to write the engine and own every layer** → **Rust + Bevy** or **C++ + raylib**.

---

## 4. Proposed architecture (stack-agnostic)

Whatever engine wins, keep game logic separable from the platform shell. That is what makes five
platforms maintainable.

```
CarTrack/
├── LICENSE                 # proprietary, already in place
├── README.md
├── docs/
│   └── PLAN.md             # this file
├── src/
│   ├── core/               # platform-independent: rules, state machines, math, scoring
│   │                       # NO engine/rendering imports in here → unit-testable headless
│   ├── game/               # entities, systems, level data, physics tuning
│   ├── ui/                 # menus, HUD, settings, localisation
│   └── platform/           # thin adapters: input, save game, audio, haptics, store/IAP
├── assets/                 # art, audio, fonts — tracked or LFS per repo convention
├── build/                  # per-target export config + CI scripts
└── tests/                  # headless tests for core/ — run on every push
```

Rules that pay for themselves:
- **Fixed-timestep simulation** (e.g. 60 Hz) with render interpolation — keeps behaviour identical
  on a 144 Hz desktop and a 30 fps phone.
- **Core has no rendering dependency** → tests run headless in CI, including in this sandbox.
- **Input is an abstraction**: gamepad + keyboard on desktop, touch + gyro on mobile, all mapping
  to the same action names.
- **Save data is versioned JSON** in the platform's app-data directory.
- **No hardcoded resolution** — design to a virtual resolution and letterbox/scale.
- **Localisation from day one**, even with only `en`.

---

## 5. Milestone roadmap

| # | Milestone | Deliverable | Exit criteria |
|---|---|---|---|
| 0 | Decide the stack | §8 answered | One engine chosen, toolchains installed |
| 1 | Skeleton | Repo structure, CI, one moving sprite on desktop | Runs on Win/mac/Linux; `core/` tests green |
| 2 | Core loop | Drive/track mechanics, scoring, win/lose | Playable end-to-end, no menus |
| 3 | Content | 3 levels or tracks, art pass, audio | 10 min of content, no placeholders |
| 4 | Mobile port | Touch input, screen scaling, Android build | Playable on a physical Android phone |
| 5 | iOS port | Xcode project, provisioning, TestFlight | Playable via TestFlight |
| 6 | Polish | Settings, save/load, localisation, accessibility | Feature-complete |
| 7 | Release | Store listings, icons, screenshots, builds | Shipped to Steam + Play + App Store |

Rough effort: M0–M3 is the bulk of the design work; **M5 is the one most teams underestimate**,
because it is blocked on Apple accounts and hardware, not on code.

---

## 6. Build & release matrix

| Target | Toolchain | Signing | Where it can be built |
|---|---|---|---|
| Windows | engine export / Electron / Tauri | optional code-signing cert | anywhere |
| Linux | engine export / AppImage / Flatpak | none required | anywhere |
| macOS | engine export, notarisation | Apple Developer ID ($99/yr) | **macOS only** |
| iOS | Xcode export | Apple Developer Program ($99/yr) | **macOS only** |
| Android | Gradle / engine export | Play App Signing | Linux or macOS (needs JDK + Android SDK) |

**Recommended CI** (GitHub Actions):
- `linux-latest` → build Linux + Windows, run headless `core/` tests on every push.
- `macos-latest` → build macOS + iOS, on tags or manual dispatch (macOS minutes are 10× billed).
- Android → `linux-latest` with `android-actions/setup-android`.

---

## 7. Closed-source licensing notes

CarTrack is All Rights Reserved. All recommended options are compatible, but the obligations
differ:

| Engine | Your obligations when shipping closed source |
|---|---|
| Godot (MIT) | **None.** Keep the copyright notice in `LICENSE.md` of the export. No fees at any revenue. |
| Unity 6 | Proprietary EULA; free below $200K revenue, paid seats above; terms can change vendor-side |
| Unreal 5 | Free until $1M lifetime gross per product, then **5% royalty** + quarterly reporting |
| Defold | Free; permissive |
| Phaser / PixiJS (MIT) | None beyond attribution |
| Flutter/Flame (BSD-3) | Attribution |
| MonoGame (MIT), libGDX (Apache-2), Bevy (MIT/Apache-2), raylib (zlib) | Attribution |
| Qt | LGPL → must allow user relinking, or buy a commercial licence. Friction for closed source. |
| pygame-ce | LGPL → same relinking consideration, and no iOS/Android anyway |

Also note: **your game being closed source does not exempt you from third-party asset licences.**
Any font, sprite, or sound you pull in carries its own terms — track those in a
`docs/THIRD_PARTY.md` from the first asset you add.

---

## 8. Decisions needed before coding starts

1. **2D or 3D?** (2D → Godot/Phaser/Defold are all strong. 3D → Godot or Unity. AAA 3D → Unreal.)
2. **What is the game?** "CarTrack" reads as either an arcade racer, a traffic/dodging game, or a
   vehicle-tracking sim. The genre drives physics needs, art volume, and whether you need a
   tilemap or a 3D world.
3. **What languages do you (or your team) already know?** This outweighs most technical
   differences. A stack you can debug at 2 a.m. beats a marginally better one.
4. **Do you want me to build and verify it in this sandbox?** If yes → TypeScript/Phaser or
   Python. If no → Godot is the better long-term choice and you run the editor locally.
5. **Offline single-player, or online?** Multiplayer adds networking, servers, and anti-cheat,
   and changes the engine ranking (Godot's built-in netcode is basic).
6. **Monetisation?** Free, paid, or free-with-ads/IAP. Ads/IAP SDKs are where Unity is clearly
   ahead on mobile.
7. **Console in scope later?** If yes, Godot drops in ranking — it needs a third-party porter.

---

## 9. Risks

| Risk | Impact | Mitigation |
|---|---|---|
| No Mac available | **Blocks all iOS and macOS shipping** | Confirm access now; else budget a macOS CI runner |
| Scope creep on 3D | Weeks→months | Start 2D; add 3D only if the design demands it |
| Engine chosen before genre is fixed | Rework | Answer §8.1–8.2 first |
| Third-party asset licences | Legal exposure for a closed-source product | Log every asset in `docs/THIRD_PARTY.md` |
| Mobile performance discovered late | Rewrite of render path | Port to a physical phone at milestone 4, not 7 |
| Unity EULA / Unreal royalty changes | Cost at scale | Godot avoids this entirely |
