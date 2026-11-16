import Link from "next/link";

import Header from "../components/Header";
import Footer from "../components/Footer";
import Seo from "../components/Seo";
import portfolio from "../data/portfolio.json";

const linkClass = "inline-flex min-h-[44px] items-center text-cyan-300 underline underline-offset-4";

export default function NotFound() {
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
      <main id="main-content" tabIndex={-1} className="container mx-auto py-24 focus:outline-none">
        <p className="font-mono text-sm text-amber-300">Fault 404</p>
        <h1 className="mt-3 text-4xl laptop:text-5xl font-semibold tracking-tight">This page does not exist.</h1>
        <p className="mt-4 max-w-xl text-lg text-slate-300">The link may be old or mistyped. Try one of these instead.</p>
        <ul className="mt-8 flex flex-wrap gap-6">
          <li>
            <Link href="/">
              <a className={linkClass}>Home</a>
            </Link>
          </li>
          <li>
            <Link href="/#work-section">
              <a className={linkClass}>Work</a>
            </Link>
          </li>
          {portfolio.showBlog && (
            <li>
              <Link href="/blog">
                <a className={linkClass}>Blog</a>
              </Link>
            </li>
          )}
        </ul>
      </main>
      <Footer />
    </>
  );
}
