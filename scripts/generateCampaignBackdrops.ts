/**
 * Generates the campaign map's per-era background scenes (one tall 9:16
 * painting per era) via nanobananaapi.ai, into the directory given as the
 * first argument (raw JPGs; convert/compress to assets/campaign/ afterwards).
 *
 *   NANOBANANA_API_KEY=<key> npx tsx scripts/generateCampaignBackdrops.ts <outDir> [eraId...]
 *
 * ~$0.04 an image. Pass era ids to regenerate only those.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const NANOBANANA_API = 'https://api.nanobananaapi.ai/api/v1/nanobanana';
const POLL_MS = 4000;
const POLL_TIMEOUT_MS = 4 * 60 * 1000;

const STYLE =
  'A tall vertical illustrated background for a mobile history game\'s level map, in a soft painterly storybook style like a modern casual mobile game: warm, friendly, gentle light, rounded shapes. ' +
  'Keep a calm, open, low-detail winding ground area running down the centre of the whole image (where round level buttons will sit), with the landmarks and scenery toward the left and right edges and in the distance at the top. ' +
  'Slightly muted colours so bright buttons on top stay readable. No text, no letters, no numbers, no signs, no UI, no borders or frames, no close-up faces. Scene: ';

const ERAS: Record<string, string> = {
  ancient:
    'the ancient world at golden hour — desert sand, the pyramids of Giza and palm trees along the Nile on one side, white Greek temple columns and olive trees on a hill on the other, a sphinx in the distance.',
  medieval:
    'the Middle Ages — rolling green hills and meadows, a stone castle with banners on a hill, a walled village with a church spire, dark forest edges, a windmill, soft morning light.',
  'early-modern':
    'the early modern age of exploration — a harbour town with Renaissance domes and red-tiled roofs, tall-masted galleons at anchor in a turquoise bay, a lighthouse, maps-and-compass colours, bright afternoon.',
  nineteenth:
    'the 19th century industrial age — brick factories with tall smoking chimneys, a steam locomotive crossing an iron bridge, gas street lamps, a canal with barges, warm sunset haze.',
  modern:
    'the modern era — a city skyline of skyscrapers at dusk with lit windows, a rocket lifting off in the distance, a highway and parks, an airliner in a violet-and-blue evening sky.',
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function generate(apiKey: string, scene: string): Promise<Buffer> {
  const headers = { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' };
  const submit = await fetch(`${NANOBANANA_API}/generate-2`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      prompt: STYLE + scene,
      imageUrls: [],
      aspectRatio: '9:16',
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
    const poll = await fetch(`${NANOBANANA_API}/record-info?taskId=${encodeURIComponent(taskId)}`, { headers });
    const record = (await poll.json()) as {
      data?: { successFlag?: number; errorMessage?: string; response?: { resultImageUrl?: string; originImageUrl?: string } };
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
}

async function main() {
  const apiKey = process.env.NANOBANANA_API_KEY;
  const [outDir, ...only] = process.argv.slice(2);
  if (!apiKey || !outDir) throw new Error('usage: NANOBANANA_API_KEY=… tsx scripts/generateCampaignBackdrops.ts <outDir> [eraId…]');
  await mkdir(outDir, { recursive: true });
  const ids = only.length > 0 ? only : Object.keys(ERAS);
  await Promise.all(
    ids.map(async (id) => {
      const scene = ERAS[id];
      if (!scene) throw new Error(`unknown era ${id}`);
      const jpg = await generate(apiKey, scene);
      await writeFile(join(outDir, `era-${id}.jpg`), jpg);
      console.log(`wrote era-${id}.jpg (${jpg.length} bytes)`);
    }),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
