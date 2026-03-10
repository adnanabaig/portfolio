import React from "react";
import Button from "../Button";

import portfolioJson from "../../data/portfolio.json";
import type { PortfolioData } from "../../types/portfolio";

const yourData = portfolioJson as PortfolioData;

export interface SocialsProps {
  className?: string;
}

const Socials = ({ className = "" }: SocialsProps) => {
  return (
    <div className={`${className} flex flex-wrap mob:flex-nowrap`}>
      {yourData.socials.map((social) => (
        <Button key={social.title} onClick={() => window.open(social.link)}>
          {social.title}
        </Button>
      ))}
    </div>
  );
};

export default Socials;

