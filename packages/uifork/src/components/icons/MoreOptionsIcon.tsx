import { IconDotsVertical } from "@tabler/icons-react";
import React from "react";

interface MoreOptionsIconProps {
  className?: string;
}

export function MoreOptionsIcon({ className }: MoreOptionsIconProps) {
  return <IconDotsVertical className={className} size={16} stroke={2} />;
}
