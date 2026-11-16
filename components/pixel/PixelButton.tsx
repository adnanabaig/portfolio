import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import Sprite from "./Sprite";
import type { SpriteName } from "../../lib/pixel/toPaths";

type Variant = "primary" | "secondary" | "danger" | "ghost";

interface Common {
  variant?: Variant;
  icon?: SpriteName;
  className?: string;
  children: ReactNode;
}

interface LinkProps extends Common {
  href: string;
  /** Opens in a new tab and appends an sr-only hint. */
  external?: boolean;
  /** Extra screen-reader-only context appended to the label. */
  srContext?: string;
  download?: boolean;
  /** Internal links only: set false to skip the in-viewport prefetch. */
  prefetch?: boolean;
}

type ButtonProps = Common & ButtonHTMLAttributes<HTMLButtonElement> & { href?: undefined };

const cls = (variant: Variant, className: string) => `px-btn px-btn--${variant} ${className}`;

const Inner = ({ icon, children }: { icon?: SpriteName; children: ReactNode }) => (
  <>
    {icon && <Sprite name={icon} scale={2} className="px-btn__icon" mono={icon.startsWith("glyph-") && icon !== "glyph-estop" && icon !== "glyph-led"} />}
    <span>{children}</span>
  </>
);

/** Link-or-button with the 8-bit press. */
const PixelButton = (props: LinkProps | ButtonProps) => {
  if (typeof props.href === "string") {
    const { href, external, srContext, prefetch, variant = "secondary", icon, className = "", children } = props as LinkProps;
    const sr = [srContext, external ? "(opens in new tab)" : ""].filter(Boolean).join(" ");
    const content = (
      <>
        <Inner icon={icon}>{children}</Inner>
        {sr && <span className="sr-only"> {sr}</span>}
      </>
    );
    if (external) {
      return (
        <a href={href} className={cls(variant, className)} target="_blank" rel="noopener noreferrer">
          {content}
        </a>
      );
    }
    if (!href.startsWith("/") || href.endsWith(".pdf")) {
      return (
        <a href={href} className={cls(variant, className)}>
          {content}
        </a>
      );
    }
    return (
      <Link href={href} prefetch={prefetch}>
        <a className={cls(variant, className)}>{content}</a>
      </Link>
    );
  }
  const { variant = "secondary", icon, className = "", children, type = "button", ...rest } = props as ButtonProps;
  return (
    <button type={type} className={cls(variant, className)} {...rest}>
      <Inner icon={icon}>{children}</Inner>
    </button>
  );
};

export default PixelButton;
