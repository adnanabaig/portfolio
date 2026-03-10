import { useRouter } from "next/router";
import Image from "next/image";
import React, { useEffect, useState } from "react";
import Button from "../Button";
import { Popover } from "@headlessui/react";

import portfolioJson from "../../data/portfolio.json";
import type { PortfolioData } from "../../types/portfolio";

const data = portfolioJson as PortfolioData;

// Split "Adnan Baig." into per-character spans so GSAP can stagger each one in,
// producing a typewriter snap-in effect without TextPlugin.
const LOGOTYPE_CHARS = (data.name + ".").split("");

export interface HeaderProps {
  handleWorkScroll?: () => void;
  handleAboutScroll?: () => void;
  isBlog?: boolean;
  /**
   * When true the logotype characters and desktop nav links start with
   * visibility:hidden so the GSAP intro timeline controls their reveal.
   * Blog pages omit this prop and render everything visible immediately.
   */
  introAnimate?: boolean;
}

const activeLinkCls =
  "relative after:absolute after:bottom-0 after:left-1/2 after:-translate-x-1/2 after:h-[2px] after:w-4/5 after:rounded-full after:bg-[#0070F3] after:shadow-[0_0_8px_rgba(0,112,243,0.8)] after:content-['']";

const Header = ({ handleWorkScroll, handleAboutScroll, isBlog, introAnimate }: HeaderProps) => {
  const router = useRouter();
  const isBlogRoute = router.pathname.startsWith("/blog");
  const [activeSection, setActiveSection] = useState<string | null>(null);

  // CSS initial state applied when the intro timeline controls reveal.
  // GSAP's autoAlpha will override these as the animation plays.
  const charHidden: React.CSSProperties = introAnimate
    ? { opacity: 0, visibility: "hidden" }
    : {};
  const navLinksHidden: React.CSSProperties = introAnimate
    ? { opacity: 0, visibility: "hidden" }
    : {};

  useEffect(() => {
    if (isBlog) return;

    const workEl  = document.getElementById("work-section");
    const aboutEl = document.getElementById("about-section");
    if (!workEl || !aboutEl) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActiveSection(entry.target.id);
        });
      },
      { threshold: 0.3 }
    );
    observer.observe(workEl);
    observer.observe(aboutEl);
    return () => observer.disconnect();
  }, [isBlog]);

  // Renders the logotype as individual character spans.
  // Each span carries data-logotype-char so GSAP can target all of them at once.
  // The period is coloured electric-blue; spaces are rendered as non-breaking.
  const renderChars = () =>
    LOGOTYPE_CHARS.map((char, i) => (
      <span
        key={i}
        data-logotype-char
        style={{
          ...charHidden,
          ...(char === "." ? { color: "#0070F3" } : {}),
        }}
      >
        {char === " " ? "\u00A0" : char}
      </span>
    ));

  return (
    <>
      {/* ── Mobile nav ───────────────────────────────────────────────────── */}
      <Popover className="block tablet:hidden mt-5">
        {({ open }) => (
          <>
            <div className="flex items-center justify-between p-2 rounded-xl border border-white/10 bg-white/5 backdrop-blur-md shadow-[0_8px_40px_rgba(0,0,0,0.35)]">
              <h1
                onClick={() => router.push("/")}
                className="font-mono font-extrabold tracking-tight cursor-pointer select-none text-2xl p-2"
                style={{ letterSpacing: "-0.04em" }}
              >
                {renderChars()}
              </h1>

              <Popover.Button>
                <span className="block h-5 w-5 relative">
                  <Image
                    src={`/images/${!open ? "menu.svg" : "cancel.svg"}`}
                    alt={open ? "Close menu" : "Open menu"}
                    layout="fill"
                    objectFit="contain"
                  />
                </span>
              </Popover.Button>
            </div>

            {/* Mobile panel — only visible when menu is open; no initial hiding needed */}
            <Popover.Panel className="absolute right-0 z-10 w-11/12 p-4 rounded-xl border border-white/10 bg-[#121212]/95 backdrop-blur-md shadow-[0_8px_40px_rgba(0,0,0,0.5)]">
              {!isBlog ? (
                <div className="grid grid-cols-1">
                  <Button onClick={handleWorkScroll}>Work</Button>
                  <Button onClick={handleAboutScroll}>About</Button>
                  {data.showBlog && <Button onClick={() => router.push("/blog")}>Blog</Button>}
                  <Button onClick={() => window.open("mailto:adnanabaig@gmail.com")}>Contact</Button>
                </div>
              ) : (
                <div className="grid grid-cols-1">
                  <Button onClick={() => router.push("/")} classes="first:ml-1">Home</Button>
                  {data.showBlog && <Button onClick={() => router.push("/blog")}>Blog</Button>}
                  <Button onClick={() => window.open("mailto:adnanabaig@gmail.com")}>Contact</Button>
                </div>
              )}
            </Popover.Panel>
          </>
        )}
      </Popover>

      {/* ── Desktop nav ──────────────────────────────────────────────────── */}
      <div className="mt-10 hidden tablet:flex flex-row items-center justify-between sticky top-0 z-10 rounded-xl border border-white/10 bg-white/5 backdrop-blur-md shadow-[0_8px_40px_rgba(0,0,0,0.35)] px-5">
        <h1
          onClick={() => router.push("/")}
          className="font-mono font-extrabold tracking-tight cursor-pointer select-none text-3xl ml-1 laptop:ml-2"
          style={{ letterSpacing: "-0.04em" }}
        >
          {renderChars()}
        </h1>

        {!isBlog ? (
          // data-nav-links lets the intro timeline fade this group in after typing
          <div data-nav-links className="flex items-center" style={navLinksHidden}>
            <Button
              onClick={handleWorkScroll}
              classes={activeSection === "work-section" ? activeLinkCls : ""}
            >
              Work
            </Button>
            <Button
              onClick={handleAboutScroll}
              classes={activeSection === "about-section" ? activeLinkCls : ""}
            >
              About
            </Button>
            {data.showBlog && (
              <Button
                onClick={() => router.push("/blog")}
                classes={isBlogRoute ? activeLinkCls : ""}
              >
                Blog
              </Button>
            )}
            <Button onClick={() => window.open("mailto:adnanabaig@gmail.com")}>
              Contact
            </Button>
          </div>
        ) : (
          <div className="flex items-center">
            <Button onClick={() => router.push("/")}>Home</Button>
            {data.showBlog && (
              <Button
                onClick={() => router.push("/blog")}
                classes={isBlogRoute ? activeLinkCls : ""}
              >
                Blog
              </Button>
            )}
            <Button onClick={() => window.open("mailto:adnanabaig@gmail.com")}>
              Contact
            </Button>
          </div>
        )}
      </div>
    </>
  );
};

export default Header;
