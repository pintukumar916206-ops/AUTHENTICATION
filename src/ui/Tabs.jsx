import React from 'react';
import { cn } from '../utils/cn';

export const Tabs = ({ children, className }) => {
  return <div className={cn("ui-tabs", className)}>{children}</div>;
};

export const TabList = ({ children, activeTab, onChange }) => {
  return (
    <div className="ui-tab-list" role="tablist">
      {React.Children.map(children, (child) => {
        if (!React.isValidElement(child)) return null;
        return React.cloneElement(child, {
          isActive: activeTab === child.props.value,
          onClick: () => onChange(child.props.value),
        });
      })}
    </div>
  );
};

export const TabTrigger = ({ children, isActive, onClick }) => {
  return (
    <button
      role="tab"
      aria-selected={isActive}
      className={cn("ui-tab-trigger", isActive && "active")}
      onClick={onClick}
    >
      {children}
    </button>
  );
};

export const TabContent = ({ value, activeTab, children, className }) => {
  const isActive = value === activeTab;
  return (
    <div
      role="tabpanel"
      className={cn("ui-tab-content", isActive && "active", className)}
    >
      {children}
    </div>
  );
};
