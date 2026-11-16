/** Skill-group colors, always paired with the group's text label. */
export const GROUP_ACCENTS = ["teal", "amber", "leaf", "violet"] as const;
export type GroupAccent = (typeof GROUP_ACCENTS)[number];
export const groupAccent = (index: number): GroupAccent => GROUP_ACCENTS[index % GROUP_ACCENTS.length];
