import Link from "next/link";
import React, { useCallback, useEffect, useRef, useState } from "react";
import portfolio from "../../data/portfolio.json";
import type { PortfolioData } from "../../types/portfolio";
import { KEYS, write } from "../../lib/storage";
import PixelButton from "../pixel/PixelButton";
import Sprite from "../pixel/Sprite";

const data = portfolio as PortfolioData;

export interface HeaderProps {
  /** Which page renders the header. Section links become "/#id" off the home page. */
  current?: "home" | "blog" | "other";
}

interface NavItem {
  title: string;
  href: string;
  /** Section id this item tracks for aria-current on the home page. */
  section?: string;
}

const SECTIONS: { title: string; id: string }[] = [
  { title: "Work", id: "work-section" },
  { title: "Experience", id: "experience-section" },
  { title: "Projects", id: "engineering-section" },
  { title: "About", id: "about-section" },
];

/** Checkpoints on the track, top to bottom of the home page. */
export const CHECKPOINTS = [
  "boot",
  "work-section",
  "experience-section",
  "engineering-section",
  "about-section",
  "writing-section",
  "contact-section",
];

/** TEXT MODE: everything in Plex, one column, no pixel decoration. */
function TextModeToggle({ plain, onToggle, className = "" }: { plain: boolean; onToggle: () => void; className?: string }) {
  return (
    <button type="button" className={`px-btn px-btn--ghost px-btn--compact ${className}`} aria-pressed={plain} onClick={onToggle}>
      <span>Text mode</span>
    </button>
  );
}

/**
 * The thin rail under the status bar. AB-01 parks at the checkpoint for the
 * section you are reading (it cuts there under reduced motion).
 */
function Track({ active }: { active: number }) {
  const [facingLeft, setFacingLeft] = useState(false);
  const last = useRef(active);
  useEffect(() => {
    if (active !== last.current) setFacingLeft(active < last.current);
    last.current = active;
  }, [active]);
  const n = CHECKPOINTS.length - 1;
  return (
    <div className="track" aria-hidden="true" data-slot="track">
      <div className="container mx-auto">
        <div className="track__rail">
          <ol className="track__marks">
            {CHECKPOINTS.map((id, i) => (
              <li key={id} className="track__mark" data-on={i <= active ? "" : undefined} style={{ left: `${(i / n) * 100}%` }} />
            ))}
          </ol>
          <div className="track__walker" style={{ transform: `translateX(${(active / n) * 100}%)` }}>
            <Sprite name="ab01" scale={1} flip={facingLeft} className="track__bot" />
          </div>
        </div>
      </div>
    </div>
  );
}

const Header = ({ current = "home" }: HeaderProps) => {
  const isHome = current === "home";
  const [activeSection, setActiveSection] = useState("");
  const [open, setOpen] = useState(false);
  const [plain, setPlain] = useState(false);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLElement | null>(null);

  // The inline _document script already applied ?plain=1 or the saved choice.
  useEffect(() => {
    setPlain(document.documentElement.hasAttribute("data-plain"));
  }, []);

  const togglePlain = useCallback(() => {
    const next = !document.documentElement.hasAttribute("data-plain");
    document.documentElement.toggleAttribute("data-plain", next);
    write(KEYS.plain, next ? "1" : "0");
    setPlain(next);
  }, []);

  // Track which section is in view so the matching link gets aria-current.
  useEffect(() => {
    if (!isHome || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActiveSection(entry.target.id);
        });
      },
      { rootMargin: "-10% 0px -50% 0px", threshold: 0 }
    );
    CHECKPOINTS.forEach((id) => {
      const element = document.getElementById(id);
      if (element) observer.observe(element);
    });
    return () => observer.disconnect();
  }, [isHome]);

  const close = useCallback((restoreFocus: boolean) => {
    setOpen(false);
    if (restoreFocus) buttonRef.current?.focus();
  }, []);

  // Escape closes the menu and returns focus; so does a click outside it.
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close(true);
      }
    };
    const onPointer = (event: PointerEvent) => {
      const target = event.target as Node;
      if (panelRef.current?.contains(target) || buttonRef.current?.contains(target)) return;
      close(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [open, close]);

  const sectionHref = (id: string) => (isHome ? `#${id}` : `/#${id}`);
  const items: NavItem[] = SECTIONS.map((s) => ({ title: s.title, href: sectionHref(s.id), section: s.id }));
  if (data.showBlog) items.push({ title: "Blog", href: "/blog" });
  items.push({ title: "Contact", href: sectionHref("contact-section"), section: "contact-section" });

  const renderLinks = (onNavigate?: () => void) =>
    items.map((item) => {
      const ariaCurrent =
        item.section && isHome && item.section === activeSection
          ? ("location" as const)
          : item.href === "/blog" && current === "blog"
          ? ("page" as const)
          : undefined;

      if (item.href.startsWith("/")) {
        return (
          <Link href={item.href} key={item.title}>
            <a className="nav-link" aria-current={ariaCurrent} onClick={onNavigate}>
              {item.title}
            </a>
          </Link>
        );
      }
      return (
        <a key={item.title} href={item.href} className="nav-link" aria-current={ariaCurrent} onClick={onNavigate}>
          {item.title}
        </a>
      );
    });

  const activeIndex = Math.max(0, CHECKPOINTS.indexOf(activeSection));

  return (
    <header className="statusbar">
      <div className="container mx-auto statusbar__row">
        <Link href="/">
          <a className="brand" aria-label={`${data.name}, home`}>
            <Sprite name="ab01-head" scale={2} className="brand__head" />
            <span className="brand__name">{data.name}</span>
          </a>
        </Link>

        <nav aria-label="Main" className="nav-desktop">
          {renderLinks()}
        </nav>

        <div className="statusbar__actions">
          <PixelButton href={data.resumeUrl} variant="primary" external srContext="PDF" className="px-btn--compact">
            RESUME.PDF
          </PixelButton>
          <TextModeToggle plain={plain} onToggle={togglePlain} className="statusbar__textmode" />
          <div className="hud-slot" data-slot="hud" />
          <button
            ref={buttonRef}
            type="button"
            className="px-btn px-btn--ghost px-btn--compact menu-button"
            aria-label="Menu"
            aria-expanded={open}
            aria-controls="mobile-nav"
            onClick={() => setOpen((value) => !value)}
          >
            <svg width="16" height="16" viewBox="0 0 8 8" shapeRendering="crispEdges" aria-hidden="true" focusable="false">
              {open ? (
                <path d="M1 1h1v1H1zM2 2h1v1H2zM3 3h2v2H3zM5 2h1v1H5zM6 1h1v1H6zM2 5h1v1H2zM1 6h1v1H1zM5 5h1v1H5zM6 6h1v1H6z" fill="currentColor" />
              ) : (
                <path d="M1 1h6v1H1zM1 3.5h6v1H1zM1 6h6v1H1z" fill="currentColor" />
              )}
            </svg>
          </button>
        </div>
      </div>

      <nav ref={panelRef} id="mobile-nav" aria-label="Main" hidden={!open} className="nav-mobile">
        <div className="container mx-auto nav-mobile__inner">
          {renderLinks(() => close(false))}
          <TextModeToggle plain={plain} onToggle={togglePlain} className="nav-mobile__textmode" />
        </div>
      </nav>

      {isHome && <Track active={activeIndex} />}
    </header>
  );
};

export default Header;
