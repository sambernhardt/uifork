import {
  autoUpdate,
  computePosition,
  flip,
  offset,
  shift,
} from "@floating-ui/dom";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence, useDragControls } from "motion/react";
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
import { SettingsView } from "./SettingsView";

// Custom hooks
import { useWebSocketConnection } from "../hooks/useWebSocketConnection";
import { useComponentDiscovery } from "../hooks/useComponentDiscovery";
import { useVersionManagement } from "../hooks/useVersionManagement";
import { usePopoverPosition } from "../hooks/usePopoverPosition";
import { useClickOutside } from "../hooks/useClickOutside";
import { useLocalStorage } from "../hooks/useLocalStorage";
import {
  useVersionKeyboardShortcuts,
  useDropdownKeyboard,
} from "../hooks/useKeyboardShortcuts";

// Animation duration constant (in seconds)
const ANIMATION_DURATION = 0.3;

// Animation easing curve (cubic-bezier)
const ANIMATION_EASING = [0.04, 1.02, 0.13, 1.02] as const;

// UI View States
type ActiveView =
  | "closed-trigger-icon"
  | "closed-trigger-label"
  | "opened-version-list"
  | "opened-no-components"
  | "opened-no-connection"
  | "opened-settings";

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
  const [openPopoverVersion, setOpenPopoverVersion] = useState<string | null>(
    null
  );
  const [componentSelectorPosition, setComponentSelectorPosition] = useState({
    x: 0,
    y: 0,
  });
  const [copied, setCopied] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [resetDrag, setResetDrag] = useState(false);
  const [dragEnabled, setDragEnabled] = useState(false);
  const [pointerStart, setPointerStart] = useState<{
    x: number;
    y: number;
    event: PointerEvent | null;
  } | null>(null);

  // Drag controls for manual drag initiation
  const dragControls = useDragControls();

  // Drag threshold in pixels
  const DRAG_THRESHOLD = 5;

  // Settings
  const [theme, setTheme] = useLocalStorage<"light" | "dark" | "system">(
    "uifork-theme",
    "system"
  );
  const [position, setPosition] = useLocalStorage<
    "top-left" | "top-right" | "bottom-left" | "bottom-right"
  >("uifork-position", "bottom-right");
  const [codeEditor, setCodeEditor] = useLocalStorage<"vscode" | "cursor">(
    "uifork-code-editor",
    "vscode"
  );

  // Root ref for theme wrapper
  const rootRef = useRef<HTMLDivElement | null>(null);

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
    onComponentsUpdate,
  } = useComponentDiscovery({ port });

  // Keep ref updated with current selected component
  useEffect(() => {
    selectedComponentRef.current = selectedComponent;
  }, [selectedComponent]);

  // Get current component's versions
  const currentComponent = mountedComponents.find(
    (c) => c.name === selectedComponent
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
    onComponentsUpdate,
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
      // Components will be updated automatically via WebSocket
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
    onClose: () => {
      setIsOpen(false);
      setIsSettingsOpen(false);
    },
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
        setIsSettingsOpen(false);
      }
    }, [
      openPopoverVersion,
      editingVersion,
      isComponentSelectorOpen,
      isSettingsOpen,
      isOpen,
      cancelRename,
    ]),
    additionalCheck: useCallback(
      (target: Node) => {
        // Check if clicking inside popover elements
        if (openPopoverVersion) {
          const popoverElements = document.querySelectorAll(
            "[data-popover-dropdown]"
          );
          for (const el of popoverElements) {
            if (el.contains(target)) return true;
          }
        }
        return false;
      },
      [openPopoverVersion]
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
      "[data-component-selector]"
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
          }
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
      updatePosition
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
    [confirmRename, sendMessage]
  );

  const handlePromoteVersion = (version: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (
      window.confirm(
        `Are you sure you want to promote version ${formatVersionLabel(
          version
        )}?\n\nThis will:\n- Replace the main component with this version\n- Remove all versioning scaffolding\n- This action cannot be undone`
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

  // Calculate nearest corner based on position
  const getNearestCorner = useCallback(
    (
      x: number,
      y: number
    ): "top-left" | "top-right" | "bottom-left" | "bottom-right" => {
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const centerX = viewportWidth / 2;
      const centerY = viewportHeight / 2;

      if (x < centerX && y < centerY) {
        return "top-left";
      } else if (x >= centerX && y < centerY) {
        return "top-right";
      } else if (x < centerX && y >= centerY) {
        return "bottom-left";
      } else {
        return "bottom-right";
      }
    },
    []
  );

  // Handle drag end - snap to nearest corner
  const handleDragEnd = useCallback(
    (event: PointerEvent, info: { point: { x: number; y: number } }) => {
      setIsDragging(false);
      setDragEnabled(false);
      setPointerStart(null);

      // Reset cursor on document body and container
      document.body.style.removeProperty("cursor");
      document.body.style.userSelect = "";
      if (containerRef.current) {
        containerRef.current.style.removeProperty("cursor");
        containerRef.current.removeAttribute("data-drag-tracking");
        containerRef.current.removeAttribute("data-dragging");
      }

      // Get current container position (includes drag transforms)
      if (!containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      // Calculate nearest corner based on center of container
      const nearestCorner = getNearestCorner(centerX, centerY);

      // Update position (will save to localStorage automatically)
      setPosition(nearestCorner);

      // Trigger reset of drag transforms
      setResetDrag(true);
    },
    [getNearestCorner, setPosition]
  );

  // Handle pointer down - start tracking for drag threshold
  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (isOpen) return; // Don't allow dragging when open
      const pointerEvent = e.nativeEvent as PointerEvent;
      setPointerStart({ x: e.clientX, y: e.clientY, event: pointerEvent });
      setDragEnabled(false);
      // Add data attribute to container for CSS targeting
      if (containerRef.current) {
        containerRef.current.setAttribute("data-drag-tracking", "true");
      }
    },
    [isOpen]
  );

  // Global pointer move handler to check threshold
  useEffect(() => {
    if (!pointerStart || isOpen) return;

    const handlePointerMove = (e: PointerEvent) => {
      const deltaX = Math.abs(e.clientX - pointerStart.x);
      const deltaY = Math.abs(e.clientY - pointerStart.y);
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

      if (distance > DRAG_THRESHOLD && !dragEnabled) {
        setDragEnabled(true);
        setResetDrag(false);
        // Start drag manually using the current pointer event
        // This ensures drag starts from the current position, not causing a jump
        dragControls.start(e, { snapToCursor: true });
      }
    };

    const handlePointerUp = () => {
      if (!dragEnabled) {
        // If drag wasn't enabled, reset everything
        setPointerStart(null);
        setDragEnabled(false);
        // Reset cursor on document body and container
        document.body.style.removeProperty("cursor");
        if (containerRef.current) {
          containerRef.current.style.removeProperty("cursor");
          containerRef.current.removeAttribute("data-drag-tracking");
        }
      }
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [pointerStart, isOpen, dragEnabled, dragControls]);

  // Handle drag start (only called after threshold is crossed)
  const handleDragStart = useCallback(() => {
    setIsDragging(true);
    setResetDrag(false);
    // Set cursor on document body and container to ensure it stays grabbing
    // Use !important to override any CSS cursor styles
    document.body.style.setProperty("cursor", "grabbing", "important");
    document.body.style.userSelect = "none";
    if (containerRef.current) {
      containerRef.current.style.setProperty("cursor", "grabbing", "important");
      containerRef.current.setAttribute("data-dragging", "true");
    }
  }, []);

  // Reset drag transforms after position update
  useEffect(() => {
    if (resetDrag && !isDragging) {
      // Reset flag after animation completes
      const timer = setTimeout(() => {
        setResetDrag(false);
      }, ANIMATION_DURATION * 1000 + 50);
      return () => clearTimeout(timer);
    }
  }, [resetDrag, isDragging]);

  // Cleanup: Reset cursor when dropdown opens or component unmounts
  useEffect(() => {
    if (isOpen && (isDragging || dragEnabled)) {
      // Reset drag state when dropdown opens
      setIsDragging(false);
      setDragEnabled(false);
      setPointerStart(null);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    }
  }, [isOpen, isDragging, dragEnabled]);

  // Cleanup: Reset cursor on unmount
  useEffect(() => {
    return () => {
      document.body.style.removeProperty("cursor");
      document.body.style.userSelect = "";
      if (containerRef.current) {
        containerRef.current.style.removeProperty("cursor");
        containerRef.current.removeAttribute("data-drag-tracking");
        containerRef.current.removeAttribute("data-dragging");
      }
    };
  }, []);

  // Calculate container position based on settings
  const containerPosition = React.useMemo(() => {
    const offset = 20;
    const positions = {
      "top-left": {
        top: `${offset}px`,
        left: `${offset}px`,
        bottom: "auto",
        right: "auto",
      },
      "top-right": {
        top: `${offset}px`,
        right: `${offset}px`,
        bottom: "auto",
        left: "auto",
      },
      "bottom-left": {
        bottom: `${offset}px`,
        left: `${offset}px`,
        top: "auto",
        right: "auto",
      },
      "bottom-right": {
        bottom: `${offset}px`,
        right: `${offset}px`,
        top: "auto",
        left: "auto",
      },
    };
    return positions[position];
  }, [position]);

  const transformOrigin = React.useMemo(() => {
    const origins = {
      "top-left": "top left",
      "top-right": "top right",
      "bottom-left": "bottom left",
      "bottom-right": "bottom right",
    };
    return origins[position];
  }, [position]);

  // Create or get root element for theming
  useEffect(() => {
    if (!isMounted) return;

    let rootEl = document.getElementById(
      "uifork-root"
    ) as HTMLDivElement | null;
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
      const hasConnection =
        connectionStatus !== "disconnected" && connectionStatus !== "failed";
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
        className={`${styles.container} ${
          !isOpen ? styles.containerClosed : ""
        }`}
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
          {activeView === "closed-trigger-icon" ||
          activeView === "closed-trigger-label" ? (
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
                activeView === "closed-trigger-icon"
                  ? styles.triggerIconOnly
                  : ""
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
              {activeView === "closed-trigger-icon" ? (
                // Icon-only state: error, connecting, or no components
                <>
                  {connectionStatus === "disconnected" ||
                  connectionStatus === "failed" ? (
                    <div className={styles.triggerIconContainer}>
                      <BranchIcon className={styles.triggerIcon} />
                      <div
                        className={styles.connectionErrorDot}
                        title="Disconnected from watch server"
                      />
                    </div>
                  ) : (
                    <>
                      {connectionStatus === "connecting" && (
                        <div
                          className={`${styles.statusIndicator} ${styles.statusIndicatorConnecting}`}
                          title="Connecting..."
                        />
                      )}
                      <BranchIcon className={styles.triggerIcon} />
                    </>
                  )}
                </>
              ) : (
                // Icon+label state: connected with components
                <>
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
              {activeView === "opened-no-connection" && (
                <div className={styles.emptyStateContainer}>
                  <h3 className={styles.emptyStateHeading}>Connection lost</h3>
                  <p className={styles.emptyStateText}>
                    You need to run{" "}
                    <code className={styles.inlineCode}>uifork watch</code> to
                    connect to the watch server
                  </p>
                </div>
              )}

              {activeView === "opened-no-components" && (
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
                />
              )}

              {activeView === "opened-version-list" && (
                <>
                  {/* Component selector */}
                  <ComponentSelector
                    selectedComponent={selectedComponent}
                    onToggle={() =>
                      setIsComponentSelectorOpen(!isComponentSelectorOpen)
                    }
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
                  <button
                    onClick={(e) => {
                      handleNewVersion(e);
                    }}
                    className={`${styles.newVersionButton} ${styles.menuItem}`}
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
      {activeView !== "closed-trigger-icon" &&
        activeView !== "closed-trigger-label" && (
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
    portalRoot
  );
}
