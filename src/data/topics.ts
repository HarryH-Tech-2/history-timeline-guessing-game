/**
 * Topics for the "Topic of the day": each is a named slice of the catalogue
 * defined by question tags. Topics are chosen deterministically from the date
 * so every player gets the same topic on the same day.
 */
export interface Topic {
  id: string;
  name: string;
  icon: string;
  blurb: string;
  /** A question belongs to the topic if it carries ANY of these tags. */
  tags: readonly string[];
}

export const TOPICS: readonly Topic[] = [
  { id: 'ancient', name: 'The Ancient World', icon: '🏺', blurb: 'Pharaohs, hoplites and the first cities.', tags: ['ancient'] },
  { id: 'rome', name: 'Ancient Rome', icon: '🏛️', blurb: 'From Romulus to the last legions.', tags: ['rome'] },
  { id: 'greece', name: 'Ancient Greece', icon: '⚱️', blurb: 'Philosophers, phalanxes and the Persian wars.', tags: ['greece'] },
  { id: 'medieval', name: 'The Middle Ages', icon: '🏰', blurb: 'Castles, crusades and the longbow.', tags: ['medieval'] },
  { id: 'inventions', name: 'Great Inventions', icon: '💡', blurb: 'The ideas that changed everything.', tags: ['invention'] },
  { id: 'usa', name: 'American History', icon: '🦅', blurb: 'Revolution, expansion and the modern age.', tags: ['usa'] },
  { id: 'england', name: 'England', icon: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', blurb: 'Kings, playwrights and a great fire.', tags: ['england'] },
  { id: 'france', name: 'France', icon: '🥖', blurb: 'Revolution, empire and the Belle Époque.', tags: ['france'] },
  { id: 'world-wars', name: 'The World Wars', icon: '🎖️', blurb: 'The battles that shaped the 20th century.', tags: ['ww1', 'ww2'] },
  { id: '19th-century', name: 'The 19th Century', icon: '🚂', blurb: 'Steam, empires and revolutions.', tags: ['19th-century'] },
  { id: '20th-century', name: 'The 20th Century', icon: '📻', blurb: 'A century of upheaval and invention.', tags: ['20th-century'] },
  { id: 'science', name: 'Science & Discovery', icon: '🔬', blurb: 'The people who explained the universe.', tags: ['science', 'physics', 'astronomy', 'medicine'] },
  { id: 'disasters', name: 'Disasters', icon: '🌋', blurb: 'Fires, floods and eruptions.', tags: ['disaster'] },
  { id: 'naval', name: 'War at Sea', icon: '⚓', blurb: 'Fleets that decided the fate of nations.', tags: ['naval', 'maritime'] },
  { id: 'politics', name: 'Politics & Power', icon: '🗳️', blurb: 'Treaties, revolutions and reformers.', tags: ['politics', 'revolution'] },
  { id: 'literature', name: 'Literature', icon: '📚', blurb: 'Epics, novels and the writers behind them.', tags: ['literature'] },
  { id: 'music', name: 'Music', icon: '🎵', blurb: 'From the Ninth Symphony to Thriller.', tags: ['music'] },
  { id: 'architecture', name: 'Architecture', icon: '🏗️', blurb: 'Monuments that still stand.', tags: ['architecture'] },
];

export function topicById(id: string): Topic | undefined {
  return TOPICS.find((t) => t.id === id);
}
