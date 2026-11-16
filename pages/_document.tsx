import { Html, Head, Main, NextScript } from "next/document";

// Runs before first paint:
// - `js` so CSS can tell scripting is on.
// - `motion-ok` only when the visitor has not asked for reduced motion. Any
//   entrance animation must be gated on `.motion-ok`, so content is visible
//   by default (no JS, reduced motion, or a slow bundle).
// - `data-plain` (Text Mode) from ?plain=1|0 or the saved choice.
// - `data-theme` from the saved choice (amber | mono).
// - `data-booted` when the boot log already played this session.
// - `data-estop` when the visitor latched the global E-STOP (it persists).
const prePaint = `(function(){var d=document.documentElement;d.classList.add('js');try{var m=window.matchMedia('(prefers-reduced-motion: no-preference)');var s=function(){d.classList.toggle('motion-ok',m.matches)};s();if(m.addEventListener){m.addEventListener('change',s)}else if(m.addListener){m.addListener(s)}}catch(e){}var q=/[?&]plain=([01])/.exec(location.search);var p=q?q[1]:null;try{var ls=window.localStorage;if(p){ls.setItem('ab:plain',p)}else{p=ls.getItem('ab:plain')}var t=ls.getItem('ab:theme');if(t==='amber'||t==='mono'){d.setAttribute('data-theme',t)}if(ls.getItem('ab:estop')==='1'){d.setAttribute('data-estop','')}}catch(e){}if(p==='1'){d.setAttribute('data-plain','')}try{var ss=window.sessionStorage;if(ss.getItem('ab:booted')){d.setAttribute('data-booted','')}else{ss.setItem('ab:booted','1')}}catch(e){}})();`;

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <meta name="theme-color" content="#0B0E14" />
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link
          rel="preload"
          href="/fonts/pixelify-sans-latin-wght-normal.woff2"
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
