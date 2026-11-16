import portfolio from "../../data/portfolio.json";
import type { PortfolioData } from "../../types/portfolio";

const data = portfolio as PortfolioData;

export interface SocialsProps {
  className?: string;
  /** Leave out the email entry (e.g. where the address is already shown). */
  hideEmail?: boolean;
}

const Socials = ({ className = "", hideEmail = false }: SocialsProps) => (
  <ul className={`${className} flex flex-wrap gap-2`} aria-label="Profiles">
    {data.socials
      .filter((social) => !(hideEmail && social.id === "email"))
      .map((social) => {
        const external = social.href.startsWith("https:");
        return (
          <li key={social.id}>
            <a
              href={social.href}
              target={external ? "_blank" : undefined}
              rel="noopener noreferrer"
              className="inline-flex min-h-[44px] items-center justify-center rounded border border-white/15 px-4 py-2 text-sm hover:border-white/40 hover:bg-white/5 transition-colors"
            >
              {social.title}
              {external && <span className="sr-only"> (opens in new tab)</span>}
            </a>
          </li>
        );
      })}
  </ul>
);

export default Socials;
