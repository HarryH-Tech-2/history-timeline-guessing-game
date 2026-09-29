/** A themed campaign route: two per era, forking off the main path. */
export interface CampaignRouteSpec {
  /** Route id; also the tag every one of its questions carries. */
  id: string;
  /** Campaign era (world) id the route belongs to. */
  eraId: string;
  name: string;
  icon: string;
}

/** Campaign route forks (2026-09-29): play order within an era is route A, then route B. */
export const CAMPAIGN_ROUTE_SPECS: readonly CampaignRouteSpec[] = [
  { id: 'egypt-near-east', eraId: 'ancient', name: 'Egypt & the Near East', icon: '🏺' },
  { id: 'greece-rome', eraId: 'ancient', name: 'Greece & Rome', icon: '🏛️' },
  { id: 'crusades-castles', eraId: 'medieval', name: 'Crusades & Castles', icon: '⚔️' },
  { id: 'silk-road', eraId: 'medieval', name: 'Silk Road & Trade', icon: '🐪' },
  { id: 'voyages', eraId: 'early-modern', name: 'Voyages of Discovery', icon: '⛵' },
  { id: 'renaissance', eraId: 'early-modern', name: 'Renaissance & Reformation', icon: '🎨' },
  { id: 'revolutions', eraId: 'nineteenth', name: 'Revolutions & Nations', icon: '🗽' },
  { id: 'steam-science', eraId: 'nineteenth', name: 'Steam & Science', icon: '🚂' },
  { id: 'world-at-war', eraId: 'modern', name: 'World at War', icon: '🎖️' },
  { id: 'space-tech', eraId: 'modern', name: 'Space & Technology', icon: '🚀' },
];
