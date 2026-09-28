/**
 * Set Premium prices on Google Play, with purchasing-power-parity tiers.
 *
 *   npx tsx scripts/setRegionalPrices.ts            # dry run: writes a CSV preview
 *   npx tsx scripts/setRegionalPrices.ts --apply    # writes the prices to Play
 *   (add --lifetime-only to touch just the lifetime product)
 *
 * US prices (tax exclusive): monthly $2.99, yearly $19.99, lifetime $34.99.
 * Every other region gets its tier's share of the US price (100/70/50/35%),
 * converted to the local currency by Play's own converter (the same one the
 * Console's "Convert prices" button uses) and rounded to a tidy local price.
 * Regions not listed in TIERS stay at 100%.
 *
 * Only the prices of regions the products already sell in are touched;
 * availability, offers (the free trial) and listings are left alone.
 *
 * Needs serviceAccount.json (the Firebase admin account) invited in Play
 * Console → Users and permissions with access to this app and the
 * "Manage store presence" permission, and the Google Play Android Developer
 * API enabled on the Cloud project.
 */
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { GoogleAuth } from 'google-auth-library';

const PACKAGE = 'com.harryhh.historydateguesser';
const API = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${PACKAGE}`;
const APPLY = process.argv.includes('--apply');

/** US price by subscription billing period, and for the one-time lifetime product. */
const baseUsdMonthly = 2.99;
const USD_BY_PERIOD: Record<string, number> = { P1M: baseUsdMonthly, P1Y: 19.99 };
const LIFETIME_ID = 'premium_lifetime';
const LIFETIME_USD = 34.99;

/** Share of the US price per region. Unlisted regions pay 100%. */
const TIERS: Record<number, string[]> = {
  0.7: [
    'ES', 'IT', 'PT', 'GR', 'CY', 'MT', 'SI', 'CZ', 'SK', 'EE', 'LV', 'LT', 'PL', 'HU', 'HR',
    'TW', 'SA', 'BH', 'OM', 'CL', 'UY', 'PR',
  ],
  0.5: [
    'MX', 'BR', 'AR', 'CO', 'PE', 'EC', 'CR', 'PA', 'DO', 'JM', 'TT', 'TR', 'RO', 'BG', 'RS',
    'BA', 'ME', 'MK', 'AL', 'MD', 'UA', 'GE', 'AM', 'AZ', 'KZ', 'BY', 'ZA', 'NA', 'BW', 'MU',
    'MY', 'TH', 'MA', 'TN', 'JO', 'LB', 'IQ', 'MN',
  ],
  0.35: [
    'IN', 'ID', 'PH', 'VN', 'PK', 'BD', 'LK', 'NP', 'MM', 'KH', 'LA', 'EG', 'DZ', 'NG', 'GH',
    'KE', 'TZ', 'UG', 'RW', 'ET', 'ZM', 'ZW', 'MZ', 'SN', 'CI', 'CM', 'BJ', 'BF', 'ML', 'NE',
    'TG', 'MG', 'BO', 'PY', 'VE', 'NI', 'HN', 'GT', 'SV', 'UZ', 'KG', 'TJ',
  ],
};
const TIER_OF = new Map<string, number>();
for (const [share, regions] of Object.entries(TIERS)) {
  for (const r of regions) TIER_OF.set(r, Number(share));
}
const SHARES = [1, ...Object.keys(TIERS).map(Number)];

interface Money {
  currencyCode: string;
  units?: string;
  nanos?: number;
}

const toNumber = (m: Money) => Number(m.units ?? 0) + (m.nanos ?? 0) / 1e9;
const toMoney = (currencyCode: string, v: number): Money => {
  const units = Math.floor(v + 1e-9);
  return { currencyCode, units: String(units), nanos: Math.round((v - units) * 100) * 1e7 };
};
const usd = (v: number): Money => toMoney('USD', v);

/** Tidy local price: 4.99 / 34.99 / 249 / 17,000 style. */
function tidy(v: number): number {
  if (v < 1) return 0.99;
  if (v < 200) return Math.max(0.99, Math.round(v) - 0.01);
  if (v < 1000) return Math.round(v / 10) * 10 - 1;
  const magnitude = 10 ** (Math.floor(Math.log10(v)) - 1);
  return Math.round(v / magnitude) * magnitude;
}

const auth = new GoogleAuth({
  keyFile: join(__dirname, '..', 'serviceAccount.json'),
  scopes: ['https://www.googleapis.com/auth/androidpublisher'],
});

async function call<T>(method: string, url: string, body?: unknown): Promise<T> {
  const client = await auth.getClient();
  const res = await client.request<T>({ method: method as 'GET', url, data: body }).catch((e) => {
    const detail = e?.response?.data?.error?.message ?? e.message;
    throw new Error(`${method} ${url.replace(API, '')} → ${detail}`);
  });
  return res.data;
}

/**
 * PATCH with the converter's regions version; the update endpoint can lag the
 * converter, so on "Invalid regions version … latest value is …{versionId=X}"
 * retry once with X.
 */
async function patchWithRegions(path: string, body: unknown, version: string) {
  const url = (v: string) => `${API}${path}&regionsVersion.version=${encodeURIComponent(v)}`;
  try {
    return await call('PATCH', url(version), body);
  } catch (e) {
    const latest = /versionId=([^}]+)\}/.exec((e as Error).message)?.[1];
    if (!latest || latest === version) throw e;
    return call('PATCH', url(latest), body);
  }
}

interface Converted {
  prices: Map<string, Money>;
  version: string;
}
const conversions = new Map<number, Converted>();

/** Play's conversion of a US price into every region's local currency. */
async function convert(usdPrice: number): Promise<Converted> {
  const key = Math.round(usdPrice * 100);
  const cached = conversions.get(key);
  if (cached) return cached;
  const res = await call<{
    convertedRegionPrices: Record<string, { regionCode: string; price: Money }>;
    regionVersion: { version: string };
  }>('POST', `${API}/pricing:convertRegionPrices`, { price: usd(usdPrice) });
  const prices = new Map(Object.values(res.convertedRegionPrices).map((c) => [c.regionCode, c.price]));
  const out = { prices, version: res.regionVersion.version };
  conversions.set(key, out);
  return out;
}

const rows: string[] = ['product,plan,region,share,currency,old,new'];

/** New local price for a region, given the product's US price. */
async function priceFor(region: string, baseUsd: number, current: Money | undefined): Promise<Money | undefined> {
  const share = region === 'US' ? 1 : (TIER_OF.get(region) ?? 1);
  if (region === 'US') return usd(baseUsd);
  const converted = (await convert(Math.round(baseUsd * share * 100) / 100)).prices.get(region);
  if (!converted) return current;
  let next = toMoney(converted.currencyCode, tidy(toNumber(converted)));
  // Some regions are billed in USD on the product even though the converter
  // answers in local currency (Play rejects the mismatch): price them in USD.
  if (current && current.currencyCode !== next.currencyCode) {
    if (current.currencyCode !== 'USD') return current;
    next = usd(tidy(baseUsd * share));
  }
  // A discounted region never pays more than it does today: some already
  // carry Play's own local price, below what the tier would give.
  if (share < 1 && current && current.currencyCode === next.currencyCode && toNumber(current) < toNumber(next)) {
    return current;
  }
  return next;
}

function record(product: string, plan: string, region: string, before: Money | undefined, after: Money | undefined) {
  const share = region === 'US' ? 1 : (TIER_OF.get(region) ?? 1);
  const fmt = (m?: Money) => (m ? toNumber(m).toFixed(2) : '');
  rows.push([product, plan, region, share, after?.currencyCode ?? '', fmt(before), fmt(after)].join(','));
}

interface RegionalConfig {
  regionCode: string;
  price?: Money;
  newSubscriberAvailability?: boolean;
}
interface BasePlan {
  basePlanId: string;
  state?: string;
  autoRenewingBasePlanType?: { billingPeriodDuration: string };
  prepaidBasePlanType?: { billingPeriodDuration: string };
  regionalConfigs?: RegionalConfig[];
  otherRegionsConfig?: { usdPrice: Money; eurPrice: Money; newSubscriberAvailability?: boolean };
}
interface Subscription {
  productId: string;
  basePlans?: BasePlan[];
}

async function updateSubscriptions() {
  const { subscriptions = [] } = await call<{ subscriptions?: Subscription[] }>('GET', `${API}/subscriptions`);
  for (const sub of subscriptions) {
    let touched = false;
    for (const plan of sub.basePlans ?? []) {
      const period =
        plan.autoRenewingBasePlanType?.billingPeriodDuration ?? plan.prepaidBasePlanType?.billingPeriodDuration ?? '';
      const baseUsd = USD_BY_PERIOD[period];
      if (baseUsd === undefined) {
        console.log(`skip ${sub.productId}/${plan.basePlanId}: no US price for period ${period}`);
        continue;
      }
      for (const rc of plan.regionalConfigs ?? []) {
        const next = await priceFor(rc.regionCode, baseUsd, rc.price);
        record(sub.productId, plan.basePlanId, rc.regionCode, rc.price, next);
        if (next) rc.price = next;
      }
      if (plan.otherRegionsConfig) {
        const eur = (await convert(baseUsd)).prices.get('DE');
        plan.otherRegionsConfig.usdPrice = usd(baseUsd);
        if (eur) plan.otherRegionsConfig.eurPrice = toMoney('EUR', tidy(toNumber(eur)));
      }
      touched = true;
    }
    if (touched && APPLY) {
      const version = (await convert(baseUsdMonthly)).version;
      await patchWithRegions(`/subscriptions/${sub.productId}?updateMask=basePlans`, sub, version);
      console.log(`updated subscription ${sub.productId}`);
    }
  }
}

interface OneTimeProduct {
  productId: string;
  purchaseOptions?: {
    purchaseOptionId: string;
    regionalPricingAndAvailabilityConfigs?: { regionCode: string; price?: Money; availability?: string }[];
  }[];
}

async function updateLifetime() {
  const product = await call<OneTimeProduct>('GET', `${API}/oneTimeProducts/${LIFETIME_ID}`);
  for (const option of product.purchaseOptions ?? []) {
    for (const rc of option.regionalPricingAndAvailabilityConfigs ?? []) {
      const next = await priceFor(rc.regionCode, LIFETIME_USD, rc.price);
      record(LIFETIME_ID, option.purchaseOptionId, rc.regionCode, rc.price, next);
      if (next) rc.price = next;
    }
  }
  if (APPLY) {
    // The one-time product endpoint can refuse the converter's regions version
    // outright; --regions-version pins one it accepts. Regions it then calls
    // not billable are left out of the update (and logged).
    const flag = process.argv.indexOf('--regions-version');
    const version = (flag > 0 ? process.argv[flag + 1] : undefined) ?? (await convert(LIFETIME_USD)).version;
    for (let attempt = 0; ; attempt++) {
      try {
        await patchWithRegions(`/onetimeproducts/${LIFETIME_ID}?updateMask=purchaseOptions`, product, version);
        break;
      } catch (e) {
        const message = (e as Error).message;
        const usdRegion = /Invalid currency for region code (\w+) .*Expected USD/.exec(message)?.[1];
        if (usdRegion && attempt <= 60) {
          const price = usd(tidy(LIFETIME_USD * (TIER_OF.get(usdRegion) ?? 1)));
          console.log(`  ${usdRegion} is billed in USD at ${version}: ${toNumber(price).toFixed(2)} USD`);
          for (const option of product.purchaseOptions ?? []) {
            for (const rc of option.regionalPricingAndAvailabilityConfigs ?? []) {
              if (rc.regionCode === usdRegion) rc.price = price;
            }
          }
          continue;
        }
        const region = /Region code (\w+) is not billable/.exec(message)?.[1];
        if (!region || attempt > 60) throw e;
        console.log(`  leaving out ${region}: not billable at regions version ${version}`);
        for (const option of product.purchaseOptions ?? []) {
          option.regionalPricingAndAvailabilityConfigs = option.regionalPricingAndAvailabilityConfigs?.filter(
            (rc) => rc.regionCode !== region,
          );
        }
      }
    }
    console.log(`updated one-time product ${LIFETIME_ID}`);
  }
}

async function main() {
  // --lifetime-only: re-run just the one-time product (subscriptions already set).
  if (!process.argv.includes('--lifetime-only')) await updateSubscriptions();
  await updateLifetime();
  const out = join(__dirname, '..', 'regional-prices-preview.csv');
  writeFileSync(out, rows.join('\n') + '\n');
  console.log(`${rows.length - 1} prices ${APPLY ? 'written' : 'previewed (dry run)'}; see ${out}`);
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
