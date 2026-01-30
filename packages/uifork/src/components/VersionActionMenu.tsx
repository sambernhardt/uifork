import React from "react";
import { createPortal } from "react-dom";
import styles from "./UIFork.module.css";
import { PromoteIcon } from "./icons/PromoteIcon";
import { OpenInEditorIcon } from "./icons/OpenInEditorIcon";
import { DeleteIcon } from "./icons/DeleteIcon";
import { RenameIcon } from "./icons/RenameIcon";
import { MenuItem } from "./MenuItem";

interface VersionActionMenuProps {
  version: string;
  position: { x: number; y: number };
  onPromote: (version: string, e: React.MouseEvent) => void;
  onOpenInEditor: (version: string, e: React.MouseEvent) => void;
  onDelete: (version: string, e: React.MouseEvent) => void;
  onRename: (version: string, e: React.MouseEvent) => void;
  onClose: () => void;
  setDropdownRef: (el: HTMLDivElement | null) => void;
}

export function VersionActionMenu({
  version,
  position,
  onPromote,
  onOpenInEditor,
  onDelete,
  onRename,
  onClose,
  setDropdownRef,
}: VersionActionMenuProps) {
  // Get the root wrapper element so we portal into it for theme inheritance
  const rootElement =
    typeof document !== "undefined"
      ? document.getElementById("uifork-root") || document.body
      : null;

  if (!rootElement) {
    return null;
  }

  // Don't set position via props - the positioning effect handles it directly
  // This prevents the popover from flashing at (0, 0) on initial render
  // The CSS animation will handle the fade-in and scale effect
  // Render in a portal to escape the scroll container and allow overflow
  return createPortal(
    <div
      ref={setDropdownRef}
      className={styles.popover}
      data-popover-dropdown
      style={{
        visibility: "hidden",
      }}
      role="menu"
    >
      <MenuItem
        icon={RenameIcon}
        label="Rename"
        stopPropagation
        onClick={(e) => {
          onRename(version, e);
          onClose();
        }}
      />
      <MenuItem
        icon={PromoteIcon}
        label="Promote"
        onClick={(e) => {
          onPromote(version, e);
          onClose();
        }}
      />
      <MenuItem
        icon={OpenInEditorIcon}
        label="Open in editor"
        onClick={(e) => {
          onOpenInEditor(version, e);
          onClose();
        }}
      />
      <div className={styles.divider} />
      <MenuItem
        icon={DeleteIcon}
        label="Delete"
        variant="delete"
        stopPropagation
        onClick={(e) => {
          onDelete(version, e);
          onClose();
        }}
      />
    </div>,
    rootElement,
  );
}
