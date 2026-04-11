import React from "react";
import styles from "./UIFork.module.css";
import { CheckmarkIcon } from "./icons/CheckmarkIcon";
import { GitForkIcon } from "./icons/GitForkIcon";
import { MoreOptionsIcon } from "./icons/MoreOptionsIcon";
import { VersionActionMenu } from "./VersionActionMenu";
import { Tooltip } from "./Tooltip";
import type { AiEditingTool } from "./SettingsView";

interface VersionItemProps {
  version: string;
  label?: string;
  isSelected: boolean;
  isPrompting?: boolean;
  formatVersionLabel: (version: string) => string;
  popoverPosition: { x: number; y: number } | undefined;
  isPopoverOpen: boolean;
  isConnected: boolean;
  onSelect: (version: string) => void;
  onDuplicate: (version: string, e: React.MouseEvent) => void;
  onTogglePopover: (version: string, e?: React.MouseEvent) => void;
  onPromote: (version: string, e: React.MouseEvent) => void;
  onOpenInEditor: (version: string, e: React.MouseEvent) => void;
  onDelete: (version: string, e: React.MouseEvent) => void;
  onRename: (version: string, e: React.MouseEvent) => void;
  onPromptVersion?: (version: string) => void;
  aiEditingTool?: AiEditingTool;
  setPopoverTriggerRef: (version: string, el: HTMLButtonElement | null) => void;
  setPopoverDropdownRef: (version: string, el: HTMLDivElement | null) => void;
}

export function VersionItem({
  version,
  label,
  isSelected,
  isPrompting = false,
  formatVersionLabel,
  popoverPosition,
  isPopoverOpen,
  isConnected,
  onSelect,
  onDuplicate,
  onTogglePopover,
  onPromote,
  onOpenInEditor,
  onDelete,
  onRename,
  onPromptVersion,
  aiEditingTool,
  setPopoverTriggerRef,
  setPopoverDropdownRef,
}: VersionItemProps) {
  const formattedVersion = formatVersionLabel(version);

  return (
    <div
      role="option"
      aria-selected={isSelected}
      data-key={version}
      onClick={() => onSelect(version)}
      className={`${styles.versionItem} ${styles.menuItem}`}
    >
      {/* Checkmark or loading spinner */}
      <div className={styles.checkmarkContainer}>
        {isPrompting ? (
          <span className={styles.spinnerIcon} aria-hidden />
        ) : (
          isSelected && <CheckmarkIcon className={styles.checkmarkIcon} />
        )}
      </div>
      <div className={styles.versionLabel}>
        <span className={styles.versionId}>{formattedVersion}</span>
        {label && <span className={styles.versionLabelText}>{label}</span>}
        {isPrompting && <span className={styles.editingLabel}>Editing…</span>}
      </div>
      {/* Action buttons - only show when connected */}
      {isConnected && (
        <div data-actions className={styles.actions} onClick={(e) => e.stopPropagation()}>
          <Tooltip label="Fork version" placement="top">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDuplicate(version, e);
              }}
              className={styles.actionButton}
            >
              <GitForkIcon className={styles.actionIcon} />
            </button>
          </Tooltip>
          <div className={styles.actionButtonMore}>
            <Tooltip label="More options" placement="top">
              <button
                ref={(el) => setPopoverTriggerRef(version, el)}
                onClick={(e) => {
                  e.stopPropagation();
                  onTogglePopover(version, e);
                }}
                className={styles.actionButton}
              >
                <MoreOptionsIcon className={styles.actionIcon} />
              </button>
            </Tooltip>
            {/* Popover menu */}
            {isPopoverOpen && (
              <VersionActionMenu
                version={version}
                label={label}
                position={popoverPosition || { x: 0, y: 0 }}
                onPromote={onPromote}
                onOpenInEditor={onOpenInEditor}
                onDelete={onDelete}
                onRename={onRename}
                onPromptVersion={onPromptVersion}
                aiEditingTool={aiEditingTool}
                onClose={() => onTogglePopover(version)}
                setDropdownRef={(el) => setPopoverDropdownRef(version, el)}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
