import React from 'react';
import { cn } from '../utils/cn';

export const Card = ({ children, className, ...props }) => {
  return (
    <div className={cn("ui-card", className)} {...props}>
      {children}
    </div>
  );
};

export const CardHeader = ({ children, title, className, ...props }) => {
  return (
    <div className={cn("ui-card-header", className)} {...props}>
      {title ? <h3 className="ui-card-title">{title}</h3> : children}
    </div>
  );
};

export const CardBody = ({ children, className, ...props }) => {
  return (
    <div className={cn("ui-card-body", className)} {...props}>
      {children}
    </div>
  );
};
