/**
 * Pure presentation helpers for the campaign map: which era the player is
 * looking at, how each stage button should look, and colour maths for text
 * and 3D lips on the era colours. No React here, so it's all unit-testable.
 */

import type { CampaignStage, CampaignWorld } from '../campaignMap';

/** Ink dark enough to read on the pale/bright era colours. */
export const DARK_INK = '#1D1712';

/** Where an era's section starts in the scroll content. */
export interface EraSection {
  id: string;
  y: number;
}

/**
 * The era whose section contains `probeY` (a content-space y, usually the
 * scroll offset plus the sticky bar's height): the last section starting at
 * or above it. Before the first section it's the first era.
 */
export function eraInView(sections: readonly EraSection[], probeY: number): string | undefined {
  const sorted = [...sections].sort((a, b) => a.y - b.y);
  let current = sorted[0]?.id;
  for (const section of sorted) {
    if (section.y <= probeY) current = section.id;
    else break;
  }
  return current;
}

/**
 * Whether an era's banner has scrolled up under the sticky bar (its bottom at
 * or above `probeY`, the bar's bottom in content space). Until then the banner
 * itself names the era, so the sticky bar stays hidden rather than repeat it.
 */
export function bannerTucked(bannerBottom: number | undefined, probeY: number): boolean {
  return bannerBottom !== undefined && bannerBottom <= probeY;
}

export type NodeState = 'locked' | 'premium' | 'frontier' | 'completed' | 'mastered' | 'open';

/** How a stage button looks, from its place in the campaign. */
export function nodeState({
  unlocked,
  frontier,
  premiumLocked,
  stars,
}: {
  unlocked: boolean;
  /** The next stage to play. */
  frontier: boolean;
  /** Premium stage and the player isn't Premium. */
  premiumLocked: boolean;
  stars: number;
}): NodeState {
  if (frontier) return 'frontier';
  if (premiumLocked) return 'premium';
  if (!unlocked) return 'locked';
  if (stars >= 3) return 'mastered';
  if (stars >= 1) return 'completed';
  return 'open';
}

function channels(hex: string): [number, number, number] {
  const n = parseInt(hex.replace('#', ''), 16);
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
}

function luminance(hex: string): number {
  const [r, g, b] = channels(hex).map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Text colour for a label sitting on `hex`: white when it clears the 3:1
 * contrast bar for large bold text (the banner and bubble type), else dark ink.
 */
export function inkOn(hex: string): string {
  const whiteContrast = 1.05 / (luminance(hex) + 0.05);
  return whiteContrast >= 3 ? '#FFFFFF' : DARK_INK;
}

/** `hex` darkened by `amount` (0 = unchanged, 1 = black) — the 3D lip under a button. */
export function shade(hex: string, amount: number): string {
  const out = channels(hex)
    .map((c) => Math.round(c * (1 - amount)))
    .map((c) => c.toString(16).padStart(2, '0'))
    .join('');
  return `#${out.toUpperCase()}`;
}

/** `hex` lightened by `amount` towards white (0 = unchanged, 1 = white) — soft tints and lips. */
export function tint(hex: string, amount: number): string {
  const out = channels(hex)
    .map((c) => Math.round(c + (255 - c) * amount))
    .map((c) => c.toString(16).padStart(2, '0'))
    .join('');
  return `#${out.toUpperCase()}`;
}

/**
 * The content-space line that decides which era's painting is shown: the
 * vertical middle of the viewport, so the next era's scenery arrives as soon
 * as its banner crosses the middle of the screen.
 */
export function backdropProbe(scrollY: number, viewportHeight: number): number {
  return scrollY + viewportHeight / 2;
}

/**
 * Face symbols for playable main stages, cycled by position: quill, compass
 * rose, sun, star, castle, ankh. All plain text glyphs (no colour-emoji
 * forms), so they take the button's ink like the old stage numbers did.
 */
export const STAGE_SYMBOLS = ['\u270E', '\u2725', '\u263C', '\u2726', '\u265C', '\u2625'] as const;
/** The era's final main stage: a fleur-de-lis, forced to its text form. */
export const FINALE_SYMBOL = '\u269C\uFE0E';
/** Every route stage: a pennant, so side paths read as side paths. */
export const ROUTE_SYMBOL = '\u2691';

/**
 * The symbol on a playable stage's face. Stable per stage: route stages wear
 * the route pennant, the era's last main stage its finale mark, and the rest
 * cycle through `STAGE_SYMBOLS` (offset by era so eras don't all open alike).
 */
export function stageSymbol(stage: CampaignStage, world: CampaignWorld): string {
  if (stage.routeId !== undefined) return ROUTE_SYMBOL;
  if (stage.index === world.stages.length) return FINALE_SYMBOL;
  const i = (stage.index - 1 + world.index - 1) % STAGE_SYMBOLS.length;
  return STAGE_SYMBOLS[i]!;
}
