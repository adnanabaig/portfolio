import portfolio from "../../data/portfolio.json";
import type { PortfolioData } from "../../types/portfolio";
import Socials from "../Socials";

const data = portfolio as PortfolioData;

const Footer = () => (
  <footer id="contact-section" aria-labelledby="contact-heading" className="mt-24 border-t border-white/10">
    <div className="container mx-auto py-16">
      <h2 id="contact-heading" className="text-2xl font-semibold">
        Contact
      </h2>
      <p className="mt-4 max-w-xl text-lg text-slate-300">{data.contact.lede}</p>

      <p className="mt-6">
        <a href={`mailto:${data.email}`} className="font-mono text-lg underline underline-offset-4 break-all">
          {data.email}
        </a>
      </p>

      <div className="mt-6 flex flex-wrap gap-2">
        <a
          href={data.resumeUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-[44px] items-center justify-center rounded border border-white/15 px-4 py-2 text-sm hover:border-white/40 hover:bg-white/5 transition-colors"
        >
          Resume (PDF)
          <span className="sr-only"> (opens in new tab)</span>
        </a>
        <Socials hideEmail />
      </div>

      <p className="mt-12 font-mono text-sm text-slate-400">
        {data.name} · {data.location}
      </p>
    </div>
  </footer>
);

export default Footer;
