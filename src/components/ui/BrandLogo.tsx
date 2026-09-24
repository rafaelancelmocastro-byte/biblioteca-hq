import React from "react";
import { APP_CONFIG } from "../../config/app";

type BrandLogoProps = {
  compact?: boolean;
  className?: string;
  showTagline?: boolean;
};

export const BrandLogo: React.FC<BrandLogoProps> = ({ compact = false, className = "", showTagline = false }) => (
  <span className={`brand-lockup ${compact ? "brand-lockup-compact" : ""} ${className}`}>
    <img src={compact ? "/brand-icon.svg" : "/brand-logo.svg"} alt="" className="brand-mark" />
    {!compact && (
      <span className="brand-copy">
        <strong>{APP_CONFIG.name.replace(/\s*HQ$/i, "")} <span>HQ</span></strong>
        {showTagline && <small>{APP_CONFIG.tagline}</small>}
      </span>
    )}
  </span>
);
