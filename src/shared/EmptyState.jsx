import React from "react";
import { Inbox } from "lucide-react";

export default function EmptyState({ title = "Nothing here yet", message, action }) {
  return (
    <div className="empty-state">
      <Inbox size={40} className="empty-state-icon" />
      <h3 className="empty-state-title">{title}</h3>
      {message && <p className="empty-state-msg">{message}</p>}
      {action}
    </div>
  );
}
