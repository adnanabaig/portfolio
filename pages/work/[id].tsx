import Link from "next/link";
import type { GetStaticPaths, GetStaticProps } from "next";

import Header from "../../components/Header";
import Footer from "../../components/Footer";
import Seo from "../../components/Seo";
import Led from "../../components/pixel/Led";
import PixelButton from "../../components/pixel/PixelButton";
import Sprite from "../../components/pixel/Sprite";
import { PROJECT_ICONS, dossierHref, projectEntries, type ProjectEntry } from "../../lib/projects";
import portfolioJson from "../../data/portfolio.json";
import type { PortfolioData, Schematic, SchematicKind } from "../../types/portfolio";

const data = portfolioJson as PortfolioData;

interface Neighbor {
  id: string;
  title: string;
  unit: string;
}

interface NetLine {
  from: string;
  to: string;
  kind: "flow" | "link" | "gate";
  note: string | null;
}

interface DossierProps {
  entry: ProjectEntry;
  prev: Neighbor | null;
  next: Neighbor | null;
  sketch: { wide: string; narrow: string; kinds: SchematicKind[]; wires: NetLine["kind"][]; net: NetLine[] };
}

const BAYS = {
  module: { bay: 1, name: "Selected work", accent: "teal" },
  bench: { bay: 3, name: "Independent builds", accent: "leaf" },
} as const;

const KIND_LABEL: Record<SchematicKind, string> = { hw: "Hardware", sw: "Software", data: "Data", check: "Check" };
const WIRE_LABEL = { flow: "Flow", link: "Link", gate: "Gate" } as const;
const WIRE_WORD = { flow: "to", link: "linked to", gate: "gates" } as const;

