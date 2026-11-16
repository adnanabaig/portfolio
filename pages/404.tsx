import Link from "next/link";
import { useState } from "react";

import Header from "../components/Header";
import Footer from "../components/Footer";
import Seo from "../components/Seo";
import Eyebrow from "../components/pixel/Eyebrow";
import Sprite from "../components/pixel/Sprite";
import portfolio from "../data/portfolio.json";
import { clientOnly } from "../lib/clientOnly";

// The micro-level loads only when the visitor asks for it.
const LostSignal = clientOnly(() => import("../components/lost/LostSignal"));

export default function NotFound() {
  const [drive, setDrive] = useState(false);
  return (
    <>
      <Seo
        title={`Page not found | ${portfolio.name}`}
        description="This page does not exist."
        path="/404"
        noindex
      />
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>
      <Header current="other" />
      <main id="main-content" tabIndex={-1} className="container mx-auto page-main focus:outline-none" data-bay="2">
        <div className="lost layout-grid">
          <div>
            <p className="eyebrow eyebrow--fault">
              <span className="eyebrow__bay">Fault 404</span>
              <span aria-hidden="true" className="eyebrow__sep">
                /
              </span>
              <span>Signal lost</span>
            </p>
            <h1 className="page-title">This page does not exist.</h1>
            <p className="page-lede">The link may be old or mistyped. Try one of these instead.</p>
            <ul className="lost__links">
              <li>
                <Link href="/">
                  <a className="px-btn px-btn--primary">
                    <span>Home</span>
                  </a>
                </Link>
              </li>
              <li>
                <Link href="/#work-section">
                  <a className="px-btn px-btn--secondary">
                    <span>Work</span>
                  </a>
                </Link>
              </li>
              {portfolio.showBlog && (
                <li>
                  <Link href="/blog">
                    <a className="px-btn px-btn--secondary">
                      <span>Blog</span>
                    </a>
                  </Link>
                </li>
              )}
            </ul>
          </div>
          <div className="lost__bot">
            <Sprite name="ab01-lost" scale={6} />
          </div>
        </div>
        {/* Optional: the plain links above are the way out; this is for fun. */}
        <div className="lost__level" data-slot="level-404">
          <button
            id="drive-home"
            type="button"
            className="px-btn px-btn--secondary lost__drive"
            onClick={() => (drive ? document.querySelector<HTMLElement>(".level__play")?.focus() : setDrive(true))}
          >
            <span>Drive AB-01 home</span>
          </button>
          {drive && <LostSignal />}
        </div>
      </main>
      <Footer />
    </>
  );
}
