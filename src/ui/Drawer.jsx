import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '../utils/cn';

export default function Drawer({ isOpen, onClose, title, children, className }) {
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
      setIsClosing(false);
    }, 300);
  };

  if (!isOpen && !isClosing) return null;

  return createPortal(
    <>
      <div className="ui-drawer-overlay" onClick={handleClose} />
      <div className={cn("ui-drawer", isClosing && "is-closing", className)}>
        <div className="ui-drawer-header">
          <h2 className="ui-drawer-title">{title}</h2>
          <button className="ui-drawer-close" onClick={handleClose} aria-label="Close panel">
            <X size={20} />
          </button>
        </div>
        <div className="ui-drawer-body">
          {children}
        </div>
      </div>
    </>,
    document.body
  );
}
