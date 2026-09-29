import { paywallHref, parsePaywallSource, PAYWALL_SOURCES } from './paywallSource';

describe('paywall source', () => {
  it('builds a typed paywall href carrying the source', () => {
    expect(paywallHref('hearts')).toEqual({ pathname: '/paywall', params: { source: 'hearts' } });
  });

  it('accepts every known source and folds anything else to unknown', () => {
    for (const source of PAYWALL_SOURCES) expect(parsePaywallSource(source)).toBe(source);
    expect(parsePaywallSource(undefined)).toBe('unknown');
    expect(parsePaywallSource('evil')).toBe('unknown');
    expect(parsePaywallSource(['hearts', 'profile'])).toBe('hearts');
  });
});
