import React from "react";

interface CheckmarkIconProps {
  className?: string;
}

export function CheckmarkIcon({ className }: CheckmarkIconProps) {
  return (
    <svg className={className} fill="none" viewBox="0 0 16 16">
      <path
        d="M13.333 4L6 11.333 2.667 8"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
