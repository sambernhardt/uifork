import { IconCopy } from "@tabler/icons-react";
import React from "react";

interface CopyIconProps {
  className?: string;
}

export function CopyIcon({ className }: CopyIconProps) {
  return <IconCopy className={className} size={16} stroke={1.5} />;
}
