import React from "react";

export default function SkeletonCard() {
  return (
    <div className="skeleton-card" aria-hidden="true">
      <div className="skeleton-row">
        <div className="skeleton skeleton-badge" />
        <div className="skeleton skeleton-score" />
      </div>
      <div className="skeleton skeleton-title" />
      <div className="skeleton skeleton-sub" />
    </div>
  );
}

export function SkeletonList({ count = 5 }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </>
  );
}
