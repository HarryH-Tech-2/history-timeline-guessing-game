import { FIXTURE_WORLDS } from './__fixtures__/routedCampaign';
import { allStages, CAMPAIGN, getStage } from './campaignMap';
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

  it('opens the map at a fork instead of picking a route', () => {
    const fork = getStage('ancient', 'ancient-s2', FIXTURE_WORLDS)!;
    expect(questCta(fork, false, FIXTURE_WORLDS)).toEqual({
      label: 'Continue your quest →',
      action: { kind: 'map', focusStageId: 'ancient-s2' },
    });
    // Even in a premium era: choosing happens on the map.
    const premiumFork = getStage('medieval', 'medieval-s1', FIXTURE_WORLDS)!;
    expect(questCta(premiumFork, false, FIXTURE_WORLDS).action).toEqual({
      kind: 'map',
      focusStageId: 'medieval-s1',
    });
  });

  it('carries on through a route and back onto the main path', () => {
    const w = FIXTURE_WORLDS;
    expect(questCta(getStage('ancient', 'ancient-south-s1', w)!, false, w).action).toEqual({
      kind: 'stage',
      stage: getStage('ancient', 'ancient-south-s2', w),
    });
    expect(questCta(getStage('ancient', 'ancient-south-s3', w)!, false, w).action).toEqual({
      kind: 'stage',
      stage: getStage('ancient', 'ancient-s3', w),
    });
  });
});
