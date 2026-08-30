import type { Category } from '@/domain';

/**
 * The launch categories. Shaped exactly like the future Firestore
 * `categories` documents so this array can be replaced by a network fetch in a
 * later slice with no consumer changes.
 */
export const CATEGORIES = [
  {
    id: 'events',
    name: 'Historic Events',
    icon: 'flag',
    colour: '#E7B84C',
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
    colour: '#E8564E',
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
    colour: '#57BE8F',
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
    colour: '#A9B6C2',
    description: 'Inventions that changed how we live.',
    difficulty: 'medium',
    active: true,
    premiumOnly: false,
    displayOrder: 3,
  },
  {
    id: 'arts',
    name: 'Arts & Culture',
    icon: 'palette',
    colour: '#B07BD9',
    description: 'Masterpieces, premieres and cultural icons.',
    difficulty: 'medium',
    active: true,
    premiumOnly: true,
    displayOrder: 4,
  },
  {
    id: 'philosophy',
    name: 'Philosophy',
    icon: 'owl',
    colour: '#4FA3A5',
    description: 'The thinkers and ideas that questioned everything.',
    difficulty: 'hard',
    active: true,
    premiumOnly: true,
    displayOrder: 5,
  },
] satisfies readonly Category[];
