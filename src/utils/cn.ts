type ClassValue = string | false | null | undefined;

/** Join class names, dropping falsy values. Later classes win via NativeWind. */
export function cn(...values: ClassValue[]): string {
  return values.filter(Boolean).join(' ');
}
