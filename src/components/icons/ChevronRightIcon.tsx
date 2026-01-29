import React from "react";

interface ChevronRightIconProps {
  className?: string;
}

export function ChevronRightIcon({ className }: ChevronRightIconProps) {
  return (
    <svg className={className} fill="none" viewBox="0 0 16 16">
      <path
        d="M6 4l4 4-4 4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
