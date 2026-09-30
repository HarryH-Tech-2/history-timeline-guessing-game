/**
 * Generates one illustration per question via the Gemini image API and writes
 * them to `assets/questions/<question-id>.jpg`, then regenerates the static
 * require-map at `src/data/questionImages.ts` (Metro needs literal `require`
 * calls, so the map is code-generated rather than built at runtime).
 *
 * Usage:
 *   NANOBANANA_API_KEY=<key> npm run generate:images   (nanobananaapi.ai, preferred)
 *   GEMINI_API_KEY=<key> npm run generate:images       (Google Gemini API)
 *   ... -- --limit 1 --concurrency 6                   (trial run / render six at a time)
 *   npm run generate:images -- --map-only   (no key: just rebuild the require-map)
 *
 * Already-generated images are skipped, so re-running only fills gaps; delete
 * an image file to force its regeneration. The API key is read from the
 * environment on purpose — never commit it.
 *
 * This is a build-time tool. It reads the seed array directly (not via the
 * app's `@/` aliases) so it runs cleanly under tsx.
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { QUESTIONS } from '../src/data/questions';

const API_URL = 'https://generativelanguage.googleapis.com/v1beta/interactions';
const MODEL = 'gemini-3.1-flash-image';

const PROMPT_TEMPLATE =
  'Present a clear, 45° top-down isometric miniature 3D cartoon scene of ' +
  '[EVENT], with its most iconic features. Use soft, refined textures with ' +
  'realistic PBR materials and gentle, lifelike lighting and shadows. Use a ' +
  'clean, minimalistic composition with a soft, solid-colored background. ' +
  'Square 1080x1080 dimension. Absolutely no text, numbers, dates, letters, ' +
  'labels, captions or signage anywhere in the image.';

const ASSETS_DIR = path.join(__dirname, '..', 'assets', 'questions');
const MAP_FILE = path.join(__dirname, '..', 'src', 'data', 'questionImages.ts');

interface InteractionStep {
  type?: string;
  content?: Array<{ type?: string; mime_type?: string; data?: string }>;
}

/**
 * Scenes described symbolically instead of literally: atrocities and
 * disasters the image model's safety filter blocks (or that shouldn't be
 * drawn as cartoons at all), and subjects whose literal depiction would be
 * lettering the prompt forbids.
 */
