import { allStages, CAMPAIGN } from './campaignMap';
import { questCta } from './questCta';

describe('questCta', () => {
  const ancient = CAMPAIGN[0]!;
  const lastAncient = ancient.stages.at(-1)!;

  it('continues straight into the next stage within the free era', () => {
    const cta = questCta(ancient.stages[0]!, false);
    expect(cta.label).toBe('Continue your quest →');
    expect(cta.action).toEqual({ kind: 'stage', stage: ancient.stages[1] });
  });

  it('sends a free player to the paywall when the next stage is premium', () => {
    expect(questCta(lastAncient, false)).toEqual({
      label: 'Continue your quest →',
      action: { kind: 'paywall' },
    });
  });

  it('lets a Premium player carry on into the Middle Ages', () => {
    expect(questCta(lastAncient, true).action).toEqual({
      kind: 'stage',
      stage: CAMPAIGN[1]!.stages[0],
    });
  });

  it('goes back to the map after the very last stage', () => {
    expect(questCta(allStages().at(-1)!, true)).toEqual({
      label: 'Back to map',
      action: { kind: 'map' },
    });
  });
});
