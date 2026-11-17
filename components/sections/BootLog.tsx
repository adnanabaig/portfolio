// Power-on self test strip under the cell view. CSS-only and aria-hidden: it
// types in once per session (gated on .motion-ok and not [data-booted]) and
// otherwise shows its final state. Every number comes from lib/facts.
import { automatedTests, issuesResolved, robotPrograms, skillCount } from "../../lib/facts";

const LINES: [string, string][] = [
  ["POWER", "OK"],
  ["SERVICE LOG", `${issuesResolved} RESOLVED`],
  ["ROBOT PROGRAMS", String(robotPrograms)],
  ["TEST SUITE", `${automatedTests} TESTS`],
  ["SKILLS", String(skillCount)],
  ["SELF TEST", "PASS"],
];

const BootLog = () => (
  <ol className="bootlog" aria-hidden="true">
    {LINES.map(([label, value], i) => (
      <li key={label} style={{ animationDelay: `${120 + i * 180}ms` }}>
        <span className="bootlog__label">{label}</span>
        <span className="bootlog__dots" />
        <span className="bootlog__value">{value}</span>
      </li>
    ))}
  </ol>
);

export default BootLog;
