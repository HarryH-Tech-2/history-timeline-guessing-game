import { render, screen } from '@testing-library/react-native';

import { getCategoryById, getQuestions, getQuestionsByCategory } from '@/data';
import { INITIAL_PROGRESSION, levelForXp, type ProgressionState } from '@/domain';
import { CAMPAIGN, eraName } from '@/features/modes/campaign/campaignMap';

import { PersonalPitch } from './PersonalPitch';

let mockState: ProgressionState = INITIAL_PROGRESSION;
jest.mock('@/features/progression/ProgressionProvider', () => ({
  useProgression: () => ({ state: mockState }),
}));

const medieval = CAMPAIGN.find((w) => w.id === 'medieval')!;
const nineteenth = CAMPAIGN.find((w) => w.id === 'nineteenth')!;

function eventsIn(world: (typeof CAMPAIGN)[number]): number {
  return (
    world.stages.reduce((n, s) => n + s.questionIds.length, 0) +
    world.routes.reduce((n, r) => n + r.stages.reduce((m, s) => m + s.questionIds.length, 0), 0)
  );
}

describe('PersonalPitch', () => {
  beforeEach(() => {
    mockState = INITIAL_PROGRESSION;
  });

  it('names the locked category and how many questions it holds', () => {
    render(<PersonalPitch source="locked_category" categoryId="space" />);
    const count = getQuestionsByCategory('space').length;
    expect(screen.getByTestId('paywall-personal-category')).toHaveTextContent(
      `${getCategoryById('space')!.name}: ${count} questions waiting for you`,
    );
  });

  it('counts down to the next heart', () => {
    mockState = { ...INITIAL_PROGRESSION, hearts: { count: 0, updatedAt: Date.now() } };
    render(<PersonalPitch source="hearts" />);
    expect(screen.getByTestId('paywall-personal-hearts')).toHaveTextContent(
      /^Next heart in 1[45]m, or never wait again\.$/,
    );
  });

  it('describes the era the player tapped', () => {
    render(<PersonalPitch source="campaign" eraId="nineteenth" />);
    expect(screen.getByTestId('paywall-personal-era')).toHaveTextContent(
      `${eraName(nineteenth)}: ${nineteenth.stages.length} stages and ${eventsIn(nineteenth)} events to explore`,
    );
  });

  it('falls back to the first locked era when the era is free or unknown', () => {
    render(<PersonalPitch source="era_complete" eraId="ancient" />);
    expect(screen.getByTestId('paywall-personal-era')).toHaveTextContent(new RegExp(`^${eraName(medieval)}:`));
  });

  it('sums up how far the player has come', () => {
    const ids = getQuestions().slice(0, 3).map((q) => q.id);
    mockState = {
      ...INITIAL_PROGRESSION,
      xp: 900,
      collection: Object.fromEntries(ids.map((id) => [id, 1])),
    };
    render(<PersonalPitch source="profile" />);
    expect(screen.getByTestId('paywall-personal-progress')).toHaveTextContent(
      `You’ve collected 3 artefacts and reached level ${levelForXp(900)}. ${getQuestions().length - 3} more events are waiting.`,
    );
    expect(screen.queryByTestId('paywall-personal-category')).toBeNull();
  });

  it('shows nothing when there is nothing true to say', () => {
    render(<PersonalPitch source="profile" />);
    expect(screen.queryByTestId('paywall-personal')).toBeNull();
  });
});
