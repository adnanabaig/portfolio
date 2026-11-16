export type BayAccent = "teal" | "amber" | "leaf" | "violet" | "sky";

export interface DitherBandProps {
  from: BayAccent;
  to: BayAccent;
}

/**
 * A static 16px Bayer-dither horizon between bays. The tiles live in CSS
 * (styles/globals.css, .dither); this only picks the two accents.
 */
const DitherBand = ({ from, to }: DitherBandProps) => (
  <div aria-hidden="true" className="dither" data-from={from} data-to={to} />
);

export default DitherBand;
