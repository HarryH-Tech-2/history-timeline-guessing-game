# Slice 1 Design — Foundation + Timeline Guess Loop

**Project:** History Timeline Guessing Game
**Slice:** 1 of 7 (Foundation + Timeline engine)
**Date:** 2026-07-27
**Status:** Approved for planning

---

## Context

Building a production mobile game where players drag a zoomable timeline to guess *when* a
historical event happened. The full product is decomposed into 7 sub-projects (see
`memory/project_timeline_game.md`); this spec covers **slice 1 only**: a runnable app with the
core timeline interaction, a single guess→reveal round, scoring, and local seed data.

**Explicitly out of scope for this slice:** Firebase, auth, RevenueCat, ads, leaderboards,
achievements, coins, hints, multiple game modes, MMKV, persistence of results. These arrive in
later slices and the architecture must not need refactoring to accommodate them.

## Decisions (locked with user)

1. **Interaction model — map-style.** Fixed center crosshair; the player pans/pinch-zooms the
   timeline *underneath* it. Guess = the year currently under the crosshair.
2. **Year range — broad, 3000 BCE to present**, with a **non-linear (log-based) warp** so the
   dense modern era gets more pixels than antiquity while ancient dates stay reachable.
3. **Content — ~40 hand-authored questions**, Firestore-shaped, across the four launch
   categories, spanning ancient→modern.
4. **Run target — Expo Go** (both iOS and Android). MMKV deferred; persistence sits behind a
   `Storage` interface backed by AsyncStorage for now.
5. **Combo / streak / XP — scored-but-stubbed** in this slice (real logic in slice 5), modelled
   cleanly so no rewrite is needed.

## Tech stack (this slice)

Expo (latest stable) · TypeScript (strict, **no `any`**) · Expo Router · NativeWind ·
React Native Reanimated · React Native Gesture Handler · Zod · Expo Haptics ·
(TanStack Query, FlashList, Expo AV available but only used where they earn their place).
AsyncStorage now; MMKV later behind the same interface.

## Folder structure

```
app/                 # Expo Router routes (thin wiring only)
src/
  domain/            # Zod schemas + inferred types: Question, Category, Guess, RoundResult, Score
  features/timeline/
    components/      # TimelineTrack, Crosshair, YearLabel, RevealMarker
    hooks/           # useTimelineTransform, useGuessRound
    math/            # warp/unwarp, scoring — pure, unit-tested
  features/round/    # single guess→submit→reveal flow (screen + local state)
  components/ui/     # Card, Button, GlassView, and other primitives
  services/storage/  # Storage interface + AsyncStorage implementation
  data/              # questions.ts, categories.ts (Firestore-shaped seed)
  theme/             # dark-first design tokens (color, spacing, typography, radii)
  utils/
tests/               # unit + component tests
```

**Rationale:** feature-modular so later slices (game modes, backend, monetization) plug in
without touching the timeline engine. Pure logic (`math/`) is isolated from React for testability.

## Domain models (Zod-first)

`Category`: `id, name, icon, colour, description, difficulty, active, premiumOnly,
displayOrder, image` (image optional). Matches the future Firestore `categories` doc.

`Question`: `id, categoryId, title, subtitle, year (int, negative=BCE), month?, day?,
difficulty, country, region, latitude, longitude, shortDescription, longDescription, image?,
source?, tags[], verified, featured`. Matches the future Firestore `questions` doc.

`Guess`: `{ year: number }` (continuous, from unwarp).
`RoundResult`: `{ question, guessYear, errorYears, score, isPerfect }`.
`Score`: base points plus stubbed `comboMultiplier` (=1) and `streakBonus` (=0) fields.

All seed data is validated with these schemas at load time; invalid data throws (fail loud).

## Timeline engine

- **Year as a continuous number**, negative for BCE. No BC/CE string handling internally;
  formatting happens only at the label/display layer.
- **Warp function.** `warp(year)` maps a year to an axis coordinate; `unwarp(coord)` is its
  exact inverse (round-trip unit-tested). Distance-from-present is compressed logarithmically so
  recent years occupy more space than ancient ones. Baseline: `w(d) = log1p(d)` on
  `d = present - year`, signed and scaled to the axis. This is the "non-linear zoom" baseline;
  pinch adds a separate multiplicative scale on top.
- **Gestures.** `Gesture.Pan` + `Gesture.Pinch` (Reanimated shared values, UI-thread worklets
  for 60fps). Pan translates the track, pinch scales it about the crosshair. Momentum via
  `withDecay`. Guess = `unwarp(coordinate under screen center)`.
- **Precision.** Pinch-zoom in until individual years are wide for fine placement; zoom out to
  see millennia. Effectively unlimited precision without a slider.
- **Feedback.** Light haptic tick as decade/century gridlines cross the crosshair.
- **Adaptive labels.** Centuries when zoomed out → decades → years as zoom increases, chosen by
  current pixels-per-year.

## Round flow

1. Prompt card shows `title` + `subtitle`.
2. Player pans/zooms; live year readout under the crosshair.
3. **Submit** → the true-year marker animates in and the crosshair result animates from the
   guessed year to the true year; score counts up.
4. **Reveal sheet:** correct year, `longDescription`, `source` (if present), optional image.
5. Confetti + success haptic when `isPerfect` (or near-perfect threshold).
6. **Next** advances to another seed question.

State is local to `features/round` (React state / reducer). No persistence this slice.

## Scoring

Pure function over absolute year error, interpolating the spec breakpoints:

| error (yrs) | 0 | 1 | 2 | 5 | 10 | 20 | 50 | 100+ |
|-------------|----|-----|-----|-----|-----|-----|-----|------|
| points      |1000|950|900|800|650|450|150| 0 |

Linear interpolation between breakpoints; `>=100` → 0. `comboMultiplier` (1) and `streakBonus`
(0) applied in the formula but inert this slice. Every breakpoint is unit-tested.

## Theming / design

Dark-first token set (color, spacing, typography, radii) consumed via NativeWind. Glassmorphic
cards, large type, generous spacing. Reduced-motion aware (respect system setting for confetti /
big animations). Accessibility labels on interactive elements. Full accessibility pass is a
later slice, but primitives are built accessibility-ready.

## Testing

- **Unit:** `warp/unwarp` round-trip across the full range incl. BCE and present; `scoring` at
  every breakpoint and interpolated midpoints; Zod schema acceptance/rejection.
- **Component:** round flow renders prompt, Submit reveals the correct year and description.
- Tooling: Jest + React Native Testing Library.

## Success criteria

A new player can open the app, read a prompt, fluidly pan/zoom the timeline at 60fps, submit a
guess, watch it animate to the correct year, see a satisfying score, and learn something from the
reveal — all in ~10–20s. Code is strictly typed, pure logic is tested, and the structure lets
slice 2+ attach without refactoring.
