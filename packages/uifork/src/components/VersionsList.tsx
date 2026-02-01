import React from "react";
import styles from "./UIFork.module.css";
import { VersionItem } from "./VersionItem";
import { VersionNameEditor } from "./VersionNameEditor";
import type { VersionInfo } from "../types";

interface VersionsListProps {
  versions: VersionInfo[];
  activeVersion: string;
  editingVersion: string | null;
  renameValue: string;
  formatVersionLabel: (version: string) => string;
  openPopoverVersion: string | null;
  popoverPositions: Map<string, { x: number; y: number }>;
  isConnected: boolean;
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
  versions,
  activeVersion,
  editingVersion,
  renameValue,
  formatVersionLabel,
  openPopoverVersion,
  popoverPositions,
  isConnected,
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
  if (versions.length === 0) {
    return <div className={styles.emptyState}>No versions found</div>;
  }

  return (
    <div className={styles.versionsList}>
      {versions
        .slice()
        .reverse()
        .map((versionInfo) => {
          const { key, label } = versionInfo;
          const isSelected = key === activeVersion;
          const isEditing = editingVersion === key;

          if (isEditing) {
            return (
              <VersionNameEditor
                key={key}
                version={key}
                value={renameValue}
                onChange={onRenameValueChange}
                formatVersionLabel={formatVersionLabel}
                onConfirm={onConfirmRename}
                onCancel={onCancelRename}
              />
            );
          }

          return (
            <VersionItem
              key={key}
              version={key}
              label={label}
              isSelected={isSelected}
              formatVersionLabel={formatVersionLabel}
              popoverPosition={popoverPositions.get(key)}
              isPopoverOpen={openPopoverVersion === key}
              isConnected={isConnected}
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
