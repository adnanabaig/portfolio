import Link from "next/link";
import React, { useCallback, useEffect, useRef, useState } from "react";
import portfolio from "../../data/portfolio.json";
import type { PortfolioData } from "../../types/portfolio";
import { isPlain, setPlain as savePlain } from "../../lib/station";
import { emit, on as onBus } from "../../lib/bus";
import { KeysButton, OpsButton } from "../ops/OpsButton";
import SoundToggle from "../ops/SoundToggle";
import StationLayer from "../ops/StationLayer";
import { useSections } from "../../hooks/useSections";
import EStop from "../EStop";
import PixelButton from "../pixel/PixelButton";
import ScrollTrack, { type Checkpoint } from "../ScrollTrack";
import Sprite from "../pixel/Sprite";

const data = portfolio as PortfolioData;

export interface HeaderProps {
  /** Which page renders the header. Section links become "/#id" off the home page. */
  current?: "home" | "blog" | "other";
  /** Section ids on this page, top to bottom (home only). Defaults to CHECKPOINTS. */
  checkpoints?: string[];
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

const CHECKPOINT_TITLES: Record<string, string> = {
  boot: "Top",
  "work-section": "Work",
  "experience-section": "Experience",
  "engineering-section": "Projects",
  "about-section": "About",
  "writing-section": "Writing",
  "contact-section": "Contact",
};

/** TEXT MODE: everything in Plex, one column, no pixel decoration. */
function TextModeToggle({ plain, onToggle, className = "" }: { plain: boolean; onToggle: () => void; className?: string }) {
  return (
    <button type="button" className={`px-btn px-btn--ghost px-btn--compact ${className}`} aria-pressed={plain} onClick={onToggle}>
      <span>Text mode</span>
    </button>
  );
}

const Header = ({ current = "home", checkpoints = CHECKPOINTS }: HeaderProps) => {
  const isHome = current === "home";
  // One scroll source for aria-current and the AB-01 track.
  const sections = useSections(checkpoints, isHome);
  const activeSection = isHome ? sections.activeId : "";
  const [open, setOpen] = useState(false);
  const [plain, setPlain] = useState(false);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLElement | null>(null);

  // The inline _document script already applied ?plain=1 or the saved choice.
  useEffect(() => {
    setPlain(isPlain());
  }, []);

  const togglePlain = useCallback(() => {
    const next = !isPlain();
    savePlain(next);
    setPlain(next);
  }, []);

  const close = useCallback((restoreFocus: boolean) => {
    setOpen(false);
    if (restoreFocus) buttonRef.current?.focus();
  }, []);

  // Opening a station dialog from the menu closes the menu (focus returns to the menu button later).
  useEffect(() => onBus("ab:open", () => setOpen(false)), []);

  // Triple-click the AB-01 head: it waves on the track (an easter egg; the logo is not the h1).
  const onBrandClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (e.detail < 2) return;
    e.preventDefault();
    if (e.detail === 3) {
      emit("ab:bot", { act: "wave" });
      import("../../lib/badges").then((m) => m.discover("wave")).catch(() => undefined);
    }
  };

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

  const trackPoints: Checkpoint[] = checkpoints.map((id) => ({ id, title: CHECKPOINT_TITLES[id] ?? id }));

  return (
    <header className="statusbar">
      <div className="container mx-auto statusbar__row">
        <Link href="/">
          <a
            className="brand"
            aria-label={`${data.name}, home`}
            onClick={onBrandClick}
            onMouseDown={(e) => {
              if (e.detail > 1) e.preventDefault();
            }}
          >
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
          <EStop />
          <div className="hud-slot" data-slot="hud">
            <OpsButton />
          </div>
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

      <nav ref={panelRef} id="mobile-nav" aria-label="Menu" hidden={!open} className="nav-mobile">
        <div className="container mx-auto nav-mobile__inner">
          {renderLinks(() => close(false))}
          <div className="nav-mobile__controls">
            <OpsButton className="nav-mobile__ops" />
            <SoundToggle />
            <KeysButton />
            <TextModeToggle plain={plain} onToggle={togglePlain} className="nav-mobile__textmode" />
          </div>
        </div>
      </nav>

      {isHome && <ScrollTrack checkpoints={trackPoints} sections={sections} />}
      {/* Shown only while html[data-estop] is set (CSS), so it is right before hydration too. */}
      <p className="sitestop">
        <span className="sitestop__tag">Site stop</span> <span className="sitestop__msg">
          Motion frozen. Press <span className="whitespace-nowrap">E-STOP</span> again to release.
        </span>
      </p>
      <StationLayer />
    </header>
  );
};

export default Header;
