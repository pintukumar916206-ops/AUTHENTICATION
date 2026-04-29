import React from 'react';
import { cn } from '../utils/cn';

export default function PageHeader({ title, subtitle, action, className }) {
  return (
    <div className={cn("ui-page-header", className)}>
      <div className="ui-page-header-content">
        <h1 className="ui-page-title">{title}</h1>
        {subtitle && <p className="ui-page-subtitle">{subtitle}</p>}
      </div>
      {action && <div className="ui-page-header-action">{action}</div>}
    </div>
  );
}
