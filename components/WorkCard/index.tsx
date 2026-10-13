import React, { useEffect, useRef } from "react";
import Image from "next/image";
import gsap from "gsap";

export interface WorkCardProps {
  img: string;
  name?: string;
  description?: string;
  category?: string;
  organization?: string;
  href: string;
}

const MAGNETIC_RADIUS = 100; // px beyond the card's edge

const WorkCard = ({
  img,
  name,
  description,
  category,
  organization,
  href,
}: WorkCardProps) => {
  const cardRef = useRef<HTMLAnchorElement | null>(null);
  const xTo = useRef<ReturnType<typeof gsap.quickTo> | null>(null);
  const yTo = useRef<ReturnType<typeof gsap.quickTo> | null>(null);

  useEffect(() => {
    const el = cardRef.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce), (pointer: coarse)").matches) return;

    // Spring-like quickTo setters — power3.out gives a subtle elastic feel
    xTo.current = gsap.quickTo(el, "x", { duration: 0.7, ease: "power3.out" });
    yTo.current = gsap.quickTo(el, "y", { duration: 0.7, ease: "power3.out" });

    const onMouseMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = e.clientX - cx;
      const dy = e.clientY - cy;

      // Distance from the mouse to the nearest edge of the card (0 when inside)
      const edgeDx = Math.max(0, Math.abs(dx) - rect.width / 2);
      const edgeDy = Math.max(0, Math.abs(dy) - rect.height / 2);
      const edgeDist = Math.sqrt(edgeDx * edgeDx + edgeDy * edgeDy);

      if (edgeDist < MAGNETIC_RADIUS) {
        // Pull strength ramps from 0 (at RADIUS) to 0.09 (at the edge)
        const pull = (1 - edgeDist / MAGNETIC_RADIUS) * 0.09;
        xTo.current!(dx * pull);
        yTo.current!(dy * pull);
      } else {
        xTo.current!(0);
        yTo.current!(0);
      }
    };

    window.addEventListener("mousemove", onMouseMove);

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      gsap.killTweensOf(el);
    };
  }, []);

  return (
    <a
      ref={cardRef}
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex h-full min-w-0 flex-col overflow-hidden cursor-pointer rounded-2xl p-3 laptop:p-4 border border-white/10 bg-white/5 backdrop-blur-md shadow-[0_12px_50px_rgba(0,0,0,0.35)] will-change-transform hover:border-[#7db6ff]/40 focus-visible:border-[#7db6ff] transition-[border-color] duration-300"
    >
      <div
        className="relative aspect-[4/3] shrink-0 overflow-hidden rounded-lg"
      >
        <Image
          alt={name ?? "Project image"}
          src={img}
          layout="fill"
          objectFit="cover"
          sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 50vw"
        />
      </div>

      {(category || organization) && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {category && (
            <span className="text-xs px-3 py-1 rounded-full border border-white/20 bg-white/[0.07] backdrop-blur-sm text-slate-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]">
              {category}
            </span>
          )}
          {organization && (
            <span className="text-xs px-3 py-1 rounded-full border border-[#0070F3]/50 bg-[#0070F3]/10 backdrop-blur-sm text-[#7db6ff] shadow-[0_0_12px_rgba(0,112,243,0.3),inset_0_1px_0_rgba(255,255,255,0.08)]">
              {organization}
            </span>
          )}
        </div>
      )}

      <h3 className="mt-5 text-2xl laptop:text-3xl font-medium">{name ?? "Project Name"}</h3>
      <p className="mt-3 mb-6 text-base leading-relaxed text-slate-300">{description ?? "Description"}</p>
      <span className="mt-auto flex items-center justify-between border-t border-white/10 pt-4 text-sm text-[#7db6ff]">{href === "https://github.com/adnanabaig" ? "View GitHub profile" : href.includes("github.com") ? "View source" : href.includes("linkedin.com") ? "View experience" : "Visit website"} <span aria-hidden="true" className="transition-transform group-hover:translate-x-1 group-focus-visible:translate-x-1">↗</span></span>
    </a>
  );
};

export default WorkCard;