export default function Dossier({ entry, prev, next, sketch }: DossierProps) {
  const { project, kind, unit, order } = entry;
  const { id, title, org, role, period, category, status, summary, highlights, stack, links } = project;
  const bay = BAYS[kind];
  const path = dossierHref(id);
  const url = `${data.siteUrl}${path}`;
  const meta = [org, role, period].filter(Boolean);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    name: title,
    description: summary,
    url,
    mainEntityOfPage: url,
    genre: category,
    keywords: stack.join(", "),
    ...(links?.length ? { sameAs: links.map((l) => l.href) } : {}),
    creator: { "@type": "Person", name: data.name, url: data.siteUrl },
    isPartOf: { "@type": "WebSite", name: data.name, url: data.siteUrl },
  };

  return (
    <>
      <Seo title={`${title} | ${data.name}`} description={summary} path={path} jsonLd={jsonLd} />
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>
      <Header current="other" />
      <main id="main-content" tabIndex={-1} className="container mx-auto page-main dossier focus:outline-none" data-bay={bay.bay}>
        <nav aria-label="Breadcrumb" className="crumbs">
          <ol>
            <li>
              <Link href="/">
                <a>Station</a>
              </Link>
            </li>
            <li>
              <Link href={`/#card-${id}`}>
                <a>
                  <span>
                    Bay {String(bay.bay).padStart(2, "0")}
                    <span className="crumbs__long"> {bay.name}</span>
                  </span>
                </a>
              </Link>
            </li>
            <li>
              <span aria-current="page">{unit}</span>
            </li>
          </ol>
        </nav>


        <article aria-labelledby="dossier-title" className="dossier__article">
          <header className="dossier__plate px-frame" data-accent={bay.accent}>
            <div className="px-titlebar">
              <span className="px-titlebar__label">
                {unit} {id}
              </span>
              {status === "in-progress" ? (
                <span className="px-titlebar__right card__status">
                  <Led color="amber" blink />
                  <span>In progress</span>
                </span>
              ) : (
                <span className="px-titlebar__right dossier__file">Dossier</span>
              )}
            </div>
            <div className="px-body dossier__head">
              <Sprite name={PROJECT_ICONS[id] ?? "skill-block"} className="dossier__icon" />
              <div className="min-w-0">
                <p className="cartridge dossier__cat">{category}</p>
                <h1 id="dossier-title" className="dossier__title">
                  {title}
                </h1>
                {meta.length > 0 && <p className="card__meta dossier__meta">{meta.join(" · ")}</p>}
                {stack.length > 0 && (
                  <ul className="parts" aria-label="Stack">
                    {stack.map((item) => (
                      <li key={item} className="chip chip--part">
                        {item}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </header>

          <div className="dossier__grid layout-grid">
            <section aria-labelledby="brief-heading" className="dossier__brief">
              <h2 id="brief-heading" className="sub-title">
                Brief
              </h2>
              <p className="dossier__summary">{summary}</p>
              {highlights.length > 0 && (
                <>
                  <h2 className="sub-title dossier__sub">Checklist</h2>
                  <ul className="checklist">
                    {highlights.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </>
              )}
            </section>

            <aside aria-labelledby="spec-heading" className="dossier__spec px-frame px-frame--inset" data-accent={bay.accent}>
              <div className="px-titlebar">
                <h2 id="spec-heading" className="px-titlebar__label">
                  Spec sheet
                </h2>
              </div>
              <dl className="px-body spec">
                <div>
                  <dt className="label">Unit</dt>
                  <dd>{unit}</dd>
                </div>
                <div>
                  <dt className="label">Bay</dt>
                  <dd>{bay.name}</dd>
                </div>
                <div>
                  <dt className="label">Category</dt>
                  <dd>{category}</dd>
                </div>
                {org && (
                  <div>
                    <dt className="label">Org</dt>
                    <dd>{org}</dd>
                  </div>
                )}
                {role && (
                  <div>
                    <dt className="label">Role</dt>
                    <dd>{role}</dd>
                  </div>
                )}
                {period && (
                  <div>
                    <dt className="label">Period</dt>
                    <dd>{period}</dd>
                  </div>
                )}
                {status === "in-progress" && (
                  <div>
                    <dt className="label">Status</dt>
                    <dd>In progress</dd>
                  </div>
                )}
              </dl>
              {links && links.length > 0 && (
                <p className="dossier__links">
                  {links.map((link) => (
                    <PixelButton
                      key={link.href}
                      href={link.href}
                      external
                      variant="primary"
                      icon="glyph-branch"
                      srContext={`(${link.label} for ${title})`}
                    >
                      PULL SOURCE
                    </PixelButton>
                  ))}
                </p>
              )}
            </aside>
          </div>

          <figure className="sketch px-frame" data-accent={bay.accent} aria-labelledby="sketch-caption">
            <figcaption id="sketch-caption" className="px-titlebar">
              <span className="px-titlebar__label">
                FIG. {order} / system sketch (illustrative)
              </span>
            </figcaption>
            <div className="px-body sketch__body">
              <div className="sketch__canvas" dangerouslySetInnerHTML={{ __html: sketch.wide + sketch.narrow }} />
              <ul className="sketch__legend" aria-label="Legend">
                {sketch.kinds.map((k) => (
                  <li key={k}>
                    <span className={`sketch__key sketch__key--${k}`} aria-hidden="true" />
                    {KIND_LABEL[k]}
                  </li>
                ))}
                {sketch.wires.map((w) => (
                  <li key={w}>
                    <span className={`sketch__wire sketch__wire--${w}`} aria-hidden="true" />
                    {WIRE_LABEL[w]}
                  </li>
                ))}
              </ul>
              <h3 className="sub-title sketch__nethead">Netlist</h3>
              <ul className="sketch__net">
                {sketch.net.map((line) => (
                  <li key={`${line.from}-${line.to}`}>
                    <span className="sketch__part">{line.from}</span> {WIRE_WORD[line.kind]} <span className="sketch__part">{line.to}</span>
                    {line.note && <span className="sketch__note">: {line.note}</span>}
                  </li>
                ))}
              </ul>
              <p className="sketch__fine">
                Illustrative. Every part in the sketch is named in the copy above. The wiring shows how the parts relate, not the exact architecture.
              </p>
            </div>
          </figure>
        </article>

        <nav aria-label="More projects" className="dossier__pager">
          {prev ? (
            <Link href={dossierHref(prev.id)}>
              <a className="pager px-frame" rel="prev">
                <span className="label pager__dir">
                  <Sprite name="glyph-arrow" scale={2} mono />
                  Prev {prev.unit}
                </span>
                <span className="pager__title">{prev.title}</span>
              </a>
            </Link>
          ) : (
            <span />
          )}
          {next ? (
            <Link href={dossierHref(next.id)}>
              <a className="pager pager--next px-frame" rel="next">
                <span className="label pager__dir">
                  Next {next.unit}
                  <Sprite name="glyph-arrow" scale={2} mono flip />
                </span>
                <span className="pager__title">{next.title}</span>
              </a>
            </Link>
          ) : (
            <span />
          )}
        </nav>
      </main>
      <Footer />
    </>
  );
}

const entries = () => projectEntries(data);

export const getStaticPaths: GetStaticPaths = () => ({
  paths: entries().map((e) => ({ params: { id: e.project.id } })),
  fallback: false,
});

export const getStaticProps: GetStaticProps<DossierProps> = async ({ params }) => {
  const { renderSchematic } = await import("../../lib/schematic");
  const schematics = (await import("../../data/schematics.json")).default as unknown as Record<string, Schematic>;
  const list = entries();
  const at = list.findIndex((e) => e.project.id === params?.id);
  if (at < 0) return { notFound: true };
  const entry = list[at];
  const spec = schematics[entry.project.id];
  if (!spec) throw new Error(`data/schematics.json has no sketch for ${entry.project.id}`);
  const neighbor = (e?: ProjectEntry): Neighbor | null => (e ? { id: e.project.id, title: e.project.title, unit: e.unit } : null);
  const label = new Map(spec.nodes.map((n) => [n.id, n.label.join(" ")]));
  const order: SchematicKind[] = ["hw", "sw", "data", "check"];
  return {
    props: {
      entry,
      prev: neighbor(list[at - 1]),
      next: neighbor(list[at + 1]),
      sketch: {
        wide: renderSchematic(spec, "wide", entry.project.id).svg,
        narrow: renderSchematic(spec, "narrow", entry.project.id).svg,
        kinds: order.filter((k) => spec.nodes.some((n) => n.kind === k)),
        wires: (["flow", "gate", "link"] as const).filter((w) => spec.edges.some((e) => (e.kind ?? "flow") === w)),
        net: spec.edges.map((e) => ({
          from: label.get(e.from) ?? e.from,
          to: label.get(e.to) ?? e.to,
          kind: e.kind ?? "flow",
          note: e.note ?? null,
        })),
      },
    },
  };
};
