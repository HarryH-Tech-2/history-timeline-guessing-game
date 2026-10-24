import type { Question } from '@/domain';
import { mulberry32, pickDeterministic } from '@/utils/rng';

import { NARROW_GRADED_IDS } from './rotation';

/**
 * How widely known a question's subject is, which is not what `difficulty`
 * measures: that grades how hard the year is to place, and the campaign orders
 * its stages by it, so it can't be re-graded without moving questions between
 * stages players have already starred. Fame only decides how often a question
 * turns up in the Daily and the random modes.
 */
export type FameTier = 'famous' | 'known' | 'niche' | 'obscure';

const TIERS: readonly FameTier[] = ['famous', 'known', 'niche', 'obscure'];

/** Share of random draws each tier gets (Endless, Survival, short category runs). */
const TIER_WEIGHT: Record<FameTier, number> = {
  famous: 0.45,
  known: 0.35,
  niche: 0.17,
  obscure: 0.03,
};

/** The Daily's fixed mix: eight rounds, none of them obscure. */
const DAILY_MIX: readonly (readonly [FameTier, number])[] = [
  ['famous', 4],
  ['known', 3],
  ['niche', 1],
];

/**
 * The first Daily dealt with the fame mix. Earlier days keep the uniform draw,
 * so a past Daily still reproduces, and builds from before the change agree
 * with newer ones up to this date.
 */
export const DAILY_FAME_MIX_FROM = '2026-10-12';

const DIFFICULTY_TIER: Record<Question['difficulty'], FameTier> = {
  easy: 'famous',
  medium: 'known',
  hard: 'niche',
  expert: 'obscure',
};

function ids(tier: FameTier, list: readonly string[]): [string, FameTier][] {
  return list.map((id) => [id, tier]);
}

/**
 * Where difficulty misjudges fame. Magna Carta is hard to date but everyone
 * has heard of it; the Anglo-Zanzibar War is easy to date and almost nobody has.
 */
const TIER_OVERRIDES: ReadonlyMap<string, FameTier> = new Map([
  ...ids('famous', [
    'evt-french-revolution',
    'evt-magna-carta',
    'evt-columbus',
    'evt-russian-revolution',
    'evt-great-fire-london',
    'evt-caesar-assassination',
    'evt-vesuvius',
    'evt-black-death',
    'evt-boston-tea-party',
    'evt-versailles-treaty',
    'evt-tutankhamun',
    'evt-hindenburg',
    'evt-fall-western-rome',
    'bat-hastings',
    'bat-waterloo',
    'bat-gettysburg',
    'bat-stalingrad',
    'bat-spanish-armada',
    'ppl-curie',
    'ppl-davinci',
    'ppl-newton',
    'ppl-shakespeare',
    'ppl-napoleon',
    'ppl-gandhi',
    'ppl-mandela',
    'ppl-darwin',
    'ppl-mozart',
    'ppl-victoria',
    'ppl-elizabeth-i',
    'ppl-galileo',
    'ppl-washington',
    'ppl-lincoln',
    'ppl-van-gogh',
    'ppl-churchill',
    'ppl-mlk',
    'ppl-anne-frank',
    'tec-telephone',
    'tec-world-wide-web',
    'tec-printing-press',
    'tec-penicillin',
    'tec-automobile',
    'tec-dna-double-helix',
    'tec-sputnik',
    'art-david',
    'art-sistine-chapel',
    'art-taj-mahal',
    'art-starry-night',
    'art-beatles-ed-sullivan',
    'art-empire-state',
    'phi-communist-manifesto',
    'con-panama-canal',
    'exp-magellan',
    'exp-everest',
    'trt-un-charter',
    'spt-world-cup-1930',
    'spc-hubble',
    'reg-ninety-five-theses',
    'reg-gunpowder-plot',
    'reg-franz-ferdinand-assassinated',
    'reg-prc-proclaimed',
    'reg-hiroshima-bomb',
    'reg-cuban-missile-crisis',
    'rte-death-of-cleopatra',
    'rte-crossing-the-rubicon',
    'rte-joan-of-arc-burned',
    'rte-emancipation-proclamation',
    'rte-lincoln-assassinated',
    'rte-armistice-compiegne',
    'rte-invasion-of-poland',
    'rte-operation-dynamo',
    'rte-pearl-harbor',
    'rte-ve-day',
  ]),
  ...ids('known', [
    'evt-constantinople',
    'evt-rosetta-stone',
    'evt-hijra',
    'bat-thermopylae',
    'bat-agincourt',
    'bat-trafalgar',
    'bat-marathon',
    'ppl-alexander',
    'ppl-caesar',
    'ppl-aristotle',
    'ppl-augustus',
    'ppl-nightingale',
    'ppl-marcus-aurelius',
    'tec-television',
    'tec-transistor',
    'tec-steam-engine',
    'tec-telescope',
    'tec-photography',
    'tec-heart-transplant',
    'art-parthenon',
    'art-don-quixote',
    'art-swan-lake',
    'art-notre-dame',
    'art-wizard-of-oz',
    'phi-socrates-trial',
    'con-meiji-restoration',
    'exp-marco-polo',
    'exp-cook-botany-bay',
    'exp-lewis-clark',
    'exp-livingstone-stanley',
    'exp-shackleton',
    'exp-earhart',
    'trt-paris-climate',
    'spt-hand-of-god',
    'trd-lehman',
    'spc-mir',
    'spc-jwst',
    'reg-hong-kong-handover',
    'reg-south-africa-1994',
    'reg-canada-confederation',
    'reg-pisa-tower-begun',
    'reg-lisbon-earthquake',
    'reg-london-underground-opens',
    'reg-qin-unification',
    'reg-carthage-destroyed',
    'reg-mexican-revolution',
    'reg-haiti-earthquake',
    'rte-council-of-nicaea',
    'rte-paris-commune',
    'rte-faraday-induction',
    'rte-mendeleev-periodic-table',
    'rte-pasteur-rabies-vaccine',
    'rte-sinking-of-lusitania',
    'rte-battle-of-verdun',
    'rte-operation-barbarossa',
    'rte-arpanet-first-message',
    'rte-concorde-service',
    'rte-macintosh-release',
  ]),
  ...ids('niche', [
    'evt-lindisfarne',
    'phi-utopia',
    'trt-tordesillas',
    'trd-erie-canal',
    'trd-diners-club',
    'reg-singapore-founded',
    'reg-brasilia',
    'reg-edict-of-milan',
    'reg-anglo-zanzibar-war',
    'reg-ben-ali-flees',
    'reg-battle-of-puebla',
    'reg-lima-founded',
    'reg-lei-aurea',
    'reg-first-melbourne-cup',
    'reg-rainbow-warrior',
    'rte-siege-of-tyre',
    'rte-battle-of-carrhae',
    'rte-battle-of-the-milvian-bridge',
    'rte-fall-of-acre',
    'rte-black-prince-poitiers',
    'rte-tang-dynasty-founded',
    'rte-song-dynasty-founded',
    'rte-kamikaze-destroys-mongol-fleet',
    'rte-balboa-sights-pacific',
    'rte-magellan-enters-strait',
    'rte-st-augustine-founded',
    'rte-st-bartholomews-day-massacre',
    'rte-insulin-first-patient',
  ]),
]);

