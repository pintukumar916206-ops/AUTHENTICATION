import React from "react";
import { cn } from "../utils/cn";

const variants = {
  primary: "btn-primary",
  ghost: "btn-ghost",
  danger: "btn-danger",
  outline: "btn-outline",
};

const sizes = {
  sm: "btn-sm",
  md: "btn-md",
  lg: "btn-lg",
};

const Button = React.forwardRef((
  { children, variant = "primary", size = "md", loading = false, className, disabled, ...props },
  ref
) => {
  return (
    <button
      ref={ref}
      className={cn("btn", variants[variant], sizes[size], loading && "btn-loading", className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <span className="btn-spinner" aria-hidden="true" />
      )}
      {children}
    </button>
  );
});

export default Button;