const EVENT_OVERRIDES: Record<string, string> = {
  'reg-hiroshima-bomb':
    'the Hiroshima Peace Memorial dome standing by a quiet river, with strings of paper cranes and a memorial flame',
  'reg-rwandan-genocide':
    'a quiet memorial on green terraced Rwandan hills, with candles and purple mourning ribbons',
  'reg-ebola-first-outbreak':
    'a small 1970s mission hospital by a river in the Congo rainforest, with doctors in white coats and a microscope',
  'reg-franz-ferdinand-assassinated':
    'a 1914 open-top royal motorcar on a Sarajevo street beside a small stone bridge over a river',
  'reg-hangul-promulgated':
    'King Sejong the Great in royal Joseon robes holding a blank scroll in a palace hall',
  // Anachronism guard: left alone, the model adds the (1973) Opera House.
  'reg-sydney-harbour-bridge':
    'the brand-new steel arch Sydney Harbour Bridge on opening day in the early 1930s, with vintage cars, a ceremonial ribbon and crowds, and only low 1930s buildings and bushland around the harbour (no modern skyline, no opera house)',
  // Airline livery lettering slipped through the no-text rule.
  'reg-khomeini-returns':
    'a plain unmarked white jumbo jet parked on an airport apron in Tehran with a huge welcoming crowd and the Azadi Tower in the background',
  // Campaign routes (2026-09-29): first renders showed lettering or anachronisms.
  'rte-siege-of-lachish':
    'Assyrian soldiers with ladders, archers and a wooden battering ram on an earthen siege ramp against the stone walls of a hilltop Judean town, with no cannons or gunpowder',
  'rte-death-of-julian':
    'a late Roman emperor in a gilded helmet slumped on his horse beside a Mesopotamian riverbank with palm trees and Persian cavalry, all banners plain red without symbols',
  'rte-great-fire-of-rome':
    'ancient Rome ablaze at night around the long Circus Maximus, with flat-roofed brick Roman apartment blocks, marble temples on the Palatine Hill and citizens fleeing (no timber-framed houses)',
  'rte-battle-of-the-milvian-bridge':
    'Roman legions clashing on an old stone arch bridge over the river Tiber, soldiers falling into the water, with plain unmarked shields and plain purple banners',
  'rte-council-of-nicaea':
    'Roman emperor Constantine in purple robes seated among robed bishops on wooden benches in a columned late Roman hall, with plain walls and no mosaics, books or writing',
  'rte-constantinople-inaugurated':
    'a grand late Roman ceremony in a new city on the Bosporus, with a porphyry column topped by a gilded statue, a chariot-racing hippodrome, colonnaded forums and harbours full of galleys (no domed mosques, no minarets)',
  'rte-death-of-cleopatra':
    'the Egyptian queen Cleopatra lying on a golden couch in a Ptolemaic palace chamber with lotus columns, an asp in a basket of figs and grieving handmaidens, walls painted with plain colour bands and no hieroglyphs',
  // Medieval routes (2026-09-29): first renders showed lettering, characters or anachronisms.
  'rte-ming-dynasty-founded':
    'the first Ming emperor in gold-and-red armour on horseback leading soldiers through the gate of a Chinese walled city at dawn, with plain red and yellow flags carrying only a dragon or plain colour, no characters or writing anywhere',
  'rte-tang-dynasty-founded':
    'a founding emperor in golden robes being enthroned on a raised dais in a Tang-style palace courtyard with officials bowing, plain coloured silk banners with no writing or symbols, no characters anywhere',
  'rte-song-dynasty-founded':
    'a general in yellow imperial robes being draped in a yellow cloak by cheering soldiers on a dirt road outside a Chinese city gate, plain coloured banners with no writing, no characters anywhere',
  'rte-yuan-dynasty-proclaimed':
    'Kublai Khan in Mongol-Chinese silk robes on a throne under a domed canopy in a Chinese palace courtyard as officials in Chinese and Mongol dress kneel, all banners and boards completely blank with no writing, no characters, no letters',
  'rte-diamond-sutra-printed':
    'a Tang-dynasty craftsman in a plain robe peeling a long blank paper sheet from a carved wooden printing block on a wooden workshop table, with ink pot, brush and rolled scrolls, all paper showing only blurry grey texture and no writing or characters',
  'rte-battle-of-nicopolis':
    'a medieval crusader cavalry charge of French and Hungarian knights in plate and mail uphill against Ottoman lines with wooden stakes, a Danube riverside stone fortress town in the background with plain roofs, no minarets and no domes',
  'rte-treaty-of-stralsund':
    'a medieval Danish king in a blue robe kneeling before Hanseatic merchants in dark furred gowns at a table with a blank parchment inside a red-brick Baltic port town hall courtyard, ships with plain unmarked flags in the harbour, no writing or signs anywhere',
  // Early Modern routes (2026-09-29): first renders showed lettering or anachronistic flags.
  'rte-cartier-cross-gaspe':
    'the French explorer Jacques Cartier in a blue doublet and plumed hat raising a tall plain wooden cross on a rocky Gaspé shore with a few French sailors in 1500s dress and Indigenous Iroquoian men watching, a small plain blue shield with three golden fleurs-de-lis hanging on the cross, two carracks anchored in the bay, no writing, no letters, no tricolour flag anywhere',
  'rte-copernicus-de-revolutionibus':
    'Nicolaus Copernicus in a dark scholar robe and cap beside a round wooden orrery model with a glowing golden sun at the centre and small planets on circular brass orbits including a small blue Earth, an astrolabe and unmarked closed books on his desk, no text, no letters, no labels anywhere',
  'rte-hudson-new-york-bay':
    'a small 1600s Dutch three-masted ship with plain blank cream sails sailing into a wide forested river estuary with tall autumn trees, Lenape bark wigwams with smoke and dugout canoes along the shore, a plain orange-white-blue flag, no lettering or symbols on the sails',
  'rte-mackenzie-reaches-pacific':
    'a 1790s fur-trader explorer in a tricorn hat and frontier coat standing on a coastal granite boulder beside a cedar-bark canoe with voyageurs and Indigenous guides, a Pacific fjord with cliffs and cedars, the boulder completely bare and smooth, no writing, no letters, no inscription anywhere',
  'rte-bering-sights-alaska':
    'two small 1700s Russian sailing packet ships with plain white flags carrying a simple blue diagonal cross approaching a snowy volcanic Alaskan coast with a tall snow-capped peak, sailors in dark coats in a rowboat near an ice-rimmed shore, no writing, no tricolour flags',
  'rte-expedition-of-the-thousand':
    'a small Italian harbour in 1860 with two plain black-hulled steamships at a stone quay, hundreds of volunteers in red shirts boarding by gangplanks, a leader in a red shirt and poncho on the deck, plain unmarked hulls, no writing, no ship names, no letters anywhere',
  'rte-golden-spike':
    'two 1860s wood-burning steam locomotives nose to nose on a single track in a desert valley, workers and officials gathered around a small ceremonial gold spike being tapped into the last rail tie, flags and top hats, plain unmarked locomotive tenders, no writing, no numbers, no letters anywhere',
  'rte-lincoln-assassinated':
    'a candlelit 1860s theatre with a box balcony decorated in bunting, a tall bearded man in a black suit seated in a rocking chair beside a woman in a grey gown, ONE lone man in a dark suit stepping in behind them from the back of the box holding a small pistol, audience below, actors on stage, no writing',
  'rte-emancipation-proclamation':
    'a Union Army camp in autumn 1862 with white tents, blue-coated soldiers, and a crowd of freed families in period clothing cheering, a broken iron chain lying on the bare ground, a tall man in a black frock coat and stovepipe hat holding a scroll on a small wooden platform, a flagpole with the American flag, no writing, no food items on the ground',
  // Campaign routes, Modern Era (2026-09-29): first renders showed lettering.
  'rte-operation-dynamo':
    'the beach and harbour mole at Dunkirk with long orderly queues of soldiers in khaki, small civilian boats and fishing boats ferrying them to plain unmarked grey destroyers, smoke rising over the seafront, all hulls completely blank with no markings',
  'rte-ve-day':
    'a joyful crowd of civilians and soldiers dancing in a European city street with plain coloured bunting and waving flags, an army jeep, a stone triumphal arch behind, all vehicles plain with no lettering or signs',
  'rte-second-el-alamein':
    'a wide North African desert battlefield with British Sherman and Crusader tanks advancing across sand dunes, minefield stakes with plain red flags, artillery and trucks, no text or labels anywhere on the ground',
  'rte-polio-vaccine-safe':
    'a cheerful 1950s town square where nurses, doctors in white coats and smiling children with parents celebrate with confetti outside a plain brick clinic with a blank sign, vials of vaccine on a table, no words or signs anywhere',
  'rte-comet-jetliner-service':
    'a sleek silver 1950s four-engine jet airliner with a plain unmarked white and silver fuselage, engines buried in the wing roots, taking off from an airfield with a plain terminal building and blank signs, passengers boarding by stairs, no lettering',
  'rte-concorde-service':
    'two white supersonic delta-wing airliners with completely plain unmarked white fuselages and plain blue tail fins parked at a modern airport apron with boarding stairs and passengers, no lettering, logos or flags',
  'rte-macintosh-release':
    'a small cream 1980s all-in-one compact computer with a tiny screen showing a smiling face icon, on a wooden shop counter with shoppers curiously watching, plain unmarked cardboard boxes on shelves, no lettering or logos',
  'rte-arpanet-first-message':
    'two 1960s room-sized computers in separate rooms linked by a thick cable, a young researcher at a teletype terminal typing in each room, a glowing line of connection between them, plain screens and panels with no text or letters',
};

