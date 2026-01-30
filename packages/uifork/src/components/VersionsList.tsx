import React from "react";
import styles from "./UIFork.module.css";
import { VersionItem } from "./VersionItem";
import { VersionNameEditor } from "./VersionNameEditor";

interface VersionsListProps {
  versionKeys: string[];
  activeVersion: string;
  editingVersion: string | null;
  renameValue: string;
  formatVersionLabel: (version: string) => string;
  openPopoverVersion: string | null;
  popoverPositions: Map<string, { x: number; y: number }>;
  onSelectVersion: (version: string) => void;
  onDuplicateVersion: (version: string, e: React.MouseEvent) => void;
  onTogglePopover: (version: string, e?: React.MouseEvent) => void;
  onPromoteVersion: (version: string, e: React.MouseEvent) => void;
  onOpenInEditor: (version: string, e: React.MouseEvent) => void;
  onDeleteVersion: (version: string, e: React.MouseEvent) => void;
  onRenameVersion: (version: string, e: React.MouseEvent) => void;
  onRenameValueChange: (value: string) => void;
  onConfirmRename: (version: string) => void;
  onCancelRename: () => void;
  setPopoverTriggerRef: (version: string, el: HTMLButtonElement | null) => void;
  setPopoverDropdownRef: (version: string, el: HTMLDivElement | null) => void;
}

export function VersionsList({
  versionKeys,
  activeVersion,
  editingVersion,
  renameValue,
  formatVersionLabel,
  openPopoverVersion,
  popoverPositions,
  onSelectVersion,
  onDuplicateVersion,
  onTogglePopover,
  onPromoteVersion,
  onOpenInEditor,
  onDeleteVersion,
  onRenameVersion,
  onRenameValueChange,
  onConfirmRename,
  onCancelRename,
  setPopoverTriggerRef,
  setPopoverDropdownRef,
}: VersionsListProps) {
  if (versionKeys.length === 0) {
    return <div className={styles.emptyState}>No versions found</div>;
  }

  return (
    <div className={styles.versionsList}>
      {versionKeys
        .slice()
        .reverse()
        .map((key) => {
          const isSelected = key === activeVersion;
          const isEditing = editingVersion === key;

          if (isEditing) {
            return (
              <VersionNameEditor
                key={key}
                version={key}
                value={renameValue}
                onChange={onRenameValueChange}
                onConfirm={onConfirmRename}
                onCancel={onCancelRename}
              />
            );
          }

          return (
            <VersionItem
              key={key}
              version={key}
              isSelected={isSelected}
              formatVersionLabel={formatVersionLabel}
              popoverPosition={popoverPositions.get(key)}
              isPopoverOpen={openPopoverVersion === key}
              onSelect={onSelectVersion}
              onDuplicate={onDuplicateVersion}
              onTogglePopover={onTogglePopover}
              onPromote={onPromoteVersion}
              onOpenInEditor={onOpenInEditor}
              onDelete={onDeleteVersion}
              onRename={onRenameVersion}
              setPopoverTriggerRef={setPopoverTriggerRef}
              setPopoverDropdownRef={setPopoverDropdownRef}
            />
          );
        })}
    </div>
  );
}
