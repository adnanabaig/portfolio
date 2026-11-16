// /lab: the visual QA bench for Station AB-01. Every sprite and frame at 1x
// to 4x, every token with its contrast against ink and panel, and every
// button and frame variant. Not linked, noindex, and left out of the sitemap.
import { useEffect, useState } from "react";
import Header from "../components/Header";
import Seo from "../components/Seo";
import DitherBand from "../components/pixel/DitherBand";
import Eyebrow from "../components/pixel/Eyebrow";
import Led from "../components/pixel/Led";
import Panel from "../components/pixel/Panel";
import PixelButton from "../components/pixel/PixelButton";
import Sprite from "../components/pixel/Sprite";
import CellPoster from "../components/teleop/CellPoster";
import { contrast, TOKENS } from "../lib/pixel/tokens";
// Static import: /lab draws every sprite, so it registers the sheet up front.
import { sprites } from "../lib/pixel/spriteData";
import type { SpriteName } from "../lib/pixel/toPaths";

const INK = TOKENS.find((t) => t.name === "--ink")!.hex;
const PANEL = TOKENS.find((t) => t.name === "--panel")!.hex;
const THEMES = ["default", "amber", "mono"] as const;

function ratio(n: number) {
  return `${n.toFixed(1)}:1`;
}

interface SwatchProps {
  name: string;
  hex: string;
  text: boolean;
  role: string;
  live?: string;
  ink: string;
  panel: string;
}

function Swatch({ name, hex, text, role, live, ink, panel }: SwatchProps) {
  const value = live || hex;
  const onInk = contrast(value, ink);
  const onPanel = contrast(value, panel);
  const fails = text && (onInk < 4.5 || onPanel < 4.5);
  const drift = live && live.toUpperCase() !== hex.toUpperCase();
  return (
    <li className="lab-swatch px-frame">
      <div className="px-body">
        <span className="lab-swatch__chip" style={{ background: `var(${name})` }} />
        <p className="lab-swatch__name">{name}</p>
        <p className="lab-swatch__meta">
          {value} · {role}
        </p>
        <p className="lab-swatch__meta">
          ink {ratio(onInk)} · panel {ratio(onPanel)} · {text ? "text" : "decor only"}
          {fails && <strong className="lab-bad"> FAILS AA</strong>}
          {drift && <strong className="lab-bad"> theme or drift: list says {hex}</strong>}
        </p>
        {text && (
          <p className="lab-swatch__sample">
            <span style={{ color: `var(${name})`, background: "var(--ink)" }}>Sample on ink</span>{" "}
            <span style={{ color: `var(${name})`, background: "var(--panel)" }}>Sample on panel</span>
          </p>
        )}
      </div>
    </li>
  );
}

