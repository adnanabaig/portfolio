import React, { useRef } from "react";
import { motion, useInView } from "framer-motion";
import Socials from "../Socials";

const Footer = () => {
  const ref = useRef<HTMLDivElement | null>(null);
  const visible = useInView(ref, { once: true, amount: 0.2 });

  return (
    <div ref={ref} className="mt-5 laptop:mt-40 p-2 laptop:p-0">
      {/* "Contact." — char-by-char slide-up */}
      <h1
        className="text-2xl text-bold"
        style={{ display: "flex", lineHeight: 1 }}
      >
        {"Contact.".split("").map((char, i) => (
          <span key={i} style={{ overflow: "hidden", display: "inline-block" }}>
            <motion.span
              style={{ display: "inline-block" }}
              initial={{ y: "110%" }}
              animate={visible ? { y: 0 } : undefined}
              transition={{ duration: 0.46, delay: 0.1 + i * 0.06, ease: [0.22, 1, 0.36, 1] }}
            >
              {char}
            </motion.span>
          </span>
        ))}
      </h1>

      {/* Socials fade + slide up after heading settles */}
      <motion.div
        className="mt-5"
        initial={{ opacity: 0, y: 18 }}
        animate={visible ? { opacity: 1, y: 0 } : undefined}
        transition={{ duration: 0.55, delay: 0.52, ease: [0.22, 1, 0.36, 1] }}
      >
        <Socials />
      </motion.div>

      {/* Copyright — subtle fade */}
      <motion.p
        className="text-sm mt-2 laptop:mt-10"
        style={{ opacity: 0 }}
        animate={visible ? { opacity: 0.4 } : undefined}
        transition={{ duration: 0.6, delay: 0.72 }}
      >
        Adnan Baig &mdash; Contract work &amp; billing via{" "}
        <a
          href="https://vizualty.net"
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2 hover:opacity-70 transition-opacity duration-200"
        >
          Vizualty LLC
        </a>
      </motion.p>
    </div>
  );
};

export default Footer;
