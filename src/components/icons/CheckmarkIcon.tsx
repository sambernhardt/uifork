import { IconCheck } from "@tabler/icons-react";
import React from "react";

interface CheckmarkIconProps {
  className?: string;
}

export function CheckmarkIcon({ className }: CheckmarkIconProps) {
  return <IconCheck className={className} size={16} stroke={2} />;
}
