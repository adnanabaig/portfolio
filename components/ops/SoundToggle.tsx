// SND: opt-in chiptune feedback. Off by default; the choice persists.
import { useEffect, useState } from "react";
import { on } from "../../lib/bus";
import Sprite from "../pixel/Sprite";
import { loadSynth, setSound, soundSaved } from "./sound";

const SoundToggle = ({ className = "" }: { className?: string }) => {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    setEnabled(soundSaved());
    return on("ab:sound", ({ on: v }) => setEnabled(v));
  }, []);

  return (
    <button
      type="button"
      className={`px-btn px-btn--ghost px-btn--compact snd ${className}`}
      aria-pressed={enabled}
      onPointerEnter={() => void loadSynth()}
      onFocus={() => void loadSynth()}
      onClick={() => setSound(!enabled)}
    >
      <Sprite name="glyph-speaker" frame={enabled ? 0 : 1} scale={2} mono className="px-btn__icon" />
      <span>Sound</span>
    </button>
  );
};

export default SoundToggle;
