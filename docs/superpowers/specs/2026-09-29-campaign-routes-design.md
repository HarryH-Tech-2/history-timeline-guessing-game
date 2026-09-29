# Campaign route forks — design

Date: 2026-09-29 · Status: design approved in conversation, awaiting spec review

## Goal

Make the campaign feel like a journey with choices: partway through each era the
path forks into two themed routes; finishing either route continues the main
path, and the other route stays open to play later. Also make the era
background switch sooner while scrolling.

Success: every existing player keeps every stage, star and unlock they had;
Daily question selection is byte-identical before and after (old and new builds
agree on the leaderboard); each fork is obvious on the map and playable end to
end on a phone.

### Out of scope

- Changing the existing main-path stages, their ids, order or contents.
- Forks that do not rejoin, more than one fork per era, or optional bonus
  detours (considered, not chosen).
- Server/Firestore changes. Campaign stays client-side.

## 1. Content

150 new questions: 5 eras × 2 routes × 3 stages × 5 questions.

| Era (years) | Route A | Route B |
|---|---|---|
| ancient (≤ 500) | `egypt-near-east` 🏺 Egypt & the Near East | `greece-rome` 🏛️ Greece & Rome |
| medieval (500–1499) | `crusades-castles` ⚔️ Crusades & Castles | `silk-road` 🐪 Silk Road & Trade |
| early-modern (1500–1799) | `voyages` ⛵ Voyages of Discovery | `renaissance` 🎨 Renaissance & Reformation |
| nineteenth (1800–1899) | `revolutions` 🗽 Revolutions & Nations | `steam-science` 🚂 Steam & Science |
| modern (1900–) | `world-at-war` 🎖️ World at War | `space-tech` 🚀 Space & Technology |

- Each question follows the existing `Question` schema and content policy
  (firm, on-timeline year ≠ 0, ≥ −999; date checked against Wikipedia; unique
  title across the whole catalogue; an existing `categoryId`; tags include the
  route id).
- Each route's 15 questions fall inside its era's years and are ordered
  easy → hard (then by year) into its 3 stages.
- Each gets a bundled illustration generated with the existing
  `scripts/generateQuestionImages.ts` pipeline (nanobanana, ~$0.04 each).
- Lives in `src/data/packs/campaignRoutes/` (one file per era), exported as
  `CAMPAIGN_ROUTES`.
- **Rotation:** route questions are excluded by `isInRotation` (like the
  regional expansion), so neither the Daily nor the main campaign path changes.
  They do join category and Endless pools like any other question.
  `scripts/exportCatalogueForFunctions.ts` and the functions catalogue treat
  them as not in rotation.

## 2. Data model (`campaignMap.ts`)

- New `CampaignRoute { id, worldId, name, icon, afterStageId, stages: CampaignStage[] }`.
  Route stages get ids `${worldId}-${routeId}-s${n}` (n = 1..3) and
  `routeId` on the stage (`CampaignStage.routeId?: string`).
- `CampaignWorld.routes: readonly CampaignRoute[]` (exactly two per era).
- Fork position: after main stage `ceil(mainStageCount / 3)` of each era
  (ancient 6 → after s2; medieval 9 → s3; early-modern 12 → s4;
  nineteenth 12 → s4; modern 24 → s8). `afterStageId` records it; the rejoin
  stage is the next main stage.
- Main-path stage building is unchanged (still from `isInRotation` questions),
  so every existing stage id and its questions stay identical — pinned by a
  test.

## 3. Unlocking and progression

`isStageUnlocked(stageId, progress)`:

1. A stage that already has progress (any stars) is unlocked — protects every
   existing player, including those already past a fork.
2. First main stage: unlocked.
3. Route stage n = 1: unlocked when the route's `afterStageId` has ≥ 1 star.
   Route stage n > 1: when route stage n − 1 has ≥ 1 star.
4. The rejoin main stage (the one right after a fork): unlocked when the
   last stage of **either** route has ≥ 1 star.
5. Any other main stage: previous main stage has ≥ 1 star (as today).

- `nextStage(stageId)`: within a route → next route stage; last route stage →
  the rejoin stage; the fork stage itself → `null`-like "fork" result so
  "Continue your quest" opens the map scrolled to the fork instead of
  auto-picking a route. Represented as a discriminated result in `questCta.ts`
  (`{ kind: 'map', focusStageId }`).
- Premium: route stages inherit their era's premium (`isStagePremium` by
  `worldId`), so ancient routes are free.
- Stars/status (`eraStatus`, journey totals): route stages count toward stars
  earned/available. "Complete" = every main stage + every stage of at least one
  route has ≥ 1 star. "Mastered" = every stage of the era (main + both routes)
  has 3 stars.
- `allStages()` keeps returning the main path in play order (existing callers);
  new `allStagesIncludingRoutes()` for totals and lookups; `getStage` finds
  route stages too.

## 4. Map UI

- Between the fork stage and the rejoin stage the trail splits into two lanes
  (left/right thirds of the width), each headed by a small route banner in the
  era colour: icon, name, ★ earned/9. The two lanes' stages sit side by side
  and their dotted connectors fork from the fork stage and merge into the
  rejoin stage.
- Main-path nodes after the fork continue the existing zig-zag.
- The frontier logic (START bubble, pulse, owl, auto-scroll) handles route
  stages: at a fresh fork both route first stages show as available; the START
  bubble and owl go to route A's first stage; the pulse shows on both.
- Stage screen titles: `${era.name} · ${route.name} · Stage n` for route stages.
- Existing testIDs keep working; route nodes use `stage-${id}` like others,
  banners `route-${routeId}`.

## 5. Faster background swap

- Era-in-view switches when the next era's banner crosses the vertical middle
  of the viewport (not when the section fills the screen).
- Cross-fade 200 ms (was 400 ms); reduced motion stays instant.

## 6. Testing

- Unit: main-path stages identical to a pinned snapshot of ids + question ids;
  Daily for pinned dates unchanged; route unlocking rules 1–5 incl. an
  "already past the fork" legacy progress case; either-route rejoin;
  `nextStage` across routes; complete/mastered with routes; premium on route
  stages; content invariants (150 questions, 15 per route, in era, unique
  titles, every one illustrated, not in rotation).
- Render: fork lanes and route banners render; both route first stages
  available at a fresh fork; tapping a premium route stage → paywall
  (source `campaign`).
- Device: play through a fork on the phone; scroll-swap speed feels immediate.

## Rollout

App-only (bundled content + client logic); ships with the next build. No
reseed needed (hydration ignores non-bundled rows; route questions are
bundled). Cost: ~150 images ≈ $6 nanobanana.
