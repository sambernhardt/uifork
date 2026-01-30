import React from "react";
import styles from "./UIFork.module.css";

interface MenuItemProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: (e: React.MouseEvent) => void;
  variant?: "default" | "delete";
  stopPropagation?: boolean;
}

export function MenuItem({
  icon: Icon,
  label,
  onClick,
  variant = "default",
  stopPropagation = false,
}: MenuItemProps) {
  const handleClick = (e: React.MouseEvent) => {
    if (stopPropagation) {
      e.stopPropagation();
    }
    onClick(e);
  };

  return (
    <button
      onClick={handleClick}
      className={`${styles.popoverMenuItem} ${styles.menuItem} ${
        variant === "delete" ? styles.popoverMenuItemDelete : ""
      }`}
    >
      <Icon className={styles.popoverMenuItemIcon} />
      <span>{label}</span>
    </button>
  );
}
