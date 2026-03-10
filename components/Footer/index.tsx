import React from "react";
import Socials from "../Socials";

const Footer = () => {
  return (
    <>
      <div className="mt-5 laptop:mt-40 p-2 laptop:p-0">
        <h1 className="text-2xl text-bold">Contact.</h1>
        <div className="mt-5">
          <Socials />
        </div>
      </div>
      <p className="text-sm opacity-40 mt-2 laptop:mt-10 p-2 laptop:p-0">
        Adnan Baig &mdash; Contract work &amp; billing via{" "}
        <a
          href="https://vizualty.com"
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2 hover:opacity-70 transition-opacity duration-200"
        >
          Vizualty LLC
        </a>
      </p>
    </>
  );
};

export default Footer;
