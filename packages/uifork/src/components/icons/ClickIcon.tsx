import { IconClick } from "@tabler/icons-react";
import React from "react";

interface ClickIconProps {
  className?: string;
}

export function ClickIcon({ className }: ClickIconProps) {
  return <IconClick className={className} size={16} stroke={1.5} />;
}
