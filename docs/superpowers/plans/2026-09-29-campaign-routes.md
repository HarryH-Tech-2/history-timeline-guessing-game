# Campaign Route Forks Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Partway through each campaign era the trail forks into two themed, 3-stage routes (150 new illustrated questions); finishing either route continues the main path, the other stays open, and the era backdrop swaps sooner while scrolling.

**Architecture:** Route questions live in a new bundled pack (`src/data/packs/campaignRoutes/`) that is kept out of rotation, so the Daily and every existing main-path stage stay byte-identical. `campaignMap.ts` gains a pure `buildCampaign(pool, routeQuestions, routeSpecs)` that attaches `routes` to each `CampaignWorld`; all progression helpers take an optional `worlds` argument (default `CAMPAIGN`) so logic is tested against injected fixtures. The map draws each era's trail from a pure `eraTrailLayout()` (nodes, dotted segments, route banners, height), so fork geometry is unit-tested and the React components stay thin.

**Tech Stack:** Expo SDK 57, React Native, expo-router, react-native-reanimated 4, NativeWind, Zod, Jest (jest-expo) + @testing-library/react-native, tsx scripts, nanobanana image API, Python/PIL for WebP conversion, node:test for `functions/`.

**Spec:** `docs/superpowers/specs/2026-09-29-campaign-routes-design.md` (binding authority — read it before each task).

## Global Constraints

- Expo docs for this project: https://docs.expo.dev/versions/v57.0.0/ (AGENTS.md: "Expo HAS CHANGED" — check the versioned docs before touching any Expo API).
- Main-path stages (ids `${era}-s${n}`, order, question ids) must not change: pinned by `src/features/modes/campaign/__fixtures__/mainPath.json` (Task 1). Never regenerate that fixture after Task 1.
- The Daily must deal exactly the same questions for the pinned dates in `src/data/regionalExpansion.test.ts` (`2026-09-29`, `2026-12-25`, `2027-03-01`).
- Route questions are excluded by `isInRotation`; `functions/src/social/catalogue.json` must mark them `"inRotation": false` (regenerate with `npm run export:catalogue`).
- Route ids, names, icons exactly: ancient `egypt-near-east` 🏺 Egypt & the Near East, `greece-rome` 🏛️ Greece & Rome; medieval `crusades-castles` ⚔️ Crusades & Castles, `silk-road` 🐪 Silk Road & Trade; early-modern `voyages` ⛵ Voyages of Discovery, `renaissance` 🎨 Renaissance & Reformation; nineteenth `revolutions` 🗽 Revolutions & Nations, `steam-science` 🚂 Steam & Science; modern `world-at-war` 🎖️ World at War, `space-tech` 🚀 Space & Technology.
- Route stage ids `${worldId}-${routeId}-s${n}` (n = 1..3); fork after main stage `ceil(mainStageCount / 3)` → `ancient-s2`, `medieval-s3`, `early-modern-s4`, `nineteenth-s4`, `modern-s8`.
- Route stage titles: `${era.name} · ${route.name} · Stage ${n}`. testIDs: route nodes `stage-${id}`, banners `route-${routeId}`.
- Content policy per question: `Question` schema; firm year, `year !== 0`, `year >= -999`, `year <= 2025`; date checked against Wikipedia (WebFetch) with `source` = that Wikipedia URL; `verified: true`; unique title across the whole catalogue; existing non-Regional `categoryId`; tags include the route id; year inside the era (ancient ≤ 500, medieval 501–1499, early-modern 1500–1799, nineteenth 1800–1899, modern ≥ 1900 — 500 belongs to Ancient in `ERAS`); no year digits in title/subtitle/shortDescription (spoiler).
- Cross-fade 200 ms (was 400 ms); reduced motion stays instant.
- No server/Firestore changes. NEVER run `firebase deploy`, `eas build`, `git push`, a Firestore reseed or a store upload. Never start or kill Metro (already running on 8081).
- Commit after every task on branch `feat/social`; every commit message ends with a blank line then `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Lint: `npx eslint <touched files>` must be clean for touched files; pre-existing errors in untouched files are baseline, not yours. Don't lint the generated `src/data/questionImages.ts`.
- Image generation is pre-approved by the spec (~150 × $0.04). Key is `NANOBANANA_API_KEY` in `.env`; never print or commit it.

## Review Focus

1. **Legacy player already past a fork** (main stages starred beyond the fork, no route stars): every starred stage stays unlocked and the map's frontier (START/owl/auto-scroll) goes to their real next stage, not back to the fork's routes — tests in Task 4 (`legacy` unlock + `frontierStage` cases).
2. **Player who picked route B first**: after starring B's stage 1 the frontier is B's stage 2, never A's stage 1 — test in Task 4 (`frontierStage` "chosen route").
3. **One route finished**: the rejoin stage unlocks, the frontier moves to it, and the other route stays tappable/unlocked — tests in Task 4 (unlock + frontier) and Task 11 (render).
4. **Narrow phone (320 dp)**: the two route banners and lanes never overlap each other or run off-screen — test in Task 10 (`eraTrailLayout` at width 320).
5. **Free player deep-linking into a premium route stage** (`/campaign/medieval/medieval-crusades-castles-s1`) sees the Premium lock, never a playable round; an unknown route stage id shows "could not be found" — tests in Task 11 (`CampaignStageScreen.test.tsx`).

---

## File Structure

| Path | Responsibility |
|---|---|
| `src/features/modes/campaign/__fixtures__/mainPath.json` (create) | Pinned main-path stage ids + question ids recorded before any change |
| `src/features/modes/campaign/campaignMainPath.test.ts` (create) | Asserts the main path equals the pin |
| `src/data/packs/campaignRoutes/routes.ts` (create) | `CampaignRouteSpec` + the 10 route specs |
| `src/data/packs/campaignRoutes/{ancient,medieval,earlyModern,nineteenth,modern}.ts` (create) | 30 route questions per era |
| `src/data/packs/campaignRoutes/index.ts` (create) | `CAMPAIGN_ROUTES`, re-exports specs |
| `src/data/rotation.ts` (create) | `OUT_OF_ROTATION_IDS` — single source for app + export script |
| `src/data/questions.ts` (modify) | Append `...CAMPAIGN_ROUTES` to `QUESTIONS` |
| `src/data/index.ts` (modify) | `isInRotation` via `OUT_OF_ROTATION_IDS`; export specs + `isCampaignRouteQuestion` |
| `scripts/exportCatalogueForFunctions.ts` (modify) | Use `OUT_OF_ROTATION_IDS` |
| `src/data/campaignRoutes.test.ts` (create) | Specs, rotation and content acceptance tests |
| `src/features/modes/campaign/campaignMap.ts` (modify) | Routes data model + unlocking/progression |
| `src/features/modes/campaign/__fixtures__/routedCampaign.ts` (create) | Injected fixture campaign for logic/layout tests |
| `src/features/modes/campaign/questCta.ts` (modify) | Fork → `{ kind: 'map', focusStageId }` |
| `src/features/modes/campaign/map/constants.ts` (modify) | Route banner/lane geometry |
| `src/features/modes/campaign/map/trailLayout.ts` (create) | Pure per-era trail geometry |
| `src/features/modes/campaign/map/RouteBanner.tsx` (create) | Small route banner |
| `src/features/modes/campaign/map/EraTrail.tsx` (modify) | Renders a `TrailLayout` |
| `src/features/modes/campaign/map/StageButton.tsx` (modify) | `pulse`, `routeName` props |
| `src/features/modes/campaign/map/mapVisuals.ts` (modify) | `backdropProbe()` |
| `src/features/modes/campaign/map/EraBackdrop.tsx` (modify) | 200 ms cross-fade |
| `src/features/modes/campaign/CampaignMapScreen.tsx` (modify) | Totals incl. routes, layouts, pulse, backdrop probe |
| `assets/questions/rte-*.webp` (create) | 150 illustrations |
| `src/data/questionImages.ts` (regenerated) | Require-map |
| `functions/src/social/catalogue.json` (regenerated), `functions/src/social/catalogue.test.ts` (modify) | Server catalogue |

Commands used throughout (run from the repo root in Git Bash):
- Jest: `npx jest <paths>`
- Types: `npx tsc --noEmit`
- Lint: `npx eslint <files>`

---

### Task 1: Pin the main path before anything changes

**Files:**
- Create: `src/features/modes/campaign/__fixtures__/mainPath.json` (recorded)
- Create: `src/features/modes/campaign/campaignMainPath.test.ts`

**Interfaces:**
- Consumes: `allStages()` from `campaignMap.ts` (current signature).
- Produces: the pin every later task must keep green.

- [ ] **Step 1: Write a temporary recorder test**

Create `src/features/modes/campaign/recordMainPath.test.ts` (deleted in Step 3):

```ts
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { allStages } from './campaignMap';

it('records the main path', () => {
  const dir = path.join(__dirname, '__fixtures__');
  mkdirSync(dir, { recursive: true });
  const rows = allStages().map((s) => ({ id: s.id, questionIds: [...s.questionIds] }));
  writeFileSync(path.join(dir, 'mainPath.json'), `${JSON.stringify(rows, null, 1)}\n`);
  expect(rows).toHaveLength(63);
});
```

- [ ] **Step 2: Run it once**

Run: `npx jest src/features/modes/campaign/recordMainPath.test.ts`
Expected: PASS; `src/features/modes/campaign/__fixtures__/mainPath.json` exists with 63 entries (6 + 9 + 12 + 12 + 24), first id `ancient-s1`, last id `modern-s24`.

- [ ] **Step 3: Delete the recorder and write the pin test**

`rm src/features/modes/campaign/recordMainPath.test.ts`, then create `src/features/modes/campaign/campaignMainPath.test.ts`:

```ts
import { allStages, CAMPAIGN } from './campaignMap';
import pinned from './__fixtures__/mainPath.json';

/**
 * Progress is keyed by stage id and stages are positional, so a main-path
 * stage must never change id, order or questions. Recorded 2026-09-29 before
 * route forks existed. NEVER re-record this file.
 */
describe('campaign main path', () => {
  it('keeps every main-path stage id and its questions exactly as shipped', () => {
    expect(allStages().map((s) => ({ id: s.id, questionIds: [...s.questionIds] }))).toEqual(pinned);
  });

  it('keeps the era stage counts', () => {
    expect(CAMPAIGN.map((w) => w.stages.length)).toEqual([6, 9, 12, 12, 24]);
  });
});
```

- [ ] **Step 4: Run it**

Run: `npx jest src/features/modes/campaign/campaignMainPath.test.ts`
Expected: PASS (2 tests). This is a characterisation pin, so it is green from the start.

- [ ] **Step 5: Commit**

```bash
git add src/features/modes/campaign/__fixtures__/mainPath.json src/features/modes/campaign/campaignMainPath.test.ts
git commit -m "test(campaign): pin main-path stage ids and questions before route forks

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Route pack skeleton and one out-of-rotation source

**Files:**
- Create: `src/data/packs/campaignRoutes/routes.ts`, `ancient.ts`, `medieval.ts`, `earlyModern.ts`, `nineteenth.ts`, `modern.ts`, `index.ts`
- Create: `src/data/rotation.ts`
- Create: `src/data/campaignRoutes.test.ts`
- Modify: `src/data/questions.ts` (imports + `QUESTIONS` array at the end of the file)
- Modify: `src/data/index.ts` (imports; `OUT_OF_ROTATION`/`isInRotation` block)
- Modify: `scripts/exportCatalogueForFunctions.ts`
- Modify: `src/data/regionalExpansion.test.ts:86-88`

**Interfaces:**
- Produces (from `@/data`): `CAMPAIGN_ROUTE_SPECS: readonly CampaignRouteSpec[]`, `type CampaignRouteSpec = { id: string; eraId: string; name: string; icon: string }`, `isCampaignRouteQuestion(q: Question): boolean`, `isInRotation(q: Question): boolean` (unchanged signature).
- Produces (direct imports): `CAMPAIGN_ROUTES: readonly Question[]` from `src/data/packs/campaignRoutes`; `ANCIENT_ROUTE_QUESTIONS`, `MEDIEVAL_ROUTE_QUESTIONS`, `EARLY_MODERN_ROUTE_QUESTIONS`, `NINETEENTH_ROUTE_QUESTIONS`, `MODERN_ROUTE_QUESTIONS` (each `readonly Question[]`); `OUT_OF_ROTATION_IDS: ReadonlySet<string>` from `src/data/rotation.ts`.
- Produces: `src/data/campaignRoutes.test.ts` with a `COMPLETE_ERAS` array that each content task extends.

- [ ] **Step 1: Write the failing test**

Create `src/data/campaignRoutes.test.ts`:

```ts
import {
  CAMPAIGN_ROUTE_SPECS,
  getCategoryById,
  getDailyQuestions,
  getQuestionById,
  getQuestions,
  isCampaignRouteQuestion,
  isInRotation,
} from './index';
import { CAMPAIGN_ROUTES } from './packs/campaignRoutes';
import { REGIONAL_EXPANSION } from './packs/regionalExpansion';
import { imageForQuestion } from './questionImages';
import { OUT_OF_ROTATION_IDS } from './rotation';

/** Eras whose 30 route questions are written. Each content task appends its era. */
const COMPLETE_ERAS: readonly string[] = [];

/** Inclusive year span of each campaign era (ERAS in campaignMap.ts: 500 is Ancient). */
const ERA_YEARS: Record<string, readonly [number, number]> = {
  ancient: [-999, 500],
  medieval: [501, 1499],
  'early-modern': [1500, 1799],
  nineteenth: [1800, 1899],
  modern: [1900, 2025],
};

const specIds = new Set(CAMPAIGN_ROUTE_SPECS.map((s) => s.id));
const eraOfRoute = new Map(CAMPAIGN_ROUTE_SPECS.map((s) => [s.id, s.eraId] as const));
const routeQuestionIds = new Set(CAMPAIGN_ROUTES.map((q) => q.id));

function dateKeys(days: number): string[] {
  const start = new Date(2026, 0, 1);
  return Array.from({ length: days }, (_, i) => {
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    return `${d.getFullYear()}-${`${d.getMonth() + 1}`.padStart(2, '0')}-${`${d.getDate()}`.padStart(2, '0')}`;
  });
}

describe('campaign route specs', () => {
  it('forks every era into the two designed routes', () => {
    expect(CAMPAIGN_ROUTE_SPECS.map((r) => `${r.eraId} ${r.id} ${r.icon} ${r.name}`)).toEqual([
      'ancient egypt-near-east 🏺 Egypt & the Near East',
      'ancient greece-rome 🏛️ Greece & Rome',
      'medieval crusades-castles ⚔️ Crusades & Castles',
      'medieval silk-road 🐪 Silk Road & Trade',
      'early-modern voyages ⛵ Voyages of Discovery',
      'early-modern renaissance 🎨 Renaissance & Reformation',
      'nineteenth revolutions 🗽 Revolutions & Nations',
      'nineteenth steam-science 🚂 Steam & Science',
      'modern world-at-war 🎖️ World at War',
      'modern space-tech 🚀 Space & Technology',
    ]);
  });
});

describe('rotation', () => {
  it('takes exactly the Regional expansion and the route questions out of rotation', () => {
    expect([...OUT_OF_ROTATION_IDS].sort()).toEqual(
      [...REGIONAL_EXPANSION, ...CAMPAIGN_ROUTES].map((q) => q.id).sort(),
    );
    for (const q of getQuestions()) expect(isInRotation(q)).toBe(!OUT_OF_ROTATION_IDS.has(q.id));
  });

  it('recognises route questions by pack membership, not by tag', () => {
    // 'renaissance' is also an ordinary tag on older, in-rotation questions.
    const lookalikes = getQuestions().filter(
      (q) => q.tags.includes('renaissance') && !routeQuestionIds.has(q.id),
    );
    expect(lookalikes.length).toBeGreaterThan(0);
    for (const q of lookalikes) expect(isCampaignRouteQuestion(q)).toBe(false);
    for (const q of CAMPAIGN_ROUTES) expect(isCampaignRouteQuestion(q)).toBe(true);
  });

  it('never deals a route question in the Daily', () => {
    for (const key of dateKeys(400)) {
      for (const q of getDailyQuestions(key)) expect(routeQuestionIds.has(q.id)).toBe(false);
    }
  });
});

describe('campaign route questions', () => {
  it('are bundled in the catalogue under unique rte- ids', () => {
    const ids = CAMPAIGN_ROUTES.map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const q of CAMPAIGN_ROUTES) {
      expect(q.id.startsWith('rte-')).toBe(true);
      expect(getQuestionById(q.id)).toBeDefined();
    }
  });

  it('carry exactly one route tag and sit inside that route’s era', () => {
    for (const q of CAMPAIGN_ROUTES) {
      const routes = q.tags.filter((t) => specIds.has(t));
      expect(routes).toHaveLength(1);
      const [min, max] = ERA_YEARS[eraOfRoute.get(routes[0]!)!]!;
      expect(q.year).toBeGreaterThanOrEqual(min);
      expect(q.year).toBeLessThanOrEqual(max);
    }
  });

  it('follow the content policy', () => {
    for (const q of CAMPAIGN_ROUTES) {
      expect(q.year).not.toBe(0);
      expect(q.year).toBeGreaterThanOrEqual(-999);
      expect(q.year).toBeLessThanOrEqual(2025);
      if (q.day !== undefined) expect(q.month).toBeDefined();
      expect(q.source?.startsWith('https://en.wikipedia.org/wiki/')).toBe(true);
      expect(q.verified).toBe(true);
      expect(getCategoryById(q.categoryId)).toBeDefined();
      expect(q.categoryId).not.toBe('regional');
      const year = String(Math.abs(q.year));
      for (const text of [q.title, q.subtitle, q.shortDescription]) expect(text).not.toContain(year);
    }
  });

  it('keeps titles unique across the whole catalogue', () => {
    const titles = getQuestions().map((q) => q.title.toLowerCase());
    expect(new Set(titles).size).toBe(titles.length);
  });

  it('illustrates every route question', () => {
    expect(CAMPAIGN_ROUTES.filter((q) => imageForQuestion(q.id) === undefined).map((q) => q.id)).toEqual([]);
  });

  for (const eraId of COMPLETE_ERAS) {
    it(`gives ${eraId} two routes of 15 questions: five easy, five medium, five hard`, () => {
      for (const spec of CAMPAIGN_ROUTE_SPECS.filter((s) => s.eraId === eraId)) {
        const own = CAMPAIGN_ROUTES.filter((q) => q.tags.includes(spec.id));
        expect(own).toHaveLength(15);
        for (const d of ['easy', 'medium', 'hard']) {
          expect(own.filter((q) => q.difficulty === d)).toHaveLength(5);
        }
      }
    });
  }

  it('adds thirty questions per completed era', () => {
    expect(CAMPAIGN_ROUTES).toHaveLength(COMPLETE_ERAS.length * 30);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/data/campaignRoutes.test.ts`
