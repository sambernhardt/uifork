"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import type { UIForkProps } from "../types";
import styles from "./UIFork.module.css";
import { ComponentSelector, ComponentSelectorDropdown } from "./ComponentSelector";
import { VersionsList } from "./VersionsList";
import { SettingsView } from "./SettingsView";
import { EmptyStateNoConnection } from "./EmptyStateNoConnection";
import { EmptyStateNoComponents } from "./EmptyStateNoComponents";
import { NewVersionButton } from "./NewVersionButton";

// Custom hooks
import { useWebSocketConnection } from "../hooks/useWebSocketConnection";
import { useComponentDiscovery } from "../hooks/useComponentDiscovery";
import { useVersionManagement } from "../hooks/useVersionManagement";
import { usePopoverPosition } from "../hooks/usePopoverPosition";
import { useClickOutside } from "../hooks/useClickOutside";
import { useLocalStorage } from "../hooks/useLocalStorage";
import { useVersionKeyboardShortcuts, useDropdownKeyboard } from "../hooks/useKeyboardShortcuts";
import { useDragToCorner } from "../hooks/useDragToCorner";
import { useContainerPositioning } from "../hooks/useContainerPositioning";
import type { Position } from "../utils/positioning";
import { ANIMATION_DURATION, ANIMATION_EASING } from "./constants";
import TriggerContent from "./TriggerContent";
import { ActiveView } from "./types";

/**
 * UIFork - A floating UI component that renders a version picker in the bottom right.
 * It communicates with the uifork watch server to manage component versions.
 *
 * Add this component to your app root (typically only in development):
 *
 * ```tsx
 * function App() {
 *   return (
 *     <>
 *       <YourApp />
 *       {process.env.NODE_ENV === "development" && <UIFork />}
 *     </>
 *   );
 * }
 * ```
 */
