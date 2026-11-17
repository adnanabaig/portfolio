// OPS console tables (help, projects): each row is a name, at least two
// spaces, then a description, so the text reads as a table when copied.
// commands.ts prints rows with kind "row"; Terminal.tsx splits only those into
// two cells (stacked on phones), so a visitor's own text is never split.

const ROW = /^(\S(?:.*?\S)?) {2,}(\S.*)$/;

/** Pads every name to the longest one plus two spaces. */
export function tableRows(rows: [name: string, description: string][]): string[] {
  const width = Math.max(0, ...rows.map(([name]) => name.length)) + 2;
  return rows.map(([name, description]) => name.padEnd(width) + description);
}

/** Splits a table row into its name and description, and the column the description starts at. */
export function splitRow(text: string): { name: string; description: string; col: number } | null {
  const m = ROW.exec(text);
  return m ? { name: m[1], description: m[2], col: text.length - m[2].length } : null;
}
