import data from "../../data/portfolio.json";
export interface SocialsProps { className?: string; }
const Socials = ({ className = "" }: SocialsProps) => (
  <div className={`${className} flex flex-wrap gap-2`}>
    {data.socials.map((social) => (
      <a key={social.title} href={social.link}
        target={social.link.startsWith("https:") ? "_blank" : undefined}
        rel="noopener noreferrer"
        className="inline-flex items-center justify-center min-h-[44px] rounded-lg border border-white/15 px-5 py-3 text-sm hover:border-[#0070F3] hover:bg-white/5 transition-colors">
        {social.title}<span aria-hidden="true" className="ml-2 text-slate-400">↗</span>
      </a>
    ))}
  </div>
);
export default Socials;