export function UIFork({ port = 3001 }: UIForkProps) {
  const [isMounted, setIsMounted] = useState(false);

  // UI state
  const [isOpen, setIsOpen] = useState(false);
  const [isComponentSelectorOpen, setIsComponentSelectorOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [openPopoverVersion, setOpenPopoverVersion] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Root ref for theme wrapper
  const rootRef = useRef<HTMLDivElement | null>(null);

  // Refs
  const triggerRef = useRef<HTMLButtonElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const componentSelectorRef = useRef<HTMLDivElement>(null);
  const selectedComponentRef = useRef<string>("");

  // Settings
  const [theme, setTheme] = useLocalStorage<"light" | "dark" | "system">("uifork-theme", "system");
  const [position, setPosition] = useLocalStorage<Position>("uifork-position", "bottom-right");
  const [codeEditor, setCodeEditor] = useLocalStorage<"vscode" | "cursor">(
    "uifork-code-editor",
    "vscode",
  );
  const [enableElementAwarePositioning, setEnableElementAwarePositioning] =
    useLocalStorage<boolean>("uifork-element-aware-positioning", true);

  // Container and component selector positioning hook
  const { containerPosition, transformOrigin, componentSelectorPosition } = useContainerPositioning(
    {
      position,
      isComponentSelectorOpen,
      containerRef,
      componentSelectorRef,
      enableElementAwarePositioning,
    },
  );

  // Drag to corner hook
  const {
    isDragging,
    resetDrag,
    dragEnabled,
    dragControls,
    handlePointerDown,
    handleDragStart,
    handleDragEnd,
  } = useDragToCorner({
    isOpen,
    containerRef,
    setPosition,
  });

  // Component discovery hook
  const { mountedComponents, selectedComponent, setSelectedComponent, onComponentsUpdate } =
    useComponentDiscovery({ port });

  // Keep ref updated with current selected component
  useEffect(() => {
    selectedComponentRef.current = selectedComponent;
  }, [selectedComponent]);

  // Get current component's versions
  const currentComponent = mountedComponents.find((c) => c.name === selectedComponent);
  const versionKeys = currentComponent?.versions || [];

  // Version management hook
  const {
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
  } = useVersionManagement({ selectedComponent, versionKeys });

  // WebSocket connection hook
  const { connectionStatus, sendMessage } = useWebSocketConnection({
    port,
    selectedComponent,
    onComponentsUpdate,
    onVersionAck: ({ version, message, newVersion }) => {
      let versionToActivate: string | null = null;

      if (message?.includes("duplicated") || message?.includes("created new version")) {
        versionToActivate = version;
      } else if (message?.includes("renamed") && newVersion) {
        versionToActivate = newVersion;
      }

      if (versionToActivate) {
        storePendingVersion(versionToActivate);
      }
    },
    onPromoted: (promotedComponent) => {
      // Always check localStorage directly and remove if it matches the promoted component
      // This handles cases where state might be stale but localStorage has the value
      const storedValue = localStorage.getItem("uifork-selected-component");
      const storedComponent = storedValue ? JSON.parse(storedValue) : null;
      const currentSelected = selectedComponentRef.current;

      // Remove if either state or localStorage matches the promoted component
      if (currentSelected === promotedComponent || storedComponent === promotedComponent) {
        // Directly remove from localStorage immediately
        localStorage.removeItem("uifork-selected-component");
        // Clear state (hook should also handle removal, but we've already done it)
        setSelectedComponent("");
        // Aggressively ensure removal persists - check and remove multiple times
        const ensureRemoval = () => {
          const stored = localStorage.getItem("uifork-selected-component");
          if (stored) {
            try {
              const parsed = JSON.parse(stored);
              if (parsed === promotedComponent) {
                localStorage.removeItem("uifork-selected-component");
              }
            } catch {
              // If not JSON, check as plain string
              if (stored === promotedComponent) {
                localStorage.removeItem("uifork-selected-component");
              }
            }
          }
        };
        // Check immediately and after delays to handle any race conditions
        ensureRemoval();
        setTimeout(ensureRemoval, 0);
        setTimeout(ensureRemoval, 50);
        setTimeout(ensureRemoval, 100);
      }
      // Components will be updated automatically via WebSocket
    },
    onError: clearEditingOnError,
  });

  // Popover positioning hook
  const { popoverPositions, setPopoverTriggerRef, setPopoverDropdownRef } = usePopoverPosition({
    openPopoverVersion,
  });

  // Keyboard shortcuts for version switching
  useVersionKeyboardShortcuts({
    versionKeys,
    activeVersion,
    setActiveVersion,
  });

  // Dropdown keyboard navigation
  useDropdownKeyboard({
    isOpen,
    containerRef,
    triggerRef,
    openPopoverVersion,
    isComponentSelectorOpen,
    editingVersion,
    onClosePopover: () => setOpenPopoverVersion(null),
    onCloseComponentSelector: () => setIsComponentSelectorOpen(false),
    onCancelRename: cancelRename,
    onClose: () => {
      setIsOpen(false);
      setIsSettingsOpen(false);
    },
  });

  // Click outside handling for main dropdown
  // Note: ComponentSelectorDropdown and VersionActionMenu handle their own click-outside
  useClickOutside({
    isActive: isOpen,
    refs: [triggerRef, containerRef],
    onClickOutside: useCallback(() => {
      if (editingVersion) {
        cancelRename();
      }
      setIsOpen(false);
      setIsSettingsOpen(false);
      setIsComponentSelectorOpen(false);
    }, [editingVersion, cancelRename]),
    additionalCheck: useCallback((target: Node) => {
      // Check if clicking inside component selector dropdown (portaled outside container)
      if (componentSelectorRef.current?.contains(target)) {
        return true;
      }
      // Check if clicking inside popover elements (portaled outside container)
      const popoverElements = document.querySelectorAll("[data-popover-dropdown]");
      for (const el of popoverElements) {
        if (el.contains(target)) return true;
      }
      return false;
    }, []),
  });

  // Mount effect
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Action handlers
  const handleDuplicateVersion = (version: string, e: React.MouseEvent) => {
    e.stopPropagation();
    sendMessage("duplicate_version", { version });
  };

  const handleDeleteVersion = (version: string, e: React.MouseEvent) => {
    e.stopPropagation();
    sendMessage("delete_version", { version });
  };

  const handleNewVersion = (e: React.MouseEvent) => {
    e.stopPropagation();
    sendMessage("new_version", {});
  };

  const handleRenameVersion = (version: string, e: React.MouseEvent) => {
    e.stopPropagation();
    startRename(version);
  };

  const handleConfirmRename = useCallback(
    (version: string) => {
      const normalizedVersion = confirmRename(version);
      if (normalizedVersion) {
        sendMessage("rename_version", {
          version,
          newVersion: normalizedVersion,
        });
      }
    },
    [confirmRename, sendMessage],
  );

  const handlePromoteVersion = (version: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (
      window.confirm(
        `Are you sure you want to promote version ${formatVersionLabel(
          version,
        )}?\n\nThis will:\n- Replace the main component with this version\n- Remove all versioning scaffolding\n- This action cannot be undone`,
      )
    ) {
      sendMessage("promote_version", { version });
      setOpenPopoverVersion(null);
    }
  };

  const handleTogglePopover = (version: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setOpenPopoverVersion(openPopoverVersion === version ? null : version);
  };

  const handleOpenInEditor = async (version: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const response = await fetch(`http://localhost:${port}/open-in-editor`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          version,
          component: selectedComponent,
          editor: codeEditor,
        }),
      });
      if (!response.ok) {
        await response.json();
      }
    } catch {
      // Error opening in editor
    }
    setOpenPopoverVersion(null);
  };

  // Format version label (v1 -> V1, v1_2 -> V1.2)
  const formatVersionLabel = (version: string) => {
    return version.replace(/^v/, "V").replace(/_/g, ".");
  };

  // Copy command to clipboard
  const handleCopyCommand = useCallback(async () => {
    const command = "uifork init ";
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Failed to copy command
    }
  }, []);

  // Copy watch command to clipboard
  const handleCopyWatchCommand = useCallback(async () => {
    const command = "npx uifork watch";
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Failed to copy command
    }
  }, []);

  // Create or get root element for theming
  useEffect(() => {
    if (!isMounted) return;

    let rootEl = document.getElementById("uifork-root") as HTMLDivElement | null;
    if (!rootEl) {
      rootEl = document.createElement("div");
      rootEl.id = "uifork-root";
      rootEl.className = styles.uiforkRoot || "uiforkRoot";
      document.body.appendChild(rootEl);
    }
    rootRef.current = rootEl;

    // Update theme attribute
    rootEl.setAttribute("data-theme", theme);

    return () => {
      // Don't remove root element on unmount as it might be used by other instances
    };
  }, [isMounted, theme, styles]);

  // Determine active view based on current state
  const activeView: ActiveView = React.useMemo(() => {
    if (!isOpen) {
      // When closed, determine if we show icon-only or icon+label
      const hasConnection = connectionStatus !== "disconnected" && connectionStatus !== "failed";
      const hasComponents = mountedComponents.length > 0;

      // Show icon+label when connected and has components
      if (hasConnection && hasComponents) {
        return "closed-trigger-label";
      }

      // Otherwise show icon-only (error, connecting, or no components)
      return "closed-trigger-icon";
    }

    // When dropdown is open, determine which view to show
    if (connectionStatus === "disconnected" || connectionStatus === "failed") {
      return "opened-no-connection";
    }

    if (isSettingsOpen) {
      return "opened-settings";
    }

    if (mountedComponents.length === 0) {
      return "opened-no-components";
    }

    return "opened-version-list";
  }, [isOpen, connectionStatus, isSettingsOpen, mountedComponents.length]);

  // Don't render until mounted on client (prevents hydration mismatch)
  if (!isMounted) {
    return null;
  }

  const portalRoot = rootRef.current || document.getElementById("uifork-root");
  if (!portalRoot) {
    return null;
  }

  return createPortal(
    <>
      <motion.div
        ref={containerRef}
        className={`${styles.container} ${!isOpen ? styles.containerClosed : ""}`}
        layout
        drag={dragEnabled && !isOpen}
        dragControls={dragControls}
        dragMomentum={false}
        dragElastic={0}
        dragListener={false}
        onPointerDown={handlePointerDown}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        animate={resetDrag ? { x: 0, y: 0 } : {}}
        style={{
          borderRadius: isOpen ? 12 : 16,
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
          ...containerPosition,
          transformOrigin,
          // Don't set cursor here - we handle it on document.body to override CSS
          touchAction: !isOpen ? "none" : "auto",
        }}
        transition={{
          layout: {
            duration: ANIMATION_DURATION,
            ease: ANIMATION_EASING,
          },
          x: {
            duration: ANIMATION_DURATION,
            ease: ANIMATION_EASING,
          },
          y: {
            duration: ANIMATION_DURATION,
            ease: ANIMATION_EASING,
          },
        }}
      >
        <AnimatePresence mode="popLayout" initial={false}>
          {activeView === "closed-trigger-icon" || activeView === "closed-trigger-label" ? (
            <motion.button
              key="trigger"
              suppressHydrationWarning
              ref={triggerRef}
              onClick={(e) => {
                // Prevent opening if we just finished dragging
                if (isDragging) {
                  e.preventDefault();
                  return;
                }
                setIsOpen(true);
                setIsSettingsOpen(false);
              }}
              aria-label="Select UI version"
              aria-expanded={false}
              aria-haspopup="listbox"
              className={`${styles.trigger} ${
                activeView === "closed-trigger-icon" ? styles.triggerIconOnly : ""
              }`}
              layout
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{
                duration: ANIMATION_DURATION,
                ease: ANIMATION_EASING,
              }}
              draggable={false}
            >
              <TriggerContent
                activeView={activeView}
                connectionStatus={connectionStatus}
                selectedComponent={selectedComponent}
                activeVersion={activeVersion}
                formatVersionLabel={formatVersionLabel}
              />
            </motion.button>
          ) : (
            <motion.div
              key="dropdown"
              ref={dropdownRef}
              role="listbox"
              aria-label="UI version options"
              className={styles.dropdown}
              layout
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{
                duration: ANIMATION_DURATION,
                ease: ANIMATION_EASING,
              }}
            >
              {activeView === "opened-no-connection" && (
                <EmptyStateNoConnection onCopyCommand={handleCopyWatchCommand} copied={copied} />
              )}

              {activeView === "opened-no-components" && (
                <EmptyStateNoComponents onCopyCommand={handleCopyCommand} copied={copied} />
              )}

              {activeView === "opened-settings" && (
                <SettingsView
                  onBack={() => setIsSettingsOpen(false)}
                  theme={theme}
                  setTheme={setTheme}
                  position={position}
                  setPosition={setPosition}
                  codeEditor={codeEditor}
                  setCodeEditor={setCodeEditor}
                  enableElementAwarePositioning={enableElementAwarePositioning}
                  setEnableElementAwarePositioning={setEnableElementAwarePositioning}
                />
              )}

              {activeView === "opened-version-list" && (
                <>
                  {/* Component selector */}
                  <ComponentSelector
                    selectedComponent={selectedComponent}
                    onToggle={() => setIsComponentSelectorOpen(!isComponentSelectorOpen)}
                    onSettingsClick={(e) => {
                      e.stopPropagation();
                      setIsSettingsOpen(true);
                    }}
                  />

                  <div className={styles.divider} />

                  {/* Versions list */}
                  <VersionsList
                    versionKeys={versionKeys}
                    activeVersion={activeVersion}
                    editingVersion={editingVersion}
                    renameValue={renameValue}
                    formatVersionLabel={formatVersionLabel}
                    openPopoverVersion={openPopoverVersion}
                    popoverPositions={popoverPositions}
                    onSelectVersion={(version) => {
                      setActiveVersion(version);
                    }}
                    onDuplicateVersion={handleDuplicateVersion}
                    onTogglePopover={handleTogglePopover}
                    onPromoteVersion={handlePromoteVersion}
                    onOpenInEditor={handleOpenInEditor}
                    onDeleteVersion={handleDeleteVersion}
                    onRenameVersion={handleRenameVersion}
                    onRenameValueChange={setRenameValue}
                    onConfirmRename={handleConfirmRename}
                    onCancelRename={cancelRename}
                    setPopoverTriggerRef={setPopoverTriggerRef}
                    setPopoverDropdownRef={setPopoverDropdownRef}
                  />

                  <div className={styles.divider} />

                  {/* New version button */}
                  <NewVersionButton onClick={handleNewVersion} />
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Component selector dropdown */}
      {activeView !== "closed-trigger-icon" && activeView !== "closed-trigger-label" && (
        <ComponentSelectorDropdown
          mountedComponents={mountedComponents}
          selectedComponent={selectedComponent}
          isOpen={isComponentSelectorOpen}
          position={componentSelectorPosition}
          onSelect={(componentName) => {
            setSelectedComponent(componentName);
            setIsComponentSelectorOpen(false);
          }}
          onClose={() => setIsComponentSelectorOpen(false)}
          componentSelectorRef={componentSelectorRef}
        />
      )}
    </>,
    portalRoot,
  );
}
