/**
 * Export the achievement catalogue for Google Play Console.
 *
 *   npm run achievements:export
 *
 * Writes, under assets/store/achievements/:
 * - achievements.csv — a human-readable sheet (one row per achievement);
 * - achievements.json — the manifest scripts/achievementIcons.py renders the
 *   512×512 icons from;
 * - play-import/*.csv — the three header-less CSVs Play Console's
 *   "Import achievements" ZIP expects (the Python script zips them with the
 *   icons into play-achievements-import.zip).
 *
 * Once the Console has generated each achievement's id, paste it into
 * src/features/progression/playGamesAchievements.ts.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { ACHIEVEMENTS } from '../src/features/progression/achievements';
import {
  MAX_TOTAL_POINTS,
  PLAY_GAMES_ACHIEVEMENTS,
} from '../src/features/progression/playGamesAchievements';

const OUT_DIR = join(__dirname, '..', 'assets', 'store', 'achievements');

function csvCell(value: string | number): string {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

const rows = ACHIEVEMENTS.map((a) => {
  const play = PLAY_GAMES_ACHIEVEMENTS[a.id];
  if (!play) throw new Error(`No Play Games entry for achievement "${a.id}"`);
  return {
    id: a.id,
    name: a.title,
    description: a.description,
    points: play.points,
    type: 'Standard',
    initialState: 'Revealed',
    icon: `icons/${a.id}.png`,
    emoji: a.icon,
    playId: play.playId,
  };
});

const total = rows.reduce((n, r) => n + r.points, 0);
if (total > MAX_TOTAL_POINTS) {
  throw new Error(`Achievement points total ${total} exceeds Play's ${MAX_TOTAL_POINTS} cap`);
}

const header = ['In-app id', 'Name', 'Description', 'Points', 'Type', 'Initial state', 'Icon'];
const csv = [
  header.join(','),
  ...rows.map((r) =>
    [r.id, r.name, r.description, r.points, r.type, r.initialState, r.icon].map(csvCell).join(','),
  ),
].join('\n');

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(join(OUT_DIR, 'achievements.csv'), `${csv}\n`, 'utf8');

// Play Console's bulk importer (Achievements → Import achievements) takes a
// flat ZIP of these three header-less CSVs plus the icon files. The CSVs are
// written here; scripts/achievementIcons.py adds the icons and zips the lot.
//   AchievementsMetadata.csv: Name,Description,Incremental value,Steps Needed,Initial State,Points,List Order
//   AchievementsLocalizations.csv: Name,Localized name,Localized description,Locale
//   AchievementsIconsMappings.csv: Name,Icon file name
const PLAY_DIR = join(OUT_DIR, 'play-import');
/**
 * Extra locales for AchievementsLocalizations.csv. The importer REJECTS rows in
 * the game's default locale ("Wrong locale - choose a locale that is different
 * than the game's default"): the metadata file already carries the default
 * text. The game is English-only, so this stays empty and the file is shipped
 * with no rows (the importer still expects it to exist).
 */
const EXTRA_LOCALES: readonly { locale: string; name: (r: (typeof rows)[number]) => string; description: (r: (typeof rows)[number]) => string }[] = [];
mkdirSync(PLAY_DIR, { recursive: true });
writeFileSync(
  join(PLAY_DIR, 'AchievementsMetadata.csv'),
  `${rows
    .map((r, i) =>
      [r.name, r.description, 'False', '', r.initialState, r.points, i + 1].map(csvCell).join(','),
    )
    .join('\n')}\n`,
  'utf8',
);
const localizationRows = EXTRA_LOCALES.flatMap(({ locale, name, description }) =>
  rows.map((r) => [r.name, name(r), description(r), locale].map(csvCell).join(',')),
);
writeFileSync(
  join(PLAY_DIR, 'AchievementsLocalizations.csv'),
  localizationRows.length > 0 ? `${localizationRows.join('\n')}\n` : '',
  'utf8',
);
writeFileSync(
  join(PLAY_DIR, 'AchievementsIconsMappings.csv'),
  `${rows.map((r) => [r.name, `${r.id}.png`].map(csvCell).join(',')).join('\n')}\n`,
  'utf8',
);
writeFileSync(
  join(OUT_DIR, 'achievements.json'),
  `${JSON.stringify(
    rows.map(({ id, name, points, emoji, playId }) => ({ id, name, points, emoji, playId })),
    null,
    2,
  )}\n`,
  'utf8',
);

console.log(`Wrote ${rows.length} achievements (${total}/${MAX_TOTAL_POINTS} points) to ${OUT_DIR}`);
