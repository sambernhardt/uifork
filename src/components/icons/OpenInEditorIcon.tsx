import React from "react";

interface OpenInEditorIconProps {
  className?: string;
}

export function OpenInEditorIcon({ className }: OpenInEditorIconProps) {
  return (
    <svg className={className} fill="none" viewBox="0 0 16 16">
      <path
        d="M5.333 2.667H3.333a1.333 1.333 0 0 0-1.333 1.333v8a1.333 1.333 0 0 0 1.333 1.333h9.334a1.333 1.333 0 0 0 1.333-1.333V10M10.667 2.667h3.333M14 2.667v3.333M8 8l6-6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
