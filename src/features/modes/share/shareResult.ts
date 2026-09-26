import type { RefObject } from 'react';
import { Share, type View } from 'react-native';
import RNShare from 'react-native-share';
import { captureRef } from 'react-native-view-shot';

import { SHARE_CARD_PIXELS } from './ShareCard';
import { buildShareMessage, STORE_URL, type ShareCardData } from './shareData';

/**
 * How a share attempt ended. `fallback` means the text card went out via the
 * plain OS sheet, which cannot say whether the player completed it.
 */
export type ShareOutcome = 'shared' | 'dismissed' | 'fallback';

/**
 * Share a run's result as the image card plus the store link — nothing else,
 * so the picture is the whole message. Captures the off-screen card to a PNG
 * and hands it to the OS share sheet; only if the capture or the native sheet
 * fails does it fall back to the emoji text card, so the player is never left
 * with a bare link.
 */
export async function shareResult(
  cardRef: RefObject<View | null>,
  data: ShareCardData,
): Promise<ShareOutcome> {
  try {
    const view = cardRef.current;
    if (!view) throw new Error('share card not mounted');
    const uri = await captureRef(view, {
      format: 'png',
      quality: 1,
      result: 'tmpfile',
      width: SHARE_CARD_PIXELS,
      height: SHARE_CARD_PIXELS,
    });
    const result = await RNShare.open({
      url: uri.startsWith('file://') ? uri : `file://${uri}`,
      type: 'image/png',
      message: STORE_URL,
      failOnCancel: false,
    });
    return result.success ? 'shared' : 'dismissed';
  } catch {
    await Share.share({ message: buildShareMessage(data) }).catch(() => {});
    return 'fallback';
  }
}
