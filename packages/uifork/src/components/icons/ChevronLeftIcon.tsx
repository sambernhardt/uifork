import { IconChevronLeft } from "@tabler/icons-react";
import React from "react";

interface ChevronLeftIconProps {
  className?: string;
}

export function ChevronLeftIcon({ className }: ChevronLeftIconProps) {
  return <IconChevronLeft className={className} size={16} stroke={2} />;
}