Expected: FAIL — `Cannot find module './packs/campaignRoutes'` (and `./rotation`).

- [ ] **Step 3: Create the pack**

`src/data/packs/campaignRoutes/routes.ts`:

```ts
/** A themed campaign route: two per era, forking off the main path. */
export interface CampaignRouteSpec {
  /** Route id; also the tag every one of its questions carries. */
  id: string;
  /** Campaign era (world) id the route belongs to. */
  eraId: string;
  name: string;
  icon: string;
}

/** Campaign route forks (2026-09-29): play order within an era is route A, then route B. */
export const CAMPAIGN_ROUTE_SPECS: readonly CampaignRouteSpec[] = [
  { id: 'egypt-near-east', eraId: 'ancient', name: 'Egypt & the Near East', icon: '🏺' },
  { id: 'greece-rome', eraId: 'ancient', name: 'Greece & Rome', icon: '🏛️' },
  { id: 'crusades-castles', eraId: 'medieval', name: 'Crusades & Castles', icon: '⚔️' },
  { id: 'silk-road', eraId: 'medieval', name: 'Silk Road & Trade', icon: '🐪' },
  { id: 'voyages', eraId: 'early-modern', name: 'Voyages of Discovery', icon: '⛵' },
  { id: 'renaissance', eraId: 'early-modern', name: 'Renaissance & Reformation', icon: '🎨' },
  { id: 'revolutions', eraId: 'nineteenth', name: 'Revolutions & Nations', icon: '🗽' },
  { id: 'steam-science', eraId: 'nineteenth', name: 'Steam & Science', icon: '🚂' },
  { id: 'world-at-war', eraId: 'modern', name: 'World at War', icon: '🎖️' },
  { id: 'space-tech', eraId: 'modern', name: 'Space & Technology', icon: '🚀' },
];
```

`src/data/packs/campaignRoutes/ancient.ts` (the other four files are identical apart from the names given below):

```ts
import type { Question } from '@/domain';

/** Campaign routes (2026-09-29): The Ancient World — Egypt & the Near East, Greece & Rome. Out of rotation. */
export const ANCIENT_ROUTE_QUESTIONS: readonly Question[] = [];
```

- `medieval.ts`: `MEDIEVAL_ROUTE_QUESTIONS`, doc comment `The Middle Ages — Crusades & Castles, Silk Road & Trade`.
- `earlyModern.ts`: `EARLY_MODERN_ROUTE_QUESTIONS`, `The Early Modern Age — Voyages of Discovery, Renaissance & Reformation`.
- `nineteenth.ts`: `NINETEENTH_ROUTE_QUESTIONS`, `The 19th Century — Revolutions & Nations, Steam & Science`.
- `modern.ts`: `MODERN_ROUTE_QUESTIONS`, `The Modern Era — World at War, Space & Technology`.

`src/data/packs/campaignRoutes/index.ts`:

```ts
import type { Question } from '@/domain';

import { ANCIENT_ROUTE_QUESTIONS } from './ancient';
import { EARLY_MODERN_ROUTE_QUESTIONS } from './earlyModern';
import { MEDIEVAL_ROUTE_QUESTIONS } from './medieval';
import { MODERN_ROUTE_QUESTIONS } from './modern';
import { NINETEENTH_ROUTE_QUESTIONS } from './nineteenth';

export { CAMPAIGN_ROUTE_SPECS, type CampaignRouteSpec } from './routes';

/**
 * Campaign route questions (2026-09-29): 5 eras × 2 routes × 15. Played in the
 * campaign's route forks and in category/Endless pools, but kept out of the
 * Daily and the campaign main path (see `isInRotation`), so neither changes.
 */
export const CAMPAIGN_ROUTES: readonly Question[] = [
  ...ANCIENT_ROUTE_QUESTIONS,
  ...MEDIEVAL_ROUTE_QUESTIONS,
  ...EARLY_MODERN_ROUTE_QUESTIONS,
  ...NINETEENTH_ROUTE_QUESTIONS,
  ...MODERN_ROUTE_QUESTIONS,
];
```

- [ ] **Step 4: Create the single rotation source**

`src/data/rotation.ts` (relative imports only, so `tsx` scripts can use it):

```ts
import { CAMPAIGN_ROUTES } from './packs/campaignRoutes';
import { REGIONAL_EXPANSION } from './packs/regionalExpansion';

/**
 * Question ids kept out of the seeded, shared modes: the Daily, the campaign
 * main path and random Social challenges. Adding questions there would give
 * old and new builds different Dailies on the same day and move questions
 * between stages players have already starred. Shared by the app
 * (`isInRotation`) and scripts/exportCatalogueForFunctions.ts.
 */
export const OUT_OF_ROTATION_IDS: ReadonlySet<string> = new Set(
  [...REGIONAL_EXPANSION, ...CAMPAIGN_ROUTES].map((q) => q.id),
);
```

- [ ] **Step 5: Wire the catalogue, `@/data` and the export script**

In `src/data/questions.ts` add `import { CAMPAIGN_ROUTES } from './packs/campaignRoutes';` beside the other pack imports and append `...CAMPAIGN_ROUTES,` as the LAST element of `QUESTIONS` (after `...REGIONAL_EXPANSION,`).

In `src/data/index.ts`:
- replace `import { REGIONAL_EXPANSION } from './packs/regionalExpansion';` with
  ```ts
  import { CAMPAIGN_ROUTES } from './packs/campaignRoutes';
  import { OUT_OF_ROTATION_IDS } from './rotation';
  ```
- below `export { QUESTION_IMAGES, imageForQuestion } from './questionImages';` add
  ```ts
  export { CAMPAIGN_ROUTE_SPECS, type CampaignRouteSpec } from './packs/campaignRoutes';
  ```
- replace the `/** Ids of packs that are played only in their own category. */ const OUT_OF_ROTATION …` line and the whole `isInRotation` doc+function with:
  ```ts
  /**
   * Whether a question takes part in the shared, seeded modes (the Daily and the
   * campaign main path). The Regional expansion and the campaign route questions
   * do not: the Daily is seeded over the whole pool and the campaign slices it
   * into stages, so adding questions there would give old and new builds
   * different Dailies on the same day and move questions between stages players
   * have already starred.
   */
  export function isInRotation(question: Question): boolean {
    return !OUT_OF_ROTATION_IDS.has(question.id);
  }

  const ROUTE_QUESTION_IDS = new Set(CAMPAIGN_ROUTES.map((q) => q.id));

  /** Whether a question belongs to a campaign route fork (by pack membership, not tag). */
  export function isCampaignRouteQuestion(question: Question): boolean {
    return ROUTE_QUESTION_IDS.has(question.id);
  }
  ```

In `scripts/exportCatalogueForFunctions.ts` replace the `REGIONAL_EXPANSION` import and the `const outOfRotation = …` line with `import { OUT_OF_ROTATION_IDS } from '../src/data/rotation';` and use `inRotation: !OUT_OF_ROTATION_IDS.has(q.id)`; update the header comment's "whether it is in rotation" line to "(Daily/campaign main-path pool; see src/data/rotation.ts)".

In `src/data/regionalExpansion.test.ts` replace the last test body with:

```ts
  it('keeps the original questions in rotation', () => {
    expect(getQuestions().filter(isInRotation)).toHaveLength(
      getQuestions().length - 83 - CAMPAIGN_ROUTES.length,
    );
  });
```
and add `import { CAMPAIGN_ROUTES } from './packs/campaignRoutes';` to its imports.

- [ ] **Step 6: Run tests to verify they pass**

Run: `npx jest src/data src/features/social/scoringParity.test.ts src/features/modes/campaign`
Expected: PASS, all suites (campaignRoutes.test.ts: 10 tests while COMPLETE_ERAS is empty).

Run: `npm run export:catalogue && git diff --stat functions/src/social/catalogue.json`
Expected: `Wrote 388 questions to …catalogue.json` and NO diff (nothing moved in or out of rotation yet).

Run: `npx tsc --noEmit`
Expected: no output, exit 0.

- [ ] **Step 7: Lint and commit**

Run: `npx eslint src/data/index.ts src/data/rotation.ts src/data/questions.ts src/data/packs/campaignRoutes src/data/campaignRoutes.test.ts src/data/regionalExpansion.test.ts scripts/exportCatalogueForFunctions.ts`
Expected: no errors.

```bash
git add src/data scripts/exportCatalogueForFunctions.ts
git commit -m "feat(data): campaign route pack skeleton with one out-of-rotation source

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Route data model in `campaignMap.ts`

**Files:**
- Modify: `src/features/modes/campaign/campaignMap.ts:1-151` (everything above `/** Star rating (1–3)…`)
- Create: `src/features/modes/campaign/__fixtures__/routedCampaign.ts`
- Modify: `src/features/modes/campaign/campaignMap.test.ts` (new `describe('routes data model')`)
- Modify: `src/data/campaignRoutes.test.ts` (per-era fork structure test)

**Interfaces:**
- Consumes: `CAMPAIGN_ROUTE_SPECS`, `isCampaignRouteQuestion`, `type CampaignRouteSpec` from `@/data` (Task 2).
- Produces:
  - `interface CampaignStage { id; worldId; index; title; questionIds; routeId?: string }`
  - `interface CampaignRoute { id: string; worldId: string; name: string; icon: string; afterStageId: string; stages: readonly CampaignStage[] }`
  - `interface CampaignWorld { …existing; routes: readonly CampaignRoute[] }`
  - `buildCampaign(pool: readonly Question[], routeQuestions: readonly Question[], routeSpecs: readonly CampaignRouteSpec[]): readonly CampaignWorld[]`
  - `forkAfterIndex(mainStageCount: number): number`
  - `getWorld(worldId, worlds = CAMPAIGN)`, `getStage(worldId, stageId, worlds = CAMPAIGN)` (finds route stages), `getRoute(stage, worlds = CAMPAIGN): CampaignRoute | undefined`, `worldStages(world): readonly CampaignStage[]` (play order: main up to the fork, route A, route B, rest of main), `allStages(worlds = CAMPAIGN)` (main path only, unchanged meaning), `allStagesIncludingRoutes(worlds = CAMPAIGN)`
  - Fixture exports: `FIXTURE_ROUTE_SPECS`, `FIXTURE_POOL`, `FIXTURE_ROUTE_QUESTIONS`, `FIXTURE_WORLDS`.

- [ ] **Step 1: Create the fixture campaign**

`src/features/modes/campaign/__fixtures__/routedCampaign.ts`:

```ts
import type { CampaignRouteSpec } from '@/data';
import type { Question } from '@/domain';

import { buildCampaign } from '../campaignMap';

function question(
  id: string,
  year: number,
  tags: readonly string[] = [],
  difficulty: Question['difficulty'] = 'easy',
): Question {
  return {
    id,
    categoryId: 'events',
    title: id,
    subtitle: '',
    year,
    difficulty,
    country: '',
    region: '',
    latitude: 0,
    longitude: 0,
    shortDescription: '',
    longDescription: '',
    tags: [...tags],
    verified: true,
    featured: false,
  };
}

const range = (n: number) => Array.from({ length: n }, (_, i) => i);

export const FIXTURE_ROUTE_SPECS: readonly CampaignRouteSpec[] = [
  { id: 'north', eraId: 'ancient', name: 'North Road', icon: 'N' },
  { id: 'south', eraId: 'ancient', name: 'South Road', icon: 'S' },
  { id: 'east', eraId: 'medieval', name: 'East Road', icon: 'E' },
  // No questions: omitted from the built world.
  { id: 'west', eraId: 'medieval', name: 'West Road', icon: 'W' },
];

/** Ancient: 30 questions → 6 stages (fork after s2). Medieval: 10 → 2 stages (fork after s1). */
export const FIXTURE_POOL: readonly Question[] = [
  ...range(30).map((i) => question(`anc-${i}`, -500 + i)),
  ...range(10).map((i) => question(`med-${i}`, 600 + i)),
];

/** north: n-0..n-4 are hard, so they sort into stage 3; south and east are all easy. */
export const FIXTURE_ROUTE_QUESTIONS: readonly Question[] = [
  ...range(15).map((i) => question(`n-${i}`, -400 + i, ['north'], i < 5 ? 'hard' : 'easy')),
  ...range(15).map((i) => question(`s-${i}`, -300 + i, ['south'])),
  ...range(5).map((i) => question(`e-${i}`, 700 + i, ['east'])),
];

export const FIXTURE_WORLDS = buildCampaign(FIXTURE_POOL, FIXTURE_ROUTE_QUESTIONS, FIXTURE_ROUTE_SPECS);
```

- [ ] **Step 2: Write the failing tests**

Append to `src/features/modes/campaign/campaignMap.test.ts` (add `allStagesIncludingRoutes, buildCampaign, forkAfterIndex, getRoute, getStage, worldStages` to the existing `./campaignMap` import and add the fixture import):

```ts
import {
  FIXTURE_POOL,
  FIXTURE_ROUTE_QUESTIONS,
  FIXTURE_ROUTE_SPECS,
  FIXTURE_WORLDS,
} from './__fixtures__/routedCampaign';

describe('routes data model', () => {
  const [ancient, medieval] = FIXTURE_WORLDS;

  it('forks a third of the way along each era, rounding up', () => {
    expect([6, 9, 12, 12, 24].map(forkAfterIndex)).toEqual([2, 3, 4, 4, 8]);
    expect(forkAfterIndex(1)).toBe(1);
  });

  it('builds each route after the fork stage with positional route stage ids', () => {
    expect(ancient!.routes.map((r) => [r.id, r.afterStageId, r.stages.map((s) => s.id)])).toEqual([
      ['north', 'ancient-s2', ['ancient-north-s1', 'ancient-north-s2', 'ancient-north-s3']],
      ['south', 'ancient-s2', ['ancient-south-s1', 'ancient-south-s2', 'ancient-south-s3']],
    ]);
    expect(medieval!.routes.map((r) => [r.id, r.afterStageId, r.stages.length])).toEqual([
      ['east', 'medieval-s1', 1],
    ]);
  });

  it('orders route questions easy→hard, then by year, five per stage', () => {
    const north = ancient!.routes[0]!;
    expect(north.stages.map((s) => s.questionIds)).toEqual([
      ['n-5', 'n-6', 'n-7', 'n-8', 'n-9'],
      ['n-10', 'n-11', 'n-12', 'n-13', 'n-14'],
      ['n-0', 'n-1', 'n-2', 'n-3', 'n-4'],
    ]);
  });

  it('labels route stages with era, route and number', () => {
    const stage = ancient!.routes[1]!.stages[2]!;
    expect(stage).toMatchObject({
      worldId: 'ancient',
      routeId: 'south',
      index: 3,
      title: 'The Ancient World · South Road · Stage 3',
    });
  });

  it('never changes the main path when routes are added', () => {
    const without = buildCampaign(FIXTURE_POOL, [], FIXTURE_ROUTE_SPECS);
    expect(without.every((w) => w.routes.length === 0)).toBe(true);
    expect(allStages(FIXTURE_WORLDS)).toEqual(allStages(without));
    expect(buildCampaign(FIXTURE_POOL, FIXTURE_ROUTE_QUESTIONS, FIXTURE_ROUTE_SPECS)).toEqual(FIXTURE_WORLDS);
  });

  it('lists stages in play order: main to the fork, route A, route B, then on', () => {
    expect(worldStages(ancient!).map((s) => s.id)).toEqual([
      'ancient-s1', 'ancient-s2',
      'ancient-north-s1', 'ancient-north-s2', 'ancient-north-s3',
      'ancient-south-s1', 'ancient-south-s2', 'ancient-south-s3',
      'ancient-s3', 'ancient-s4', 'ancient-s5', 'ancient-s6',
    ]);
    expect(allStagesIncludingRoutes(FIXTURE_WORLDS)).toHaveLength(12 + 3);
    expect(allStages(FIXTURE_WORLDS)).toHaveLength(8);
  });

  it('finds route stages and their route', () => {
    const stage = getStage('medieval', 'medieval-east-s1', FIXTURE_WORLDS);
    expect(stage?.routeId).toBe('east');
    expect(getRoute(stage!, FIXTURE_WORLDS)?.name).toBe('East Road');
    expect(getRoute(getStage('ancient', 'ancient-s1', FIXTURE_WORLDS)!, FIXTURE_WORLDS)).toBeUndefined();
    expect(getStage('ancient', 'medieval-east-s1', FIXTURE_WORLDS)).toBeUndefined();
  });
});
```

Also append to `src/data/campaignRoutes.test.ts` (import `CAMPAIGN` from `@/features/modes/campaign/campaignMap` at the top), inside `describe('campaign route questions', …)` right after the existing `for (const eraId of COMPLETE_ERAS)` loop:

```ts
  const FORK_AFTER: Record<string, string> = {
    ancient: 'ancient-s2',
    medieval: 'medieval-s3',
    'early-modern': 'early-modern-s4',
    nineteenth: 'nineteenth-s4',
    modern: 'modern-s8',
  };

  for (const eraId of COMPLETE_ERAS) {
    it(`forks ${eraId} after ${FORK_AFTER[eraId]} into two routes of three five-question stages`, () => {
      const world = CAMPAIGN.find((w) => w.id === eraId)!;
      expect(world.routes.map((r) => r.id)).toEqual(
        CAMPAIGN_ROUTE_SPECS.filter((s) => s.eraId === eraId).map((s) => s.id),
      );
      for (const route of world.routes) {
        expect(route.afterStageId).toBe(FORK_AFTER[eraId]);
        expect(route.stages.map((s) => s.id)).toEqual([1, 2, 3].map((n) => `${eraId}-${route.id}-s${n}`));
        for (const stage of route.stages) expect(stage.questionIds).toHaveLength(5);
      }
    });
  }
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npx jest src/features/modes/campaign/campaignMap.test.ts`
Expected: FAIL — `buildCampaign`/`forkAfterIndex`/`worldStages` are not exported (TypeError: … is not a function).

- [ ] **Step 4: Implement the data model**

In `src/features/modes/campaign/campaignMap.ts` replace the imports, the three interfaces, and everything from `function chunk` through `export function allStages()` with the code below. Keep `ERAS`, `eraOf`, `difficultyRank`, `chunk` bodies as they are; keep everything from `/** Star rating (1–3)…` down unchanged in this task.

```ts
import {
  CAMPAIGN_ROUTE_SPECS,
  getQuestions,
  isCampaignRouteQuestion,
  isInRotation,
  type CampaignRouteSpec,
} from '@/data';
import { DIFFICULTY_ORDER, type Question, type RoundResult } from '@/domain';

import type { CampaignProgress } from '../persistence';

export const STAGE_SIZE = 5;

export interface CampaignStage {
  id: string;
  worldId: string;
  /** 1-based position within the world's main path, or within its route. */
  index: number;
  title: string;
  questionIds: readonly string[];
  /** Set on route stages only: the route they belong to. */
  routeId?: string;
}

