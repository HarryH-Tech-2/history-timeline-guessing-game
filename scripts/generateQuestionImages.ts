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