/**
 * The year is deliberately EXCLUDED from the description: image models often
 * render it into the scene (plaques, captions), which spoils the answer in a
 * date-guessing game — and sometimes they even paint a WRONG year.
 */
function eventDescription(q: (typeof QUESTIONS)[number]): string {
  return EVENT_OVERRIDES[q.id] ?? `${q.title} — ${q.subtitle}`;
}

type Generator = (event: string) => Promise<Buffer>;

const NANOBANANA_API = 'https://api.nanobananaapi.ai/api/v1/nanobanana';
const POLL_MS = 4000;
const POLL_TIMEOUT_MS = 4 * 60 * 1000;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * nanobananaapi.ai (Nano Banana 2, 1K, ~$0.04 an image). Asynchronous: submit
 * a task, poll its record until it succeeds, then download the result.
 */
function nanoBananaGenerator(apiKey: string): Generator {
  const headers = { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' };
  return async (event) => {
    const submit = await fetch(`${NANOBANANA_API}/generate-2`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        prompt: PROMPT_TEMPLATE.replace('[EVENT]', event),
        imageUrls: [],
        aspectRatio: '1:1',
        resolution: '1K',
        outputFormat: 'jpg',
      }),
    });
    const submitted = (await submit.json()) as { code?: number; msg?: string; data?: { taskId?: string } };
    const taskId = submitted.data?.taskId;
    if (!submit.ok || submitted.code !== 200 || !taskId) {
      throw new Error(`submit failed: ${submitted.code ?? submit.status} ${submitted.msg ?? ''}`);
    }

    const deadline = Date.now() + POLL_TIMEOUT_MS;
    while (Date.now() < deadline) {
      await sleep(POLL_MS);
      const poll = await fetch(`${NANOBANANA_API}/record-info?taskId=${encodeURIComponent(taskId)}`, {
        headers,
      });
      const record = (await poll.json()) as {
        data?: {
          successFlag?: number;
          errorMessage?: string;
          response?: { resultImageUrl?: string; originImageUrl?: string };
        };
      };
      const flag = record.data?.successFlag;
      if (flag === 0 || flag === undefined) continue;
      if (flag !== 1) throw new Error(`generation failed (${flag}): ${record.data?.errorMessage ?? ''}`);
      const url = record.data?.response?.resultImageUrl ?? record.data?.response?.originImageUrl;
      if (!url) throw new Error('task succeeded without an image URL');
      const image = await fetch(url);
      if (!image.ok) throw new Error(`download failed: HTTP ${image.status}`);
      return Buffer.from(await image.arrayBuffer());
    }
    throw new Error(`timed out waiting for task ${taskId}`);
  };
}

