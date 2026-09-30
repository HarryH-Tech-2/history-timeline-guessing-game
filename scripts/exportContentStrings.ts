/**
 * Dumps the player-visible content text (English) that the translation
 * overlays in src/data/i18n must cover, as JSON on stdout:
 *   npx tsx scripts/exportContentStrings.ts > content-en.json
 * Question images are bundled `require()`s; stub them so the catalogue loads
 * outside Metro.
 */
/* eslint-disable @typescript-eslint/no-require-imports */
const Module = require('module') as { _extensions: Record<string, (m: { exports: unknown }) => void> };
Module._extensions['.webp'] = (m) => {
  m.exports = 1;
};
Module._extensions['.png'] = Module._extensions['.webp'];

const data = require('../src/data') as typeof import('../src/data');
const { TOPICS } = require('../src/data/topics') as typeof import('../src/data/topics');

const out = {
  categories: Object.fromEntries(
    data.getCategories().map((c) => [c.id, { name: c.name, description: c.description }]),
  ),
  questions: Object.fromEntries(
    data.getQuestions().map((q) => [q.id, { title: q.title, longDescription: q.longDescription }]),
  ),
  topics: Object.fromEntries(TOPICS.map((t) => [t.id, { name: t.name, blurb: t.blurb }])),
  regions: Object.fromEntries(data.REGIONS.map((r) => [r.id, { name: r.name, blurb: r.blurb }])),
  routes: Object.fromEntries(data.CAMPAIGN_ROUTE_SPECS.map((r) => [r.id, { name: r.name }])),
};

process.stdout.write(`${JSON.stringify(out, null, 2)}\n`);
