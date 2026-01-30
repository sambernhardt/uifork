import {
  autoUpdate,
  computePosition,
  flip,
  offset,
  shift,
} from "@floating-ui/dom";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import type { UIForkProps } from "../types";
import styles from "./UIFork.module.css";
import { PlusIcon } from "./icons/PlusIcon";
import { BranchIcon } from "./icons/BranchIcon";
import { CopyIcon } from "./icons/CopyIcon";
import { CheckmarkIcon } from "./icons/CheckmarkIcon";
import {
  ComponentSelector,
  ComponentSelectorDropdown,
} from "./ComponentSelector";
import { VersionsList } from "./VersionsList";

// Custom hooks
import { useWebSocketConnection } from "../hooks/useWebSocketConnection";
import { useComponentDiscovery } from "../hooks/useComponentDiscovery";
import { useVersionManagement } from "../hooks/useVersionManagement";
import { usePopoverPosition } from "../hooks/usePopoverPosition";
import { useClickOutside } from "../hooks/useClickOutside";
import {
  useVersionKeyboardShortcuts,
  useDropdownKeyboard,
} from "../hooks/useKeyboardShortcuts";

// Animation duration constant (in seconds)
const ANIMATION_DURATION = 0.3;

// Animation easing curve (cubic-bezier)
const ANIMATION_EASING = [0.04, 1.02, 0.13, 1.02] as const;

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
  const [openPopoverVersion, setOpenPopoverVersion] = useState<string | null>(
    null,
  );
  const [componentSelectorPosition, setComponentSelectorPosition] = useState({
    x: 0,
    y: 0,
  });
  const [copied, setCopied] = useState(false);

  // Refs
  const triggerRef = useRef<HTMLButtonElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const componentSelectorRef = useRef<HTMLDivElement>(null);
  const selectedComponentRef = useRef<string>("");

  // Component discovery hook
  const {
    mountedComponents,
    selectedComponent,
    setSelectedComponent,
    fetchComponents,
  } = useComponentDiscovery({ port });

  // Keep ref updated with current selected component
  useEffect(() => {
    selectedComponentRef.current = selectedComponent;
  }, [selectedComponent]);

  // Get current component's versions
  const currentComponent = mountedComponents.find(
    (c) => c.name === selectedComponent,
  );
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
    onFileChanged: fetchComponents,
    onVersionAck: ({ version, message, newVersion }) => {
      console.log("[UIFork] onVersionAck:", { version, message, newVersion });
      let versionToActivate: string | null = null;

      if (
        message?.includes("duplicated") ||
        message?.includes("created new version")
      ) {
        versionToActivate = version;
      } else if (message?.includes("renamed") && newVersion) {
        versionToActivate = newVersion;
      }

      if (versionToActivate) {
        console.log("[UIFork] Activating version:", versionToActivate);
        storePendingVersion(versionToActivate);
        fetchComponents();
      }
    },
    onPromoted: (promotedComponent) => {
      // Always check localStorage directly and remove if it matches the promoted component
      // This handles cases where state might be stale but localStorage has the value
      const storedValue = localStorage.getItem("uifork-selected-component");
      const storedComponent = storedValue ? JSON.parse(storedValue) : null;
      const currentSelected = selectedComponentRef.current;

      // Remove if either state or localStorage matches the promoted component
      if (
        currentSelected === promotedComponent ||
        storedComponent === promotedComponent
      ) {
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
      // Fetch components after clearing (this might auto-select another component)
      fetchComponents();
    },
    onError: clearEditingOnError,
  });

  // Popover positioning hook
  const { popoverPositions, setPopoverTriggerRef, setPopoverDropdownRef } =
    usePopoverPosition({ openPopoverVersion });

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
    onClose: () => setIsOpen(false),
  });

  // Click outside handling
  useClickOutside({
    isActive: isOpen || openPopoverVersion !== null || isComponentSelectorOpen,
    refs: [triggerRef, containerRef, componentSelectorRef],
    onClickOutside: useCallback(() => {
      if (openPopoverVersion) {
        setOpenPopoverVersion(null);
        return;
      }
      if (editingVersion) {
        cancelRename();
      }
      if (isComponentSelectorOpen) {
        setIsComponentSelectorOpen(false);
      }
      if (isOpen) {
        setIsOpen(false);
      }
    }, [
      openPopoverVersion,
      editingVersion,
      isComponentSelectorOpen,
      isOpen,
      cancelRename,
    ]),
    additionalCheck: useCallback(
      (target: Node) => {
        // Check if clicking inside popover elements
        if (openPopoverVersion) {
          const popoverElements = document.querySelectorAll(
            "[data-popover-dropdown]",
          );
          for (const el of popoverElements) {
            if (el.contains(target)) return true;
          }
        }
        return false;
      },
      [openPopoverVersion],
    ),
  });

  // Position component selector dropdown
  useEffect(() => {
    if (
      !isComponentSelectorOpen ||
      !containerRef.current ||
      !componentSelectorRef.current
    )
      return;
    const trigger = containerRef.current.querySelector(
      "[data-component-selector]",
    ) as HTMLElement;
    if (!trigger) return;

    const updatePosition = async () => {
      try {
        const { x, y } = await computePosition(
          containerRef.current!,
          componentSelectorRef.current!,
          {
            placement: "left-start",
            strategy: "fixed",
            middleware: [offset(4), flip(), shift({ padding: 8 })],
          },
        );
        setComponentSelectorPosition({ x, y });
        if (componentSelectorRef.current)
          componentSelectorRef.current.style.visibility = "visible";
      } catch (error) {
        console.error("Error positioning component selector:", error);
      }
    };
    if (componentSelectorRef.current)
      componentSelectorRef.current.style.visibility = "hidden";
    updatePosition();
    const cleanup = autoUpdate(
      containerRef.current,
      componentSelectorRef.current,
      updatePosition,
    );
    return cleanup;
  }, [isComponentSelectorOpen]);

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
        `Are you sure you want to promote version ${formatVersionLabel(version)}?\n\nThis will:\n- Replace the main component with this version\n- Remove all versioning scaffolding\n- This action cannot be undone`,
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
        body: JSON.stringify({ version, component: selectedComponent }),
      });
      if (!response.ok) {
        const error = await response.json();
        console.error("[UIFork] Error opening in editor:", error.error);
      }
    } catch (error) {
      console.error("[UIFork] Error opening in editor:", error);
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
    } catch (error) {
      console.error("Failed to copy command:", error);
    }
  }, []);

  // Don't render until mounted on client (prevents hydration mismatch)
  if (!isMounted) {
    return null;
  }

  return createPortal(
    <>
      <motion.div
        ref={containerRef}
        className={styles.container}
        layout
        style={{
          borderRadius: 12,
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
        }}
        transition={{
          layout: {
            duration: ANIMATION_DURATION,
            ease: ANIMATION_EASING,
          },
        }}
      >
        <AnimatePresence mode="popLayout" initial={false}>
          {!isOpen ? (
            <motion.button
              key="trigger"
              suppressHydrationWarning
              ref={triggerRef}
              onClick={() => setIsOpen(true)}
              aria-label="Select UI version"
              aria-expanded={false}
              aria-haspopup="listbox"
              className={`${styles.trigger} ${
                mountedComponents.length === 0 ? styles.triggerEmpty : ""
              }`}
              layout
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{
                duration: ANIMATION_DURATION,
                ease: ANIMATION_EASING,
              }}
            >
              {mountedComponents.length === 0 ? (
                <BranchIcon className={styles.triggerIcon} />
              ) : (
                <>
                  <div
                    className={`${styles.statusIndicator} ${
                      connectionStatus === "connected"
                        ? styles.statusIndicatorConnected
                        : connectionStatus === "connecting"
                          ? styles.statusIndicatorConnecting
                          : styles.statusIndicatorDisconnected
                    }`}
                    title={
                      connectionStatus === "connected"
                        ? "Connected to watch server"
                        : connectionStatus === "connecting"
                          ? "Connecting..."
                          : "Disconnected from watch server"
                    }
                  />
                  <BranchIcon className={styles.triggerIcon} />
                  <motion.span
                    layoutId="component-name"
                    layout="position"
                    className={styles.triggerLabel}
                    transition={{
                      duration: ANIMATION_DURATION,
                      ease: ANIMATION_EASING,
                    }}
                  >
                    {selectedComponent || "No component"}
                  </motion.span>
                  <span className={styles.triggerVersion}>
                    {activeVersion ? formatVersionLabel(activeVersion) : "-"}
                  </span>
                </>
              )}
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
              {mountedComponents.length === 0 ? (
                <div className={styles.emptyStateContainer}>
                  <h3 className={styles.emptyStateHeading}>
                    Get started with uifork
                  </h3>
                  <p className={styles.emptyStateText}>
                    Choose a component and run the command in your root
                    directory
                  </p>
                  <button
                    onClick={handleCopyCommand}
                    className={styles.emptyStateCommandContainer}
                    title="Copy command"
                    aria-label="Copy command to clipboard"
                  >
                    <code className={styles.emptyStateCommand}>
                      uifork init &lt;path to file&gt;
                    </code>
                    {copied ? (
                      <CheckmarkIcon className={styles.emptyStateCopyIcon} />
                    ) : (
                      <CopyIcon className={styles.emptyStateCopyIcon} />
                    )}
                  </button>
                </div>
              ) : (
                <>
                  {/* Component selector */}
                  <ComponentSelector
                    selectedComponent={selectedComponent}
                    onToggle={() =>
                      setIsComponentSelectorOpen(!isComponentSelectorOpen)
                    }
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
                  <button
                    onClick={(e) => {
                      handleNewVersion(e);
                    }}
                    className={styles.newVersionButton}
                    title="Create new version"
                  >
                    <div className={styles.newVersionIconContainer}>
                      <PlusIcon className={styles.newVersionIcon} />
                    </div>
                    <span>New version</span>
                  </button>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Component selector dropdown */}
      {isOpen && (
        <ComponentSelectorDropdown
          mountedComponents={mountedComponents}
          selectedComponent={selectedComponent}
          isOpen={isComponentSelectorOpen}
          position={componentSelectorPosition}
          onSelect={(componentName) => {
            setSelectedComponent(componentName);
            setIsComponentSelectorOpen(false);
          }}
          componentSelectorRef={componentSelectorRef}
        />
      )}
    </>,
    document.body,
  );
}
