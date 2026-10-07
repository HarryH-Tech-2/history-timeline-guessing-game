import { getLandmarks, getQuestionById, getQuestions } from '@/data';
import { LANDMARK_IDS } from '@/data/landmarks';
import { t } from '@/i18n';

import { landmarkHint } from './hint';

const question = (id: string) => getQuestionById(id)!;

describe('landmarks', () => {
  it('are all in the catalogue', () => {
    expect(getLandmarks().map((q) => q.id)).toEqual([...LANDMARK_IDS]);
  });
});

describe('landmarkHint', () => {
  it('places a question against the nearest landmark, with a loose gap', () => {
    // Trafalgar (1805) sits ten years before Waterloo (1815).
    const hint = landmarkHint(question('bat-trafalgar'))!;
    expect(hint.landmark.id).toBe('bat-waterloo');
    expect(t(hint.relation)).toBe('This happened within about a decade of it.');
  });

  it('says which side of the landmark the question falls on', () => {
    // The Hagia Sophia (537) follows the fall of Rome (476); Marathon (490 BCE)
    // comes before Thermopylae (480 BCE) but too close to give a direction.
    expect(landmarkHint(question('art-hagia-sophia'))).toMatchObject({
      landmark: { id: 'evt-fall-western-rome' },
      relation: 'round.hints.relation.halfCenturyAfter',
    });
    expect(landmarkHint(question('evt-domesday-book'))).toMatchObject({
      landmark: { id: 'bat-hastings' },
      relation: 'round.hints.relation.decadesAfter',
    });
    expect(landmarkHint(question('rte-siege-of-lachish'))).toMatchObject({
      landmark: { id: 'bat-thermopylae' },
      relation: 'round.hints.relation.centuriesBefore',
    });
  });

  it('never uses the question as its own landmark', () => {
    for (const q of getQuestions()) {
      expect(landmarkHint(q)!.landmark.id).not.toBe(q.id);
    }
  });
});
