import { formatYear } from '@/features/timeline/math/format';

import { t } from './translate';

/** A year for display in the current language: "1863", "450 a.C.". JS thread only. */
export function displayYear(year: number): string {
  return formatYear(year, t('common.bce'));
}
