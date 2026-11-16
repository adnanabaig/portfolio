import type { ElementType, ReactNode } from "react";

export type PanelVariant = "default" | "active" | "crt" | "inset";

export interface PanelProps {
  as?: ElementType;
  variant?: PanelVariant;
  /** Silkscreen label in the title bar. Framing only, never a fact. */
  title?: ReactNode;
  /** Right side of the title bar. */
  titleRight?: ReactNode;
  accent?: "teal" | "amber" | "leaf" | "violet" | "sky" | "coral";
  className?: string;
  bodyClassName?: string;
  children?: ReactNode;
  [attr: string]: unknown;
}

/** A .px-frame box with an optional title bar. */
const Panel = ({
  as: Tag = "div",
  variant = "default",
  title,
  titleRight,
  accent,
  className = "",
  bodyClassName = "",
  children,
  ...rest
}: PanelProps) => (
  <Tag
    className={`px-frame${variant === "default" ? "" : ` px-frame--${variant}`} ${className}`}
    data-accent={accent}
    {...rest}
  >
    {(title || titleRight) && (
      <div className="px-titlebar">
        <span className="px-titlebar__label">{title}</span>
        {titleRight && <span className="px-titlebar__right">{titleRight}</span>}
      </div>
    )}
    <div className={`px-body ${bodyClassName}`}>{children}</div>
  </Tag>
);

export default Panel;