/**
 * A themed side path: it forks off the main path after `afterStageId` and
 * rejoins at the next main stage. Finishing either route of a fork opens the
 * rejoin stage; the other route stays open to play later.
 */
export interface CampaignRoute {
  id: string;
  worldId: string;
  name: string;
  icon: string;
  /** The main stage this route forks after. */
  afterStageId: string;
  stages: readonly CampaignStage[];
}

export interface CampaignWorld {
  id: string;
  name: string;
  colour: string;
  icon: string;
  /** Display label for the era's year span, e.g. "1500 – 1800". */
  period: string;
  /** 1-based position in the campaign. */
  index: number;
  /** The main path, in play order. */
  stages: readonly CampaignStage[];
  /** The era's fork: its themed routes, in play order (empty until they have questions). */
  routes: readonly CampaignRoute[];
}

// … ERAS, eraOf, difficultyRank, chunk: unchanged …

function byDifficultyThenYear(a: Question, b: Question): number {
  const byDifficulty = difficultyRank(a.difficulty) - difficultyRank(b.difficulty);
  return byDifficulty !== 0 ? byDifficulty : a.year - b.year;
}

/** The 1-based main stage an era forks after: a third of the way along, rounded up. */
export function forkAfterIndex(mainStageCount: number): number {
  return Math.ceil(mainStageCount / 3);
}

/**
 * The campaign is one world per time period, played in chronological order.
 * Within an era the in-rotation questions are ordered easy→hard (then by year)
 * and split into fixed stages — the main path, whose positional ids players'
 * progress is keyed by, so `pool` must only ever be the rotation. A third of
 * the way along, each era forks into its themed routes, built the same way
 * from the route questions tagged with the route's id. Routes without
 * questions are left out. Every category takes part, premium ones included
 * (user decision 2026-09-03). Pure, so tests can build fixture campaigns.
 */
export function buildCampaign(
  pool: readonly Question[],
  routeQuestions: readonly Question[],
  routeSpecs: readonly CampaignRouteSpec[],
): readonly CampaignWorld[] {
  return ERAS.map((era, worldIndex) => {
    const ordered = pool.filter((q) => eraOf(q).id === era.id).sort(byDifficultyThenYear);

    const stages: CampaignStage[] = chunk(ordered, STAGE_SIZE).map((group, stageIndex) => ({
      id: `${era.id}-s${stageIndex + 1}`,
      worldId: era.id,
      index: stageIndex + 1,
      title: `${era.name} · Stage ${stageIndex + 1}`,
      questionIds: group.map((q) => q.id),
    }));

    const fork = stages[forkAfterIndex(stages.length) - 1];
    const routes: CampaignRoute[] =
      fork === undefined
        ? []
        : routeSpecs
            .filter((spec) => spec.eraId === era.id)
            .map((spec) => {
              const own = routeQuestions
                .filter((q) => q.tags.includes(spec.id))
                .sort(byDifficultyThenYear);
              return {
                id: spec.id,
                worldId: era.id,
                name: spec.name,
                icon: spec.icon,
                afterStageId: fork.id,
                stages: chunk(own, STAGE_SIZE).map((group, i) => ({
                  id: `${era.id}-${spec.id}-s${i + 1}`,
                  worldId: era.id,
                  index: i + 1,
                  title: `${era.name} · ${spec.name} · Stage ${i + 1}`,
                  questionIds: group.map((q) => q.id),
                  routeId: spec.id,
                })),
              };
            })
            .filter((route) => route.stages.length > 0);

    return {
      id: era.id,
      name: era.name,
      colour: era.colour,
      icon: era.icon,
      period: era.period,
      index: worldIndex + 1,
      stages,
      routes,
    };
  }).filter((world) => world.stages.length > 0);
}

/** Built once from the bundled seed. */
export const CAMPAIGN: readonly CampaignWorld[] = buildCampaign(
  getQuestions().filter(isInRotation),
  getQuestions().filter(isCampaignRouteQuestion),
  CAMPAIGN_ROUTE_SPECS,
);

export function getWorld(
  worldId: string,
  worlds: readonly CampaignWorld[] = CAMPAIGN,
): CampaignWorld | undefined {
  return worlds.find((w) => w.id === worldId);
}

/** Every stage of an era in play order: main path to the fork, each route, then the rest. */
export function worldStages(world: CampaignWorld): readonly CampaignStage[] {
  return world.stages.flatMap((stage) => [
    stage,
    ...world.routes.filter((r) => r.afterStageId === stage.id).flatMap((r) => r.stages),
  ]);
}

export function getStage(
  worldId: string,
  stageId: string,
  worlds: readonly CampaignWorld[] = CAMPAIGN,
): CampaignStage | undefined {
  const world = getWorld(worldId, worlds);
  return world === undefined ? undefined : worldStages(world).find((s) => s.id === stageId);
}

/** The route a stage belongs to; undefined for main-path stages. */
export function getRoute(
  stage: CampaignStage,
  worlds: readonly CampaignWorld[] = CAMPAIGN,
): CampaignRoute | undefined {
  if (stage.routeId === undefined) return undefined;
  return getWorld(stage.worldId, worlds)?.routes.find((r) => r.id === stage.routeId);
}

/** The main path: a flat, ordered list of every main stage across every world. */
export function allStages(worlds: readonly CampaignWorld[] = CAMPAIGN): readonly CampaignStage[] {
  return worlds.flatMap((w) => w.stages);
}

