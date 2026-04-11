import { IconArrowUp } from "@tabler/icons-react";
import React from "react";

interface ArrowUpIconProps {
  className?: string;
}

export function ArrowUpIcon({ className }: ArrowUpIconProps) {
  return <IconArrowUp className={className} size={16} stroke={2} />;
}
