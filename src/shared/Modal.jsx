import React, { useEffect, useCallback } from "react";
import useUIStore from "../store/uiStore";
import { X } from "lucide-react";

export default function Modal() {
  const { modal, closeModal } = useUIStore();

  const handleEsc = useCallback((e) => {
    if (e.key === "Escape") closeModal();
  }, [closeModal]);

  useEffect(() => {
    if (!modal) return;
    document.addEventListener("keydown", handleEsc);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleEsc);
      document.body.style.overflow = "";
    };
  }, [modal, handleEsc]);

  if (!modal) return null;

  return (
    <div className="modal-backdrop" onClick={closeModal} role="dialog" aria-modal="true">
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={closeModal} aria-label="Close modal">
          <X size={16} />
        </button>
        {modal.content}
      </div>
    </div>
  );
}
