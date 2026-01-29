"use client";

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
import { useLocalStorage } from "../hooks/useLocalStorage";
import { getMountedComponents, subscribe } from "../utils/componentRegistry";
import type { ComponentInfo, UIForkProps } from "../types";
import styles from "./UIFork.module.css";

// Animation duration constant (in seconds)
const ANIMATION_DURATION = 0.3;

// Animation easing curve (cubic-bezier)
const ANIMATION_EASING = [0.18, 0.83, 0, 1] as const;

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
  // Component discovery state
  const [components, setComponents] = useState<ComponentInfo[]>([]);
  const [mountedComponentIds, setMountedComponentIds] = useState<string[]>([]);
  const [selectedComponent, setSelectedComponent] = useLocalStorage<string>(
    "uifork-selected-component",
    "",
    true,
  );
  const [isComponentSelectorOpen, setIsComponentSelectorOpen] = useState(false);

  // Version state for selected component
  const [activeVersion, setActiveVersion] = useLocalStorage<string>(
    selectedComponent || "uifork-default",
    "",
    true,
  );

  // UI state
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const componentSelectorRef = useRef<HTMLDivElement>(null);
  const [componentSelectorPosition, setComponentSelectorPosition] = useState({
    x: 0,
    y: 0,
  });

  // WebSocket state
  const [wsConnection, setWsConnection] = useState<WebSocket | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<
    "connected" | "disconnected" | "connecting"
  >("disconnected");

  // Rename state
  const [editingVersion, setEditingVersion] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState<string>("");
  const renameInputRef = useRef<HTMLInputElement>(null);
  const editingVersionRef = useRef<string | null>(null);

  // Popover state
  const [openPopoverVersion, setOpenPopoverVersion] = useState<string | null>(
    null,
  );
  const popoverTriggerRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const popoverDropdownRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const popoverPositions = useRef<Map<string, { x: number; y: number }>>(
    new Map(),
  );

  // Refs
  const selectedComponentRef = useRef(selectedComponent);
  const activeVersionRef = useRef(activeVersion);

  // Filter components to only show mounted ones
  const mountedComponents = components.filter((c) =>
    mountedComponentIds.includes(c.name),
  );

  // Get current component's versions
  const currentComponent = mountedComponents.find(
    (c) => c.name === selectedComponent,
  );
  const versionKeys = currentComponent?.versions || [];

  // Keep refs updated
  useEffect(() => {
    selectedComponentRef.current = selectedComponent;
    activeVersionRef.current = activeVersion;
  }, [selectedComponent, activeVersion]);

  // Keep editingVersion ref updated
  useEffect(() => {
    editingVersionRef.current = editingVersion;
  }, [editingVersion]);

  // Fetch components from server
  const fetchComponents = useCallback(async () => {
    try {
      const response = await fetch(`http://localhost:${port}/components`);
      if (response.ok) {
        const data = await response.json();
        setComponents(data.components || []);

        // If no component selected yet, select the first one
        if (!selectedComponent && data.components?.length > 0) {
          setSelectedComponent(data.components[0].name);
        }
      }
    } catch (error) {
      console.error("[UIFork] Error fetching components:", error);
    }
  }, [port, selectedComponent, setSelectedComponent]);

  // Subscribe to component registry changes
  useEffect(() => {
    // Initialize with current mounted components
    setMountedComponentIds(getMountedComponents());

    // Subscribe to changes
    const unsubscribe = subscribe(() => {
      setMountedComponentIds(getMountedComponents());
    });

    return unsubscribe;
  }, []);

  // Auto-select first mounted component if current selection is not mounted
  useEffect(() => {
    if (
      selectedComponent &&
      mountedComponentIds.length > 0 &&
      !mountedComponentIds.includes(selectedComponent)
    ) {
      // Current selection is not mounted, switch to first mounted component
      const firstMounted = components.find((c) =>
        mountedComponentIds.includes(c.name),
      );
      if (firstMounted) {
        setSelectedComponent(firstMounted.name);
      }
    } else if (
      !selectedComponent &&
      mountedComponentIds.length > 0 &&
      components.length > 0
    ) {
      // No selection yet, select first mounted component
      const firstMounted = components.find((c) =>
        mountedComponentIds.includes(c.name),
      );
      if (firstMounted) {
        setSelectedComponent(firstMounted.name);
      }
    }
  }, [
    selectedComponent,
    mountedComponentIds,
    components,
    setSelectedComponent,
  ]);

  // Fetch components on mount and when WebSocket reconnects
  useEffect(() => {
    fetchComponents();
  }, [fetchComponents]);

  // Update active version when component changes or versions update
  useEffect(() => {
    if (selectedComponent && versionKeys.length > 0) {
      // Try to read saved version from localStorage
      const savedVersion = localStorage.getItem(selectedComponent);
      const parsedVersion = savedVersion ? JSON.parse(savedVersion) : null;

      if (parsedVersion && versionKeys.includes(parsedVersion)) {
        setActiveVersion(parsedVersion);
      } else if (!versionKeys.includes(activeVersion)) {
        // Fall back to first version
        setActiveVersion(versionKeys[0]);
      }
    }
  }, [selectedComponent, versionKeys, activeVersion, setActiveVersion]);

  // Write active version to localStorage with component ID as key
  useEffect(() => {
    if (selectedComponent && activeVersion) {
      localStorage.setItem(selectedComponent, JSON.stringify(activeVersion));
      // Dispatch storage event for cross-tab sync
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: selectedComponent,
          newValue: JSON.stringify(activeVersion),
        }),
      );
    }
  }, [selectedComponent, activeVersion]);

  // WebSocket connection management
  useEffect(() => {
    const wsUrl = `ws://localhost:${port}/ws`;

    setConnectionStatus("connecting");
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      setConnectionStatus("connected");
      setWsConnection(ws);
      // Refresh components list on reconnect
      fetchComponents();
    };

    ws.onclose = () => {
      setConnectionStatus("disconnected");
      setWsConnection(null);
    };

    ws.onerror = (error) => {
      console.error("[UIFork] WebSocket error:", error);
      setConnectionStatus("disconnected");
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === "file_changed") {
          // Refresh components list when files change
          fetchComponents();
        } else if (data.type === "ack" && data.payload?.version) {
          const message = data.payload.message || "";
          let versionToActivate: string | null = null;
          const newVersion = data.payload.newVersion;

          if (
            message.includes("duplicated") ||
            message.includes("created new version")
          ) {
            versionToActivate = data.payload.version;
          } else if (message.includes("renamed") && newVersion) {
            versionToActivate = newVersion;
          } else if (message.includes("promoted")) {
            // Component was promoted, refresh components list
            // The component will no longer appear in the list
            const promotedComponent =
              data.payload.component || selectedComponentRef.current;
            fetchComponents();
            // Clear selection if the promoted component was selected
            if (selectedComponentRef.current === promotedComponent) {
              setSelectedComponent("");
            }
            return;
          }

          if (versionToActivate) {
            // Store pending version and refresh components
            const pendingKey = `${selectedComponentRef.current}-pending-version`;
            localStorage.setItem(pendingKey, versionToActivate);
            fetchComponents();
          }
        } else if (data.type === "error") {
          console.error("[UIFork] Server error:", data.payload?.message);
          if (editingVersionRef.current) {
            setEditingVersion(null);
            setRenameValue("");
          }
        }
      } catch (error) {
        console.error("[UIFork] Error parsing WebSocket message:", error);
      }
    };

    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, [port, fetchComponents]);

  // Check for pending version after components refresh
  useEffect(() => {
    if (selectedComponent && versionKeys.length > 0) {
      const pendingKey = `${selectedComponent}-pending-version`;
      const pendingVersion = localStorage.getItem(pendingKey);
      if (pendingVersion && versionKeys.includes(pendingVersion)) {
        setActiveVersion(pendingVersion);
        localStorage.removeItem(pendingKey);
      }
    }
  }, [selectedComponent, versionKeys, setActiveVersion]);

  // Send WebSocket message helper
  const sendWebSocketMessage = useCallback(
    (
      type:
        | "duplicate_version"
        | "delete_version"
        | "new_version"
        | "rename_version"
        | "promote_version",
      payload: Record<string, unknown>,
    ) => {
      if (wsConnection && wsConnection.readyState === WebSocket.OPEN) {
        // Include component name in all messages
        wsConnection.send(
          JSON.stringify({
            type,
            payload: { ...payload, component: selectedComponent },
          }),
        );
      } else {
        console.warn("[UIFork] WebSocket not connected, cannot send message");
      }
    },
    [wsConnection, selectedComponent],
  );

  // Action handlers
  const handleDuplicateVersion = (version: string, e: React.MouseEvent) => {
    e.stopPropagation();
    sendWebSocketMessage("duplicate_version", { version });
  };

  const handleDeleteVersion = (version: string, e: React.MouseEvent) => {
    e.stopPropagation();
    sendWebSocketMessage("delete_version", { version });
  };

  const handleNewVersion = (e: React.MouseEvent) => {
    e.stopPropagation();
    sendWebSocketMessage("new_version", {});
  };

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

  const handleRenameVersion = (version: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingVersion(version);
    setRenameValue(version);
  };

  const handleConfirmRename = useCallback(
    (version: string) => {
      const normalizedVersion = normalizeVersionKey(renameValue.trim());
      if (
        !normalizedVersion ||
        normalizedVersion === version ||
        versionKeys.includes(normalizedVersion)
      ) {
        setEditingVersion(null);
        setRenameValue("");
        return;
      }
      sendWebSocketMessage("rename_version", {
        version,
        newVersion: normalizedVersion,
      });
      setEditingVersion(null);
      setRenameValue("");
    },
    [renameValue, versionKeys, sendWebSocketMessage],
  );

  const handleCancelRename = useCallback(() => {
    setEditingVersion(null);
    setRenameValue("");
  }, []);

  const handlePromoteVersion = (version: string, e: React.MouseEvent) => {
    e.stopPropagation();
    // Confirm before promoting since this is a destructive operation
    if (
      window.confirm(
        `Are you sure you want to promote version ${formatVersionLabel(version)}?\n\nThis will:\n- Replace the main component with this version\n- Remove all versioning scaffolding\n- This action cannot be undone`,
      )
    ) {
      sendWebSocketMessage("promote_version", { version });
      setOpenPopoverVersion(null);
    }
  };

  const handleTogglePopover = (version: string, e: React.MouseEvent) => {
    e.stopPropagation();
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

  // Keyboard shortcuts for version switching
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!e.metaKey || versionKeys.length === 0) return;
      const currentIndex = versionKeys.indexOf(activeVersion);
      if (e.key === "ArrowDown") {
        e.preventDefault();
        const prevIndex = currentIndex - 1;
        setActiveVersion(
          versionKeys[prevIndex >= 0 ? prevIndex : versionKeys.length - 1],
        );
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        const nextIndex = currentIndex + 1;
        setActiveVersion(
          versionKeys[nextIndex < versionKeys.length ? nextIndex : 0],
        );
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeVersion, versionKeys, setActiveVersion]);

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
          trigger,
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
      trigger,
      componentSelectorRef.current,
      updatePosition,
    );
    return cleanup;
  }, [isComponentSelectorOpen]);

  // Position popover menus
  useEffect(() => {
    if (!openPopoverVersion) return;
    const trigger = popoverTriggerRefs.current.get(openPopoverVersion);
    const dropdown = popoverDropdownRefs.current.get(openPopoverVersion);
    if (!trigger || !dropdown) return;
    const updatePosition = async () => {
      try {
        const { x, y } = await computePosition(trigger, dropdown, {
          placement: "bottom-end",
          strategy: "fixed",
          middleware: [
            offset(4),
            flip({
              fallbackPlacements: ["bottom-start", "top-end", "top-start"],
            }),
            shift({ padding: 8 }),
          ],
        });
        popoverPositions.current.set(openPopoverVersion, { x, y });
        dropdown.style.visibility = "visible";
      } catch (error) {
        console.error("Error positioning popover:", error);
      }
    };
    dropdown.style.visibility = "hidden";
    updatePosition();
    const cleanup = autoUpdate(trigger, dropdown, updatePosition);
    return cleanup;
  }, [openPopoverVersion]);

  // Focus input when entering rename mode
  useEffect(() => {
    if (editingVersion && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [editingVersion]);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!isOpen && !openPopoverVersion && !isComponentSelectorOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        triggerRef.current?.contains(target) ||
        containerRef.current?.contains(target)
      )
        return;
      if (componentSelectorRef.current?.contains(target)) return;
      if (openPopoverVersion) {
        const trigger = popoverTriggerRefs.current.get(openPopoverVersion);
        const dropdown = popoverDropdownRefs.current.get(openPopoverVersion);
        if (trigger?.contains(target) || dropdown?.contains(target)) return;
        setOpenPopoverVersion(null);
      }
      if (editingVersion) handleCancelRename();
      if (isComponentSelectorOpen) setIsComponentSelectorOpen(false);
      if (isOpen) setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [
    isOpen,
    openPopoverVersion,
    editingVersion,
    isComponentSelectorOpen,
    handleCancelRename,
  ]);

  // Handle keyboard navigation
  useEffect(() => {
    if (!isOpen || !containerRef.current) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (openPopoverVersion) {
          setOpenPopoverVersion(null);
          return;
        }
        if (isComponentSelectorOpen) {
          setIsComponentSelectorOpen(false);
          return;
        }
        if (editingVersion) {
          handleCancelRename();
        }
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    };
    containerRef.current.addEventListener("keydown", handleKeyDown);
    return () =>
      containerRef.current?.removeEventListener("keydown", handleKeyDown);
  }, [
    isOpen,
    openPopoverVersion,
    isComponentSelectorOpen,
    editingVersion,
    handleCancelRename,
  ]);

  // Format version label (v1 -> V1, v1_2 -> V1.2)
  const formatVersionLabel = (version: string) => {
    return version.replace(/^v/, "V").replace(/_/g, ".");
  };

  useEffect(() => {
    setIsMounted(true);
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
              className={styles.trigger}
              layout
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{
                duration: ANIMATION_DURATION,
                ease: ANIMATION_EASING,
              }}
            >
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
              <span className={styles.triggerSeparator}>/</span>
              <span className={styles.triggerVersion}>
                {activeVersion ? formatVersionLabel(activeVersion) : "-"}
              </span>
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
              {/* Component selector */}
              <button
                data-component-selector
                onClick={() =>
                  setIsComponentSelectorOpen(!isComponentSelectorOpen)
                }
                className={styles.componentSelector}
              >
                <motion.span
                  layoutId="component-name"
                  layout="position"
                  className={styles.componentSelectorLabel}
                  transition={{
                    duration: ANIMATION_DURATION,
                    ease: ANIMATION_EASING,
                  }}
                >
                  {selectedComponent || "Select component"}
                </motion.span>
                <svg
                  className={styles.componentSelectorIcon}
                  fill="none"
                  viewBox="0 0 16 16"
                >
                  <path
                    d="M6 4l4 4-4 4"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>

              <div className={styles.divider} />

              {/* Versions list */}
              <div className={styles.versionsList}>
                {versionKeys.length === 0 ? (
                  <div className={styles.emptyState}>No versions found</div>
                ) : (
                  versionKeys
                    .slice()
                    .reverse()
                    .map((key) => {
                      const isSelected = key === activeVersion;
                      const isEditing = editingVersion === key;

                      if (isEditing) {
                        return (
                          <div
                            key={key}
                            className={styles.versionItemEditing}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <input
                              ref={renameInputRef}
                              type="text"
                              value={renameValue}
                              onChange={(e) => setRenameValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  handleConfirmRename(key);
                                } else if (e.key === "Escape") {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  handleCancelRename();
                                }
                              }}
                              onClick={(e) => e.stopPropagation()}
                              className={styles.renameInput}
                              placeholder="e.g., v1, v2, v1_2"
                            />
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleConfirmRename(key);
                              }}
                              className={styles.confirmButton}
                              title="Confirm rename"
                            >
                              <svg
                                className={styles.confirmIcon}
                                fill="none"
                                viewBox="0 0 16 16"
                              >
                                <path
                                  d="M13.333 4L6 11.333 2.667 8"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </svg>
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCancelRename();
                              }}
                              className={styles.confirmButton}
                              title="Cancel rename"
                            >
                              <svg
                                className={styles.cancelIcon}
                                fill="none"
                                viewBox="0 0 16 16"
                              >
                                <path
                                  d="M4 4l8 8M12 4l-8 8"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </svg>
                            </button>
                          </div>
                        );
                      }

                      return (
                        <div
                          key={key}
                          role="option"
                          aria-selected={isSelected}
                          data-key={key}
                          onClick={() => {
                            setActiveVersion(key);
                            setIsOpen(false);
                            setOpenPopoverVersion(null);
                            triggerRef.current?.focus();
                          }}
                          className={styles.versionItem}
                        >
                          {/* Checkmark */}
                          <div className={styles.checkmarkContainer}>
                            {isSelected && (
                              <svg
                                className={styles.checkmarkIcon}
                                fill="none"
                                viewBox="0 0 16 16"
                              >
                                <path
                                  d="M13.333 4L6 11.333 2.667 8"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </svg>
                            )}
                          </div>
                          <div className={styles.versionLabel}>
                            {formatVersionLabel(key)}
                          </div>
                          {/* Action buttons */}
                          <div data-actions className={styles.actions}>
                            <button
                              onClick={(e) => handleDuplicateVersion(key, e)}
                              className={styles.actionButton}
                              title="Clone version"
                            >
                              <svg
                                className={styles.actionIcon}
                                fill="none"
                                viewBox="0 0 16 16"
                              >
                                <rect
                                  x="5.333"
                                  y="5.333"
                                  width="8"
                                  height="8"
                                  rx="1"
                                  stroke="currentColor"
                                  strokeWidth="1.5"
                                />
                                <path
                                  d="M10.667 2.667H2.667a1 1 0 0 0-1 1v8"
                                  stroke="currentColor"
                                  strokeWidth="1.5"
                                  strokeLinecap="round"
                                />
                              </svg>
                            </button>
                            <div className={styles.actionButtonMore}>
                              <button
                                ref={(el) => {
                                  if (el)
                                    popoverTriggerRefs.current.set(key, el);
                                  else popoverTriggerRefs.current.delete(key);
                                }}
                                onClick={(e) => handleTogglePopover(key, e)}
                                className={styles.actionButton}
                                title="More options"
                              >
                                <svg
                                  className={styles.actionIcon}
                                  fill="none"
                                  viewBox="0 0 16 16"
                                >
                                  <circle
                                    cx="8"
                                    cy="4"
                                    r="1"
                                    fill="currentColor"
                                  />
                                  <circle
                                    cx="8"
                                    cy="8"
                                    r="1"
                                    fill="currentColor"
                                  />
                                  <circle
                                    cx="8"
                                    cy="12"
                                    r="1"
                                    fill="currentColor"
                                  />
                                </svg>
                              </button>
                              {/* Popover menu */}
                              {openPopoverVersion === key && (
                                <div
                                  ref={(el) => {
                                    if (el)
                                      popoverDropdownRefs.current.set(key, el);
                                    else
                                      popoverDropdownRefs.current.delete(key);
                                  }}
                                  className={styles.popover}
                                  style={{
                                    left: `${popoverPositions.current.get(key)?.x || 0}px`,
                                    top: `${popoverPositions.current.get(key)?.y || 0}px`,
                                    visibility: "hidden",
                                  }}
                                  role="menu"
                                >
                                  <button
                                    onClick={(e) =>
                                      handlePromoteVersion(key, e)
                                    }
                                    className={styles.popoverMenuItem}
                                  >
                                    <svg
                                      className={styles.popoverMenuItemIcon}
                                      fill="none"
                                      viewBox="0 0 16 16"
                                    >
                                      <path
                                        d="M8 12V4M4 8l4-4 4 4"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                      />
                                    </svg>
                                    <span>Promote</span>
                                  </button>
                                  <button
                                    onClick={(e) => handleOpenInEditor(key, e)}
                                    className={styles.popoverMenuItem}
                                  >
                                    <svg
                                      className={styles.popoverMenuItemIcon}
                                      fill="none"
                                      viewBox="0 0 16 16"
                                    >
                                      <path
                                        d="M5.333 2.667H3.333a1.333 1.333 0 0 0-1.333 1.333v8a1.333 1.333 0 0 0 1.333 1.333h9.334a1.333 1.333 0 0 0 1.333-1.333V10M10.667 2.667h3.333M14 2.667v3.333M8 8l6-6"
                                        stroke="currentColor"
                                        strokeWidth="1.5"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                      />
                                    </svg>
                                    <span>Open in editor</span>
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteVersion(key, e);
                                      setOpenPopoverVersion(null);
                                    }}
                                    className={`${styles.popoverMenuItem} ${styles.popoverMenuItemDelete}`}
                                  >
                                    <svg
                                      className={styles.popoverMenuItemIcon}
                                      fill="none"
                                      viewBox="0 0 16 16"
                                    >
                                      <path
                                        d="M2 4h12M5.333 4V2.667a1.333 1.333 0 0 1 1.334-1.334h2.666a1.333 1.333 0 0 1 1.334 1.334V4m2 0v9.333a1.333 1.333 0 0 1-1.334 1.334H4.667a1.333 1.333 0 0 1-1.334-1.334V4h10.667z"
                                        stroke="currentColor"
                                        strokeWidth="1.5"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                      />
                                    </svg>
                                    <span>Delete</span>
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleRenameVersion(key, e);
                                      setOpenPopoverVersion(null);
                                    }}
                                    className={styles.popoverMenuItem}
                                  >
                                    <svg
                                      className={styles.popoverMenuItemIcon}
                                      fill="none"
                                      viewBox="0 0 16 16"
                                    >
                                      <path
                                        d="M11.333 2.667a1.414 1.414 0 0 1 2 2L6 12l-2.667.667L4 10.667l7.333-7.333z"
                                        stroke="currentColor"
                                        strokeWidth="1.5"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                      />
                                    </svg>
                                    <span>Rename</span>
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                )}
              </div>

              <div className={styles.divider} />

              {/* New version button */}
              <button
                onClick={(e) => {
                  handleNewVersion(e);
                  setIsOpen(false);
                  triggerRef.current?.focus();
                }}
                className={styles.newVersionButton}
                title="Create new version"
              >
                <div className={styles.newVersionIconContainer}>
                  <svg
                    className={styles.newVersionIcon}
                    fill="none"
                    viewBox="0 0 16 16"
                  >
                    <path
                      d="M8 3v10M3 8h10"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>
                <span>New version</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Component selector dropdown */}
      {isOpen && isComponentSelectorOpen && (
        <div
          ref={componentSelectorRef}
          className={styles.componentSelectorDropdown}
          style={{
            left: `${componentSelectorPosition.x}px`,
            top: `${componentSelectorPosition.y}px`,
            visibility: "hidden",
          }}
        >
          {mountedComponents.length === 0 ? (
            <div className={styles.emptyState}>No mounted components found</div>
          ) : (
            mountedComponents.map((component) => (
              <button
                key={component.name}
                onClick={() => {
                  setSelectedComponent(component.name);
                  setIsComponentSelectorOpen(false);
                }}
                className={`${styles.componentSelectorItem} ${
                  component.name === selectedComponent
                    ? styles.componentSelectorItemSelected
                    : ""
                }`}
              >
                <div className={styles.componentSelectorItemCheckmarkContainer}>
                  {component.name === selectedComponent && (
                    <svg
                      className={styles.componentSelectorItemCheckmark}
                      fill="none"
                      viewBox="0 0 16 16"
                    >
                      <path
                        d="M13.333 4L6 11.333 2.667 8"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </div>
                <span>{component.name}</span>
                <span className={styles.componentSelectorItemCount}>
                  {component.versions.length}
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </>,
    document.body,
  );
}
