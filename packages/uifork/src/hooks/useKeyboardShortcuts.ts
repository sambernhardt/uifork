import { useEffect, RefObject } from "react";

interface UseVersionKeyboardShortcutsOptions {
  versionKeys: string[];
  activeVersion: string;
  setActiveVersion: (version: string) => void;
}

/**
 * Hook for Cmd/Ctrl+Arrow keyboard shortcuts to switch versions
 */
export function useVersionKeyboardShortcuts({
  versionKeys,
  activeVersion,
  setActiveVersion,
}: UseVersionKeyboardShortcutsOptions) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((!e.metaKey && !e.ctrlKey) || versionKeys.length === 0) return;
      const currentIndex = versionKeys.indexOf(activeVersion);
      if (e.key === "ArrowDown") {
        e.preventDefault();
        const prevIndex = currentIndex - 1;
        setActiveVersion(versionKeys[prevIndex >= 0 ? prevIndex : versionKeys.length - 1]);
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        const nextIndex = currentIndex + 1;
        setActiveVersion(versionKeys[nextIndex < versionKeys.length ? nextIndex : 0]);
      }
    };
    window.addEventListener("keydown", handleKeyDown, { capture: true });
    return () => window.removeEventListener("keydown", handleKeyDown, { capture: true });
  }, [activeVersion, versionKeys, setActiveVersion]);
}

interface UseDropdownKeyboardOptions {
  isOpen: boolean;
  containerRef: RefObject<HTMLDivElement | null>;
  triggerRef: RefObject<HTMLButtonElement | null>;
  openPopoverVersion: string | null;
  isComponentSelectorOpen: boolean;
  editingVersion: string | null;
  onClosePopover: () => void;
  onCloseComponentSelector: () => void;
  onCancelRename: () => void;
  onClose: () => void;
}

/**
 * Hook for dropdown keyboard navigation (Escape to close)
 */
export function useDropdownKeyboard({
  isOpen,
  containerRef,
  triggerRef,
  openPopoverVersion,
  isComponentSelectorOpen,
  editingVersion,
  onClosePopover,
  onCloseComponentSelector,
  onCancelRename,
  onClose,
}: UseDropdownKeyboardOptions) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (openPopoverVersion) {
          onClosePopover();
          return;
        }
        if (isComponentSelectorOpen) {
          onCloseComponentSelector();
          return;
        }
        if (editingVersion) {
          onCancelRename();
          return;
        }
        onClose();
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [
    isOpen,
    containerRef,
    triggerRef,
    openPopoverVersion,
    isComponentSelectorOpen,
    editingVersion,
    onClosePopover,
    onCloseComponentSelector,
    onCancelRename,
    onClose,
  ]);
}
