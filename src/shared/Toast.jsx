import React from "react";
import useUIStore from "../store/uiStore";
import { CheckCircle, AlertTriangle, XCircle, Info, X } from "lucide-react";
import { cn } from "../utils/cn";

const icons = {
  success: <CheckCircle size={16} />,
  error: <XCircle size={16} />,
  warning: <AlertTriangle size={16} />,
  info: <Info size={16} />,
};

function Toast({ id, message, type = "info" }) {
  const { removeToast } = useUIStore();
  return (
    <div className={cn("toast", `toast-${type}`)}>
      <span className="toast-icon">{icons[type]}</span>
      <span className="toast-msg">{message}</span>
      <button className="toast-close" onClick={() => removeToast(id)} aria-label="Dismiss">
        <X size={12} />
      </button>
    </div>
  );
}

export default function ToastContainer() {
  const { toasts } = useUIStore();
  if (!toasts.length) return null;

  return (
    <div className="toast-container" role="region" aria-label="Notifications" aria-live="polite">
      {toasts.map((t) => (
        <Toast key={t.id} {...t} />
      ))}
    </div>
  );
}
