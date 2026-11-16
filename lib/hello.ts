// A hello for people who open the browser console, once per page load, plus
// window.ab01: harmless puppet hooks that drive AB-01 on the track.
// Loaded at idle by components/ops/StationLayer.
import portfolio from "../data/portfolio.json";
import { emit } from "./bus";
import { discover } from "./badges";

const ART = [
  "        o",
  "        |",
  "   .---------.",
  "   |  []  [] |   AB-01",
  "   '---------'",
  "  =|  .---.  |o",
  "   |  |___|  |",
  "   '---------'",
  "     /|   |\\",
  "    /_|   |_\\",
].join("\n");

const COLORS = ["teal", "amber", "coral", "leaf", "violet", "sky"];

let greeted = false;

export function hello() {
  if (greeted || typeof window === "undefined") return;
  greeted = true;
  const puppet = (fn: () => void) => () => {
    discover("ab01");
    fn();
    return "AB-01 acknowledges.";
  };
  (window as Window & { ab01?: unknown }).ab01 = {
    wave: puppet(() => emit("ab:bot", { act: "wave" })),
    dance: puppet(() => emit("ab:bot", { act: "dance" })),
    color: (name = "teal") => {
      if (!COLORS.includes(name)) return `Try one of: ${COLORS.join(", ")}`;
      discover("ab01");
      emit("ab:bot", { act: "color", color: name });
      return `Visor set to ${name}.`;
    },
    help: () => "ab01.wave(), ab01.dance(), ab01.color('amber')",
  };
  // eslint-disable-next-line no-console
  console.log(
    `%c${ART}\n\n%cReading the source? Email me: ${portfolio.email}\n%cTry ab01.wave(), ab01.dance(), or ab01.color('amber').`,
    "color:#2EE6C5;font-family:monospace",
    "color:#E8ECF2;font-weight:bold",
    "color:#9AA7BD"
  );
}