/** Every stage, route stages included, in play order. */
export function allStagesIncludingRoutes(
  worlds: readonly CampaignWorld[] = CAMPAIGN,
): readonly CampaignStage[] {
  return worlds.flatMap(worldStages);
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx jest src/features/modes/campaign src/data/campaignRoutes.test.ts src/data/regionalExpansion.test.ts`
Expected: PASS, including `campaignMainPath.test.ts` (main path unchanged).

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 6: Lint and commit**

Run: `npx eslint src/features/modes/campaign/campaignMap.ts src/features/modes/campaign/campaignMap.test.ts src/features/modes/campaign/__fixtures__/routedCampaign.ts src/data/campaignRoutes.test.ts`
Expected: no errors.

```bash
git add src/features/modes/campaign src/data/campaignRoutes.test.ts
git commit -m "feat(campaign): route forks data model built beside an unchanged main path

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Unlocking, next stage, status, frontier and totals

**Files:**
- Modify: `src/features/modes/campaign/campaignMap.ts` (everything from `/** A stage is playable if…` / `isStageUnlocked` to end of file)
- Modify: `src/features/modes/campaign/questCta.ts`
- Modify: `src/features/modes/campaign/CampaignMapScreen.tsx` (`starsIn`, `frontierOf`, totals, `tryScroll` lookup)
- Test: `src/features/modes/campaign/campaignMap.test.ts`, `questCta.test.ts`, `CampaignMapScreen.test.tsx`

**Interfaces:**
- Consumes: Task 3 exports and fixtures.
- Produces:
  - `isStageUnlocked(stageId: string, progress: CampaignProgress, worlds = CAMPAIGN): boolean` (rules 1–5 of the spec)
  - `isWorldPremium(worldId, worlds = CAMPAIGN)`, `isStagePremium(stage, worlds = CAMPAIGN)`
  - `type NextStep = { kind: 'stage'; stage: CampaignStage } | { kind: 'fork'; forkStageId: string } | { kind: 'end' }`; `nextStage(stageId, worlds = CAMPAIGN): NextStep`
  - `rejoinStageOf(route: CampaignRoute, worlds = CAMPAIGN): CampaignStage | undefined`
  - `eraStatus(world, progress): EraStatus` (routes counted; complete = main + one route; mastered = all at 3★)
  - `starsEarned(stages: readonly CampaignStage[], progress): number`
  - `frontierStage(progress, worlds = CAMPAIGN): CampaignStage | undefined`
  - `pulseStageIds(progress, worlds = CAMPAIGN): ReadonlySet<string>`
  - `progressSince(before, after, worlds = CAMPAIGN): ProgressDelta` (route stages included, play order)
  - `QuestAction` `map` variant becomes `{ kind: 'map'; focusStageId?: string }`; `questCta(stage, isPremium, worlds = CAMPAIGN)`.

- [ ] **Step 1: Write the failing logic tests**

In `src/features/modes/campaign/campaignMap.test.ts`: add `frontierStage, pulseStageIds, rejoinStageOf, starsEarned` to the `./campaignMap` import; DELETE the existing `describe('nextStage' …)`, `describe('eraStatus' …)` and `describe('progressSince' …)` blocks and append:

```ts
function starred(ids: readonly string[], stars = 1): CampaignProgress {
  return Object.fromEntries(ids.map((id) => [id, { stars, bestScore: 100 }]));
}

const W = FIXTURE_WORLDS;
const north = ['ancient-north-s1', 'ancient-north-s2', 'ancient-north-s3'];
const south = ['ancient-south-s1', 'ancient-south-s2', 'ancient-south-s3'];
const ancientMain = ['ancient-s1', 'ancient-s2', 'ancient-s3', 'ancient-s4', 'ancient-s5', 'ancient-s6'];

describe('route unlocking', () => {
  it('opens both routes once the fork stage has a star, and keeps the rejoin shut', () => {
    const atFork = starred(['ancient-s1', 'ancient-s2']);
    expect(isStageUnlocked('ancient-north-s1', {}, W)).toBe(false);
    expect(isStageUnlocked('ancient-north-s1', atFork, W)).toBe(true);
    expect(isStageUnlocked('ancient-south-s1', atFork, W)).toBe(true);
    expect(isStageUnlocked('ancient-north-s2', atFork, W)).toBe(false);
    expect(isStageUnlocked('ancient-s3', atFork, W)).toBe(false);
  });

  it('walks a route one starred stage at a time', () => {
    const p = starred(['ancient-s1', 'ancient-s2', 'ancient-north-s1']);
    expect(isStageUnlocked('ancient-north-s2', p, W)).toBe(true);
    expect(isStageUnlocked('ancient-north-s3', p, W)).toBe(false);
  });

  it('rejoins the main path after the last stage of either route', () => {
    expect(isStageUnlocked('ancient-s3', starred(['ancient-s1', 'ancient-s2', ...north]), W)).toBe(true);
    expect(isStageUnlocked('ancient-s3', starred(['ancient-s1', 'ancient-s2', ...south]), W)).toBe(true);
    expect(isStageUnlocked('ancient-s3', starred(['ancient-s1', 'ancient-s2', ...north.slice(0, 2)]), W)).toBe(false);
    // A one-stage route: its only stage is its last.
    expect(isStageUnlocked('medieval-s2', starred(['medieval-s1', 'medieval-east-s1']), W)).toBe(true);
  });

  it('keeps every stage a legacy player already starred, past the fork included', () => {
    const legacy = starred(ancientMain);
    for (const id of ancientMain) expect(isStageUnlocked(id, legacy, W)).toBe(true);
    expect(isStageUnlocked('medieval-s1', legacy, W)).toBe(true);
    expect(isStageUnlocked('ancient-north-s1', legacy, W)).toBe(true);
    // Rule 1 on its own: a starred stage is open even if its predecessor is not.
    expect(isStageUnlocked('ancient-s5', starred(['ancient-s5']), W)).toBe(true);
  });

  it('keeps the real campaign fully unlocked for a player with stars everywhere', () => {
    const all = starred(allStagesIncludingRoutes().map((s) => s.id));
    for (const s of allStagesIncludingRoutes()) expect(isStageUnlocked(s.id, all)).toBe(true);
  });

  it('prices route stages like their era', () => {
    expect(isStagePremium(getStage('ancient', 'ancient-north-s1', W)!, W)).toBe(false);
    expect(isStagePremium(getStage('medieval', 'medieval-east-s1', W)!, W)).toBe(true);
  });
});

describe('nextStage', () => {
  it('walks the main path across eras and ends after the last stage', () => {
    const stages = allStages();
    expect(nextStage(stages[0]!.id)).toEqual({ kind: 'stage', stage: stages[1] });
    const lastAncient = CAMPAIGN[0]!.stages.at(-1)!;
    expect(nextStage(lastAncient.id)).toEqual({ kind: 'stage', stage: CAMPAIGN[1]!.stages[0] });
    expect(nextStage(stages.at(-1)!.id)).toEqual({ kind: 'end' });
    expect(nextStage('nope')).toEqual({ kind: 'end' });
  });

  it('stops at a fork, walks a route, and rejoins after its last stage', () => {
    const at = (id: string) => nextStage(id, W);
    expect(at('ancient-s1')).toEqual({ kind: 'stage', stage: getStage('ancient', 'ancient-s2', W) });
    expect(at('ancient-s2')).toEqual({ kind: 'fork', forkStageId: 'ancient-s2' });
    expect(at('ancient-north-s1')).toEqual({ kind: 'stage', stage: getStage('ancient', 'ancient-north-s2', W) });
    expect(at('ancient-north-s3')).toEqual({ kind: 'stage', stage: getStage('ancient', 'ancient-s3', W) });
    expect(at('ancient-south-s3')).toEqual({ kind: 'stage', stage: getStage('ancient', 'ancient-s3', W) });
    expect(at('ancient-s6')).toEqual({ kind: 'stage', stage: getStage('medieval', 'medieval-s1', W) });
    expect(at('medieval-s1')).toEqual({ kind: 'fork', forkStageId: 'medieval-s1' });
    expect(at('medieval-east-s1')).toEqual({ kind: 'stage', stage: getStage('medieval', 'medieval-s2', W) });
    expect(at('medieval-s2')).toEqual({ kind: 'end' });
    expect(rejoinStageOf(W[0]!.routes[0]!, W)?.id).toBe('ancient-s3');
  });
});

describe('eraStatus', () => {
  const ancient = W[0]!;

  it('counts route stages in the tally', () => {
    expect(eraStatus(ancient, starred(['ancient-s1'], 2))).toEqual({
      cleared: 1,
      total: 12,
      complete: false,
      mastered: false,
    });
  });

  it('is complete with the main path and one whole route', () => {
    expect(eraStatus(ancient, starred(ancientMain, 2)).complete).toBe(false);
    expect(eraStatus(ancient, starred([...ancientMain, ...north.slice(0, 2)], 2)).complete).toBe(false);
    expect(eraStatus(ancient, starred([...ancientMain, ...south], 2))).toMatchObject({
      cleared: 9,
      complete: true,
      mastered: false,
    });
  });

  it('is mastered only at three stars on every stage of both routes', () => {
    expect(eraStatus(ancient, starred([...ancientMain, ...north], 3)).mastered).toBe(false);
    expect(eraStatus(ancient, starred([...ancientMain, ...north, ...south], 3))).toMatchObject({
      complete: true,
      mastered: true,
    });
  });

  it('keeps the old rule for an era without routes', () => {
    const [plain] = buildCampaign(FIXTURE_POOL, [], FIXTURE_ROUTE_SPECS);
    expect(eraStatus(plain!, starred(ancientMain, 3))).toMatchObject({ complete: true, mastered: true });
  });

  it('sums stars over any stages', () => {
    expect(starsEarned(worldStages(ancient), { 'ancient-s1': { stars: 2, bestScore: 1 }, 'ancient-north-s1': { stars: 3, bestScore: 1 } })).toBe(5);
  });
});

describe('frontierStage', () => {
  const at = (ids: readonly string[]) => frontierStage(starred(ids), W)?.id;

  it('starts at the first stage and leads into route A at a fresh fork', () => {
    expect(at([])).toBe('ancient-s1');
    expect(at(['ancient-s1', 'ancient-s2'])).toBe('ancient-north-s1');
    expect([...pulseStageIds(starred(['ancient-s1', 'ancient-s2']), W)]).toEqual([
      'ancient-north-s1',
      'ancient-south-s1',
    ]);
  });

  it('follows the route the player chose', () => {
    expect(at(['ancient-s1', 'ancient-s2', 'ancient-south-s1'])).toBe('ancient-south-s2');
    expect([...pulseStageIds(starred(['ancient-s1', 'ancient-s2', 'ancient-south-s1']), W)]).toEqual([
      'ancient-south-s2',
    ]);
  });

  it('moves on to the rejoin once a route is finished, leaving the other open', () => {
    const p = ['ancient-s1', 'ancient-s2', ...north];
    expect(at(p)).toBe('ancient-s3');
    expect(isStageUnlocked('ancient-south-s1', starred(p), W)).toBe(true);
  });

  it('never drags a legacy player back to a fork they are already past', () => {
    expect(at(ancientMain)).toBe('medieval-s1');
    expect(at(['ancient-s1', 'ancient-s2', 'ancient-s3'])).toBe('ancient-s4');
  });

  it('is undefined once everything is starred', () => {
    expect(at(allStagesIncludingRoutes(W).map((s) => s.id))).toBeUndefined();
    expect(pulseStageIds(starred(allStagesIncludingRoutes(W).map((s) => s.id)), W).size).toBe(0);
  });
});

describe('progressSince', () => {
  it('reports stages cleared and unlocked, route stages included, in play order', () => {
    const before = starred(['ancient-s1']);
    const after = starred(['ancient-s1', 'ancient-s2']);
    expect(progressSince(before, after, W)).toEqual({
      cleared: ['ancient-s2'],
      unlocked: ['ancient-north-s1', 'ancient-south-s1'],
    });
    expect(progressSince(starred(['ancient-s1', 'ancient-s2', ...north.slice(0, 2)]), starred(['ancient-s1', 'ancient-s2', ...north]), W)).toEqual({
      cleared: ['ancient-north-s3'],
      unlocked: ['ancient-s3'],
    });
  });

  it('ignores star upgrades on stages that were already cleared', () => {
    expect(progressSince(starred(['ancient-s1']), starred(['ancient-s1'], 3), W)).toEqual({
      cleared: [],
      unlocked: [],
    });
  });
});
```

Replace `src/features/modes/campaign/questCta.test.ts` with:

```ts
import { FIXTURE_WORLDS } from './__fixtures__/routedCampaign';
import { allStages, CAMPAIGN, getStage } from './campaignMap';
import { questCta } from './questCta';

describe('questCta', () => {
  const ancient = CAMPAIGN[0]!;
  const lastAncient = ancient.stages.at(-1)!;

  it('continues straight into the next stage within the free era', () => {
    const cta = questCta(ancient.stages[0]!, false);
    expect(cta.label).toBe('Continue your quest →');
    expect(cta.action).toEqual({ kind: 'stage', stage: ancient.stages[1] });
  });

  it('sends a free player to the paywall when the next stage is premium', () => {
    expect(questCta(lastAncient, false)).toEqual({
      label: 'Continue your quest →',
      action: { kind: 'paywall' },
    });
  });

  it('lets a Premium player carry on into the Middle Ages', () => {
    expect(questCta(lastAncient, true).action).toEqual({
      kind: 'stage',
      stage: CAMPAIGN[1]!.stages[0],
    });
  });

  it('goes back to the map after the very last stage', () => {
    expect(questCta(allStages().at(-1)!, true)).toEqual({
      label: 'Back to map',
      action: { kind: 'map' },
    });
  });

  it('opens the map at a fork instead of picking a route', () => {
    const fork = getStage('ancient', 'ancient-s2', FIXTURE_WORLDS)!;
    expect(questCta(fork, false, FIXTURE_WORLDS)).toEqual({
      label: 'Continue your quest →',
      action: { kind: 'map', focusStageId: 'ancient-s2' },
    });
    // Even in a premium era: choosing happens on the map.
    const premiumFork = getStage('medieval', 'medieval-s1', FIXTURE_WORLDS)!;
    expect(questCta(premiumFork, false, FIXTURE_WORLDS).action).toEqual({
      kind: 'map',
      focusStageId: 'medieval-s1',
    });
  });

  it('carries on through a route and back onto the main path', () => {
    const w = FIXTURE_WORLDS;
    expect(questCta(getStage('ancient', 'ancient-south-s1', w)!, false, w).action).toEqual({
      kind: 'stage',
      stage: getStage('ancient', 'ancient-south-s2', w),
    });
    expect(questCta(getStage('ancient', 'ancient-south-s3', w)!, false, w).action).toEqual({
      kind: 'stage',
      stage: getStage('ancient', 'ancient-s3', w),
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest src/features/modes/campaign/campaignMap.test.ts src/features/modes/campaign/questCta.test.ts`
Expected: FAIL — `frontierStage is not a function`, `nextStage` returns a stage/null instead of `{ kind }`, fixture unlock assertions fail.

- [ ] **Step 3: Implement the logic**

In `campaignMap.ts`, keep `starsForResults` and `FREE_ERA_COUNT` and replace everything else from the `isStageUnlocked` doc comment to the end of the file with:

```ts
function starsOf(progress: CampaignProgress, stageId: string): number {
  return progress[stageId]?.stars ?? 0;
}

function isCleared(progress: CampaignProgress, stageId: string): boolean {
  return starsOf(progress, stageId) >= 1;
}

/** Where a stage sits: its world and, for a route stage, its route. */
function locate(
  stageId: string,
  worlds: readonly CampaignWorld[],
): { world: CampaignWorld; stage: CampaignStage; route?: CampaignRoute } | undefined {
  for (const world of worlds) {
    const main = world.stages.find((s) => s.id === stageId);
    if (main) return { world, stage: main };
    for (const route of world.routes) {
      const stage = route.stages.find((s) => s.id === stageId);
      if (stage) return { world, stage, route };
    }
  }
  return undefined;
}

/** The main stage after `stageId` on the main path, crossing eras. */
function nextMainStage(stageId: string, worlds: readonly CampaignWorld[]): CampaignStage | undefined {
  const main = allStages(worlds);
  const i = main.findIndex((s) => s.id === stageId);
  return i < 0 ? undefined : main[i + 1];
}

/** Routes that fork after `stageId`. */
function routesAfter(stageId: string, worlds: readonly CampaignWorld[]): CampaignRoute[] {
  return worlds.flatMap((w) => w.routes.filter((r) => r.afterStageId === stageId));
}

/** Where a route rejoins the main path: the main stage right after its fork. */
export function rejoinStageOf(
  route: CampaignRoute,
  worlds: readonly CampaignWorld[] = CAMPAIGN,
): CampaignStage | undefined {
  return nextMainStage(route.afterStageId, worlds);
}

/**
 * Whether a stage is playable:
 *  1. it already has a star (protects every existing player, even past a fork);
 *  2. it is the very first stage;
 *  3. route stage 1 once its fork stage has a star; later route stages once the
 *     previous route stage has one;
 *  4. the main stage right after a fork once the last stage of EITHER route has one;
 *  5. any other main stage once the previous main stage has one.
 * This also gates later eras behind earlier ones. Unknown ids are locked.
 */
export function isStageUnlocked(
  stageId: string,
  progress: CampaignProgress,
  worlds: readonly CampaignWorld[] = CAMPAIGN,
): boolean {
  const found = locate(stageId, worlds);
  if (found === undefined) return false;
  if (isCleared(progress, stageId)) return true;
  if (found.route !== undefined) {
    const i = found.stage.index - 1;
    const previousId = i === 0 ? found.route.afterStageId : found.route.stages[i - 1]!.id;
    return isCleared(progress, previousId);
  }
  const main = allStages(worlds);
  const index = main.findIndex((s) => s.id === stageId);
  if (index === 0) return true;
  const previous = main[index - 1]!;
  const fork = routesAfter(previous.id, worlds);
  if (fork.length > 0) {
    return fork.some((route) => isCleared(progress, route.stages.at(-1)!.id));
  }
  return isCleared(progress, previous.id);
}

/** Every era after the free ones (the Middle Ages onward) needs Premium. */
export function isWorldPremium(worldId: string, worlds: readonly CampaignWorld[] = CAMPAIGN): boolean {
  const world = getWorld(worldId, worlds);
  return world !== undefined && world.index > FREE_ERA_COUNT;
}

/** Route stages are priced like their era. */
export function isStagePremium(
  stage: CampaignStage,
  worlds: readonly CampaignWorld[] = CAMPAIGN,
): boolean {
  return isWorldPremium(stage.worldId, worlds);
}

/** What follows a stage: another stage, a fork for the player to choose at, or the end. */
export type NextStep =
  | { kind: 'stage'; stage: CampaignStage }
  | { kind: 'fork'; forkStageId: string }
  | { kind: 'end' };

/**
 * The step after `stageId`: within a route the next route stage, after a
 * route's last stage its rejoin stage, at a fork stage the fork itself (the
 * player picks a route on the map), otherwise the next main stage.
 */
export function nextStage(stageId: string, worlds: readonly CampaignWorld[] = CAMPAIGN): NextStep {
  const found = locate(stageId, worlds);
  if (found === undefined) return { kind: 'end' };
  if (found.route !== undefined) {
    const following = found.route.stages[found.stage.index];
    if (following !== undefined) return { kind: 'stage', stage: following };
    const rejoin = rejoinStageOf(found.route, worlds);
    return rejoin === undefined ? { kind: 'end' } : { kind: 'stage', stage: rejoin };
  }
  if (routesAfter(stageId, worlds).length > 0) return { kind: 'fork', forkStageId: stageId };
  const next = nextMainStage(stageId, worlds);
  return next === undefined ? { kind: 'end' } : { kind: 'stage', stage: next };
}

export interface EraStatus {
  /** Stages with at least one star, route stages included. */
  cleared: number;
  /** Every stage of the era, route stages included. */
  total: number;
  /** Every main stage and every stage of at least one route cleared. */
  complete: boolean;
  /** Every stage (main and both routes) at three stars. */
  mastered: boolean;
}

export function eraStatus(world: CampaignWorld, progress: CampaignProgress): EraStatus {
  const all = worldStages(world);
  const cleared = all.filter((s) => isCleared(progress, s.id)).length;
  const total = all.length;
  const mainDone = world.stages.every((s) => isCleared(progress, s.id));
  const routeDone =
    world.routes.length === 0 ||
    world.routes.some((r) => r.stages.every((s) => isCleared(progress, s.id)));
  return {
    cleared,
    total,
    complete: total > 0 && mainDone && routeDone,
    mastered: total > 0 && all.every((s) => starsOf(progress, s.id) >= 3),
  };
}

/** Stars earned across some stages. */
export function starsEarned(stages: readonly CampaignStage[], progress: CampaignProgress): number {
  return stages.reduce((n, s) => n + starsOf(progress, s.id), 0);
}

/**
 * Route stages the frontier passes over: every route of a settled fork (one
 * route finished, or the player already past the rejoin stage — e.g. from
 * before forks existed), and the unchosen route once the player has starred a
 * stage of the other.
 */
function passedRouteStageIds(
  progress: CampaignProgress,
  worlds: readonly CampaignWorld[],
): ReadonlySet<string> {
  const skip = new Set<string>();
  for (const world of worlds) {
    const [first] = world.routes;
    if (first === undefined) continue;
    const rejoin = rejoinStageOf(first, worlds);
    const settled =
      world.routes.some((r) => r.stages.every((s) => isCleared(progress, s.id))) ||
      (rejoin !== undefined && isCleared(progress, rejoin.id));
    const chosen = world.routes.find((r) => r.stages.some((s) => isCleared(progress, s.id)));
    for (const route of world.routes) {
      if (settled || (chosen !== undefined && route !== chosen)) {
        for (const s of route.stages) skip.add(s.id);
      }
    }
  }
  return skip;
}

/** The next stage to play: the first unlocked, unstarred stage in play order the frontier hasn't passed. */
export function frontierStage(
  progress: CampaignProgress,
  worlds: readonly CampaignWorld[] = CAMPAIGN,
): CampaignStage | undefined {
  const passed = passedRouteStageIds(progress, worlds);
  return allStagesIncludingRoutes(worlds).find(
    (s) => !passed.has(s.id) && !isCleared(progress, s.id) && isStageUnlocked(s.id, progress, worlds),
  );
}

/** Stages wearing the frontier pulse: the frontier, plus the other route's opener at a fresh fork. */
export function pulseStageIds(
  progress: CampaignProgress,
  worlds: readonly CampaignWorld[] = CAMPAIGN,
): ReadonlySet<string> {
  const frontier = frontierStage(progress, worlds);
  const ids = new Set<string>();
  if (frontier === undefined) return ids;
  ids.add(frontier.id);
  if (frontier.routeId !== undefined && frontier.index === 1) {
    for (const route of getWorld(frontier.worldId, worlds)?.routes ?? []) {
      const opener = route.stages[0];
      if (opener !== undefined && !isCleared(progress, opener.id) && isStageUnlocked(opener.id, progress, worlds)) {
        ids.add(opener.id);
      }
    }
  }
  return ids;
}

export interface ProgressDelta {
  /** Stages that went from no stars to cleared, in play order. */
  cleared: string[];
  /** Stages that became playable, in play order. */
  unlocked: string[];
}

/** What changed on the map between two progress snapshots — drives the light-up sequence. */
export function progressSince(
  before: CampaignProgress,
  after: CampaignProgress,
  worlds: readonly CampaignWorld[] = CAMPAIGN,
): ProgressDelta {
  const cleared: string[] = [];
  const unlocked: string[] = [];
  for (const stage of allStagesIncludingRoutes(worlds)) {
    if (!isCleared(before, stage.id) && isCleared(after, stage.id)) cleared.push(stage.id);
    if (!isStageUnlocked(stage.id, before, worlds) && isStageUnlocked(stage.id, after, worlds)) {
      unlocked.push(stage.id);
    }
  }
  return { cleared, unlocked };
}
```

(`FREE_ERA_COUNT` stays exported above `isWorldPremium` with its existing comment.)

Replace `src/features/modes/campaign/questCta.ts` with:

```ts
import { CAMPAIGN, isStagePremium, nextStage, type CampaignStage, type CampaignWorld } from './campaignMap';

export type QuestAction =
  | { kind: 'stage'; stage: CampaignStage }
  | { kind: 'paywall' }
  /** Back to the map; at a fork `focusStageId` names the fork the player chooses a route at. */
  | { kind: 'map'; focusStageId?: string };

/**
 * The main button after clearing a stage: carry straight on to the next one,
 * or — when that stage is Premium and the player isn't — to the paywall. At a
 * fork the player picks a route on the map, so it returns there (the map's
 * frontier scroll lands on the fork). After the final stage there is nowhere
 * left to march, so back to the map.
 */
export function questCta(
  stage: CampaignStage,
  isPremium: boolean,
  worlds: readonly CampaignWorld[] = CAMPAIGN,
): { label: string; action: QuestAction } {
  const next = nextStage(stage.id, worlds);
  if (next.kind === 'end') return { label: 'Back to map', action: { kind: 'map' } };
  const label = 'Continue your quest →';
  if (next.kind === 'fork') return { label, action: { kind: 'map', focusStageId: next.forkStageId } };
  if (isStagePremium(next.stage, worlds) && !isPremium) return { label, action: { kind: 'paywall' } };
  return { label, action: { kind: 'stage', stage: next.stage } };
}
```

`CampaignStageScreen.tsx` needs no change: its `onQuest` already sends `map` to `router.back()`.

- [ ] **Step 4: Run logic tests**

Run: `npx jest src/features/modes/campaign/campaignMap.test.ts src/features/modes/campaign/questCta.test.ts src/features/modes/campaign/campaignMainPath.test.ts`
Expected: PASS.

- [ ] **Step 5: Make the map screen count route stars (tests first)**

In `src/features/modes/campaign/CampaignMapScreen.test.tsx`: change the import to `import { allStagesIncludingRoutes, CAMPAIGN, worldStages } from './campaignMap';`, add `const ancientAll = worldStages(ancient).map((s) => s.id);` under `const medieval = …`, then:
- `'crowns the Middle Ages onward…'`: seed `cleared(ancientAll)`.
- `'lets Premium players straight into the Middle Ages'`: seed `cleared(ancientAll)`.
- `'marks a fully three-starred era…'`: seed `cleared(ancientAll, 3)`; replace the `total` line and assertion with
  ```ts
  const total = allStagesIncludingRoutes().length;
  expect(screen.getByTestId('journey-stars', HIDDEN)).toHaveTextContent(
    `★ ${ancientAll.length * 3}/${total * 3}`,
  );
  ```
- `'opens on the first era…'`: expect `sticky-era-stars` to have text `` `★ 0/${ancientAll.length * 3}` ``.

These are no-ops today (no route questions yet) and keep the suite correct once content lands.

In `CampaignMapScreen.tsx`:
- imports from `./campaignMap`: add `allStagesIncludingRoutes`, `frontierStage`, `starsEarned`, `worldStages` (keep the `CampaignProgress` type import; `useState<CampaignProgress>` still uses it).
- delete the local `starsIn` and `frontierOf` functions; replace their uses:
  - `const frontierId = frontierOf(progress)?.id;` → `const frontierId = frontierStage(progress)?.id;`
  - in the focus effect `const next = frontierOf(p);` → `const next = frontierStage(p);`
  - in `tryScroll`: `const stage = allStages().find(…)` → `const stage = allStagesIncludingRoutes().find((s) => s.id === target.stageId);`
  - `EraBanner` props: `earned={starsEarned(worldStages(world), progress)}` and `total={worldStages(world).length * 3}`
  - `StickyEraBar` props: `earned={starsEarned(worldStages(viewWorld), progress)}`, `total={worldStages(viewWorld).length * 3}`, `journeyEarned={starsEarned(allStagesIncludingRoutes(), progress)}`, `journeyTotal={allStagesIncludingRoutes().length * 3}`
- keep `const stages = allStages();` and `orderOf` (trail phase stays main-path based).

- [ ] **Step 6: Run the campaign suites and types**

Run: `npx jest src/features/modes/campaign src/data`
Expected: PASS.

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 7: Lint and commit**

Run: `npx eslint src/features/modes/campaign`
Expected: no errors.

```bash
git add src/features/modes/campaign
git commit -m "feat(campaign): route unlocking, fork-aware next stage, frontier and star totals

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Content tasks (Tasks 5–9): shared rules

Each content task writes 30 questions for one era: 15 per route, **exactly 5 easy, 5 medium, 5 hard per route** (so stage 1 is easy, 2 medium, 3 hard). Every entry is a `Question`:

| Field | Rule |
|---|---|
| `id` | `rte-` + kebab-case slug of the event, unique |
| `categoryId` | one of `events`, `battles`, `people`, `technology`, `exploration`, `treaties`, `sport`, `trade`, `arts`, `philosophy`, `space` (never `regional`) |
| `title` | Title Case, catalogue-unique, no year digits |
| `subtitle` | one clause, no year digits |
| `year` | signed int, BCE negative, inside the era, `≠ 0`, `≥ -999` |
| `month`, `day` | only if Wikipedia states them firmly; `day` requires `month` |
| `difficulty` | `easy` / `medium` / `hard` |
| `country`, `region` | modern country; city/region |
| `latitude`, `longitude` | decimal, 2–4 dp |
| `shortDescription` | one sentence, no year digits |
| `longDescription` | 2–3 sentences of context and consequence |
| `source` | the English Wikipedia article URL used to verify the date |
| `tags` | `[<route id>, <era topic tag if any: 'ancient' / 'medieval' / '19th-century' / '20th-century'>, <lowercase country tag e.g. 'egypt','england','usa'>, …theme tags]` — exactly one route id; theme tags reuse existing ones (`military`, `politics`, `religion`, `revolution`, `invention`, `science`, `exploration`, `trade`, `economics`, `ww1`, `ww2`, `space`, `naval`, `architecture`, `literature`) |
| `verified` | `true` |
| `featured` | `false` |

Content policy: firm dates only — reject any event whose Wikipedia date is "c.", a range, or disputed between years. Prefer events players can place (well-known for `easy`, notable for `medium`, specialist for `hard`). No event already in the catalogue under another wording.

Per-era recipe (spelled out in each task): find existing coverage → draft 30 → WebFetch-verify each → add era to `COMPLETE_ERAS` → generate art → convert to WebP → inspect art → export catalogue → run tests → commit.

---

### Task 5: Content — The Ancient World routes (30 questions)

**Files:**
- Modify: `src/data/packs/campaignRoutes/ancient.ts`
- Modify: `src/data/campaignRoutes.test.ts` (`COMPLETE_ERAS`)
- Modify: `functions/src/social/catalogue.test.ts`
- Create: `assets/questions/rte-*.webp` (30)
- Regenerate: `src/data/questionImages.ts`, `functions/src/social/catalogue.json`

**Interfaces:**
- Consumes: `ANCIENT_ROUTE_QUESTIONS` export (Task 2), `buildCampaign` routing by tag (Task 3).
- Produces: routes `egypt-near-east` (Egypt, Mesopotamia, Assyria, Babylon, Persia, Levant, Phoenicia, Hittite/Anatolian, Nubia) and `greece-rome` (Greek city-states, Macedon, Hellenistic kingdoms, Roman Republic and Empire, including Western Rome's fall in 476), all years −999…500.

- [ ] **Step 1: List existing coverage to avoid duplicates**

Run: `grep -rhoE "title: '[^']+'" src/data/questions.ts src/data/packs | wc -l`
Expected: ~388 titles. For every candidate event, `grep -i "<keyword>" src/data/questions.ts src/data/packs -r` must return nothing that describes the same event (e.g. Marathon, Salamis, Cannae, Actium, Gaugamela, Caesar's assassination, the Rosetta Stone and Cyrus taking Babylon already exist).

- [ ] **Step 2: Draft the 30 questions**

Replace the array in `src/data/packs/campaignRoutes/ancient.ts` with 30 entries. These two worked examples are included verbatim (their dates were WebFetch-verified 2026-09-29):

```ts
  {
    id: 'rte-fall-of-nineveh',
    categoryId: 'battles',
    title: 'The Fall of Nineveh',
    subtitle: 'Babylonians and Medes storm the Assyrian capital',
    year: -612,
    difficulty: 'medium',
    country: 'Iraq',
    region: 'Mosul',
    latitude: 36.3594,
    longitude: 43.1528,
    shortDescription: 'An alliance of Babylonians and Medes besieged and sacked Nineveh, the greatest city of the Assyrian Empire.',
    longDescription:
      'After a siege of several months the attackers broke into Nineveh and destroyed it. The fall of its capital brought down the Neo-Assyrian Empire within a few years, leaving Babylon under Nabopolassar and his son Nebuchadnezzar as the new power of the Near East.',
    source: 'https://en.wikipedia.org/wiki/Battle_of_Nineveh_(612_BC)',
    tags: ['egypt-near-east', 'ancient', 'iraq', 'military'],
    verified: true,
    featured: false,
  },
  {
    id: 'rte-battle-of-pydna',
    categoryId: 'battles',
    title: 'The Battle of Pydna',
    subtitle: 'Roman legions break the Macedonian phalanx',
    year: -168,
    month: 6,
    day: 22,
    difficulty: 'hard',
    country: 'Greece',
    region: 'Pieria',
    latitude: 40.39,
    longitude: 22.6,
    shortDescription: 'A Roman army under Lucius Aemilius Paullus crushed King Perseus of Macedon near Pydna.',
    longDescription:
      'On broken ground the Macedonian phalanx lost its formation and the legions cut it apart. The defeat ended the Antigonid dynasty that had ruled Macedon since the successors of Alexander the Great, and within two decades Macedonia was a Roman province.',
    source: 'https://en.wikipedia.org/wiki/Battle_of_Pydna',
    tags: ['greece-rome', 'ancient', 'greece', 'rome', 'military'],
    verified: true,
    featured: false,
  },
```

Write 28 more following the field table: `egypt-near-east` total 15 (5 easy / 5 medium / 5 hard), `greece-rome` total 15 (5/5/5).

- [ ] **Step 3: Verify every date against Wikipedia**

For each of the 30 entries call WebFetch with `url` = the entry's `source` and `prompt` = `Quote the exact date (year, and month/day if stated) the article gives for <title>. Say if it is approximate, disputed or a range.` Then:
- year differs, or is approximate/disputed/range → replace the question (never "fix" by guessing);
- month/day not stated firmly → delete `month`/`day`;
- keep `source` pointing at the article you checked.
Record nothing else; `verified: true` means this step was done.

- [ ] **Step 4: Mark the era complete and watch the content tests fail on art only**

In `src/data/campaignRoutes.test.ts` set `const COMPLETE_ERAS: readonly string[] = ['ancient'];`

Run: `npx jest src/data/campaignRoutes.test.ts`
Expected: FAIL only in `illustrates every route question` (30 missing ids) — plus `regionalExpansion.test.ts`'s whole-catalogue illustration test if run. Any other failure (counts, era years, policy, titles) must be fixed in the data before continuing.

- [ ] **Step 5: Generate the art**

Run: `npx tsx --env-file=.env scripts/generateQuestionImages.ts --concurrency 6`
Expected: `Provider: nanobananaapi.ai (Nano Banana 2, 1K)`, 30 `generated rte-…` lines, `Done: 30 generated, 0 failed, 418 in require-map.`
If an item prints `FAILED` (safety filter), add a symbolic entry for its id to `EVENT_OVERRIDES` in `scripts/generateQuestionImages.ts` (describe setting/objects, no violence, no text) and rerun the same command (only missing images are rendered).

- [ ] **Step 6: Convert to WebP and inspect**

Run: `python scripts/optimizeImages.py`
Expected: 30 `assets/questions/rte-*.jpg` become `.webp`; `src/data/questionImages.ts` now requires `rte-*.webp`. Check: `ls assets/questions/rte-*.jpg 2>/dev/null | wc -l` → `0`; `ls assets/questions/rte-*.webp | wc -l` → `30`.

Open every new `.webp` with the Read tool. Any image with visible letters, digits, dates, signage or an obvious anachronism: `rm` it and rerun Steps 5–6 (add an `EVENT_OVERRIDES` entry if it repeats).

- [ ] **Step 7: Export the server catalogue and pin one id server-side**

Run: `npm run export:catalogue`
Expected: `Wrote 418 questions to …catalogue.json`.

Append to `functions/src/social/catalogue.test.ts`:

```ts
test('keeps campaign route questions out of the random pool', () => {
  assert.equal(yearOf('rte-battle-of-pydna'), -168);
  assert.ok(!rotationPool().includes('rte-battle-of-pydna'));
  assert.ok(!rotationPool().includes('rte-fall-of-nineveh'));
});
```

- [ ] **Step 8: Run the tests**

Run: `npx jest src/data src/features/social/scoringParity.test.ts src/features/modes/campaign`
Expected: PASS — including `forks ancient after ancient-s2 into two routes…`, the Daily pins and `campaignMainPath`.

Run: `cd functions && npm test; cd ..`
Expected: all node:test tests pass (`# fail 0`).

- [ ] **Step 9: Commit**

```bash
git add src/data/packs/campaignRoutes/ancient.ts src/data/campaignRoutes.test.ts src/data/questionImages.ts assets/questions/rte-*.webp functions/src/social/catalogue.json functions/src/social/catalogue.test.ts scripts/generateQuestionImages.ts
git commit -m "content(campaign): Ancient World routes — Egypt & the Near East, Greece & Rome

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Content — The Middle Ages routes (30 questions)

**Files:**
- Modify: `src/data/packs/campaignRoutes/medieval.ts`
- Modify: `src/data/campaignRoutes.test.ts` (`COMPLETE_ERAS`)
- Create: `assets/questions/rte-*.webp` (30 new)
- Regenerate: `src/data/questionImages.ts`, `functions/src/social/catalogue.json`

**Interfaces:**
- Consumes: `MEDIEVAL_ROUTE_QUESTIONS` export (Task 2).
- Produces: routes `crusades-castles` (Crusades, military orders, castles and sieges, Reconquista, Hundred Years' War battles) and `silk-road` (Silk Road, Mongol Empire, Indian Ocean and Venetian/Genoese/Hanseatic trade, Islamic Golden Age cities, Tang/Song/Yuan China), years 501–1499.

- [ ] **Step 1: List existing coverage to avoid duplicates**

Run: `grep -rhoE "title: '[^']+'" src/data/questions.ts src/data/packs | wc -l`
Expected: ~418. Grep each candidate keyword; already present include the Siege of Jerusalem, Hastings, Agincourt, Bannockburn, Talas, Marco Polo, Ibn Battuta, Zheng He, Mansa Musa, Genghis Khan uniting the Mongols, the founding and Mongol sack of Baghdad.

- [ ] **Step 2: Draft the 30 questions**

Replace the array in `src/data/packs/campaignRoutes/medieval.ts`; include verbatim:

```ts
  {
    id: 'rte-battle-of-arsuf',
    categoryId: 'battles',
    title: 'The Battle of Arsuf',
    subtitle: 'Richard the Lionheart turns on Saladin’s army by the sea',
    year: 1191,
    month: 9,
    day: 7,
    difficulty: 'hard',
    country: 'Israel',
    region: 'Herzliya',
    latitude: 32.2025,
    longitude: 34.8125,
    shortDescription: 'Richard the Lionheart’s crusaders beat Saladin’s army on the coast road to Jaffa.',
    longDescription:
      'Marching south from Acre during the Third Crusade, Richard kept his column tightly disciplined under constant attack until his knights finally charged near Arsuf. The victory secured the coast and the port of Jaffa, though the crusaders never retook Jerusalem.',
    source: 'https://en.wikipedia.org/wiki/Battle_of_Arsuf',
    tags: ['crusades-castles', 'medieval', 'israel', 'crusades', 'military'],
    verified: true,
    featured: false,
  },
  {
    id: 'rte-yuan-dynasty-proclaimed',
    categoryId: 'events',
    title: 'Kublai Khan Proclaims the Yuan Dynasty',
    subtitle: 'The Mongol ruler of China takes a Chinese dynastic name',
    year: 1271,
    difficulty: 'medium',
    country: 'China',
    region: 'Beijing',
    latitude: 39.9042,
    longitude: 116.4074,
    shortDescription: 'Kublai Khan declared the Great Yuan, ruling China as a Chinese-style dynasty.',
    longDescription:
      'Grandson of Genghis Khan, Kublai moved his capital to Dadu, the site of modern Beijing, and presided over an empire whose peace kept the overland Silk Road busy with merchants, envoys and missionaries — among them the Venetian Marco Polo.',
    source: 'https://en.wikipedia.org/wiki/Yuan_dynasty',
    tags: ['silk-road', 'medieval', 'china', 'mongols', 'trade'],
    verified: true,
    featured: false,
  },
```

Write 28 more: each route 15 total, 5 easy / 5 medium / 5 hard.

- [ ] **Step 3: Verify every date against Wikipedia**

For each of the 30 entries call WebFetch with `url` = `source`, `prompt` = `Quote the exact date (year, and month/day if stated) the article gives for <title>. Say if it is approximate, disputed or a range.` Replace any question whose year is approximate/disputed/a range or differs; drop `month`/`day` unless stated firmly.

- [ ] **Step 4: Mark the era complete and watch the content tests fail on art only**

Set `const COMPLETE_ERAS: readonly string[] = ['ancient', 'medieval'];`
Run: `npx jest src/data/campaignRoutes.test.ts`
Expected: FAIL only in `illustrates every route question` (30 medieval ids).

- [ ] **Step 5: Generate the art**

Run: `npx tsx --env-file=.env scripts/generateQuestionImages.ts --concurrency 6`
Expected: `Done: 30 generated, 0 failed, 448 in require-map.` On `FAILED`, add an `EVENT_OVERRIDES` entry and rerun.

- [ ] **Step 6: Convert to WebP and inspect**

Run: `python scripts/optimizeImages.py`
Expected: `ls assets/questions/rte-*.jpg 2>/dev/null | wc -l` → `0`; `ls assets/questions/rte-*.webp | wc -l` → `60`. Open each of the 30 new images with Read; delete and regenerate any with text, digits or anachronisms.

- [ ] **Step 7: Export the server catalogue**

Run: `npm run export:catalogue`
Expected: `Wrote 448 questions to …catalogue.json`.

- [ ] **Step 8: Run the tests**

Run: `npx jest src/data src/features/social/scoringParity.test.ts src/features/modes/campaign`
Expected: PASS (incl. `forks medieval after medieval-s3…`).
Run: `cd functions && npm test; cd ..`
Expected: `# fail 0`.

- [ ] **Step 9: Commit**

```bash
git add src/data/packs/campaignRoutes/medieval.ts src/data/campaignRoutes.test.ts src/data/questionImages.ts assets/questions/rte-*.webp functions/src/social/catalogue.json scripts/generateQuestionImages.ts
git commit -m "content(campaign): Middle Ages routes — Crusades & Castles, Silk Road & Trade

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Content — The Early Modern Age routes (30 questions)

**Files:**
- Modify: `src/data/packs/campaignRoutes/earlyModern.ts`
- Modify: `src/data/campaignRoutes.test.ts` (`COMPLETE_ERAS`)
- Create: `assets/questions/rte-*.webp` (30 new)
- Regenerate: `src/data/questionImages.ts`, `functions/src/social/catalogue.json`

**Interfaces:**
- Consumes: `EARLY_MODERN_ROUTE_QUESTIONS` export (Task 2).
- Produces: routes `voyages` (Age of Discovery voyages, landfalls, colonial foundings, circumnavigations, Pacific exploration) and `renaissance` (Renaissance art, science and printing; Reformation and Counter-Reformation; wars of religion), years 1500–1799.

- [ ] **Step 1: List existing coverage to avoid duplicates**

Run: `grep -rhoE "title: '[^']+'" src/data/questions.ts src/data/packs | wc -l`
Expected: ~448. Already present include Cabral reaching Brazil, Magellan's circumnavigation, Drake's return, Tasman sighting New Zealand, Cook at Botany Bay, Vasco da Gama, Luther's Ninety-five Theses.

- [ ] **Step 2: Draft the 30 questions**

Replace the array in `src/data/packs/campaignRoutes/earlyModern.ts`; include verbatim:

```ts
  {
    id: 'rte-ponce-de-leon-florida',
    categoryId: 'exploration',
    title: 'Ponce de León Sights Florida',
    subtitle: 'A Spanish expedition names a new land for the Easter season',
    year: 1513,
    month: 4,
    day: 2,
    difficulty: 'medium',
    country: 'United States',
    region: 'Florida',
    latitude: 29.0,
    longitude: -81.0,
    shortDescription: 'Juan Ponce de León’s fleet sighted the coast he named La Florida.',
    longDescription:
      'Sailing north from Puerto Rico in search of new lands, Ponce de León sighted what he took to be an island and named it for Pascua Florida, the Easter feast. The voyage gave Spain its claim to the peninsula and charted the powerful Gulf Stream.',
    source: 'https://en.wikipedia.org/wiki/Juan_Ponce_de_León',
    tags: ['voyages', 'spain', 'usa', 'exploration'],
    verified: true,
    featured: false,
  },
  {
    id: 'rte-council-of-trent-opens',
    categoryId: 'events',
    title: 'The Council of Trent Opens',
    subtitle: 'The Catholic Church gathers to answer the Reformation',
    year: 1545,
    month: 12,
    day: 13,
    difficulty: 'hard',
    country: 'Italy',
    region: 'Trento',
    latitude: 46.0664,
    longitude: 11.1257,
    shortDescription: 'Bishops met in the Alpine city of Trent for a council that would sit, on and off, for eighteen years.',
    longDescription:
      'Summoned by Pope Paul III, the council defined Catholic doctrine against Protestant teaching, reformed the training of priests and tightened church discipline. Its twenty-five sessions shaped the Counter-Reformation.',
    source: 'https://en.wikipedia.org/wiki/Council_of_Trent',
    tags: ['renaissance', 'italy', 'religion'],
    verified: true,
    featured: false,
  },
```

Write 28 more: each route 15 total, 5 easy / 5 medium / 5 hard.

- [ ] **Step 3: Verify every date against Wikipedia**

For each entry WebFetch `source` with `prompt` = `Quote the exact date (year, and month/day if stated) the article gives for <title>. Say if it is approximate, disputed or a range.` Replace uncertain ones; drop unconfirmed `month`/`day`.

- [ ] **Step 4: Mark the era complete and watch the content tests fail on art only**

Set `const COMPLETE_ERAS: readonly string[] = ['ancient', 'medieval', 'early-modern'];`
Run: `npx jest src/data/campaignRoutes.test.ts`
Expected: FAIL only in `illustrates every route question`.

- [ ] **Step 5: Generate the art**

Run: `npx tsx --env-file=.env scripts/generateQuestionImages.ts --concurrency 6`
Expected: `Done: 30 generated, 0 failed, 478 in require-map.`

- [ ] **Step 6: Convert to WebP and inspect**

Run: `python scripts/optimizeImages.py`
Expected: `ls assets/questions/rte-*.jpg 2>/dev/null | wc -l` → `0`; `ls assets/questions/rte-*.webp | wc -l` → `90`. Inspect the 30 new images with Read; regenerate any with text/digits/anachronisms.

- [ ] **Step 7: Export the server catalogue**

Run: `npm run export:catalogue`
Expected: `Wrote 478 questions to …catalogue.json`.

- [ ] **Step 8: Run the tests**

Run: `npx jest src/data src/features/social/scoringParity.test.ts src/features/modes/campaign`
Expected: PASS (incl. `forks early-modern after early-modern-s4…`).
Run: `cd functions && npm test; cd ..`
Expected: `# fail 0`.

- [ ] **Step 9: Commit**

```bash
git add src/data/packs/campaignRoutes/earlyModern.ts src/data/campaignRoutes.test.ts src/data/questionImages.ts assets/questions/rte-*.webp functions/src/social/catalogue.json scripts/generateQuestionImages.ts
git commit -m "content(campaign): Early Modern routes — Voyages of Discovery, Renaissance & Reformation

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Content — The 19th Century routes (30 questions)

**Files:**
- Modify: `src/data/packs/campaignRoutes/nineteenth.ts`
- Modify: `src/data/campaignRoutes.test.ts` (`COMPLETE_ERAS`)
- Create: `assets/questions/rte-*.webp` (30 new)
- Regenerate: `src/data/questionImages.ts`, `functions/src/social/catalogue.json`

**Interfaces:**
- Consumes: `NINETEENTH_ROUTE_QUESTIONS` export (Task 2).
- Produces: routes `revolutions` (Latin American independence, 1830/1848 revolutions, national unifications, constitutions, abolition, civil wars) and `steam-science` (railways, steamships, telegraph/telephone, photography, electricity, medicine, evolution and physics milestones), years 1800–1899.

- [ ] **Step 1: List existing coverage to avoid duplicates**

Run: `grep -rhoE "title: '[^']+'" src/data/questions.ts src/data/packs | wc -l`
Expected: ~478. Already present include the Kingdom of Italy being proclaimed, the telephone, Darwin; grep every candidate.

- [ ] **Step 2: Draft the 30 questions**

Replace the array in `src/data/packs/campaignRoutes/nineteenth.ts`; include verbatim:

```ts
  {
    id: 'rte-frankfurt-parliament',
    categoryId: 'events',
    title: 'The Frankfurt Parliament Meets',
    subtitle: 'Germany’s first freely elected national assembly gathers',
    year: 1848,
    month: 5,
    day: 18,
    difficulty: 'hard',
    country: 'Germany',
    region: 'Frankfurt',
    latitude: 50.1109,
    longitude: 8.6821,
    shortDescription: 'Elected delegates from across the German states met in St Paul’s Church to draft a constitution for a united Germany.',
    longDescription:
      'Born of that year’s revolutions, the assembly wrote a liberal constitution and offered an imperial crown to King Frederick William IV of Prussia, who refused it. The parliament broke up the following year, but its black, red and gold colours became Germany’s flag.',
    source: 'https://en.wikipedia.org/wiki/Frankfurt_Parliament',
    tags: ['revolutions', '19th-century', 'germany', 'politics', 'revolution'],
    verified: true,
    featured: false,
  },
  {
    id: 'rte-stockton-darlington-railway',
    categoryId: 'technology',
    title: 'The Stockton and Darlington Railway Opens',
    subtitle: 'Locomotion No. 1 hauls the first public steam railway train',
    year: 1825,
    month: 9,
    day: 27,
    difficulty: 'medium',
    country: 'United Kingdom',
    region: 'County Durham',
    latitude: 54.5236,
    longitude: -1.5528,
    shortDescription: 'George Stephenson drove Locomotion No. 1 at the head of a train of coal wagons and passengers.',
    longDescription:
      'Built to carry coal from the Durham pits to the River Tees, the line was the world’s first public railway to use steam locomotives. Its success encouraged the backers of the Liverpool and Manchester Railway and set off the railway age.',
    source: 'https://en.wikipedia.org/wiki/Stockton_and_Darlington_Railway',
    tags: ['steam-science', '19th-century', 'england', 'invention'],
    verified: true,
    featured: false,
  },
```

Write 28 more: each route 15 total, 5 easy / 5 medium / 5 hard.

- [ ] **Step 3: Verify every date against Wikipedia**

For each entry WebFetch `source` with `prompt` = `Quote the exact date (year, and month/day if stated) the article gives for <title>. Say if it is approximate, disputed or a range.` Replace uncertain ones; drop unconfirmed `month`/`day`.

- [ ] **Step 4: Mark the era complete and watch the content tests fail on art only**

Set `const COMPLETE_ERAS: readonly string[] = ['ancient', 'medieval', 'early-modern', 'nineteenth'];`
Run: `npx jest src/data/campaignRoutes.test.ts`
Expected: FAIL only in `illustrates every route question`.

- [ ] **Step 5: Generate the art**

Run: `npx tsx --env-file=.env scripts/generateQuestionImages.ts --concurrency 6`
Expected: `Done: 30 generated, 0 failed, 508 in require-map.`

- [ ] **Step 6: Convert to WebP and inspect**

Run: `python scripts/optimizeImages.py`
Expected: `ls assets/questions/rte-*.jpg 2>/dev/null | wc -l` → `0`; `ls assets/questions/rte-*.webp | wc -l` → `120`. Inspect the 30 new images with Read; regenerate any with text/digits/anachronisms.

- [ ] **Step 7: Export the server catalogue**

Run: `npm run export:catalogue`
Expected: `Wrote 508 questions to …catalogue.json`.

- [ ] **Step 8: Run the tests**

Run: `npx jest src/data src/features/social/scoringParity.test.ts src/features/modes/campaign`
Expected: PASS (incl. `forks nineteenth after nineteenth-s4…`).
Run: `cd functions && npm test; cd ..`
Expected: `# fail 0`.

- [ ] **Step 9: Commit**

```bash
git add src/data/packs/campaignRoutes/nineteenth.ts src/data/campaignRoutes.test.ts src/data/questionImages.ts assets/questions/rte-*.webp functions/src/social/catalogue.json scripts/generateQuestionImages.ts
git commit -m "content(campaign): 19th Century routes — Revolutions & Nations, Steam & Science

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Content — The Modern Era routes (30 questions)

**Files:**
- Modify: `src/data/packs/campaignRoutes/modern.ts`
- Modify: `src/data/campaignRoutes.test.ts` (`COMPLETE_ERAS`)
- Create: `assets/questions/rte-*.webp` (30 new)
- Regenerate: `src/data/questionImages.ts`, `functions/src/social/catalogue.json`

**Interfaces:**
- Consumes: `MODERN_ROUTE_QUESTIONS` export (Task 2).
- Produces: routes `world-at-war` (First and Second World War campaigns, battles, turning points and ends; no atrocity depiction — use memorial/setting descriptions for art) and `space-tech` (spaceflight, computing, electronics, aviation, medicine and communications), years 1900–2025. Completes the 150.

- [ ] **Step 1: List existing coverage to avoid duplicates**

Run: `grep -rhoE "title: '[^']+'" src/data/questions.ts src/data/packs | wc -l`
Expected: ~508. The Space pack (`spc-*`) and core battles already cover many headline events (Stalingrad, Midway, the transistor, the World Wide Web, Hubble, Sputnik, the Moon landing) — grep every candidate.

- [ ] **Step 2: Draft the 30 questions**

Replace the array in `src/data/packs/campaignRoutes/modern.ts`; include verbatim:

```ts
  {
    id: 'rte-gallipoli-landings',
    categoryId: 'battles',
    title: 'The Gallipoli Landings',
    subtitle: 'Allied troops storm ashore on the Dardanelles peninsula',
    year: 1915,
    month: 4,
    day: 25,
    difficulty: 'medium',
    country: 'Turkey',
    region: 'Çanakkale',
    latitude: 40.2403,
    longitude: 26.2786,
    shortDescription: 'British, French, Australian and New Zealand troops landed on the Gallipoli peninsula to open the way to Constantinople.',
    longDescription:
      'The landings at Cape Helles and Anzac Cove met fierce Ottoman resistance, and the campaign became an eight-month stalemate before the Allies withdrew. The day of the landing is still marked as Anzac Day in Australia and New Zealand.',
    source: 'https://en.wikipedia.org/wiki/Landing_at_Anzac_Cove',
    tags: ['world-at-war', '20th-century', 'turkey', 'ww1', 'military'],
    verified: true,
    featured: false,
  },
  {
    id: 'rte-intel-4004',
    categoryId: 'technology',
    title: 'The Intel 4004 Goes on Sale',
    subtitle: 'The first commercial microprocessor puts a whole CPU on one chip',
    year: 1971,
    month: 11,
    day: 15,
    difficulty: 'hard',
    country: 'United States',
    region: 'Santa Clara, California',
    latitude: 37.3541,
    longitude: -121.9552,
    shortDescription: 'Intel launched the 4004, a four-bit processor on a single chip smaller than a fingernail.',
    longDescription:
      'Designed for the Japanese calculator maker Busicom, the 4004 packed about 2,300 transistors onto one piece of silicon. It proved a complete central processor could be mass-produced as a chip, opening the way to personal computers.',
    source: 'https://en.wikipedia.org/wiki/Intel_4004',
    tags: ['space-tech', '20th-century', 'usa', 'invention'],
    verified: true,
    featured: false,
  },
```

Write 28 more: each route 15 total, 5 easy / 5 medium / 5 hard.

- [ ] **Step 3: Verify every date against Wikipedia**

For each entry WebFetch `source` with `prompt` = `Quote the exact date (year, and month/day if stated) the article gives for <title>. Say if it is approximate, disputed or a range.` Replace uncertain ones; drop unconfirmed `month`/`day`.

- [ ] **Step 4: Mark the era complete and watch the content tests fail on art only**

Set `const COMPLETE_ERAS: readonly string[] = ['ancient', 'medieval', 'early-modern', 'nineteenth', 'modern'];`
Run: `npx jest src/data/campaignRoutes.test.ts`
Expected: FAIL only in `illustrates every route question`.

- [ ] **Step 5: Generate the art**

Run: `npx tsx --env-file=.env scripts/generateQuestionImages.ts --concurrency 6`
Expected: `Done: 30 generated, 0 failed, 538 in require-map.` War subjects are the most likely to trip the safety filter: add `EVENT_OVERRIDES` entries (setting, memorials, maps, equipment on display — no combat, no casualties, no lettering) for any `FAILED` id and rerun.

- [ ] **Step 6: Convert to WebP and inspect**

Run: `python scripts/optimizeImages.py`
Expected: `ls assets/questions/rte-*.jpg 2>/dev/null | wc -l` → `0`; `ls assets/questions/rte-*.webp | wc -l` → `150`. Inspect the 30 new images with Read; regenerate any with text/digits (the 4004 prompt is a likely offender), insignia lettering or anachronisms.

- [ ] **Step 7: Export the server catalogue**

Run: `npm run export:catalogue`
Expected: `Wrote 538 questions to …catalogue.json`.
Run: `node -e "const c=require('./functions/src/social/catalogue.json');const v=Object.values(c);console.log(v.length, v.filter(r=>!r.inRotation).length)"`
Expected: `538 233`.

- [ ] **Step 8: Run the tests**

Run: `npx jest src/data src/features/social/scoringParity.test.ts src/features/modes/campaign`
Expected: PASS — `adds thirty questions per completed era` now asserts 150; `forks modern after modern-s8…` passes.
Run: `cd functions && npm test; cd ..`
Expected: `# fail 0`.

- [ ] **Step 9: Commit**

```bash
git add src/data/packs/campaignRoutes/modern.ts src/data/campaignRoutes.test.ts src/data/questionImages.ts assets/questions/rte-*.webp functions/src/social/catalogue.json scripts/generateQuestionImages.ts
git commit -m "content(campaign): Modern Era routes — World at War, Space & Technology

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: Pure trail layout with fork lanes

**Files:**
- Modify: `src/features/modes/campaign/map/constants.ts` (append)
- Create: `src/features/modes/campaign/map/trailLayout.ts`
- Test: `src/features/modes/campaign/map/trailLayout.test.ts`

**Interfaces:**
- Consumes: `CampaignWorld`, `CampaignRoute`, `CampaignStage` (Task 3); `FIXTURE_WORLDS`, `FIXTURE_POOL`, `FIXTURE_ROUTE_SPECS`, `buildCampaign` for tests.
- Produces:
  - constants `ROUTE_BANNER_TOP = 72`, `ROUTE_BANNER_H = 52`, `ROUTE_GUTTER = 16`, `ROUTE_GAP = 12`; `routeLane(lane: number, width: number): { left: number; width: number; centre: number }`
  - `interface Point { x: number; y: number }`, `interface TrailNode extends Point { stage: CampaignStage; route?: CampaignRoute }`, `interface TrailSegment { fromId: string; toId: string; from: Point; to: Point }`, `interface RouteBannerSpot { route: CampaignRoute; left: number; top: number; width: number }`, `interface TrailLayout { nodes: readonly TrailNode[]; segments: readonly TrailSegment[]; banners: readonly RouteBannerSpot[]; height: number }`
  - `eraTrailLayout(world: CampaignWorld, startIndex: number, width: number): TrailLayout`

Geometry (lanes are centred in the left and right halves rather than the outer thirds so a 176 dp banner fits "🎨 Renaissance & Reformation" at a 392 dp width; see Review Focus 4):
- main stage i before/at the fork: `x = trailX(startIndex + i, width)`, `y = stageCentreY(i)`;
- banners: `top = forkY + ROUTE_BANNER_TOP`, height `ROUTE_BANNER_H`, left/width from `routeLane`;
- route row r: `y = forkY + ROUTE_BANNER_TOP + ROUTE_BANNER_H + TRAIL_TOP + STEP_Y / 2 + r * STEP_Y`, `x = routeLane(lane).centre`;
- main stages after the fork keep `x = trailX(startIndex + i, width)` and sit one `STEP_Y` apart starting one `STEP_Y` below the last route row;
- `height = maxNodeY + STEP_Y / 2 + 14` (equals today's `TRAIL_TOP + n * STEP_Y + 14` without routes).

- [ ] **Step 1: Write the failing test**

`src/features/modes/campaign/map/trailLayout.test.ts`:

```ts
import { FIXTURE_POOL, FIXTURE_ROUTE_SPECS, FIXTURE_WORLDS } from '../__fixtures__/routedCampaign';
import { buildCampaign, worldStages } from '../campaignMap';
import { NODE, ROUTE_BANNER_H, routeLane, stageCentreY, STEP_Y, TRAIL_TOP, trailX } from './constants';
import { eraTrailLayout } from './trailLayout';

const ancient = FIXTURE_WORLDS[0]!;
const W = 392;

function byId(layout: ReturnType<typeof eraTrailLayout>) {
  return new Map(layout.nodes.map((n) => [n.stage.id, n] as const));
}

describe('eraTrailLayout', () => {
  it('lays out an era without routes exactly as the plain trail did', () => {
    const [plain] = buildCampaign(FIXTURE_POOL, [], FIXTURE_ROUTE_SPECS);
    const layout = eraTrailLayout(plain!, 3, W);
    expect(layout.nodes.map((n) => [n.stage.id, n.x, n.y])).toEqual(
      plain!.stages.map((s, i) => [s.id, trailX(3 + i, W), stageCentreY(i)]),
    );
    expect(layout.height).toBe(TRAIL_TOP + plain!.stages.length * STEP_Y + 14);
    expect(layout.segments).toHaveLength(plain!.stages.length - 1);
    expect(layout.banners).toEqual([]);
  });

  it('places every stage once, in play order', () => {
    const layout = eraTrailLayout(ancient, 0, W);
    expect(layout.nodes.map((n) => n.stage.id)).toEqual(worldStages(ancient).map((s) => s.id));
  });

  it('splits the fork into two side-by-side lanes that rejoin below', () => {
    const nodes = byId(eraTrailLayout(ancient, 0, W));
    const fork = nodes.get('ancient-s2')!;
    for (const [lane, route] of ['north', 'south'].entries()) {
      for (let r = 1; r <= 3; r += 1) {
        const node = nodes.get(`ancient-${route}-s${r}`)!;
        expect(node.x).toBe(routeLane(lane, W).centre);
        expect(node.route?.id).toBe(route);
        expect(node.y).toBe(nodes.get(`ancient-north-s${r}`)!.y);
      }
    }
    expect(nodes.get('ancient-north-s1')!.y).toBeGreaterThan(fork.y);
    const rejoin = nodes.get('ancient-s3')!;
    expect(rejoin.y).toBe(nodes.get('ancient-north-s3')!.y + STEP_Y);
    expect(rejoin.x).toBe(trailX(2, W));
    expect(nodes.get('ancient-s4')!.y).toBe(rejoin.y + STEP_Y);
  });

  it('forks the dotted trail out of the fork stage and merges it into the rejoin', () => {
    const pairs = eraTrailLayout(ancient, 0, W).segments.map((s) => `${s.fromId}>${s.toId}`);
    expect(pairs).toEqual([
      'ancient-s1>ancient-s2',
      'ancient-s2>ancient-north-s1',
      'ancient-north-s1>ancient-north-s2',
      'ancient-north-s2>ancient-north-s3',
      'ancient-north-s3>ancient-s3',
      'ancient-s2>ancient-south-s1',
      'ancient-south-s1>ancient-south-s2',
      'ancient-south-s2>ancient-south-s3',
      'ancient-south-s3>ancient-s3',
      'ancient-s3>ancient-s4',
      'ancient-s4>ancient-s5',
      'ancient-s5>ancient-s6',
    ]);
  });

  it('heads each lane with a banner between the fork and the first route stage', () => {
    const layout = eraTrailLayout(ancient, 0, W);
    const nodes = byId(layout);
    expect(layout.banners.map((b) => b.route.id)).toEqual(['north', 'south']);
    for (const banner of layout.banners) {
      expect(banner.top).toBeGreaterThan(nodes.get('ancient-s2')!.y + NODE / 2);
      expect(banner.top + ROUTE_BANNER_H).toBeLessThan(nodes.get('ancient-north-s1')!.y - NODE / 2);
    }
  });

  it.each([320, 360, 392, 430])('keeps both lanes and banners on screen and apart at %i dp', (width) => {
    const [left, right] = eraTrailLayout(ancient, 0, width).banners;
    expect(left!.left).toBeGreaterThanOrEqual(16);
    expect(left!.left + left!.width).toBeLessThan(right!.left);
    expect(right!.left + right!.width).toBeLessThanOrEqual(width - 16);
    expect(routeLane(1, width).centre - routeLane(0, width).centre).toBeGreaterThan(NODE + 20);
  });

  it('grows the trail by the fork section', () => {
    const layout = eraTrailLayout(ancient, 0, W);
    const lowest = Math.max(...layout.nodes.map((n) => n.y));
    expect(layout.height).toBe(lowest + STEP_Y / 2 + 14);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/features/modes/campaign/map/trailLayout.test.ts`
Expected: FAIL — `Cannot find module './trailLayout'`.

- [ ] **Step 3: Implement**

Append to `src/features/modes/campaign/map/constants.ts`:

```ts
/** Below the fork stage's centre: where its route banners start (clear of its star pill). */
export const ROUTE_BANNER_TOP = 72;
/** Height of a route banner, lip included. */
export const ROUTE_BANNER_H = 52;
/** Side margin of the route lanes, and the gap between the two banners. */
export const ROUTE_GUTTER = 16;
export const ROUTE_GAP = 12;

/** Lane `lane` (0 = left, 1 = right) of a fork: its banner's box and the lane's centre line. */
export function routeLane(lane: number, width: number): { left: number; width: number; centre: number } {
  const laneWidth = (width - 2 * ROUTE_GUTTER - ROUTE_GAP) / 2;
  const left = ROUTE_GUTTER + lane * (laneWidth + ROUTE_GAP);
  return { left, width: laneWidth, centre: left + laneWidth / 2 };
}
```

Create `src/features/modes/campaign/map/trailLayout.ts`:

```ts
import type { CampaignRoute, CampaignStage, CampaignWorld } from '../campaignMap';
import {
  ROUTE_BANNER_H,
  ROUTE_BANNER_TOP,
  routeLane,
  stageCentreY,
  STEP_Y,
  TRAIL_TOP,
  trailX,
} from './constants';

export interface Point {
  x: number;
  y: number;
}

export interface TrailNode extends Point {
  stage: CampaignStage;
  /** Set for route stages. */
  route?: CampaignRoute;
}

export interface TrailSegment {
  fromId: string;
  toId: string;
  from: Point;
  to: Point;
}

export interface RouteBannerSpot {
  route: CampaignRoute;
  left: number;
  top: number;
  width: number;
}

export interface TrailLayout {
  /** Every stage of the era, in play order. */
  nodes: readonly TrailNode[];
  /** Dotted connectors, each lit once its `fromId` stage is cleared. */
  segments: readonly TrailSegment[];
  banners: readonly RouteBannerSpot[];
  height: number;
}

/**
 * Where everything on one era's trail sits (trail-local coordinates). Main
 * stages swing along the sine path, the phase continuing from `startIndex`
 * so the campaign reads as one road. At the fork the trail splits into two
 * lanes — one per route, each under its banner, stages side by side — and
 * merges back into the next main stage, below which the swing carries on.
 */
export function eraTrailLayout(world: CampaignWorld, startIndex: number, width: number): TrailLayout {
  const main = world.stages;
  const routes = world.routes;
  const forkIndex = routes.length > 0 ? main.findIndex((s) => s.id === routes[0]!.afterStageId) : -1;

  const nodes: TrailNode[] = [];
  const banners: RouteBannerSpot[] = [];
  const at = new Map<string, Point>();
  const place = (stage: CampaignStage, point: Point, route?: CampaignRoute) => {
    nodes.push(route === undefined ? { stage, ...point } : { stage, route, ...point });
    at.set(stage.id, point);
  };

  /** How far main stages after the fork are pushed down by the fork section. */
  let shift = 0;
  main.forEach((stage, i) => {
    place(stage, { x: trailX(startIndex + i, width), y: stageCentreY(i) + shift });
    if (i !== forkIndex) return;
    const forkY = stageCentreY(i) + shift;
    const bannerTop = forkY + ROUTE_BANNER_TOP;
    const firstRowY = bannerTop + ROUTE_BANNER_H + TRAIL_TOP + STEP_Y / 2;
    const rows = Math.max(...routes.map((r) => r.stages.length));
    routes.forEach((route, lane) => {
      const box = routeLane(lane, width);
      banners.push({ route, left: box.left, top: bannerTop, width: box.width });
      route.stages.forEach((s, r) => place(s, { x: box.centre, y: firstRowY + r * STEP_Y }, route));
    });
    const lastRowY = firstRowY + (rows - 1) * STEP_Y;
    shift = lastRowY + STEP_Y - stageCentreY(i + 1);
  });

  const segments: TrailSegment[] = [];
  const link = (from: CampaignStage, to: CampaignStage) => {
    segments.push({ fromId: from.id, toId: to.id, from: at.get(from.id)!, to: at.get(to.id)! });
  };
  main.forEach((stage, i) => {
    const next = main[i + 1];
    if (i !== forkIndex) {
      if (next !== undefined) link(stage, next);
      return;
    }
    for (const route of routes) {
      route.stages.forEach((s, r) => link(r === 0 ? stage : route.stages[r - 1]!, s));
      if (next !== undefined) link(route.stages.at(-1)!, next);
    }
  });

  const lowest = Math.max(...nodes.map((n) => n.y));
  return { nodes, segments, banners, height: lowest + STEP_Y / 2 + 14 };
}
```

Note the node order: `place` runs main stages in order and the fork's route stages right after the fork stage, which equals `worldStages(world)`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/features/modes/campaign/map`
Expected: PASS (`trailLayout.test.ts` and `mapVisuals.test.ts`).

- [ ] **Step 5: Lint, types, commit**

Run: `npx eslint src/features/modes/campaign/map/constants.ts src/features/modes/campaign/map/trailLayout.ts src/features/modes/campaign/map/trailLayout.test.ts && npx tsc --noEmit`
Expected: no output.

```bash
git add src/features/modes/campaign/map
git commit -m "feat(campaign): pure trail layout with forked route lanes

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 11: Draw the forks on the map

**Files:**
- Create: `src/features/modes/campaign/map/RouteBanner.tsx`
- Modify: `src/features/modes/campaign/map/EraTrail.tsx` (whole component)
- Modify: `src/features/modes/campaign/map/StageButton.tsx` (props, label, pulse)
- Modify: `src/features/modes/campaign/CampaignMapScreen.tsx` (layouts, pulse, scroll)
- Test: `src/features/modes/campaign/CampaignMapScreen.test.tsx`, `src/features/modes/campaign/CampaignStageScreen.test.tsx`

**Interfaces:**
- Consumes: `eraTrailLayout`, `TrailLayout` (Task 10); `pulseStageIds`, `frontierStage`, `starsEarned`, `worldStages`, `allStagesIncludingRoutes` (Task 4); real route content (Tasks 5–9).
- Produces: `RouteBanner({ route, colour, earned, total, left, top, width })` with testIDs `route-${route.id}` / `route-stars-${route.id}`; `EraTrail({ world, layout, width, progress, frontierId, pulseIds, premiumLocked, celebration, onOpenStage, onLayoutY })`; `StageButton` gains `pulse?: boolean` and `routeName?: string`; pulse ring testID `frontier-pulse`.

- [ ] **Step 1: Write the failing render tests**

In `CampaignMapScreen.test.tsx`:
- replace `'lights the trail behind cleared stages only'` with:

```ts
  it('lights the trail behind cleared stages only', async () => {
    await seed(cleared([ancient.stages[0]!.id]));
    render(<CampaignMapScreen />);
    // One cleared stage lights the one segment leaving it, five dots.
    await waitFor(() => expect(screen.getAllByTestId('trail-dot-lit')).toHaveLength(5));
  });
```

- append inside the `describe`:

```ts
  it('forks the trail after the fork stage into two bannered, playable routes', async () => {
    const [routeA, routeB] = ancient.routes;
    await seed(cleared([ancient.stages[0]!.id, ancient.stages[1]!.id]));
    render(<CampaignMapScreen />);
    await waitFor(() => expect(screen.getByTestId(`route-${routeA!.id}`)).toBeOnTheScreen());
    expect(screen.getByTestId(`route-${routeB!.id}`)).toBeOnTheScreen();
    expect(screen.getByText(`${routeA!.icon} ${routeA!.name}`)).toBeOnTheScreen();
    expect(screen.getByTestId(`route-stars-${routeA!.id}`)).toHaveTextContent('★ 0/9');

    const a1 = screen.getByTestId(`stage-${routeA!.stages[0]!.id}`);
    const b1 = screen.getByTestId(`stage-${routeB!.stages[0]!.id}`);
    expect(within(a1).getByTestId('stage-face-frontier')).toBeOnTheScreen();
    expect(within(b1).getByTestId('stage-face-open')).toBeOnTheScreen();
    expect(within(a1).getByTestId('frontier-pulse')).toBeOnTheScreen();
    expect(within(b1).getByTestId('frontier-pulse')).toBeOnTheScreen();
    expect(screen.getAllByTestId('start-bubble')).toHaveLength(1);
    expect(b1).toHaveProp('accessibilityLabel', `${routeB!.name}, Stage 1`);
    // The rejoin stage waits for a whole route.
    expect(
      within(screen.getByTestId(`stage-${ancient.stages[2]!.id}`)).getByTestId('stage-face-locked'),
    ).toBeOnTheScreen();
    // s1→s2 plus both connectors out of the fork: three segments of five dots.
    expect(screen.getAllByTestId('trail-dot-lit')).toHaveLength(15);

    fireEvent.press(b1);
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/campaign/[world]/[stage]',
      params: { world: ancient.id, stage: routeB!.stages[0]!.id },
    });
  });

  it('reopens the main path after one whole route and leaves the other open', async () => {
    const [routeA, routeB] = ancient.routes;
    await seed(cleared([ancient.stages[0]!.id, ancient.stages[1]!.id, ...routeA!.stages.map((s) => s.id)]));
    render(<CampaignMapScreen />);
    const rejoin = await screen.findByTestId(`stage-${ancient.stages[2]!.id}`);
    await waitFor(() => expect(within(rejoin).getByTestId('stage-face-frontier')).toBeOnTheScreen());
    expect(
      within(screen.getByTestId(`stage-${routeB!.stages[0]!.id}`)).getByTestId('stage-face-open'),
    ).toBeOnTheScreen();
    expect(screen.getByTestId(`route-stars-${routeA!.id}`)).toHaveTextContent('★ 3/9');
  });

  it('sends a free player tapping a Middle Ages route stage to the paywall', async () => {
    const [crusades] = medieval.routes;
    await seed(cleared(ancientAll));
    render(<CampaignMapScreen />);
    const node = await screen.findByTestId(`stage-${crusades!.stages[0]!.id}`);
    expect(node).toHaveProp('accessibilityLabel', `${crusades!.name}, Stage 1, Premium`);
    fireEvent.press(node);
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/paywall', params: { source: 'campaign' } });
  });
```

In `CampaignStageScreen.test.tsx` append inside the `describe`:

```ts
  it('guards a deep link into a premium route stage too', () => {
    mockParams.stage = medieval.routes[0]!.stages[0]!.id;
    render(<CampaignStageScreen />);
    expect(screen.getByTestId('stage-premium-locked')).toBeOnTheScreen();
    expect(screen.queryByTestId('submit-button')).toBeNull();
  });

  it('says an unknown route stage could not be found', () => {
    mockParams.stage = `${medieval.id}-crusades-castles-s9`;
    render(<CampaignStageScreen />);
    expect(screen.getByText('This stage could not be found.')).toBeOnTheScreen();
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest src/features/modes/campaign/CampaignMapScreen.test.tsx src/features/modes/campaign/CampaignStageScreen.test.tsx`
Expected: FAIL — `Unable to find an element with testID: route-egypt-near-east` (routes not drawn); the stage-screen tests PASS already (getStage finds route stages since Task 3) — they pin Review Focus 5.

- [ ] **Step 3: Create `RouteBanner.tsx`**

```tsx
import { Text, View } from 'react-native';

import type { CampaignRoute } from '../campaignMap';
import { ROUTE_BANNER_H } from './constants';
import { inkOn, shade } from './mapVisuals';

const BANNER_LIP = 4;

/**
 * The small banner heading one lane of a fork, in the era colour on a darker
 * lip like the stage buttons: the route's icon and name, and its star tally.
 */
export function RouteBanner({
  route,
  colour,
  earned,
  total,
  left,
  top,
  width,
}: {
  route: CampaignRoute;
  colour: string;
  earned: number;
  total: number;
  left: number;
  top: number;
  width: number;
}) {
  const ink = inkOn(colour);
  return (
    <View
      pointerEvents="none"
      testID={`route-${route.id}`}
      style={{ position: 'absolute', left, top, width, height: ROUTE_BANNER_H }}
    >
      <View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: BANNER_LIP,
          bottom: 0,
          borderRadius: 14,
          backgroundColor: shade(colour, 0.3),
        }}
      />
      <View
        className="items-center justify-center px-2"
        style={{ height: ROUTE_BANNER_H - BANNER_LIP, borderRadius: 14, backgroundColor: colour }}
      >
        <Text
          className="text-xs font-extrabold"
          style={{ color: ink }}
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          {`${route.icon} ${route.name}`}
        </Text>
        <Text className="text-[11px] font-bold" style={{ color: ink }} testID={`route-stars-${route.id}`}>
          ★ {earned}/{total}
        </Text>
      </View>
    </View>
  );
}
```

- [ ] **Step 4: Replace `EraTrail.tsx`'s component**

Keep `Celebration` and `NO_CELEBRATION`; replace the imports and `EraTrail` with:

```tsx
import { View } from 'react-native';

import type { CampaignProgress } from '../../persistence';
import {
  isStageUnlocked,
  starsEarned,
  type CampaignStage,
  type CampaignWorld,
} from '../campaignMap';
import { RouteBanner } from './RouteBanner';
import { StageButton } from './StageButton';
import type { TrailLayout } from './trailLayout';
import { TrailDots } from './TrailDots';

// … Celebration, NO_CELEBRATION unchanged …

/**
 * One era's stretch of the trail, drawn from its precomputed layout: dotted
 * segments, the fork's route banners, then the stage buttons on top.
 */
export function EraTrail({
  world,
  layout,
  width,
  progress,
  frontierId,
  pulseIds,
  premiumLocked,
  celebration,
  onOpenStage,
  onLayoutY,
}: {
  world: CampaignWorld;
  layout: TrailLayout;
  width: number;
  progress: CampaignProgress;
  frontierId?: string;
  /** Stages wearing the frontier pulse (both route openers at a fresh fork). */
  pulseIds: ReadonlySet<string>;
  premiumLocked: boolean;
  celebration: Celebration;
  onOpenStage: (stage: CampaignStage) => void;
  onLayoutY: (y: number) => void;
}) {
  return (
    <View style={{ height: layout.height }} onLayout={(e) => onLayoutY(e.nativeEvent.layout.y)}>
      {layout.segments.map((segment) => (
        <TrailDots
          key={`${segment.fromId}>${segment.toId}`}
          from={segment.from}
          to={segment.to}
          colour={world.colour}
          lit={(progress[segment.fromId]?.stars ?? 0) >= 1}
          lighting={celebration.cleared.has(segment.fromId)}
          token={celebration.token}
        />
      ))}
      {layout.banners.map((banner) => (
        <RouteBanner
          key={banner.route.id}
          route={banner.route}
          colour={world.colour}
          earned={starsEarned(banner.route.stages, progress)}
          total={banner.route.stages.length * 3}
          left={banner.left}
          top={banner.top}
          width={banner.width}
        />
      ))}
      {layout.nodes.map(({ stage, route, x, y }) => {
        const kind = celebration.cleared.has(stage.id)
          ? 'cleared'
          : celebration.unlocked.has(stage.id)
            ? 'unlocked'
            : null;
        return (
          <StageButton
            key={stage.id}
            stage={stage}
            routeName={route?.name}
            colour={world.colour}
            unlocked={isStageUnlocked(stage.id, progress)}
            frontier={stage.id === frontierId}
            pulse={pulseIds.has(stage.id)}
            premiumLocked={premiumLocked}
            stars={progress[stage.id]?.stars ?? 0}
            x={x}
            y={y}
            owlSide={x > width / 2 ? 'left' : 'right'}
            celebrate={kind === null ? null : { token: celebration.token, kind }}
            onPress={() => onOpenStage(stage)}
          />
        );
      })}
    </View>
  );
}
```

- [ ] **Step 5: Teach `StageButton` routes and the shared pulse**

In `StageButton.tsx`:
- `FrontierPulse`'s `Animated.View`: add `testID="frontier-pulse"`.
- props: add to the destructuring and the type
  ```ts
  /** Route stages: the route's name, for the accessibility label. */
  routeName?: string;
  /** Wear the frontier pulse without being the frontier (the other route's opener at a fork). */
  pulse?: boolean;
  ```
- label: `const label = `${routeName !== undefined ? `${routeName}, ` : ''}Stage ${stage.index}${premiumLocked ? ', Premium' : unlocked ? '' : ', locked'}`;`
- pulse: `{frontier && !reducedMotion && <FrontierPulse … />}` → `{(frontier || pulse === true) && !reducedMotion && <FrontierPulse colour={colour} size={size} />}`

- [ ] **Step 6: Wire layouts and pulse into `CampaignMapScreen.tsx`**

- imports: add `useMemo` from react; `pulseStageIds` from `./campaignMap`; `eraTrailLayout, type TrailLayout` from `./map/trailLayout`; remove `stageCentreY` from the `./map/constants` import.
- replace `const orderOf = new Map(stages.map((s, i) => [s.id, i]));` with:

```ts
  /** Each era's trail geometry; the swing phase runs on along the main path. */
  const layouts = useMemo(() => {
    const orderOf = new Map(allStages().map((s, i) => [s.id, i]));
    return new Map(
      CAMPAIGN.map(
        (w) => [w.id, eraTrailLayout(w, orderOf.get(w.stages[0]?.id ?? '') ?? 0, width)] as const,
      ),
    );
  }, [width]);
  const layoutsRef = useRef<ReadonlyMap<string, TrailLayout>>(layouts);
  layoutsRef.current = layouts;
  const pulseIds = pulseStageIds(progress);
```
- `tryScroll`: after the `wrapper`/`trail` lookups add `const node = layoutsRef.current.get(stage.worldId)?.nodes.find((n) => n.stage.id === stage.id);`, change the guard to `if (wrapper === undefined || trail === undefined || node === undefined) return;` and `const y = wrapper + trail + node.y;`.
- in the `CAMPAIGN.map` render: delete `const startIndex = …`; pass `layout={layouts.get(world.id)!}` and `pulseIds={pulseIds}` to `EraTrail` instead of `startIndex`.
- `const stages = allStages();` is now unused — delete it.

- [ ] **Step 7: Run tests to verify they pass**

Run: `npx jest src/features/modes/campaign`
Expected: PASS, all suites.

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 8: Lint and commit**

Run: `npx eslint src/features/modes/campaign`
Expected: no errors.

```bash
git add src/features/modes/campaign
git commit -m "feat(campaign): draw route forks — lanes, banners, shared pulse, route labels

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 12: Swap the era backdrop sooner

**Files:**
- Modify: `src/features/modes/campaign/map/mapVisuals.ts` (append `backdropProbe`)
- Modify: `src/features/modes/campaign/map/EraBackdrop.tsx:16-17` (`CROSSFADE_MS`)
- Modify: `src/features/modes/campaign/CampaignMapScreen.tsx` (`trackEra`, ScrollView, section wrapper)
- Test: `src/features/modes/campaign/map/mapVisuals.test.ts`, `src/features/modes/campaign/map/EraBackdrop.test.tsx` (create), `src/features/modes/campaign/CampaignMapScreen.test.tsx`

**Interfaces:**
- Produces: `backdropProbe(scrollY: number, viewportHeight: number): number`; `export const CROSSFADE_MS = 200` from `EraBackdrop.tsx`; testIDs `campaign-scroll` (ScrollView) and `era-section-${world.id}` (era wrapper).

- [ ] **Step 1: Write the failing tests**

Append to `mapVisuals.test.ts` (and import `backdropProbe`):

```ts
describe('backdropProbe', () => {
  it('is the middle of the viewport in content space', () => {
    expect(backdropProbe(0, 800)).toBe(400);
    expect(backdropProbe(1150, 800)).toBe(1550);
  });
});
```

Create `src/features/modes/campaign/map/EraBackdrop.test.tsx`:

```tsx
import { act, render, screen } from '@testing-library/react-native';

import { CROSSFADE_MS, EraBackdrop } from './EraBackdrop';

describe('EraBackdrop', () => {
  afterEach(() => jest.useRealTimers());

  it('cross-fades in 200 ms and then drops the outgoing painting', () => {
    jest.useFakeTimers();
    expect(CROSSFADE_MS).toBe(200);
    const { rerender } = render(<EraBackdrop eraId="ancient" />);
    rerender(<EraBackdrop eraId="medieval" />);
    expect(screen.getByTestId('era-backdrop-ancient')).toBeOnTheScreen();
    expect(screen.getByTestId('era-backdrop-medieval')).toBeOnTheScreen();
    act(() => jest.advanceTimersByTime(260));
    expect(screen.queryByTestId('era-backdrop-ancient')).toBeNull();
  });
});
```

Append to `CampaignMapScreen.test.tsx` (inside the `describe`):

```ts
  it('swaps the painting once the next era crosses the middle of the screen', async () => {
    render(<CampaignMapScreen />);
    await waitFor(() => expect(screen.getByTestId(`era-backdrop-${ancient.id}`)).toBeOnTheScreen());
    const scroll = screen.getByTestId('campaign-scroll');
    const layout = (y: number, height: number) => ({
      nativeEvent: { layout: { x: 0, y, width: 400, height } },
    });
    fireEvent(scroll, 'layout', layout(0, 800));
    fireEvent(screen.getByTestId(`era-section-${ancient.id}`), 'layout', layout(0, 1500));
    fireEvent(screen.getByTestId(`era-section-${medieval.id}`), 'layout', layout(1500, 2000));
    const scrollTo = (y: number) =>
      fireEvent.scroll(scroll, { nativeEvent: { contentOffset: { x: 0, y } } });

    // The Middle Ages section starts 500 px down: below the middle line (400).
    scrollTo(1000);
    expect(screen.queryByTestId(`era-backdrop-${medieval.id}`)).toBeNull();
    // Now 350 px down: past the middle, so its painting takes over…
    scrollTo(1150);
    expect(screen.getByTestId(`era-backdrop-${medieval.id}`)).toBeOnTheScreen();
    // …while the sticky bar still names the era under it.
    expect(screen.getByTestId('sticky-era-title', HIDDEN)).toHaveTextContent(`ERA I · ${ancient.name}`);
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest src/features/modes/campaign/map src/features/modes/campaign/CampaignMapScreen.test.tsx`
Expected: FAIL — `backdropProbe is not a function`, `CROSSFADE_MS` undefined, `Unable to find an element with testID: campaign-scroll`.

- [ ] **Step 3: Implement**

Append to `mapVisuals.ts`:

```ts
/**
 * The content-space line that decides which era's painting is shown: the
 * vertical middle of the viewport, so the next era's scenery arrives as soon
 * as its banner crosses the middle of the screen.
 */
export function backdropProbe(scrollY: number, viewportHeight: number): number {
  return scrollY + viewportHeight / 2;
}
```

In `EraBackdrop.tsx`: `const CROSSFADE_MS = 400;` → `export const CROSSFADE_MS = 200;` (comment unchanged).

In `CampaignMapScreen.tsx`:
- import `backdropProbe` from `./map/mapVisuals`.
- add state/refs next to `viewEraId`:
  ```ts
  /** The era whose painting fills the screen: switches when its section crosses the middle. */
  const [backdropEraId, setBackdropEraId] = useState(CAMPAIGN[0]?.id);
  const backdropEraRef = useRef(backdropEraId);
  /** The scroll view's own height (the visible map), measured on layout. */
  const viewportH = useRef(height);
  ```
- in `trackEra`, right after `const sections = …`, insert:
  ```ts
    const backdropId = eraInView(sections, backdropProbe(y, viewportH.current));
    if (backdropId !== undefined && backdropId !== backdropEraRef.current) {
      backdropEraRef.current = backdropId;
      setBackdropEraId(backdropId);
    }
  ```
  (the rest of `trackEra` — sticky bar era and `bannerTucked` on `y + STICKY_BAR_SPACE` — stays as is.) Update the `trackEra` doc comment to: "Point the backdrop at the era crossing the middle of the viewport and the sticky bar at the era under the bar at scroll offset `y`, showing the bar only once that era's banner is tucked up beneath it."
- `{viewEraId !== undefined && <EraBackdrop eraId={viewEraId} />}` → `{backdropEraId !== undefined && <EraBackdrop eraId={backdropEraId} />}`
- `<ScrollView` gains `testID="campaign-scroll"` and
  ```tsx
  onLayout={(e) => {
    viewportH.current = e.nativeEvent.layout.height;
    trackEra(scrollY.current);
  }}
  ```
- the era wrapper `<View key={world.id} onLayout=…>` gains `testID={`era-section-${world.id}`}`.
- update the file-top comment "(cross-fading as the player scrolls between eras)" to "(cross-fading as each new era crosses the middle of the screen)".

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest src/features/modes/campaign`
Expected: PASS.

- [ ] **Step 5: Lint, types, commit**

Run: `npx eslint src/features/modes/campaign && npx tsc --noEmit`
Expected: no output.

```bash
git add src/features/modes/campaign
git commit -m "feat(campaign): swap era scenery at mid-screen with a 200 ms cross-fade

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 13: Final verification (automated + on the phone)

**Files:** none created. Fix-ups (if any) go in the file that owns the bug, with a regression test, committed separately.

**Interfaces:**
- Consumes: everything above.

- [ ] **Step 1: Types**

Run: `npx tsc --noEmit`
Expected: no output, exit 0.

- [ ] **Step 2: Full Jest suite**

Run: `npx jest 2>&1 | tail -8`
Expected: `Test Suites: N passed, N total` with 0 failed; snapshot count unchanged (0).

- [ ] **Step 3: Lint every touched file**

Run:
```bash
npx eslint $(git diff --name-only cf136ae..HEAD -- '*.ts' '*.tsx' | grep -v '^src/data/questionImages.ts$' | grep -v '^functions/')
```
Expected: no errors. (Pre-existing errors elsewhere are baseline.)

- [ ] **Step 4: Functions tests (catalogue changed)**

Run: `cd functions && npm test; cd ..`
Expected: `# fail 0`.

Run: `node -e "const c=require('./functions/src/social/catalogue.json');const v=Object.values(c);console.log(v.length, v.filter(r=>!r.inRotation).length)"`
Expected: `538 233`.

- [ ] **Step 5: Invariants recap**

Run: `npx jest src/features/modes/campaign/campaignMainPath.test.ts src/data/regionalExpansion.test.ts src/data/campaignRoutes.test.ts`
Expected: PASS — main path pinned, Daily pins unchanged, 150 route questions, all illustrated, out of rotation.

- [ ] **Step 6: Device check (Metro is already running on 8081 — do not start or stop it)**

```bash
ADB="$LOCALAPPDATA/Android/Sdk/platform-tools/adb.exe"
"$ADB" devices                                  # expect the Galaxy A55 (RZCY10VEV4X) listed as "device"
"$ADB" reverse tcp:8081 tcp:8081
"$ADB" shell pm list packages | grep historydateguesser   # pick the dev-client package from this list
```
Reload the JS bundle in the dev-client app on the phone (it is connected to the running Metro), open the Campaign tab, then capture:
```bash
SHOTS=$(mktemp -d)   # screenshots stay out of the repo
MSYS_NO_PATHCONV=1 "$ADB" exec-out screencap -p > "$SHOTS/01-map-top.png"
```
Scroll with short swipes only (`"$ADB" shell input swipe 540 1700 540 900 400`; never ≥ 1000 ms) and screenshot after each, viewing each PNG with Read. Check and record:
1. The Ancient fork after stage 2: two lanes, two banners ("🏺 Egypt & the Near East ★ n/9", "🏛️ Greece & Rome ★ n/9") fully on screen, no overlap with nodes, START bubble or owl.
2. Dotted connectors leave stage 2 into both lanes and merge into stage 3.
3. Scrolling from Ancient into the Middle Ages: the painting switches as the Middle Ages banner passes mid-screen, not later; the fade is quick.
4. Play through the fork: clear Ancient stages 1–2 (or confirm existing progress already has them), tap "Continue your quest →" on stage 2's summary and confirm it returns to the map showing the fork with route A's first stage as START and both openers pulsing; play route A stage 1 and confirm its summary continues to route A stage 2. If driving whole rounds over adb proves unreliable (see device recipe), ask the user to play those stages on the phone and report back, then screenshot the result.
Write down what was checked and any defect; fix defects in the owning task's files with a regression test and commit (`fix(campaign): …` + trailer).

- [ ] **Step 7: Confirm nothing was deployed or pushed**

Run: `git status --short && git log --oneline cf136ae..HEAD`
Expected: clean tree; ~13 commits on `feat/social`; no push, no `firebase deploy`, no `eas build`, no reseed were run.

---

## Self-review (done while writing)

- **Spec coverage:** §1 content → Tasks 2, 5–9 (specs/ids/icons, 150 questions, era bounds, easy→hard ordering, art, pack location, rotation, functions catalogue). §2 data model → Task 3 (`CampaignRoute`, route stage ids + `routeId`, `routes`, fork position, main path pinned by Task 1). §3 unlocking rules 1–5, `nextStage` fork result, `{ kind: 'map', focusStageId }`, premium inheritance, stars/complete/mastered, `allStages` vs `allStagesIncludingRoutes`, `getStage` → Task 4. §4 lanes, banners, zig-zag continuation, frontier/START/owl/pulse, stage titles, testIDs → Tasks 3, 10, 11. §5 mid-screen swap + 200 ms → Task 12. §6 testing → Tasks 1, 2, 4, 5–11; device → Task 13. Rollout (no reseed, no server) → Global Constraints.
- **Placeholders:** none; the 28 non-example questions per era are content to author under explicit acceptance tests, not code placeholders.
- **Type consistency:** `NextStep`/`nextStage`, `QuestAction.map.focusStageId`, `frontierStage`, `pulseStageIds`, `starsEarned`, `worldStages`, `allStagesIncludingRoutes`, `eraTrailLayout`/`TrailLayout`, `routeLane`, `RouteBanner` props and `EraTrail` props match across Tasks 3, 4, 10, 11, 12.
- **Review Focus:** each of the five lines has a test in its owning task (Task 4 legacy/chosen/finished-route frontier; Task 10 widths 320–430; Task 11 stage-screen deep links).
