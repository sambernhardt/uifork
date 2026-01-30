import { IconPlus } from "@tabler/icons-react";
import React from "react";

interface PlusIconProps {
  className?: string;
}

export function PlusIcon({ className }: PlusIconProps) {
  return <IconPlus className={className} size={16} stroke={2} />;
}
