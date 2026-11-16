/** A small LCG so world shuffles are reproducible from a seed. */
export function seeded(seed = 0x5eed) {
  let s = seed >>> 0;
  return () => (s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32;
}
