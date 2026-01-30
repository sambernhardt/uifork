import { IconArrowUp } from "@tabler/icons-react";
import React from "react";

interface PromoteIconProps {
  className?: string;
}

export function PromoteIcon({ className }: PromoteIconProps) {
  return <IconArrowUp className={className} size={16} stroke={2} />;
}
