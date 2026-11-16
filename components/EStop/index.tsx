// Global E-STOP: a latched site-wide motion kill switch. Sets html[data-estop]
// (persisted, and re-applied before paint by pages/_document), which pauses
// every CSS animation, freezes the AB-01 track and the teleop canvas, and
// broadcasts "ab:estop" so sound can mute.
import { useEffect, useState } from "react";
import { on as onBus } from "../../lib/bus";
import { isEstop, setEstop } from "../../lib/station";
import Sprite from "../pixel/Sprite";

const EStop = ({ className = "" }: { className?: string }) => {
  const [pressed, setPressed] = useState(false);

  useEffect(() => {
    setPressed(isEstop());
    return onBus("ab:estop", ({ on }) => setPressed(on));
  }, []);

  return (
    <button
      type="button"
      className={`px-btn px-btn--danger px-btn--compact estop ${className}`}
      aria-pressed={pressed}
      onClick={() => setEstop(!isEstop())}
    >
      <Sprite name="glyph-estop" scale={2} className="px-btn__icon" />
      <span className="estop__label">{pressed ? "Resume motion" : "E-stop"}</span>
    </button>
  );
};

export default EStop;
