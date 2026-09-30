import { t } from '@/i18n';

/**
 * "12m" / "1h 05m" in the current language (same shape as the domain's
 * formatHeartCountdown, with the unit words translated). Its own module so
 * the paywall can show it without importing the hearts hook.
 */
export function heartCountdown(ms: number): string {
  const totalMinutes = Math.ceil(ms / 60_000);
  if (totalMinutes < 60) return t('home.daily.minutes', { minutes: String(Math.max(1, totalMinutes)) });
  const hours = String(Math.floor(totalMinutes / 60));
  const minutes = String(totalMinutes % 60).padStart(2, '0');
  return t('home.daily.hoursMinutes', { hours, minutes });
}
