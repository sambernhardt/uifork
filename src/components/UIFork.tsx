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
import { useLocalStorage } from "../hooks/useLocalStorage";
import { getMountedComponents, subscribe } from "../utils/componentRegistry";
import type { ComponentInfo, UIForkProps } from "../types";

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
  const dropdownRef = useRef<HTMLDivElement>(null);
  const componentSelectorRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
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

  // Position dropdown using floating-ui
  useEffect(() => {
    if (!isOpen || !triggerRef.current || !dropdownRef.current) return;
    const updatePosition = async () => {
      try {
        const { x, y } = await computePosition(
          triggerRef.current!,
          dropdownRef.current!,
          {
            placement: "top-end",
            strategy: "fixed",
            middleware: [
              offset(8),
              flip({
                fallbackPlacements: ["bottom-end", "top-start", "bottom-start"],
              }),
              shift({ padding: 20 }),
            ],
          },
        );
        setPosition({ x, y });
        if (dropdownRef.current)
          dropdownRef.current.style.visibility = "visible";
      } catch (error) {
        console.error("Error positioning dropdown:", error);
      }
    };
    if (dropdownRef.current) dropdownRef.current.style.visibility = "hidden";
    updatePosition();
    const cleanup = autoUpdate(
      triggerRef.current,
      dropdownRef.current,
      updatePosition,
      {
        ancestorScroll: true,
        ancestorResize: true,
        elementResize: true,
        layoutShift: true,
        animationFrame: false,
      },
    );
    return cleanup;
  }, [isOpen]);

  // Position component selector dropdown
  useEffect(() => {
    if (
      !isComponentSelectorOpen ||
      !dropdownRef.current ||
      !componentSelectorRef.current
    )
      return;
    const trigger = dropdownRef.current.querySelector(
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
        dropdownRef.current?.contains(target)
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
    if (!isOpen || !dropdownRef.current) return;
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
    dropdownRef.current.addEventListener("keydown", handleKeyDown);
    return () =>
      dropdownRef.current?.removeEventListener("keydown", handleKeyDown);
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
    setTimeout(() => {
      setIsMounted(true);
    }, 100);
  }, []);

  // Don't render if not in browser
  if (typeof window === "undefined") {
    return null;
  }

  return createPortal(
    <>
      {/* Trigger button */}
      <button
        suppressHydrationWarning
        ref={triggerRef}
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Select UI version"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        style={{
          position: "fixed",
          bottom: "20px",
          right: "20px",
          zIndex: 1000,
          display: "flex",
          alignItems: "center",
          gap: "8px",
          borderRadius: "8px",
          backgroundColor: "#262626",
          padding: "8px 12px",
          fontSize: "14px",
          color: "white",
          border: "none",
          cursor: "pointer",
          boxShadow:
            "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
        }}
      >
        {/* Connection status indicator */}
        <div
          style={{
            width: "8px",
            height: "8px",
            borderRadius: "50%",
            backgroundColor:
              connectionStatus === "connected"
                ? "#22c55e"
                : connectionStatus === "connecting"
                  ? "#eab308"
                  : "#ef4444",
          }}
          title={
            connectionStatus === "connected"
              ? "Connected to watch server"
              : connectionStatus === "connecting"
                ? "Connecting..."
                : "Disconnected from watch server"
          }
        />
        <span>{selectedComponent || "No component"}</span>
        <span style={{ color: "#a3a3a3" }}>/</span>
        <span>{activeVersion ? formatVersionLabel(activeVersion) : "-"}</span>
        <svg
          style={{
            width: "16px",
            height: "16px",
            transform: isOpen ? "rotate(180deg)" : "none",
            transition: "transform 0.2s",
          }}
          fill="none"
          viewBox="0 0 16 16"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M4 6l4 4 4-4"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {/* Dropdown menu */}
      {isOpen && (
        <div
          ref={dropdownRef}
          role="listbox"
          aria-label="UI version options"
          style={{
            position: "fixed",
            zIndex: 1001,
            minWidth: "200px",
            borderRadius: "8px",
            backgroundColor: "#262626",
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
            border: "1px solid #404040",
            padding: "4px",
            left: `${position.x}px`,
            top: `${position.y}px`,
            visibility: "hidden",
          }}
        >
          {/* Component selector */}
          <button
            data-component-selector
            onClick={() => setIsComponentSelectorOpen(!isComponentSelectorOpen)}
            style={{
              display: "flex",
              width: "100%",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "8px",
              padding: "8px 12px",
              fontSize: "14px",
              color: "white",
              backgroundColor: "transparent",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              textAlign: "left",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.backgroundColor = "#404040")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.backgroundColor = "transparent")
            }
          >
            <span style={{ fontWeight: 500 }}>
              {selectedComponent || "Select component"}
            </span>
            <svg
              style={{ width: "12px", height: "12px" }}
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

          <div style={{ borderTop: "1px solid #404040", margin: "4px 0" }} />

          {/* Versions list */}
          {versionKeys.length === 0 ? (
            <div
              style={{
                padding: "8px 12px",
                fontSize: "14px",
                color: "#a3a3a3",
              }}
            >
              No versions found
            </div>
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
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        padding: "8px 12px",
                      }}
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
                        style={{
                          flex: 1,
                          borderRadius: "4px",
                          backgroundColor: "#404040",
                          padding: "4px 8px",
                          fontSize: "14px",
                          color: "white",
                          border: "none",
                          outline: "none",
                        }}
                        placeholder="e.g., v1, v2, v1_2"
                      />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleConfirmRename(key);
                        }}
                        style={{
                          padding: "4px",
                          borderRadius: "4px",
                          backgroundColor: "transparent",
                          border: "none",
                          cursor: "pointer",
                        }}
                        title="Confirm rename"
                      >
                        <svg
                          style={{
                            width: "16px",
                            height: "16px",
                            color: "#22c55e",
                          }}
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
                        style={{
                          padding: "4px",
                          borderRadius: "4px",
                          backgroundColor: "transparent",
                          border: "none",
                          cursor: "pointer",
                        }}
                        title="Cancel rename"
                      >
                        <svg
                          style={{
                            width: "16px",
                            height: "16px",
                            color: "#ef4444",
                          }}
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
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      padding: "8px 12px",
                      fontSize: "14px",
                      color: "white",
                      backgroundColor: "transparent",
                      borderRadius: "4px",
                      cursor: "pointer",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = "#404040";
                      const actions = e.currentTarget.querySelector(
                        "[data-actions]",
                      ) as HTMLElement;
                      if (actions) actions.style.opacity = "1";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "transparent";
                      const actions = e.currentTarget.querySelector(
                        "[data-actions]",
                      ) as HTMLElement;
                      if (actions) actions.style.opacity = "0";
                    }}
                  >
                    {/* Checkmark */}
                    <div
                      style={{
                        width: "16px",
                        height: "16px",
                        flexShrink: 0,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {isSelected && (
                        <svg
                          style={{ width: "16px", height: "16px" }}
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
                    <div style={{ flex: 1 }}>{formatVersionLabel(key)}</div>
                    {/* Action buttons */}
                    <div
                      data-actions
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                        opacity: 0,
                        transition: "opacity 0.15s",
                      }}
                    >
                      <button
                        onClick={(e) => handleDuplicateVersion(key, e)}
                        style={{
                          padding: "4px",
                          borderRadius: "4px",
                          backgroundColor: "transparent",
                          border: "none",
                          cursor: "pointer",
                          color: "white",
                        }}
                        title="Clone version"
                      >
                        <svg
                          style={{ width: "14px", height: "14px" }}
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
                      <div style={{ position: "relative" }}>
                        <button
                          ref={(el) => {
                            if (el) popoverTriggerRefs.current.set(key, el);
                            else popoverTriggerRefs.current.delete(key);
                          }}
                          onClick={(e) => handleTogglePopover(key, e)}
                          style={{
                            padding: "4px",
                            borderRadius: "4px",
                            backgroundColor: "transparent",
                            border: "none",
                            cursor: "pointer",
                            color: "white",
                          }}
                          title="More options"
                        >
                          <svg
                            style={{ width: "14px", height: "14px" }}
                            fill="none"
                            viewBox="0 0 16 16"
                          >
                            <circle cx="8" cy="4" r="1" fill="currentColor" />
                            <circle cx="8" cy="8" r="1" fill="currentColor" />
                            <circle cx="8" cy="12" r="1" fill="currentColor" />
                          </svg>
                        </button>
                        {/* Popover menu */}
                        {openPopoverVersion === key && (
                          <div
                            ref={(el) => {
                              if (el) popoverDropdownRefs.current.set(key, el);
                              else popoverDropdownRefs.current.delete(key);
                            }}
                            style={{
                              position: "fixed",
                              zIndex: 1002,
                              minWidth: "140px",
                              borderRadius: "8px",
                              backgroundColor: "#262626",
                              boxShadow:
                                "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
                              border: "1px solid #404040",
                              padding: "4px",
                              left: `${popoverPositions.current.get(key)?.x || 0}px`,
                              top: `${popoverPositions.current.get(key)?.y || 0}px`,
                              visibility: "hidden",
                            }}
                            role="menu"
                          >
                            <button
                              onClick={(e) => handlePromoteVersion(key, e)}
                              style={{
                                display: "flex",
                                width: "100%",
                                alignItems: "center",
                                gap: "8px",
                                padding: "8px 12px",
                                fontSize: "14px",
                                color: "white",
                                backgroundColor: "transparent",
                                border: "none",
                                borderRadius: "4px",
                                cursor: "pointer",
                                textAlign: "left",
                              }}
                              onMouseEnter={(e) =>
                                (e.currentTarget.style.backgroundColor =
                                  "#404040")
                              }
                              onMouseLeave={(e) =>
                                (e.currentTarget.style.backgroundColor =
                                  "transparent")
                              }
                            >
                              <svg
                                style={{ width: "16px", height: "16px" }}
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
                              style={{
                                display: "flex",
                                width: "100%",
                                alignItems: "center",
                                gap: "8px",
                                padding: "8px 12px",
                                fontSize: "14px",
                                color: "white",
                                backgroundColor: "transparent",
                                border: "none",
                                borderRadius: "4px",
                                cursor: "pointer",
                                textAlign: "left",
                              }}
                              onMouseEnter={(e) =>
                                (e.currentTarget.style.backgroundColor =
                                  "#404040")
                              }
                              onMouseLeave={(e) =>
                                (e.currentTarget.style.backgroundColor =
                                  "transparent")
                              }
                            >
                              <svg
                                style={{ width: "16px", height: "16px" }}
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
                              style={{
                                display: "flex",
                                width: "100%",
                                alignItems: "center",
                                gap: "8px",
                                padding: "8px 12px",
                                fontSize: "14px",
                                color: "#f87171",
                                backgroundColor: "transparent",
                                border: "none",
                                borderRadius: "4px",
                                cursor: "pointer",
                                textAlign: "left",
                              }}
                              onMouseEnter={(e) =>
                                (e.currentTarget.style.backgroundColor =
                                  "#404040")
                              }
                              onMouseLeave={(e) =>
                                (e.currentTarget.style.backgroundColor =
                                  "transparent")
                              }
                            >
                              <svg
                                style={{ width: "16px", height: "16px" }}
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
                              style={{
                                display: "flex",
                                width: "100%",
                                alignItems: "center",
                                gap: "8px",
                                padding: "8px 12px",
                                fontSize: "14px",
                                color: "white",
                                backgroundColor: "transparent",
                                border: "none",
                                borderRadius: "4px",
                                cursor: "pointer",
                                textAlign: "left",
                              }}
                              onMouseEnter={(e) =>
                                (e.currentTarget.style.backgroundColor =
                                  "#404040")
                              }
                              onMouseLeave={(e) =>
                                (e.currentTarget.style.backgroundColor =
                                  "transparent")
                              }
                            >
                              <svg
                                style={{ width: "16px", height: "16px" }}
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

          <div style={{ borderTop: "1px solid #404040", margin: "4px 0" }} />

          {/* New version button */}
          <button
            onClick={(e) => {
              handleNewVersion(e);
              setIsOpen(false);
              triggerRef.current?.focus();
            }}
            style={{
              display: "flex",
              width: "100%",
              alignItems: "center",
              gap: "8px",
              padding: "8px 12px",
              fontSize: "14px",
              color: "white",
              backgroundColor: "transparent",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              textAlign: "left",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.backgroundColor = "#404040")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.backgroundColor = "transparent")
            }
            title="Create new version"
          >
            <div
              style={{
                width: "16px",
                height: "16px",
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <svg
                style={{ width: "16px", height: "16px" }}
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
        </div>
      )}

      {/* Component selector dropdown */}
      {isOpen && isComponentSelectorOpen && (
        <div
          ref={componentSelectorRef}
          style={{
            position: "fixed",
            zIndex: 1002,
            minWidth: "160px",
            borderRadius: "8px",
            backgroundColor: "#262626",
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
            border: "1px solid #404040",
            padding: "4px",
            left: `${componentSelectorPosition.x}px`,
            top: `${componentSelectorPosition.y}px`,
            visibility: "hidden",
          }}
        >
          {mountedComponents.length === 0 ? (
            <div
              style={{
                padding: "8px 12px",
                fontSize: "14px",
                color: "#a3a3a3",
              }}
            >
              No mounted components found
            </div>
          ) : (
            mountedComponents.map((component) => (
              <button
                key={component.name}
                onClick={() => {
                  setSelectedComponent(component.name);
                  setIsComponentSelectorOpen(false);
                }}
                style={{
                  display: "flex",
                  width: "100%",
                  alignItems: "center",
                  gap: "8px",
                  padding: "8px 12px",
                  fontSize: "14px",
                  color: "white",
                  backgroundColor:
                    component.name === selectedComponent
                      ? "#404040"
                      : "transparent",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                  textAlign: "left",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.backgroundColor = "#404040")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.backgroundColor =
                    component.name === selectedComponent
                      ? "#404040"
                      : "transparent")
                }
              >
                <div
                  style={{
                    width: "16px",
                    height: "16px",
                    flexShrink: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {component.name === selectedComponent && (
                    <svg
                      style={{ width: "16px", height: "16px" }}
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
                <span
                  style={{
                    marginLeft: "auto",
                    color: "#a3a3a3",
                    fontSize: "12px",
                  }}
                >
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
