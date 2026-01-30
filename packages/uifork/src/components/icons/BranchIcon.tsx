import { IconGitBranch } from "@tabler/icons-react";
import React from "react";

interface BranchIconProps {
  className?: string;
}

export function BranchIcon({ className }: BranchIconProps) {
  return <IconGitBranch className={className} size={16} stroke={1.5} />;
}
