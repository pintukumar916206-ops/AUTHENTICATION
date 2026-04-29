import React from "react";
import { AlertOctagon } from "lucide-react";
import Button from "./Button";

export default function ErrorState({ message = "Something went wrong.", onRetry }) {
  return (
    <div className="error-state">
      <AlertOctagon size={40} className="error-state-icon" />
      <h3 className="error-state-title">Analysis Failed</h3>
      <p className="error-state-msg">{message}</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          Retry
        </Button>
      )}
    </div>
  );
}