function geminiGenerator(apiKey: string): Generator {
  return (event) => generateImage(apiKey, event);
}

async function generateImage(apiKey: string, event: string): Promise<Buffer> {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: { 'x-goog-api-key': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      input: [{ type: 'text', text: PROMPT_TEMPLATE.replace('[EVENT]', event) }],
      response_format: {
        type: 'image',
        mime_type: 'image/jpeg',
        aspect_ratio: '1:1',
        image_size: '1K',
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${(await response.text()).slice(0, 300)}`);
  }

  const body = (await response.json()) as { steps?: InteractionStep[] };
  for (const step of body.steps ?? []) {
    const image = step.content?.find((c) => c.type === 'image' && c.data);
    if (image?.data) return Buffer.from(image.data, 'base64');
  }
  throw new Error('response contained no image data');
}

/**
 * Rebuild the require-map from whatever images exist on disk. Fresh renders
 * land as .jpg; `python scripts/optimizeImages.py` later converts them to the
 * smaller .webp (and rewrites this map), so both extensions are recognised.
 */
function imageFileFor(id: string): string | null {
  for (const ext of ['webp', 'jpg']) {
    if (existsSync(path.join(ASSETS_DIR, `${id}.${ext}`))) return `${id}.${ext}`;
  }
  return null;
}

function writeRequireMap(): number {
  const files = QUESTIONS.map((q) => [q.id, imageFileFor(q.id)] as const).filter(
    (pair): pair is readonly [string, string] => pair[1] !== null,
  );
  const ids = files.map(([id]) => id);

  const entries = files
    .map(([id, file]) => `  '${id}': require('../../assets/questions/${file}'),`)
    .join('\n');

  writeFileSync(
    MAP_FILE,
    `/**
 * AUTO-GENERATED by scripts/generateQuestionImages.ts — do not edit by hand.
 * Static \`require\` calls so Metro bundles each illustration; keyed by
 * question id. Questions without a generated image are simply absent.
 */
import type { ImageSourcePropType } from 'react-native';

export const QUESTION_IMAGES: Record<string, ImageSourcePropType> = {
${entries}
};

export function imageForQuestion(id: string): ImageSourcePropType | undefined {
  return QUESTION_IMAGES[id];
}
`,
  );
  return ids.length;
}

async function main(): Promise<void> {
  // Images rendered elsewhere (e.g. via Higgsfield) only need the map rebuilt.
  if (process.argv.includes('--map-only')) {
    const mapped = writeRequireMap();
    console.log(`Require-map rebuilt: ${mapped} of ${QUESTIONS.length} questions have images.`);
    return;
  }

  // nanobananaapi.ai when its key is set, otherwise Google's Gemini API.
  const nanoKey = process.env.NANOBANANA_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;
  if (!nanoKey && !geminiKey) {
    console.error('Set NANOBANANA_API_KEY or GEMINI_API_KEY. Aborting.');
    process.exitCode = 1;
    return;
  }
  const generate = nanoKey ? nanoBananaGenerator(nanoKey) : geminiGenerator(geminiKey!);
  console.log(`Provider: ${nanoKey ? 'nanobananaapi.ai (Nano Banana 2, 1K)' : `Gemini ${MODEL}`}`);

  // `--limit N` renders at most N missing images (a cheap trial run).
  const limitIndex = process.argv.indexOf('--limit');
  const limit = limitIndex >= 0 ? Number(process.argv[limitIndex + 1]) : Infinity;

  // `--concurrency N` renders N at once (the async provider spends most of its
  // time waiting on the queue, so a handful in flight cuts the wall clock).
  const concurrencyIndex = process.argv.indexOf('--concurrency');
  const concurrency = concurrencyIndex >= 0 ? Number(process.argv[concurrencyIndex + 1]) : 1;

  mkdirSync(ASSETS_DIR, { recursive: true });

  // Rendered art is later converted to .webp, so check every extension —
  // checking only .jpg would re-render (and re-bill) the whole catalogue.
  const queue = QUESTIONS.filter((q) => imageFileFor(q.id) === null).slice(0, limit);

  let generated = 0;
  let failed = 0;

  const worker = async (): Promise<void> => {
    for (let question = queue.shift(); question; question = queue.shift()) {
      try {
        const image = await generate(eventDescription(question));
        writeFileSync(path.join(ASSETS_DIR, `${question.id}.jpg`), image);
        generated += 1;
        console.log(`generated ${question.id} (${Math.round(image.length / 1024)} KB)`);
      } catch (error) {
        failed += 1;
        console.error(`FAILED    ${question.id}: ${(error as Error).message}`);
      }
    }
  };
  await Promise.all(Array.from({ length: Math.max(1, concurrency) }, worker));

  const mapped = writeRequireMap();
  console.log(`\nDone: ${generated} generated, ${failed} failed, ${mapped} in require-map.`);
  if (failed > 0) process.exitCode = 1;
}

void main();
