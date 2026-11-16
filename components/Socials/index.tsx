import portfolio from "../../data/portfolio.json";
import type { PortfolioData, SocialLink } from "../../types/portfolio";
import PixelButton from "../pixel/PixelButton";
import type { SpriteName } from "../../lib/pixel/toPaths";

const data = portfolio as PortfolioData;

/** Generic pixel glyphs (not brand logos) for each profile type. */
const GLYPH: Record<SocialLink["id"], SpriteName> = {
  github: "glyph-branch",
  linkedin: "glyph-idcard",
  email: "glyph-mail",
};

export interface SocialsProps {
  className?: string;
  /** Leave out the email entry (e.g. where the address is already shown). */
  hideEmail?: boolean;
}

const Socials = ({ className = "", hideEmail = false }: SocialsProps) => (
  <ul className={`socials ${className}`} aria-label="Profiles">
    {data.socials
      .filter((social) => !(hideEmail && social.id === "email"))
      .map((social) => (
        <li key={social.id}>
          <PixelButton
            href={social.href}
            external={social.href.startsWith("https:")}
            variant="ghost"
            icon={GLYPH[social.id]}
          >
            {social.title}
          </PixelButton>
        </li>
      ))}
  </ul>
);

export default Socials;
