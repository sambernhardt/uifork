import React, { useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import styles from "./UIFork.module.css";
import { PromoteIcon } from "./icons/PromoteIcon";
import { OpenInEditorIcon } from "./icons/OpenInEditorIcon";
import { DeleteIcon } from "./icons/DeleteIcon";
import { RenameIcon } from "./icons/RenameIcon";
import { PromptIcon } from "./icons/PromptIcon";
import { MenuItem } from "./MenuItem";
import { useClickOutside } from "../hooks/useClickOutside";
import type { AiEditingTool } from "./SettingsView";

interface VersionActionMenuProps {
  version: string;
  label?: string;
  position: { x: number; y: number };
  onPromote: (version: string, e: React.MouseEvent) => void;
  onOpenInEditor: (version: string, e: React.MouseEvent) => void;
  onDelete: (version: string, e: React.MouseEvent) => void;
  onRename: (version: string, e: React.MouseEvent) => void;
  onPromptVersion?: (version: string) => void;
  aiEditingTool?: AiEditingTool;
  onClose: () => void;
  setDropdownRef: (el: HTMLDivElement | null) => void;
}

export function VersionActionMenu({
  version,
  label,
  position: _position,
  onPromote,
  onOpenInEditor,
  onDelete,
  onRename,
  onPromptVersion,
  aiEditingTool,
  onClose,
  setDropdownRef,
}: VersionActionMenuProps) {
  const renameLabel = label && label.trim() ? "Edit label" : "Add label";
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Combine local ref with callback ref from parent
  const combinedRef = useCallback(
    (el: HTMLDivElement | null) => {
      (dropdownRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
      setDropdownRef(el);
    },
    [setDropdownRef],
  );

  // Close menu when clicking outside
  useClickOutside({
    isActive: true,
    refs: [dropdownRef],
    onClickOutside: onClose,
    // Don't close when clicking the trigger button (it handles its own toggle)
    additionalCheck: (target) => {
      const element = target as Element;
      // Check if clicking inside the actions area (which contains the trigger)
      return !!element.closest?.("[data-actions]");
    },
  });

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
    <>
      {/* Scrim blocks clicks underneath; clicking it closes the menu */}
      <div
        className={styles.popoverScrim}
        data-popover-scrim
        onClick={onClose}
        aria-hidden
      />
      <div
        ref={combinedRef}
        className={styles.popover}
        data-popover-dropdown
        style={{
          visibility: "hidden",
        }}
        role="menu"
      >
        <div className={styles.popoverSection}>
          <MenuItem
            icon={RenameIcon}
            label={renameLabel}
            stopPropagation
            onClick={(e) => {
              onRename(version, e);
              onClose();
            }}
          />
          {aiEditingTool && aiEditingTool !== "none" && onPromptVersion && (
            <MenuItem
              icon={PromptIcon}
              label="Edit with prompt…"
              stopPropagation
              onClick={() => {
                onPromptVersion(version);
                onClose();
              }}
            />
          )}
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
        </div>
        <div className={styles.divider} />
        <div className={styles.popoverSection}>
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
        </div>
      </div>
    </>,
    rootElement,
  );
}
