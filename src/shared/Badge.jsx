import React from "react";
import { cn } from "../utils/cn";

const verdictConfig = {
  GENUINE: { label: "GENUINE", cls: "badge-genuine" },
  SUSPICIOUS: { label: "SUSPICIOUS", cls: "badge-suspicious" },
  FAKE: { label: "FAKE", cls: "badge-fake" },
  UNVERIFIABLE: { label: "UNVERIFIABLE", cls: "badge-unknown" },
};

export default function Badge({ verdict, className }) {
  const cfg = verdictConfig[verdict] || verdictConfig.UNVERIFIABLE;
  return (
    <span className={cn("badge", cfg.cls, className)}>
      {cfg.label}
    </span>
  );
}
