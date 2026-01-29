import React from "react";

interface MoreOptionsIconProps {
  className?: string;
}

export function MoreOptionsIcon({ className }: MoreOptionsIconProps) {
  return (
    <svg className={className} fill="none" viewBox="0 0 16 16">
      <circle cx="8" cy="4" r="1" fill="currentColor" />
      <circle cx="8" cy="8" r="1" fill="currentColor" />
      <circle cx="8" cy="12" r="1" fill="currentColor" />
    </svg>
  );
}
