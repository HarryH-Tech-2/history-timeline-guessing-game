import type { RefObject } from 'react';
import { Share, type View } from 'react-native';
import RNShare from 'react-native-share';
import { captureRef } from 'react-native-view-shot';

import type { DailyRecord } from '../persistence';
import { SHARE_CARD_PIXELS } from './DailyShareCard';
import { buildShareMessage, STORE_URL } from './shareCard';

/**
 * Share today's result as the image card plus the store link — nothing else,
 * so the picture is the whole message. Captures the off-screen card to a PNG
 * and hands it to the OS share sheet; only if the capture or the native sheet
 * fails does it fall back to the emoji text card, so the player is never left
 * with a bare link.
 */
export async function shareDailyResult(
  cardRef: RefObject<View | null>,
  record: DailyRecord,
): Promise<void> {
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
    await RNShare.open({
      url: uri.startsWith('file://') ? uri : `file://${uri}`,
      type: 'image/png',
      message: STORE_URL,
      failOnCancel: false,
    });
  } catch {
    await Share.share({ message: buildShareMessage(record) }).catch(() => {});
  }
}
