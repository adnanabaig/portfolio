import { Html, Head, Main, NextScript } from "next/document";

// Runs before first paint. Adds `js` so CSS can tell scripting is on, and
// `motion-ok` only when the visitor has not asked for reduced motion. Any
// entrance animation must be gated on `.motion-ok`, so content is visible by
// default (no JS, reduced motion, or a slow bundle).
const prePaint = `(function(){var d=document.documentElement;d.classList.add('js');try{var m=window.matchMedia('(prefers-reduced-motion: no-preference)');var s=function(){d.classList.toggle('motion-ok',m.matches)};s();if(m.addEventListener){m.addEventListener('change',s)}else if(m.addListener){m.addListener(s)}}catch(e){}})();`;

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <meta name="theme-color" content="#0d0e10" />
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link
          rel="preload"
          href="/fonts/ibm-plex-sans-latin-wght-normal.woff2"
          as="font"
          type="font/woff2"
          crossOrigin=""
        />
        <script dangerouslySetInnerHTML={{ __html: prePaint }} />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
