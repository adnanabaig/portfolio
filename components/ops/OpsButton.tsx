// OPS>: opens the OPS console (also "/" or "`"). Main bundle, tiny: the
// console itself loads on first open. KeysButton opens the keymap placard ("?").
import { emit } from "../../lib/bus";

const warm = () => void import("./Terminal");

export const OpsButton = ({ className = "" }: { className?: string }) => (
  <button
    type="button"
    className={`px-btn px-btn--ghost px-btn--compact ops-btn ${className}`}
    aria-haspopup="dialog"
    aria-keyshortcuts="/"
    onPointerEnter={warm}
    onFocus={warm}
    onClick={(e) => emit("ab:open", { what: "ops", from: e.currentTarget })}
  >
    <span aria-hidden="true">OPS&gt;</span>
    <span className="sr-only">OPS console</span>
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
    <span>Keys ?</span>
  </button>
);

export default OpsButton;
