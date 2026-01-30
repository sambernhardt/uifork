import { IconSelector } from "@tabler/icons-react";
import React from "react";

interface SelectorIconProps {
  className?: string;
}

export function SelectorIcon({ className }: SelectorIconProps) {
  return <IconSelector className={className} size={16} stroke={2} />;
}
