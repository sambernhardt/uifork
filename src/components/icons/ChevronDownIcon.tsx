import { IconChevronDown } from "@tabler/icons-react";
import React from "react";

interface ChevronDownIconProps {
  className?: string;
}

export function ChevronDownIcon({ className }: ChevronDownIconProps) {
  return <IconChevronDown className={className} size={16} stroke={2} />;
}
