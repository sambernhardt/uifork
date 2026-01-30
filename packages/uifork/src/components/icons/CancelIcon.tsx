import { IconX } from "@tabler/icons-react";
import React from "react";

interface CancelIconProps {
  className?: string;
}

export function CancelIcon({ className }: CancelIconProps) {
  return <IconX className={className} size={16} stroke={2} />;
}
