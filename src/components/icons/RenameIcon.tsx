import { IconPencil } from "@tabler/icons-react";
import React from "react";

interface RenameIconProps {
  className?: string;
}

export function RenameIcon({ className }: RenameIconProps) {
  return <IconPencil className={className} size={16} stroke={1.5} />;
}
