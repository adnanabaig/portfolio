// BAY 00 / BOOT. Name, role, lede, proof, and the resume link all paint as
// plain HTML at t=0; the cell view sits beside (or below) and never gates it.
import portfolio from "../../data/portfolio.json";
import type { PortfolioData } from "../../types/portfolio";
import CellPoster from "../teleop/CellPoster";
import Led from "../pixel/Led";
import PixelButton from "../pixel/PixelButton";
import Socials from "../Socials";
import BootLog from "./BootLog";
import Telemetry from "./Telemetry";

const data = portfolio as PortfolioData;

const Hero = () => (
  <section id="boot" aria-labelledby="hero-heading" className="hero bay" data-bay="0">
    <div className="container mx-auto">
      <div className="hero__grid layout-grid">
        <div className="hero__copy">
          <p className="chip chip--live">
            <span className="chip__tag" aria-hidden="true">
              <Led color="leaf" blink />
              LIVE
            </span>
            <span>{data.hero.eyebrow}</span>
          </p>
          <h1 id="hero-heading" className="hero__name">
            {data.name}
          </h1>
          <p className="hero__lede">{data.hero.lede}</p>

          <ul className="proof" aria-label="Highlights">
            {data.hero.proof.map((item) => (
              <li key={item} className="proof__row">
                <Led color="leaf" />
                <span className="proof__ok" aria-hidden="true">
                  [OK]
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ul>

          <div className="hero__ctas">
            <PixelButton href="#work-section" variant="secondary">
              See selected work
            </PixelButton>
            <PixelButton href={data.resumeUrl} variant="primary" external srContext="PDF">
              RESUME.PDF
            </PixelButton>
          </div>
          <Socials className="hero__socials" hideEmail />
        </div>

        <div className="hero__cell">
          <div className="px-frame px-frame--crt cell" data-marker="cell">
            <div className="px-titlebar">
              <span className="px-titlebar__label">CELL VIEW / AB-01</span>
              <span className="px-titlebar__right">
                <Led color="amber" />
                <span>SIM</span>
              </span>
            </div>
            <div className="crt-screen" id="cell-screen">
              <CellPoster />
            </div>
            <div className="cell__controls" data-slot="cell-controls" />
          </div>
          <BootLog />
        </div>
      </div>
      <Telemetry />
    </div>
  </section>
);

export default Hero;
