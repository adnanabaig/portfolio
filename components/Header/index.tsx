import Link from "next/link";
import Image from "next/image";
import React, { useEffect, useState } from "react";
import { Popover } from "@headlessui/react";
import data from "../../data/portfolio.json";

export interface HeaderProps {
  handleWorkScroll?: () => void;
  handleAboutScroll?: () => void;
  isBlog?: boolean;
  introAnimate?: boolean;
}

const linkClass = "nav-link rounded-lg px-4 py-3 text-sm hover:bg-white/10 transition-colors";
const Header = ({ isBlog = false }: HeaderProps) => {
  const [activeSection, setActiveSection] = useState("");
  useEffect(() => {
    if (isBlog) return;
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) setActiveSection(entry.target.id);
      });
    }, { rootMargin: "-10% 0px -50% 0px", threshold: 0 });
    ["work-section", "engineering-section", "about-section", "contact-section"].forEach((id) => {
      const element = document.getElementById(id);
      if (element) observer.observe(element);
    });
    return () => observer.disconnect();
  }, [isBlog]);
  const items = isBlog
    ? [{ title: "Home", href: "/" }]
    : [{ title: "Work", href: "#work-section" }, { title: "Projects", href: "#engineering-section" }, { title: "About", href: "#about-section" }];
  if (data.showBlog) items.push({ title: "Blog", href: "/blog" });
  items.push({ title: "Contact", href: isBlog ? "/#contact-section" : "#contact-section" });

  const logo = (
    <Link href="/">
      <a aria-label="Adnan Baig home" className="font-mono font-extrabold tracking-tight select-none text-2xl laptop:text-3xl p-2">
        {data.name}<span className="text-[#0070F3]">.</span>
      </a>
    </Link>
  );
  const links = (close?: () => void) => items.map((item) => (
    <Link href={item.href} key={item.title}>
      <a className={linkClass} onClick={() => close?.()}
        aria-current={item.href === `#${activeSection}` ? "location" : isBlog && item.href === "/blog" ? "page" : undefined}>
        {item.title}
      </a>
    </Link>
  ));
  return (
    <header className="relative z-20 px-4 laptop:px-0">
      <Popover className="tablet:hidden mt-5">
        {({ open, close }) => (
          <>
            <div className="flex items-center justify-between p-2 rounded-xl border border-white/10 bg-white/5 backdrop-blur-md">
              {logo}
              <Popover.Button aria-label={open ? "Close navigation" : "Open navigation"} className="p-3 rounded-lg hover:bg-white/10">
                <span className="block h-5 w-5 relative">
                  <Image src={`/images/${open ? "cancel" : "menu"}.svg`} alt="" layout="fill" objectFit="contain" className="invert" />
                </span>
              </Popover.Button>
            </div>
            <Popover.Panel as="nav" aria-label="Main navigation" className="absolute inset-x-4 mt-2 p-3 rounded-xl border border-white/10 bg-[#121212]/95 backdrop-blur-md shadow-xl">
              <div className="grid">{links(close)}</div>
            </Popover.Panel>
          </>
        )}
      </Popover>
      <div className="mt-10 hidden tablet:flex items-center justify-between rounded-xl border border-white/10 bg-white/5 backdrop-blur-md px-3 py-2">
        {logo}
        <nav aria-label="Main navigation" className="flex items-center">{links()}</nav>
      </div>
    </header>
  );
};
export default Header;
