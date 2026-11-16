import Link from "next/link";
import React, { useCallback, useEffect, useRef, useState } from "react";
import portfolio from "../../data/portfolio.json";
import type { PortfolioData } from "../../types/portfolio";

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
  external?: boolean;
}

const SECTIONS: { title: string; id: string }[] = [
  { title: "Work", id: "work-section" },
  { title: "Experience", id: "experience-section" },
  { title: "Projects", id: "engineering-section" },
  { title: "About", id: "about-section" },
];

const linkClass =
  "nav-link inline-flex min-h-[44px] items-center rounded px-3 py-2 text-sm text-slate-300 hover:text-white hover:bg-white/5 transition-colors";

const Header = ({ current = "home" }: HeaderProps) => {
  const isHome = current === "home";
  const [activeSection, setActiveSection] = useState("");
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLElement | null>(null);

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
    [...SECTIONS.map((s) => s.id), "contact-section"].forEach((id) => {
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
  items.push({ title: "Resume", href: data.resumeUrl, external: true });

  const renderLinks = (onNavigate?: () => void) =>
    items.map((item) => {
      const ariaCurrent =
        item.section && isHome && item.section === activeSection
          ? ("location" as const)
          : item.href === "/blog" && current === "blog"
          ? ("page" as const)
          : undefined;

      if (item.external) {
        return (
          <a
            key={item.title}
            href={item.href}
            target="_blank"
            rel="noopener noreferrer"
            className={linkClass}
            onClick={onNavigate}
          >
            {item.title}
            <span className="sr-only"> (PDF, opens in new tab)</span>
          </a>
        );
      }
      if (item.href.startsWith("/")) {
        return (
          <Link href={item.href} key={item.title}>
            <a className={linkClass} aria-current={ariaCurrent} onClick={onNavigate}>
              {item.title}
            </a>
          </Link>
        );
      }
      return (
        <a key={item.title} href={item.href} className={linkClass} aria-current={ariaCurrent} onClick={onNavigate}>
          {item.title}
        </a>
      );
    });

  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-[#0d0e10]/95">
      <div className="container mx-auto flex min-h-[64px] items-center justify-between gap-4">
        <Link href="/">
          <a className="font-mono text-base font-medium tracking-tight" aria-label={`${data.name}, home`}>
            {data.name}
          </a>
        </Link>

        <nav aria-label="Main" className="hidden tablet:flex items-center gap-1">
          {renderLinks()}
        </nav>

        <button
          ref={buttonRef}
          type="button"
          className="tablet:hidden inline-flex h-11 w-11 items-center justify-center rounded border border-white/15 hover:bg-white/5"
          aria-label="Menu"
          aria-expanded={open}
          aria-controls="mobile-nav"
          onClick={() => setOpen((value) => !value)}
        >
          {open ? (
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true" focusable="false">
              <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true" focusable="false">
              <path d="M3 6h14M3 10h14M3 14h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          )}
        </button>
      </div>

      <nav
        ref={panelRef}
        id="mobile-nav"
        aria-label="Main"
        hidden={!open}
        className="tablet:hidden absolute inset-x-0 top-full max-h-[calc(100vh-6rem)] max-h-[calc(100svh-6rem)] overflow-y-auto border-b border-white/10 bg-[#0d0e10]"
      >
        <div className="container mx-auto grid py-2">{renderLinks(() => close(false))}</div>
      </nav>
    </header>
  );
};

export default Header;
