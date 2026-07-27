import type { Category } from '@/domain';

/**
 * The four launch categories. Shaped exactly like the future Firestore
 * `categories` documents so this array can be replaced by a network fetch in a
 * later slice with no consumer changes.
 */
export const CATEGORIES = [
  {
    id: 'events',
    name: 'Historic Events',
    icon: 'flag',
    colour: '#5B8CFF',
    description: 'Turning points that reshaped the world.',
    difficulty: 'easy',
    active: true,
    premiumOnly: false,
    displayOrder: 0,
  },
  {
    id: 'battles',
    name: 'Battles',
    icon: 'swords',
    colour: '#FF5C7A',
    description: 'Clashes that decided the fate of empires.',
    difficulty: 'medium',
    active: true,
    premiumOnly: false,
    displayOrder: 1,
  },
  {
    id: 'people',
    name: 'Famous People',
    icon: 'person',
    colour: '#3DDC97',
    description: 'When history’s icons were born.',
    difficulty: 'medium',
    active: true,
    premiumOnly: false,
    displayOrder: 2,
  },
  {
    id: 'technology',
    name: 'Technology',
    icon: 'cpu',
    colour: '#FFB454',
    description: 'Inventions that changed how we live.',
    difficulty: 'medium',
    active: true,
    premiumOnly: false,
    displayOrder: 3,
  },
] satisfies readonly Category[];
