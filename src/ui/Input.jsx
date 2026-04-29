import React, { forwardRef, useId } from 'react';
import { cn } from '../utils/cn';

const Input = forwardRef(({ label, error, icon: Icon, rightElement, className, containerClassName, id, ...props }, ref) => {
  const generatedId = useId();
  const inputId = id || generatedId;
  
  return (
    <div className={cn('ui-input-wrapper', containerClassName)}>
      {label && (
        <label htmlFor={inputId} className="ui-label">
          {label}
        </label>
      )}
      <div className="ui-input-container">
        {Icon && <Icon size={18} className="ui-input-icon" />}
        <input
          id={inputId}
          ref={ref}
          className={cn('ui-input', Icon && 'has-icon', rightElement && 'has-right-element', error && 'is-error', className)}
          {...props}
        />
        {rightElement && <div className="ui-input-right-element">{rightElement}</div>}
      </div>
      {error && <span className="ui-error-text">{error}</span>}
    </div>
  );
});

Input.displayName = 'Input';

export default Input;
