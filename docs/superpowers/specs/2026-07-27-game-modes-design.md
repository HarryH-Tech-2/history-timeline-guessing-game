# Slice 3 — Game Modes

Status: approved 2026-07-27. Builds on the timeline guess engine (slices 1–2).

## Goal

Add four playable game modes on top of the existing single-question guess loop:
**Endless**, **Daily**, **Survival**, **Campaign** (no Time Attack). Introduce a
home hub for navigation and a persistence layer so Daily locks per day and
Campaign/best-score progress survives relaunches.

## Architecture (Approach A: shared engine + thin per-mode hooks)

```
src/
  storage/
    types.ts          Storage interface (async getItem/setItem/removeItem)
    asyncStorage.ts   AsyncStorage adapter (Expo Go friendly)
    createStore.ts    typed, Zod-validated key/value store
  utils/rng.ts        mulberry32 + string->seed (deterministic Daily)
  features/
    round/
      RoundView.tsx     presentational guess loop (extracted from RoundScreen)
      useGameSession.ts shared engine
    modes/
      home/HomeHub.tsx
      endless/useEndlessSession.ts
      daily/useDailySession.ts + dailyQuestions.ts
      survival/useSurvivalSession.ts
      campaign/useCampaignSession.ts + campaignMap.ts
      components/ModeHud.tsx
      components/RunSummary.tsx
```

### Engine — `useGameSession({ first, next, shouldEnd?, modifiers? })`
Holds `question`, `phase` (`guessing|revealed`), current `result`, `results[]`,
`totalScore`, `status` (`active|finished`). `submit(guessYear)` scores via the
existing `evaluateGuess`; `advance()` calls `next(results)` — if it returns
`null` or `shouldEnd(results)` is true, `status` becomes `finished`. Each mode
hook supplies only its queue policy and end condition.

### Presentational split
`RoundView` takes `{ question, phase, result, categoryColour, onSubmit, onNext }`
and renders `PromptCard + TimelineTrack + Submit/RevealSheet + Confetti`. Mode
screens own the session and wrap `RoundView` with a `ModeHud` and, on finish,
`RunSummary`.

## Mode rules

- **Endless** — infinite random queue, never ends; player exits via Home. Best
  score persisted.
- **Daily** — 8 questions deterministically seeded from `YYYY-MM-DD` (same for
  everyone). One attempt/day: once today's record exists the mode shows a locked
  summary until tomorrow. Spoiler-free shareable recap.
- **Survival** — 3 lives; a round costs a life when `errorYears > 20`. Run ends
  at 0 lives. Best `{roundsSurvived, score}` persisted.
- **Campaign** — 4 worlds = the 4 categories (displayOrder). Each category's 10
  questions are ordered easy→expert and chunked into 2 stages of 5. Stars per
  stage from average round score: `>=800 → 3`, `>=550 → 2`, completed `→ 1`.
  Stage 2 unlocks when stage 1 has ≥1 star; the next world unlocks when the
  previous world's last stage has ≥1 star. World 1 always unlocked. Progress
  persisted.

## Navigation (Expo Router, typed routes)

- `app/index.tsx` — Home hub (4 mode cards).
- `app/endless.tsx`, `app/daily.tsx`, `app/survival.tsx`.
- `app/campaign/index.tsx` — world/stage map.
- `app/campaign/[world]/[stage].tsx` — play a stage.

## Persistence (Zod-validated, via Storage interface)

- `chronos.bestScores` — `{ endless?: number; survival?: { rounds; score } }`
- `chronos.daily` — latest `{ date; totalScore; perfectCount; results[] }`
- `chronos.campaign` — `{ [stageId]: { stars; bestScore } }`

Corrupt/missing reads fall back to defaults. Swapping AsyncStorage for MMKV
later is a one-file change.

## Testing

Unit: rng determinism; daily queue determinism (same date → same 8 ids); survival
lives logic; campaign stars + unlock logic; store round-trip against an in-memory
fake. Engine: submit→advance→finish + `shouldEnd`. Component: home hub renders/
routes; a mode plays to summary; survival ends at 0 lives. All Expo-Go runnable;
only new native dependency is AsyncStorage.