export default function Lab() {
  const [live, setLive] = useState<Record<string, string>>({});
  const [theme, setTheme] = useState<(typeof THEMES)[number]>("default");

  // Read the live CSS custom properties so the page reports what actually ships.
  useEffect(() => {
    const root = document.documentElement;
    if (theme === "default") root.removeAttribute("data-theme");
    else root.setAttribute("data-theme", theme);
    const style = getComputedStyle(root);
    const next: Record<string, string> = {};
    TOKENS.forEach((t) => (next[t.name] = style.getPropertyValue(t.name).trim()));
    setLive(next);
  }, [theme]);

  useEffect(() => () => document.documentElement.removeAttribute("data-theme"), []);

  const names = Object.keys(sprites) as SpriteName[];

  return (
    <>
      <Seo title="Lab | Station AB-01" description="Sprite and token review bench." path="/lab" noindex />
      <Header current="other" />
      <main id="main-content" className="container mx-auto page-main lab">
        <header className="page-head">
          <Eyebrow bay={0} label="Lab" />
          <h1 className="page-title">Station AB-01 lab</h1>
          <p className="page-lede">
            Review bench for original art and tokens. Every sprite below is authored in lib/pixel/sprites.json.
          </p>
          <div className="lab-row" role="group" aria-label="Theme">
            {THEMES.map((t) => (
              <button key={t} type="button" className="chip chip--skill" aria-pressed={theme === t} onClick={() => setTheme(t)}>
                {t}
              </button>
            ))}
          </div>
        </header>

        <section aria-labelledby="lab-sprites">
          <h2 id="lab-sprites" className="section-title">
            Sprites
          </h2>
          <ul className="lab-sprites">
            {names.flatMap((name) =>
              sprites[name].frames.map((_, frame) => (
                <li key={`${name}-${frame}`} className="lab-sprite px-frame">
                  <div className="px-titlebar">
                    <span className="px-titlebar__label">
                      {name} [{frame}]
                    </span>
                    <span className="px-titlebar__right">
                      {sprites[name].w}x{sprites[name].h}
                    </span>
                  </div>
                  <div className="px-body lab-sprite__scales">
                    {[1, 2, 3, 4].map((s) => (
                      <Sprite key={s} name={name} frame={frame} scale={s} />
                    ))}
                  </div>
                </li>
              ))
            )}
          </ul>
        </section>

        <section aria-labelledby="lab-og">
          <h2 id="lab-og" className="section-title">
            Social card and icons
          </h2>
          <p className="section-sub">Generated by npm run og from the same sprite data. Review against the original-art rule.</p>
          <div className="lab-row">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/og.png" width={600} height={315} alt="Social card: Adnan Baig, AB-01, and the workcell arm" className="lab-og" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/apple-touch-icon.png" width={180} height={180} alt="Apple touch icon: AB-01 head" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icon-32.png" width={32} height={32} alt="Favicon: AB-01 head" />
          </div>
        </section>

        <section aria-labelledby="lab-poster">
          <h2 id="lab-poster" className="section-title">
            Cell poster
          </h2>
          <div className="px-frame px-frame--crt cell lab-poster">
            <div className="crt-screen">
              <CellPoster />
            </div>
          </div>
        </section>

        <section aria-labelledby="lab-tokens">
          <h2 id="lab-tokens" className="section-title">
            Tokens
          </h2>
          <p className="section-sub">Contrast is computed in the page from the live CSS values.</p>
          <ul className="lab-swatches">
            {TOKENS.map((t) => (
              <Swatch key={t.name} {...t} live={live[t.name]} ink={live["--ink"] || INK} panel={live["--panel"] || PANEL} />
            ))}
          </ul>
        </section>

        <section aria-labelledby="lab-ui">
          <h2 id="lab-ui" className="section-title">
            Buttons, frames, chips, LEDs
          </h2>
          <div className="lab-row">
            <PixelButton variant="primary">Primary</PixelButton>
            <PixelButton variant="secondary">Secondary</PixelButton>
            <PixelButton variant="danger" icon="glyph-estop">
              E-stop
            </PixelButton>
            <PixelButton variant="ghost" icon="glyph-speaker">
              Ghost
            </PixelButton>
            <PixelButton variant="secondary" disabled>
              Disabled
            </PixelButton>
          </div>
          <div className="lab-row">
            <button type="button" className="chip chip--skill" aria-pressed="false">
              Chip
            </button>
            <button type="button" className="chip chip--skill" aria-pressed="true">
              Pressed
            </button>
            <button type="button" className="chip chip--skill" data-hit="">
              Found
            </button>
            <span className="chip chip--part">Part chip</span>
            <span className="cartridge">Cartridge</span>
            <span className="badge badge--current">
              <Led color="teal" blink />
              Current
            </span>
          </div>
          <div className="lab-row">
            {(["leaf", "amber", "coral", "teal", "violet", "sky", "off"] as const).map((c) => (
              <span key={c} className="lab-led">
                <Led color={c} blink={c === "amber"} /> {c}
              </span>
            ))}
          </div>
          <div className="lab-frames">
            <Panel title="Default">Frame body</Panel>
            <Panel title="Active" variant="active">
              Frame body
            </Panel>
            <Panel title="Inset" variant="inset">
              Frame body
            </Panel>
            <Panel title="CRT" variant="crt" bodyClassName="crt-screen lab-crt">
              <Sprite name="ab01" scale={4} />
            </Panel>
          </div>
          <div className="lab-dither">
            <DitherBand from="teal" to="amber" />
            <DitherBand from="amber" to="leaf" />
            <DitherBand from="leaf" to="violet" />
            <DitherBand from="violet" to="sky" />
          </div>
          <div className="lab-type">
            <p className="hero__name">Pixelify h1</p>
            <p className="section-title">Pixelify h2</p>
            <p className="eyebrow">Silkscreen 16 label</p>
            <p className="lab-type__24">Silkscreen 24</p>
            <p>IBM Plex Sans body at 17 to 18px with a 1.6 line height.</p>
            <p className="font-mono text-mist">IBM Plex Mono meta 14px</p>
          </div>
        </section>
      </main>
    </>
  );
}
