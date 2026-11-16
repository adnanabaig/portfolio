import type { Project } from "../../types/portfolio";

export interface WorkCardProps {
  project: Project;
}

/** A plain, semantic project card. Renders only real fields from the data. */
const WorkCard = ({ project }: WorkCardProps) => {
  const { id, title, org, role, period, category, status, summary, highlights, stack, links } = project;
  const headingId = `project-${id}`;
  const meta = [org, role, period].filter(Boolean);

  return (
    <article
      aria-labelledby={headingId}
      className="flex h-full min-w-0 flex-col rounded border border-white/10 bg-white/[0.02] p-5 laptop:p-6"
    >
      <p className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-xs uppercase tracking-wider text-slate-400">
        <span>{category}</span>
        {status === "in-progress" && <span className="text-amber-300">In progress</span>}
      </p>

      <h3 id={headingId} className="mt-3 text-xl laptop:text-2xl font-semibold leading-snug">
        {title}
      </h3>
      {meta.length > 0 && <p className="mt-1 text-sm text-slate-400">{meta.join(" · ")}</p>}

      <p className="mt-4 leading-relaxed text-slate-200">{summary}</p>

      {highlights.length > 0 && (
        <ul className="mt-4 list-disc space-y-2 pl-5 text-slate-300 marker:text-slate-500">
          {highlights.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      )}

      {stack.length > 0 && (
        <ul className="mt-5 flex flex-wrap gap-2" aria-label="Stack">
          {stack.map((item) => (
            <li key={item} className="rounded border border-white/10 px-2 py-1 font-mono text-xs text-slate-300">
              {item}
            </li>
          ))}
        </ul>
      )}

      {links && links.length > 0 && (
        <p className="mt-auto flex flex-wrap gap-4 pt-5">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-[44px] items-center text-sm text-cyan-300 underline underline-offset-4"
            >
              {link.label}
              <span className="sr-only">
                {" "}
                for {title} (opens in new tab)
              </span>
            </a>
          ))}
        </p>
      )}
    </article>
  );
};

export default WorkCard;
