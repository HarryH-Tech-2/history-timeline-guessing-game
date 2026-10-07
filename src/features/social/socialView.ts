export const SOCIAL_SEGMENTS = ['global', 'groups', 'challenges'] as const;
export type SocialSegment = (typeof SOCIAL_SEGMENTS)[number];
