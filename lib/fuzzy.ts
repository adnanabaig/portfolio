// A small subsequence scorer for the command palette. Every query character
// must appear in the text in order (case folded). Each matched character is
// worth 1, plus 8 at the very start of the text, 5 at the start of a word,
// and 3 when it directly follows the previous match; every skipped character
// between two matches costs 1. The best placement is found exactly (dynamic
// programming, O(query x text)), and the matched indices come back so the
// palette can mark them.

export interface FuzzyMatch {
  score: number;
  /** Indices into the text of each matched character, ascending. */
  indices: number[];
}

export const SCORE = { char: 1, prefix: 8, word: 5, consecutive: 3, gap: 1 } as const;

const fold = (c: string) => c.toLowerCase();
const isWordChar = (c: string) => /[a-z0-9]/i.test(c);

/** Bonus for a match at text position j. */
function startBonus(text: string, j: number) {
  if (j === 0) return SCORE.prefix;
  const prev = text[j - 1];
  const here = text[j];
  if (!isWordChar(prev)) return SCORE.word;
  // camelCase and letter-to-digit boundaries also start a word.
  if (/[a-z]/.test(prev) && /[A-Z]/.test(here)) return SCORE.word;
  if (/[a-z]/i.test(prev) && /[0-9]/.test(here)) return SCORE.word;
  return 0;
}

/** Scores query against text. Null when the query is not a subsequence. An empty query matches with score 0. */
export function fuzzy(query: string, text: string): FuzzyMatch | null {
  const q = Array.from(query.trim(), fold).filter((c) => c !== " ");
  if (!q.length) return { score: 0, indices: [] };
  const n = text.length;
  const m = q.length;
  if (m > n) return null;
  const t = Array.from({ length: n }, (_, i) => fold(text[i]));
  const NEG = -Infinity;
  // best[i][j]: best score with query[i] matched at text[j]; from[i][j]: where query[i-1] sat.
  const best: Float64Array[] = [];
  const from: Int32Array[] = [];
  for (let i = 0; i < m; i++) {
    const row = new Float64Array(n).fill(NEG);
    const back = new Int32Array(n).fill(-1);
    // Running max of best[i-1][k] + k over k <= j - 2 (the gap penalty is linear in j - k).
    let runMax = NEG;
    let runArg = -1;
    for (let j = i; j < n; j++) {
      if (i > 0 && j >= 2) {
        const k = j - 2;
        const v = best[i - 1][k] + k * SCORE.gap;
        if (v > runMax) {
          runMax = v;
          runArg = k;
        }
      }
      if (t[j] !== q[i]) continue;
      const gain = SCORE.char + startBonus(text, j);
      if (i === 0) {
        row[j] = gain;
        continue;
      }
      const adjacent = best[i - 1][j - 1] + SCORE.consecutive;
      const gapped = runMax === NEG ? NEG : runMax - (j - 1) * SCORE.gap;
      if (adjacent === NEG && gapped === NEG) continue;
      if (adjacent >= gapped) {
        row[j] = adjacent + gain;
        back[j] = j - 1;
      } else {
        row[j] = gapped + gain;
        back[j] = runArg;
      }
    }
    best.push(row);
    from.push(back);
  }
  let end = -1;
  let top = NEG;
  for (let j = 0; j < n; j++) {
    if (best[m - 1][j] > top) {
      top = best[m - 1][j];
      end = j;
    }
  }
  if (end < 0) return null;
  const indices = new Array<number>(m);
  for (let i = m - 1, j = end; i >= 0; i--) {
    indices[i] = j;
    j = from[i][j];
  }
  return { score: top, indices };
}
