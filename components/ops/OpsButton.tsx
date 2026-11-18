// OPS>: opens the OPS console (also "/" or "`"). Main bundle, tiny: the
// console itself loads on first open. KeysButton opens the keymap placard
// ("?"). PaletteButton opens the command palette (Cmd/Ctrl+K). OPS> and the
// bar launcher carry a .kbd-tip with their shortcut: after a 400ms hover, or
// at once on :focus-visible; hidden on touch (hover: none) and in the menu panel. The tips are aria-hidden;
// aria-keyshortcuts carries the shortcut for assistive tech.
import { emit } from "../../lib/bus";
import Kbd from "../pixel/Kbd";

const warm = () => void import("./Terminal");
const warmPalette = () => void import("./Palette");

export const OpsButton = ({ className = "" }: { className?: string }) => (
  <button
    type="button"
    className={`px-btn px-btn--ghost px-btn--compact ops-btn has-tip ${className}`}
    aria-haspopup="dialog"
    aria-keyshortcuts="/"
    onPointerEnter={warm}
    onFocus={warm}
    onClick={(e) => emit("ab:open", { what: "ops", from: e.currentTarget })}
  >
    <span aria-hidden="true">OPS&gt;</span>
    <span className="sr-only">OPS console</span>
    <span className="kbd-tip" aria-hidden="true">
      <Kbd keys={["/"]} />
      {/* From 1280px the bar has no search button, so OPS> also teaches the palette chord. */}
      <span className="kbd-tip__more">
        console <Kbd keys={["mod", "K"]} /> search
      </span>
    </span>
  </button>
);

export const KeysButton = ({ className = "" }: { className?: string }) => (
  <button
    type="button"
    className={`px-btn px-btn--ghost px-btn--compact ${className}`}
    aria-haspopup="dialog"
    aria-keyshortcuts="?"
    onClick={(e) => emit("ab:open", { what: "keys", from: e.currentTarget })}
  >
    {/* Lives only in the (scrolling) menu panel, where tips are off; the "?" is in the label. */}
    <span>Keys ?</span>
  </button>
);

/** The pixel magnifier (8x8). */
const Glass = () => (
  <svg className="palette-btn__glass" width="16" height="16" viewBox="0 0 8 8" shapeRendering="crispEdges" aria-hidden="true" focusable="false">
    <path d="M2 0h3v1H2zM1 1h1v1H1zM5 1h1v1H5zM0 2h1v3H0zM6 2h1v3H6zM1 5h1v1H1zM5 5h1v1H5zM2 6h3v1H2zM6 6h1v1H6zM7 7h1v1H7z" fill="currentColor" />
  </svg>
);

/**
 * The palette launcher. "bar" sits in the status bar's HUD slot (a 48px
 * glyph square from 768px, glyph plus keycaps from 1024px, gone from
 * 1280px); "menu" is the Search row in the menu panel (under 768px and from
 * 1280px). Warms the chunk on hover and focus.
 */
export const PaletteButton = ({ variant }: { variant: "bar" | "menu" }) => (
  <button
    type="button"
    className={`px-btn px-btn--ghost px-btn--compact palette-btn palette-btn--${variant} has-tip`}
    aria-haspopup="dialog"
    aria-keyshortcuts="Meta+K Control+K"
    onPointerEnter={warmPalette}
    onFocus={warmPalette}
    onClick={(e) => emit("ab:open", { what: "palette", from: e.currentTarget })}
  >
    <Glass />
    <span className={variant === "bar" ? "sr-only" : undefined}>Search</span>
    <span className="palette-btn__kbd" aria-hidden="true">
      <Kbd keys={["mod", "K"]} />
    </span>
    {variant === "bar" && (
      <span className="kbd-tip" aria-hidden="true">
        <Kbd keys={["mod", "K"]} />
      </span>
    )}
  </button>
);

export default OpsButton;
