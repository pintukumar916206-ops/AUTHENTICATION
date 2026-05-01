import React from "react";
import { cn } from "../utils/cn";

export default function StatBox({
  label,
  value,
  icon: Icon,
  className,
  children,
}) {
  return (
    <div className={cn("ui-statbox", className)}>
      <div className="ui-statbox-header">
        <div className="ui-statbox-icon">{Icon && <Icon size={20} />}</div>
        <div className="ui-statbox-content">
          <span className="ui-statbox-value">{value}</span>
          <span className="ui-statbox-label">{label}</span>
        </div>
      </div>
      {children && <div className="ui-statbox-extra">{children}</div>}
    </div>
  );
}
