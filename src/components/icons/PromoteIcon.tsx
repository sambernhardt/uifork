import React from "react";

interface PromoteIconProps {
  className?: string;
}

export function PromoteIcon({ className }: PromoteIconProps) {
  return (
    <svg className={className} fill="none" viewBox="0 0 16 16">
      <path
        d="M8 12V4M4 8l4-4 4 4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
