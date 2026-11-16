import { useEffect, useRef, useState } from "react";
import portfolio from "../../data/portfolio.json";
import type { PortfolioData } from "../../types/portfolio";
import DitherBand from "../pixel/DitherBand";
import Eyebrow from "../pixel/Eyebrow";
import PixelButton from "../pixel/PixelButton";
import Sprite from "../pixel/Sprite";
import Socials from "../Socials";

const data = portfolio as PortfolioData;

/** Copies the address; falls back to selecting it when the clipboard API is unavailable. */
function CopyAddress({ targetId }: { targetId: string }) {
  const [status, setStatus] = useState("");
  const timer = useRef<number>();
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const copy = async () => {
    let ok = false;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(data.email);
        ok = true;
      }
    } catch {
      ok = false;
    }
    if (!ok) {
      const node = document.getElementById(targetId);
      const selection = window.getSelection();
      if (node && selection) {
        const range = document.createRange();
        range.selectNodeContents(node);
        selection.removeAllRanges();
        selection.addRange(range);
        try {
          ok = document.execCommand("copy");
        } catch {
          ok = false;
        }
      }
    }
    setStatus(ok ? "Copied" : "Address selected. Press Ctrl+C or Cmd+C to copy.");
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setStatus(""), 4000);
  };

  return (
    <>
      <PixelButton variant="secondary" icon="glyph-mail" onClick={copy}>
        Copy address
      </PixelButton>
      <span className="uplink__status" role="status" aria-live="polite">
        {status}
      </span>
    </>
  );
}

const Footer = () => (
  <>
    <DitherBand from="violet" to="sky" />
    <footer id="contact-section" aria-labelledby="contact-heading" className="uplink bay" data-bay="6">
      <div className="container mx-auto uplink__grid layout-grid">
        <div className="uplink__dish">
          <Sprite name="radar" className="uplink__sprite" />
        </div>
        <div className="uplink__copy">
          <Eyebrow bay={6} label="Uplink" />
          <h2 id="contact-heading" className="section-title">
            Contact
          </h2>
          <p className="uplink__lede">{data.contact.lede}</p>

          <p className="uplink__mail">
            <a id="uplink-address" href={`mailto:${data.email}`}>
              {data.email}
            </a>
          </p>

          <div className="uplink__actions">
            <CopyAddress targetId="uplink-address" />
            <PixelButton href={data.resumeUrl} variant="primary" external srContext="PDF">
              RESUME.PDF
            </PixelButton>
          </div>
          <Socials className="uplink__socials" hideEmail />

          <p className="uplink__sign">
            {data.name} · {data.location}
          </p>
        </div>
      </div>
    </footer>
  </>
);

export default Footer;
