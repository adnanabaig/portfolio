import type { Project } from "../../types/portfolio";
import Led from "../pixel/Led";
import PixelButton from "../pixel/PixelButton";
import Sprite from "../pixel/Sprite";
import { PROJECT_ICONS as ICONS, dossierHref, unitLabel } from "../../lib/projects";

export interface WorkCardProps {
  project: Project;
  /** 1-based position, shown as MOD-01 / RIG-01. */
  index: number;
  kind?: "module" | "bench";
  /** Space-separated skill tokens for the Inventory cross-reference. */
  skills?: string;
}

/** A module card (selected work) or bench card (independent builds). Renders only real fields. */
const WorkCard = ({ project, index, kind = "module", skills = "" }: WorkCardProps) => {
  const { id, title, org, role, period, category, status, summary, highlights, stack, links } = project;
  const headingId = `project-${id}`;
  const meta = [org, role, period].filter(Boolean);
  const unit = unitLabel(kind, index);

  return (
    <article
      aria-labelledby={headingId}
      className={`card card--${kind} px-frame`}
      data-accent={kind === "bench" ? "leaf" : "teal"}
      data-skills={skills}
      id={`card-${id}`}
    >
      <div className="px-titlebar">
        <span className="px-titlebar__label">
          {unit} {id}
        </span>
        {status === "in-progress" && (
          <span className="px-titlebar__right card__status">
            <Led color="amber" blink />
            <span>In progress</span>
          </span>
        )}
      </div>
      <div className="px-body card__body">
        <div className="card__head">
          <Sprite name={ICONS[id] ?? "skill-block"} className="card__icon" />
          <div className="min-w-0">
            <p className="cartridge">{category}</p>
            <h3 id={headingId} className="card__title">
              {title}
            </h3>
            {meta.length > 0 && <p className="card__meta">{meta.join(" · ")}</p>}
          </div>
        </div>

        <p className="card__summary">{summary}</p>

        {highlights.length > 0 && (
          <ul className="checklist">
            {highlights.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        )}

        {stack.length > 0 && (
          <ul className="parts" aria-label="Stack">
            {stack.map((item) => (
              <li key={item} className="chip chip--part">
                {item}
              </li>
            ))}
          </ul>
        )}

        <p className="card__links">
          <PixelButton
            href={dossierHref(id)}
            variant="secondary"
            icon="glyph-idcard"
            srContext={`for ${title}`}
            prefetch={false}
            className="card__dossier"
          >
            Open dossier
          </PixelButton>
          {links?.map((link) => (
            <PixelButton
              key={link.href}
              href={link.href}
              external
              variant="secondary"
              icon="glyph-branch"
              srContext={`(${link.label} for ${title})`}
            >
              PULL SOURCE
            </PixelButton>
          ))}
        </p>
      </div>
    </article>
  );
};

export default WorkCard;
