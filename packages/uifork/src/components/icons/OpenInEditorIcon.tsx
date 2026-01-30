import { IconExternalLink } from "@tabler/icons-react";
import React from "react";

interface OpenInEditorIconProps {
  className?: string;
}

export function OpenInEditorIcon({ className }: OpenInEditorIconProps) {
  return <IconExternalLink className={className} size={16} stroke={1.5} />;
}
