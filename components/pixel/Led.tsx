export interface LedProps {
  color?: "leaf" | "amber" | "coral" | "teal" | "violet" | "sky" | "off";
  /** 1 Hz blink, only when motion is allowed. */
  blink?: boolean;
  className?: string;
}

/** A square status lamp. Decorative: always pair it with a text label. */
const Led = ({ color = "leaf", blink = false, className = "" }: LedProps) => (
  <span aria-hidden="true" className={`led led--${color}${blink ? " led--blink" : ""} ${className}`} />
);

export default Led;
