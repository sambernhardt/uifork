import { IconTrash } from "@tabler/icons-react";
import React from "react";

interface DeleteIconProps {
  className?: string;
}

export function DeleteIcon({ className }: DeleteIconProps) {
  return <IconTrash className={className} size={16} stroke={1.5} />;
}
