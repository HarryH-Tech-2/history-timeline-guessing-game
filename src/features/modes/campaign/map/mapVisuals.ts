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

/**
 * Banner text on an era colour: always white, like the Middle Ages banner.
 * On the lighter era colours (where white alone is too faint to read) it gets
 * a tight drop shadow in the era's own darker shade, which keeps the letters
 * crisp without turning them dark.
 */
export function bannerInk(hex: string): {
  color: string;
  textShadowColor?: string;
  textShadowOffset?: { width: number; height: number };
  textShadowRadius?: number;
} {
  if (inkOn(hex) === '#FFFFFF') return { color: '#FFFFFF' };
  return {
    color: '#FFFFFF',
    textShadowColor: shade(hex, 0.55),
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  };
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

/** A face icon: a MaterialCommunityIcons glyph name. */
export interface StageIcon {
  icon: string;
}

/**
 * Face icons for each era's main stages, cycled by position along the path,
 * so every era's buttons read as that period at a glance.
 */
export const ERA_ICONS: Readonly<Record<string, readonly string[]>> = {
  ancient: [
    // Temple front and flame, distinct from the Egypt/Greece-Rome route icons.
    'bank',
    'torch',
    'horse-variant',
    'shield-sun',
    'script-text',
    'white-balance-sunny',
  ],
  medieval: ['castle', 'sword-cross', 'bow-arrow', 'shield', 'chess-rook', 'church'],
  'early-modern': ['sail-boat', 'compass-rose', 'feather', 'telescope', 'map', 'anchor'],
  nineteenth: ['train', 'factory', 'cog', 'lightbulb-on', 'hammer-wrench', 'phone-classic'],
  modern: [
    'rocket-launch',
    'airplane',
    'atom',
    'television-classic',
    'laptop',
    'satellite-variant',
  ],
};
/** Fallback set for an era without its own (keeps new eras playable). */
export const DEFAULT_ICONS = [
  'star-four-points',
  'compass',
  'feather',
  'map',
  'flag',
  'script-text',
] as const;
/** The era's final main stage. */
export const FINALE_ICON = 'trophy';
/** Each route's own theme; unknown routes fall back to `ROUTE_ICON`. */
export const ROUTE_ICONS: Readonly<Record<string, string>> = {
  'egypt-near-east': 'pyramid',
  'greece-rome': 'pillar',
  'crusades-castles': 'shield-cross',
  'silk-road': 'caravan',
  voyages: 'sail-boat',
  renaissance: 'palette',
  revolutions: 'flag',
  'steam-science': 'train',
  'world-at-war': 'medal',
  'space-tech': 'rocket',
};
export const ROUTE_ICON = 'map-marker-path';

/**
 * The icon on a stage's face. Stable per stage: route stages wear their
 * route's icon, the era's last main stage a trophy, and the rest cycle
 * through the era's set (offset by era so eras don't all open alike).
 */
export function stageIcon(stage: CampaignStage, world: CampaignWorld): StageIcon {
  if (stage.routeId !== undefined) return { icon: ROUTE_ICONS[stage.routeId] ?? ROUTE_ICON };
  if (stage.index === world.stages.length) return { icon: FINALE_ICON };
  const set = ERA_ICONS[world.id] ?? DEFAULT_ICONS;
  const i = (stage.index - 1 + world.index - 1) % set.length;
  return { icon: set[i]! };
}
