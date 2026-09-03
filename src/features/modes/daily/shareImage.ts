import type { RefObject } from 'react';
import { Share, type View } from 'react-native';
import RNShare from 'react-native-share';
import { captureRef } from 'react-native-view-shot';

import type { DailyRecord } from '../persistence';
import { SHARE_CARD_PIXELS } from './DailyShareCard';
import { buildShareMessage } from './shareCard';

/**
 * Share today's result as an image plus the emoji text. Captures the
 * off-screen card to a PNG and hands both to the OS share sheet; if the
 * capture or the native sheet fails for any reason, falls back to the plain
 * text share so the player is never left with nothing.
 */
export async function shareDailyResult(
  cardRef: RefObject<View | null>,
  record: DailyRecord,
): Promise<void> {
  const message = buildShareMessage(record);
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
      message,
      failOnCancel: false,
    });
  } catch {
    await Share.share({ message }).catch(() => {});
  }
}
