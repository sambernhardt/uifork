import { IconChevronRight } from "@tabler/icons-react";
import React from "react";

interface ChevronRightIconProps {
  className?: string;
}

export function ChevronRightIcon({ className }: ChevronRightIconProps) {
  return <IconChevronRight className={className} size={16} stroke={2} />;
}