/**
 * A question's fame tier: an override if it has one, else read off its
 * difficulty. The Regional expansion and the campaign routes were graded
 * against their own narrow pools ("easy" for a Crusades fork), so they start
 * one tier lower than the label says.
 */
export function fameTier(question: Question): FameTier {
  const override = TIER_OVERRIDES.get(question.id);
  if (override) return override;
  const tier = DIFFICULTY_TIER[question.difficulty];
  if (!NARROW_GRADED_IDS.has(question.id)) return tier;
  return TIERS[Math.min(TIERS.indexOf(tier) + 1, TIERS.length - 1)]!;
}

/**
 * Draw one question, well-known ones far more often than obscure ones. The
 * tier is rolled first and the question picked evenly inside it, so the mix
 * holds however many questions each tier happens to have.
 */
export function pickByFame<T extends Question>(
  pool: readonly T[],
  rand: () => number = Math.random,
): T | undefined {
  const byTier = new Map<FameTier, T[]>();
  for (const q of pool) {
    const tier = fameTier(q);
    const list = byTier.get(tier);
    if (list) list.push(q);
    else byTier.set(tier, [q]);
  }
  const present = TIERS.filter((tier) => byTier.has(tier));
  const total = present.reduce((sum, tier) => sum + TIER_WEIGHT[tier], 0);
  let roll = rand() * total;
  for (const tier of present) {
    roll -= TIER_WEIGHT[tier];
    if (roll < 0 || tier === present[present.length - 1]) {
      const list = byTier.get(tier)!;
      return list[Math.floor(rand() * list.length)];
    }
  }
  return undefined;
}

/** Deal `count` distinct questions from `pool`, each drawn with {@link pickByFame}. */
export function dealByFame<T extends Question>(pool: readonly T[], count: number, seed: number): T[] {
  const rand = mulberry32(seed);
  const left = [...pool];
  const dealt: T[] = [];
  while (dealt.length < count && left.length > 0) {
    const picked = pickByFame(left, rand)!;
    left.splice(left.indexOf(picked), 1);
    dealt.push(picked);
  }
  return dealt;
}

/**
 * The Daily's questions under the fame mix: seeded per tier, then shuffled so
 * the famous ones aren't always first. A tier that runs short is topped up
 * from the rest of the pool.
 */
export function dealDailyByFame<T extends Question>(pool: readonly T[], count: number, seed: number): T[] {
  const dealt: T[] = [];
  DAILY_MIX.forEach(([tier, share], i) => {
    const want = Math.round((share / 8) * count);
    dealt.push(...pickDeterministic(pool.filter((q) => fameTier(q) === tier), want, seed + i));
  });
  if (dealt.length < count) {
    const rest = pool.filter((q) => !dealt.includes(q) && fameTier(q) !== 'obscure');
    dealt.push(...pickDeterministic(rest, count - dealt.length, seed + DAILY_MIX.length));
  }
  return pickDeterministic(dealt.slice(0, count), count, seed);
}
