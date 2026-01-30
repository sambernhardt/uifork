import { IconSettings } from "@tabler/icons-react";
import React from "react";

interface GearIconProps {
  className?: string;
}

export function GearIcon({ className }: GearIconProps) {
  return <IconSettings className={className} size={16} stroke={1.5} />;
}
