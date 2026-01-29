import React from "react";

interface RenameIconProps {
  className?: string;
}

export function RenameIcon({ className }: RenameIconProps) {
  return (
    <svg className={className} fill="none" viewBox="0 0 16 16">
      <path
        d="M11.333 2.667a1.414 1.414 0 0 1 2 2L6 12l-2.667.667L4 10.667l7.333-7.333z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
