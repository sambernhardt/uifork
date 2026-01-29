import React from "react";

interface CopyIconProps {
  className?: string;
}

export function CopyIcon({ className }: CopyIconProps) {
  return (
    <svg className={className} fill="none" viewBox="0 0 16 16">
      <rect
        x="5.333"
        y="5.333"
        width="8"
        height="8"
        rx="1"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M10.667 2.667H2.667a1 1 0 0 0-1 1v8"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
