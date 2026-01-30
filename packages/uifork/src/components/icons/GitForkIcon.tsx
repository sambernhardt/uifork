import { IconGitFork } from "@tabler/icons-react";
import React from "react";

interface GitForkIconProps {
  className?: string;
}

export function GitForkIcon({ className }: GitForkIconProps) {
  return <IconGitFork className={className} size={16} stroke={1.5} />;
}
