// Shared copy rules for check:copy and check-ops: no em dashes, no emoji,
// and no internal terms on the public site.
export const EM_DASH = "\u2014";
export const FORBIDDEN = [
  "MUMI",
  "Beryllium",
  "Helium",
  "Hydrogen",
  "Lithium",
  "rl_robot",
  "metabot",
  "Phabricator",
  "unsplash",
];
// Emoji: any Extended_Pictographic code point, plus the emoji variation selector.
export const EMOJI = /[\p{Extended_Pictographic}\u{FE0F}]/gu;

/** Problems in one string, as short labels. */
export function copyProblems(text) {
  const out = [];
  if (text.includes(EM_DASH)) out.push("em dash");
  for (const term of FORBIDDEN) if (text.toLowerCase().includes(term.toLowerCase())) out.push(`forbidden term "${term}"`);
  for (const m of text.matchAll(EMOJI)) out.push(`emoji U+${m[0].codePointAt(0).toString(16).toUpperCase()}`);
  return out;
}
