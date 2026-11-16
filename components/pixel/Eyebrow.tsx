export interface EyebrowProps {
  bay: number;
  label: string;
  className?: string;
}

/** "BAY 01 / DEPLOYED" above a section heading. Framing only. */
const Eyebrow = ({ bay, label, className = "" }: EyebrowProps) => (
  <p className={`eyebrow ${className}`}>
    <span className="eyebrow__bay">BAY {String(bay).padStart(2, "0")}</span>
    <span aria-hidden="true" className="eyebrow__sep">
      /
    </span>
    <span>{label}</span>
  </p>
);

export default Eyebrow;
