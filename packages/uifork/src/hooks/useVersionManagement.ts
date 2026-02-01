import { useEffect, useRef, useState, useCallback } from "react";
import { useLocalStorage } from "./useLocalStorage";
import type { VersionInfo } from "../types";

interface UseVersionManagementOptions {
  selectedComponent: string;
  versions: VersionInfo[];
}

export function useVersionManagement({
  selectedComponent,
  versions,
}: UseVersionManagementOptions) {
  // Extract version keys for validation
  const versionKeys = versions.map((v) => v.key);

  const [activeVersion, setActiveVersion] = useLocalStorage<string>(
    selectedComponent || "uifork-default",
    "",
    true,
  );

  // Rename state (now for labels)
  const [editingVersion, setEditingVersion] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState<string>("");
  const editingVersionRef = useRef<string | null>(null);

  // Keep ref updated
  useEffect(() => {
    editingVersionRef.current = editingVersion;
  }, [editingVersion]);

  // Consolidated effect for initialization and pending version check
  useEffect(() => {
    if (selectedComponent && versionKeys.length > 0) {
      const pendingKey = `${selectedComponent}-pending-version`;
      const pendingVersion = localStorage.getItem(pendingKey);

      if (pendingVersion && versionKeys.includes(pendingVersion)) {
        setActiveVersion(pendingVersion);
        localStorage.removeItem(pendingKey);
      } else {
        // If no pending version, validate current active version
        // If activeVersion is not in keys, try to restore from LS or default
        if (!versionKeys.includes(activeVersion)) {
          const savedVersion = localStorage.getItem(selectedComponent);
          const parsedVersion = savedVersion ? JSON.parse(savedVersion) : null;

          if (parsedVersion && versionKeys.includes(parsedVersion)) {
            setActiveVersion(parsedVersion);
          } else {
            setActiveVersion(versionKeys[0]);
          }
        }
      }
    }
  }, [selectedComponent, versionKeys, activeVersion, setActiveVersion]);

  // Store pending version (called after version operations)
  const storePendingVersion = useCallback(
    (version: string) => {
      const pendingKey = `${selectedComponent}-pending-version`;
      localStorage.setItem(pendingKey, version);
    },
    [selectedComponent],
  );

  // Get label for a version key
  const getVersionLabel = useCallback(
    (key: string): string | undefined => {
      return versions.find((v) => v.key === key)?.label;
    },
    [versions],
  );

  // Rename handlers (now for labels)
  const startRename = useCallback(
    (version: string) => {
      setEditingVersion(version);
      // Initialize with current label, or empty string if no label
      const currentLabel = getVersionLabel(version) || "";
      setRenameValue(currentLabel);
    },
    [getVersionLabel],
  );

  const confirmRename = useCallback(
    (version: string): string | null => {
      const newLabel = renameValue.trim();
      const currentLabel = getVersionLabel(version) || "";

      // If label hasn't changed, cancel
      if (newLabel === currentLabel) {
        setEditingVersion(null);
        setRenameValue("");
        return null;
      }

      setEditingVersion(null);
      setRenameValue("");
      return newLabel;
    },
    [renameValue, getVersionLabel],
  );

  const cancelRename = useCallback(() => {
    setEditingVersion(null);
    setRenameValue("");
  }, []);

  // Clear editing state on error
  const clearEditingOnError = useCallback(() => {
    if (editingVersionRef.current) {
      setEditingVersion(null);
      setRenameValue("");
    }
  }, []);

  return {
    activeVersion,
    setActiveVersion,
    editingVersion,
    renameValue,
    setRenameValue,
    startRename,
    confirmRename,
    cancelRename,
    clearEditingOnError,
    storePendingVersion,
    versionKeys,
  };
}
