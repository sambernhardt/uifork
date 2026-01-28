import {
  autoUpdate,
  computePosition,
  flip,
  offset,
  shift,
} from "@floating-ui/dom";
import React, {
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

// Simple useLocalStorage hook
function useLocalStorage<T>(
  key: string,
  initialValue: T,
  syncAcrossTabs = false,
): [T, (value: T | ((val: T) => T)) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === "undefined") {
      return initialValue;
    }
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  const setValue = useCallback(
    (value: T | ((val: T) => T)) => {
      try {
        setStoredValue((currentValue) => {
          const valueToStore =
            value instanceof Function ? value(currentValue) : value;
          if (typeof window !== "undefined") {
            window.localStorage.setItem(key, JSON.stringify(valueToStore));
            if (syncAcrossTabs) {
              window.dispatchEvent(
                new StorageEvent("storage", {
                  key,
                  newValue: JSON.stringify(valueToStore),
                }),
              );
            }
          }
          return valueToStore;
        });
      } catch (error) {
        console.error(`Error setting localStorage key "${key}":`, error);
      }
    },
    [key, syncAcrossTabs],
  );

  useEffect(() => {
    if (!syncAcrossTabs) return;

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === key && e.newValue) {
        try {
          setStoredValue(JSON.parse(e.newValue));
        } catch (error) {
          console.error(
            `Error parsing localStorage value for "${key}":`,
            error,
          );
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [key, syncAcrossTabs]);

  return [storedValue, setValue];
}

type VersionType<T extends Record<string, unknown>> = {
  render: (props: T) => ReactNode;
  description?: string;
  label: string;
};

type VersionsType<T extends Record<string, unknown>> = {
  [key: string]: VersionType<T>;
};

type UISwitcherProps<T extends Record<string, unknown>> = {
  id: string;
  versions: VersionsType<T>;
  defaultVersion?: string;
  props: T;
  showSwitcher?: boolean;
};

export const UISwitcher = <T extends Record<string, unknown>>({
  id,
  versions,
  defaultVersion,
  props,
  showSwitcher = true,
}: UISwitcherProps<T>) => {
  const versionKeys = Object.keys(versions);
  const [activeVersion, setActiveVersion] = useLocalStorage<string>(
    id,
    defaultVersion || versionKeys[0],
    true,
  );
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [wsConnection, setWsConnection] = useState<WebSocket | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<
    "connected" | "disconnected" | "connecting"
  >("disconnected");
  const [editingVersion, setEditingVersion] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState<string>("");
  const renameInputRef = useRef<HTMLInputElement>(null);
  const editingVersionRef = useRef<string | null>(null);
  const previousVersionKeysRef = useRef<Set<string>>(new Set());
  const versionsRef = useRef(versions);
  const idRef = useRef(id);
  const activeVersionRef = useRef(activeVersion);
  const [openPopoverVersion, setOpenPopoverVersion] = useState<string | null>(
    null,
  );
  const popoverTriggerRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const popoverDropdownRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const popoverPositions = useRef<Map<string, { x: number; y: number }>>(
    new Map(),
  );

  // Keep editingVersion ref updated
  useEffect(() => {
    editingVersionRef.current = editingVersion;
  }, [editingVersion]);

  // Keep refs updated
  useEffect(() => {
    versionsRef.current = versions;
    idRef.current = id;
    activeVersionRef.current = activeVersion;
  }, [versions, id, activeVersion]);

  // Initialize previous version keys and check for pending versions on mount
  useEffect(() => {
    previousVersionKeysRef.current = new Set(versionKeys);

    // Check if there's a pending version from before hot reload
    const pendingVersionKey = `${id}-pending-version`;
    try {
      const pendingVersion = localStorage.getItem(pendingVersionKey);
      if (pendingVersion && versionKeys.includes(pendingVersion)) {
        setActiveVersion(pendingVersion);
        localStorage.removeItem(pendingVersionKey);
      }
    } catch (error) {
      // Ignore localStorage errors
    }
  }, []); // Only run on mount

  useEffect(() => {
    if (!versionKeys.includes(activeVersion)) {
      setActiveVersion(versionKeys[0]);
    }
  }, [activeVersion, versionKeys, setActiveVersion]);

  // Activate newly created/cloned version when it becomes available
  useEffect(() => {
    const currentVersionSet = new Set(versionKeys);
    const previousVersionSet = previousVersionKeysRef.current;

    // Find newly added versions
    const newVersions = versionKeys.filter(
      (key) => !previousVersionSet.has(key),
    );

    // If there's a new version and it's not already active, activate it
    if (newVersions.length > 0) {
      // Check localStorage for a pending version that should be activated
      const pendingVersionKey = `${id}-pending-version`;
      try {
        const pendingVersion = localStorage.getItem(pendingVersionKey);
        if (pendingVersion && versionKeys.includes(pendingVersion)) {
          setActiveVersion(pendingVersion);
          localStorage.removeItem(pendingVersionKey);
        } else if (newVersions.length === 1) {
          // If only one new version was added, activate it
          setActiveVersion(newVersions[0]);
        }
      } catch (error) {
        // If localStorage fails, just activate the first new version
        if (newVersions.length > 0) {
          setActiveVersion(newVersions[0]);
        }
      }
    }

    // Update the previous version keys set
    previousVersionKeysRef.current = currentVersionSet;
  }, [versionKeys, id, setActiveVersion]);

  // WebSocket connection management
  useEffect(() => {
    // Port can be configured via window.__UIFORK_PORT__ or defaults to 3001
    const port =
      (typeof window !== "undefined" &&
        (window as { __UIFORK_PORT__?: string }).__UIFORK_PORT__) ||
      "3001";
    const wsUrl = `ws://localhost:${port}/ws`;

    setConnectionStatus("connecting");
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      setConnectionStatus("connected");
      setWsConnection(ws);
    };

    ws.onclose = () => {
      setConnectionStatus("disconnected");
      setWsConnection(null);
    };

    ws.onerror = (error) => {
      console.error("[UISwitcher] WebSocket error:", error);
      setConnectionStatus("disconnected");
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        // Handle server messages (ack, error, file_changed)
        if (data.type === "file_changed") {
          // File system changed - versions file was regenerated
          // The effect hook will detect new versions and activate them
          console.log("[UISwitcher] File changed:", data.payload);
        } else if (data.type === "ack" && data.payload?.version) {
          // When a new version is created, duplicated, or renamed, switch to it
          const message = data.payload.message || "";

          // Determine which version to activate based on the operation type
          let versionToActivate: string | null = null;
          const oldVersion = data.payload.version;
          const newVersion = data.payload.newVersion;

          if (message.includes("duplicated")) {
            // For duplicate: activate the new target version
            versionToActivate = data.payload.version;
          } else if (message.includes("created new version")) {
            // For new version: activate the newly created version
            versionToActivate = data.payload.version;
          } else if (message.includes("renamed") && newVersion) {
            // For rename: activate the new version name
            versionToActivate = newVersion;

            // Check if the renamed version was the active one
            if (activeVersionRef.current === oldVersion) {
              // The renamed version was active, so we definitely need to switch to the new version
              console.log(
                `[UISwitcher] Active version ${oldVersion} was renamed to ${newVersion}, switching...`,
              );
            }
          }
          // For delete operations, we don't activate anything

          if (versionToActivate) {
            // Store in localStorage so it survives hot reloads
            // The effect hook will check this when versionKeys updates
            const pendingVersionKey = `${idRef.current}-pending-version`;
            try {
              localStorage.setItem(pendingVersionKey, versionToActivate);
              // Also try to activate immediately if the version is already available
              // (in case the versions prop updates before file_changed)
              const currentVersionKeys = Object.keys(versionsRef.current);
              if (currentVersionKeys.includes(versionToActivate)) {
                setActiveVersion(versionToActivate);
                localStorage.removeItem(pendingVersionKey);
              }
            } catch (error) {
              console.error(
                "[UISwitcher] Error storing pending version:",
                error,
              );
            }
          }
        } else if (data.type === "error") {
          // Handle error messages from server
          const errorMessage = data.payload?.message || "Unknown error";
          console.error("[UISwitcher] Server error:", errorMessage);

          // If we're in rename mode and got an error, cancel the rename
          if (editingVersionRef.current) {
            setEditingVersion(null);
            setRenameValue("");
          }
        }
      } catch (error) {
        console.error("[UISwitcher] Error parsing WebSocket message:", error);
      }
    };

    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, [setActiveVersion, setEditingVersion, setRenameValue]);

  // Send WebSocket message helper
  const sendWebSocketMessage = useCallback(
    (
      type:
        | "duplicate_version"
        | "delete_version"
        | "new_version"
        | "rename_version",
      payload: Record<string, unknown>,
    ) => {
      if (wsConnection && wsConnection.readyState === WebSocket.OPEN) {
        wsConnection.send(JSON.stringify({ type, payload }));
      } else {
        console.warn(
          "[UISwitcher] WebSocket not connected, cannot send message",
        );
      }
    },
    [wsConnection],
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

  // Helper function to normalize version key input
  const normalizeVersionKey = (input: string): string | null => {
    if (!input || typeof input !== "string") return null;

    // Remove any leading/trailing whitespace and convert to lowercase
    let normalized = input.trim().toLowerCase();

    if (!normalized) return null;

    // Remove any 'v' prefix if present, then add lowercase 'v'
    // This ensures we always have lowercase 'v'
    normalized = normalized.replace(/^v+/i, ""); // Remove any v/V prefix

    // Convert dots to underscores (e.g., "2.2" -> "2_2")
    // This allows users to input v2.2 format which is more intuitive
    normalized = normalized.replace(/\./g, "_");

    normalized = "v" + normalized; // Add lowercase v prefix

    // Validate format: v{number}[_{number}]
    const versionKeyPattern = /^v\d+(_\d+)?$/;
    if (!versionKeyPattern.test(normalized)) {
      return null;
    }

    return normalized;
  };

  const handleRenameVersion = (version: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingVersion(version);
    // Show the version key (e.g., "v1") instead of the label for editing
    setRenameValue(version);
  };

  const handleConfirmRename = useCallback(
    (version: string) => {
      const trimmedValue = renameValue.trim();

      // Normalize the input to a valid version key format
      const normalizedVersion = normalizeVersionKey(trimmedValue);

      if (!normalizedVersion) {
        // Invalid format - could show an error message here
        console.error(
          "[UISwitcher] Invalid version format. Expected format: v1, v2, v2.2, v1_2, etc.",
        );
        setEditingVersion(null);
        setRenameValue("");
        return;
      }

      if (normalizedVersion === version) {
        // No change - cancel
        setEditingVersion(null);
        setRenameValue("");
        return;
      }

      // Check if the new version key already exists
      if (versionKeys.includes(normalizedVersion)) {
        console.error(
          `[UISwitcher] Version ${normalizedVersion} already exists`,
        );
        setEditingVersion(null);
        setRenameValue("");
        return;
      }

      // Send rename message via WebSocket
      // Ensure we're sending a normalized version key (lowercase 'v')
      console.log(
        `[UISwitcher] Renaming ${version} to ${normalizedVersion} (normalized from "${trimmedValue}")`,
      );

      sendWebSocketMessage("rename_version", {
        version,
        newVersion: normalizedVersion,
      });

      setEditingVersion(null);
      setRenameValue("");
    },
    [renameValue, versions, versionKeys, sendWebSocketMessage],
  );

  const handleCancelRename = useCallback(() => {
    setEditingVersion(null);
    setRenameValue("");
  }, []);

  const handleNewVersion = (e: React.MouseEvent) => {
    e.stopPropagation();
    sendWebSocketMessage("new_version", {});
  };

  const handlePromoteVersion = (version: string, e: React.MouseEvent) => {
    e.stopPropagation();
    // TODO: Wire up promote functionality
    console.log("[UISwitcher] Promote version:", version);
    setOpenPopoverVersion(null);
  };

  const handleTogglePopover = (version: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setOpenPopoverVersion(openPopoverVersion === version ? null : version);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!e.metaKey) return;

      const currentIndex = versionKeys.indexOf(activeVersion);

      if (e.key === "ArrowDown") {
        e.preventDefault();
        const prevIndex = currentIndex - 1;
        const newVersion =
          versionKeys[prevIndex >= 0 ? prevIndex : versionKeys.length - 1];
        setActiveVersion(newVersion);
      }

      if (e.key === "ArrowUp") {
        e.preventDefault();
        const nextIndex = currentIndex + 1;
        const newVersion =
          versionKeys[nextIndex < versionKeys.length ? nextIndex : 0];
        setActiveVersion(newVersion);
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
              shift({
                padding: 20,
              }),
            ],
          },
        );

        setPosition({ x, y });
        // Make dropdown visible after positioning
        if (dropdownRef.current) {
          dropdownRef.current.style.visibility = "visible";
        }
      } catch (error) {
        console.error("Error positioning dropdown:", error);
      }
    };

    // Set initial hidden state
    if (dropdownRef.current) {
      dropdownRef.current.style.visibility = "hidden";
    }

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

  // Position popover menus using floating-ui
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
            shift({
              padding: 8,
            }),
          ],
        });

        popoverPositions.current.set(openPopoverVersion, { x, y });
        // Make dropdown visible after positioning
        dropdown.style.visibility = "visible";
      } catch (error) {
        console.error("Error positioning popover:", error);
      }
    };

    // Set initial hidden state
    dropdown.style.visibility = "hidden";

    updatePosition();

    const cleanup = autoUpdate(trigger, dropdown, updatePosition, {
      ancestorScroll: true,
      ancestorResize: true,
      elementResize: true,
      layoutShift: true,
      animationFrame: false,
    });

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
    if (!isOpen && !openPopoverVersion) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;

      // Check main dropdown
      if (
        triggerRef.current?.contains(target) ||
        dropdownRef.current?.contains(target)
      ) {
        return;
      }

      // Check popover dropdowns
      if (openPopoverVersion) {
        const trigger = popoverTriggerRefs.current.get(openPopoverVersion);
        const dropdown = popoverDropdownRefs.current.get(openPopoverVersion);
        if (trigger?.contains(target) || dropdown?.contains(target)) {
          return;
        }
        setOpenPopoverVersion(null);
      }

      // Cancel any ongoing rename when closing dropdown
      if (editingVersion) {
        handleCancelRename();
      }
      if (isOpen) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, openPopoverVersion, editingVersion, handleCancelRename]);

  // Handle keyboard navigation within dropdown
  useEffect(() => {
    if (!isOpen || !dropdownRef.current) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        // Close popover if open
        if (openPopoverVersion) {
          setOpenPopoverVersion(null);
          return;
        }
        // Cancel any ongoing rename when closing dropdown
        if (editingVersion) {
          handleCancelRename();
        }
        setIsOpen(false);
        triggerRef.current?.focus();
        return;
      }

      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        const options = Array.from(
          dropdownRef.current!.querySelectorAll<HTMLElement>('[role="option"]'),
        );
        const currentIndex = options.findIndex(
          (opt) => opt.getAttribute("aria-selected") === "true",
        );

        let nextIndex: number;
        if (e.key === "ArrowDown") {
          nextIndex = currentIndex < options.length - 1 ? currentIndex + 1 : 0;
        } else {
          nextIndex = currentIndex > 0 ? currentIndex - 1 : options.length - 1;
        }

        options[nextIndex]?.focus();
        setActiveVersion(versionKeys.toReversed()[nextIndex]);
      }

      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        const focused = document.activeElement as HTMLElement;
        const optionKey = focused?.getAttribute("data-key");
        if (optionKey) {
          setActiveVersion(optionKey);
          setIsOpen(false);
          triggerRef.current?.focus();
        }
      }
    };

    dropdownRef.current.addEventListener("keydown", handleKeyDown);
    return () => {
      dropdownRef.current?.removeEventListener("keydown", handleKeyDown);
    };
  }, [
    isOpen,
    versionKeys,
    setActiveVersion,
    editingVersion,
    handleCancelRename,
    openPopoverVersion,
  ]);

  const Version =
    versions[activeVersion]?.render || versions[versionKeys[0]].render;

  const activeVersionLabel = versions[activeVersion]?.label || versionKeys[0];

  return (
    <>
      <Version {...props} />
      {showSwitcher &&
        createPortal(
          <>
            {/* Trigger button */}
            <button
              ref={triggerRef}
              onClick={() => setIsOpen(!isOpen)}
              aria-label="Select UI version"
              aria-expanded={isOpen}
              aria-haspopup="listbox"
              className="fixed bottom-5 right-5 z-[1000] flex items-center gap-2 rounded-lg bg-neutral-800 px-3 py-2 text-sm text-white shadow-lg transition-colors hover:bg-neutral-700 focus:outline-none focus:ring-2 focus:ring-neutral-500 focus:ring-offset-2 focus:ring-offset-neutral-900"
            >
              {/* Connection status indicator */}
              <div
                className={`h-2 w-2 rounded-full ${
                  connectionStatus === "connected"
                    ? "bg-green-500"
                    : connectionStatus === "connecting"
                      ? "bg-yellow-500"
                      : "bg-red-500"
                }`}
                title={
                  connectionStatus === "connected"
                    ? "Connected to watch server"
                    : connectionStatus === "connecting"
                      ? "Connecting..."
                      : "Disconnected from watch server"
                }
              />
              <span>{activeVersionLabel}</span>
              <svg
                className={`h-4 w-4 transition-transform ${
                  isOpen ? "rotate-180" : ""
                }`}
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
                className="fixed z-[1001] min-w-[120px] rounded-lg bg-neutral-800 shadow-xl border border-neutral-700 p-1"
                style={{
                  left: `${position.x}px`,
                  top: `${position.y}px`,
                  visibility: "hidden",
                }}
              >
                {versionKeys.toReversed().map((key) => {
                  const isSelected = key === activeVersion;
                  const isEditing = editingVersion === key;

                  if (isEditing) {
                    return (
                      <div
                        key={key}
                        className="flex w-full items-center gap-2 px-3 py-2"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {/* Input */}
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
                          className="flex-1 rounded bg-neutral-700 px-2 py-1 text-sm text-white focus:outline-none focus:ring-2 focus:ring-neutral-500"
                          placeholder="e.g., v1, v2, v1_2"
                        />
                        {/* Check button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleConfirmRename(key);
                          }}
                          className="p-1 rounded hover:bg-green-600/20 transition-colors flex-shrink-0"
                          title="Confirm rename"
                          aria-label="Confirm rename"
                        >
                          <svg
                            className="h-4 w-4 text-green-500"
                            fill="none"
                            viewBox="0 0 16 16"
                            xmlns="http://www.w3.org/2000/svg"
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
                        {/* Cancel button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCancelRename();
                          }}
                          className="p-1 rounded hover:bg-red-600/20 transition-colors flex-shrink-0"
                          title="Cancel rename"
                          aria-label="Cancel rename"
                        >
                          <svg
                            className="h-4 w-4 text-red-500"
                            fill="none"
                            viewBox="0 0 16 16"
                            xmlns="http://www.w3.org/2000/svg"
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
                    <button
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
                      className="group flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-white transition-colors hover:bg-neutral-700 focus:bg-neutral-700 focus:outline-none rounded"
                    >
                      {/* Checkmark icon container - matches plus icon container dimensions */}
                      <div className="h-4 w-4 flex-shrink-0 flex items-center justify-center">
                        {isSelected && (
                          <svg
                            className="h-4 w-4"
                            fill="none"
                            viewBox="0 0 16 16"
                            xmlns="http://www.w3.org/2000/svg"
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
                      <div className="flex flex-col flex-1 min-w-0">
                        <div>{versions[key].label}</div>
                        {versions[key].description && (
                          <div className="text-xs text-neutral-400">
                            {versions[key].description}
                          </div>
                        )}
                      </div>
                      {/* Action buttons */}
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {/* Clone button */}
                        <button
                          onClick={(e) => handleDuplicateVersion(key, e)}
                          className="p-1 rounded hover:bg-neutral-600 transition-colors"
                          title="Clone version"
                          aria-label={`Clone ${key}`}
                        >
                          <svg
                            className="h-3.5 w-3.5"
                            fill="none"
                            viewBox="0 0 16 16"
                            xmlns="http://www.w3.org/2000/svg"
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
                        {/* 3-dot menu button */}
                        <div className="relative">
                          <button
                            ref={(el) => {
                              if (el) {
                                popoverTriggerRefs.current.set(key, el);
                              } else {
                                popoverTriggerRefs.current.delete(key);
                              }
                            }}
                            onClick={(e) => handleTogglePopover(key, e)}
                            className="p-1 rounded hover:bg-neutral-600 transition-colors"
                            title="More options"
                            aria-label={`More options for ${key}`}
                            aria-expanded={openPopoverVersion === key}
                          >
                            <svg
                              className="h-3.5 w-3.5"
                              fill="none"
                              viewBox="0 0 16 16"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <circle cx="8" cy="4" r="1" fill="currentColor" />
                              <circle cx="8" cy="8" r="1" fill="currentColor" />
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
                                if (el) {
                                  popoverDropdownRefs.current.set(key, el);
                                } else {
                                  popoverDropdownRefs.current.delete(key);
                                }
                              }}
                              className="fixed z-[1002] min-w-[120px] rounded-lg bg-neutral-800 shadow-xl border border-neutral-700 p-1"
                              style={{
                                left: `${popoverPositions.current.get(key)?.x || 0}px`,
                                top: `${popoverPositions.current.get(key)?.y || 0}px`,
                                visibility: "hidden",
                              }}
                              role="menu"
                            >
                              {/* Promote option */}
                              <button
                                onClick={(e) => handlePromoteVersion(key, e)}
                                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-white transition-colors hover:bg-neutral-700 focus:bg-neutral-700 focus:outline-none rounded"
                                role="menuitem"
                              >
                                <svg
                                  className="h-4 w-4"
                                  fill="none"
                                  viewBox="0 0 16 16"
                                  xmlns="http://www.w3.org/2000/svg"
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
                              {/* Delete option */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteVersion(key, e);
                                  setOpenPopoverVersion(null);
                                }}
                                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-400 transition-colors hover:bg-neutral-700 focus:bg-neutral-700 focus:outline-none rounded"
                                role="menuitem"
                              >
                                <svg
                                  className="h-4 w-4"
                                  fill="none"
                                  viewBox="0 0 16 16"
                                  xmlns="http://www.w3.org/2000/svg"
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
                              {/* Rename option */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRenameVersion(key, e);
                                  setOpenPopoverVersion(null);
                                }}
                                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-white transition-colors hover:bg-neutral-700 focus:bg-neutral-700 focus:outline-none rounded"
                                role="menuitem"
                              >
                                <svg
                                  className="h-4 w-4"
                                  fill="none"
                                  viewBox="0 0 16 16"
                                  xmlns="http://www.w3.org/2000/svg"
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
                    </button>
                  );
                })}
                {/* Divider */}
                <div className="border-t border-neutral-700 my-1" />
                {/* New version button */}
                <button
                  onClick={(e) => {
                    handleNewVersion(e);
                    setIsOpen(false);
                    triggerRef.current?.focus();
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-white transition-colors hover:bg-neutral-700 focus:bg-neutral-700 focus:outline-none rounded"
                  title="Create new version"
                >
                  {/* Plus icon container - matches checkmark icon container dimensions */}
                  <div className="h-4 w-4 flex-shrink-0 flex items-center justify-center">
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 16 16"
                      xmlns="http://www.w3.org/2000/svg"
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
          </>,
          document.body,
        )}
    </>
  );
};
