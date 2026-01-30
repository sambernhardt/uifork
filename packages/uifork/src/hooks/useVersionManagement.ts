import { useEffect, useRef, useState, useCallback } from "react";
import { useLocalStorage } from "./useLocalStorage";

interface UseVersionManagementOptions {
  selectedComponent: string;
  versionKeys: string[];
}

export function useVersionManagement({
  selectedComponent,
  versionKeys,
}: UseVersionManagementOptions) {
  const [activeVersion, setActiveVersion] = useLocalStorage<string>(
    selectedComponent || "uifork-default",
    "",
    true,
  );

  // Rename state
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

  // Helper function to normalize version key input
  const normalizeVersionKey = (input: string): string | null => {
    if (!input || typeof input !== "string") return null;
    let normalized = input.trim().toLowerCase();
    if (!normalized) return null;
    normalized = normalized.replace(/^v+/i, "");
    normalized = normalized.replace(/\./g, "_");
    normalized = "v" + normalized;
    const versionKeyPattern = /^v\d+(_\d+)?$/;
    if (!versionKeyPattern.test(normalized)) return null;
    return normalized;
  };

  // Rename handlers
  const startRename = useCallback((version: string) => {
    setEditingVersion(version);
    setRenameValue(version);
  }, []);

  const confirmRename = useCallback(
    (version: string): string | null => {
      const normalizedVersion = normalizeVersionKey(renameValue.trim());
      if (
        !normalizedVersion ||
        normalizedVersion === version ||
        versionKeys.includes(normalizedVersion)
      ) {
        setEditingVersion(null);
        setRenameValue("");
        return null;
      }
      setEditingVersion(null);
      setRenameValue("");
      return normalizedVersion;
    },
    [renameValue, versionKeys],
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
  };
}
