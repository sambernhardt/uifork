import React, { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import {
  autoUpdate,
  computePosition,
  flip,
  offset,
  shift,
} from "@floating-ui/dom";
import styles from "./UIFork.module.css";
import {
  SourceInfo,
  ComponentStackFrame,
  findElementFromStackFrame,
  getSourceFromElement,
  getComponentStackWithContext,
} from "../utils/sourceTracing";
import { GitForkIcon } from "./icons/GitForkIcon";
import { SelectorIcon } from "./icons/SelectorIcon";
import type { WebSocketMessageType } from "../hooks/useWebSocketConnection";

export interface ComponentStackContext {
  above: ComponentStackFrame | null;
  current: ComponentStackFrame | null;
  below: ComponentStackFrame | null;
  all: ComponentStackFrame[];
}

export interface ElementSelectionOverlayProps {
  /** The element currently being hovered */
  hoveredElement: Element | null;
  /** Source info for the hovered element */
  hoveredSourceInfo: SourceInfo | null;
  /** The element that was selected (takes priority over hovered) */
  selectedElement: Element | null;
  /** Source info for the selected element */
  selectedSourceInfo: SourceInfo | null;
  /** Component stack context for the selected element */
  selectedComponentStack: ComponentStackContext | null;
  /** Whether selection mode is active */
  isActive: boolean;
  /** Callback when a component in the stack is selected */
  onStackItemSelect?: (element: Element, frame: ComponentStackFrame) => void;
  /** Function to send websocket messages */
  sendMessage?: (
    type: WebSocketMessageType,
    payload: Record<string, unknown>
  ) => void;
  /** Callback to clear selection and exit selection mode */
  onForkComplete?: (componentName: string) => void;
}

/**
 * Overlay component that shows a highlight box around the hovered or selected element
 */
export function ElementSelectionOverlay({
  hoveredElement,
  hoveredSourceInfo,
  selectedElement,
  selectedSourceInfo,
  selectedComponentStack,
  isActive,
  onStackItemSelect,
  sendMessage,
  onForkComplete,
}: ElementSelectionOverlayProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [hoveredItemIndex, setHoveredItemIndex] = useState<number | null>(null);
  const itemRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const sourcePopoverRef = useRef<HTMLDivElement | null>(null);
  const sourceButtonRef = useRef<HTMLButtonElement | null>(null);
  const forkButtonRef = useRef<HTMLButtonElement | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const [bounds, setBounds] = useState<DOMRect | null>(null);
  const [opacity, setOpacity] = useState(0);

  // Use selected element if available, otherwise use hovered element
  const targetElement = selectedElement || hoveredElement;

  // Close dropdown when selection changes
  useEffect(() => {
    if (!selectedElement) {
      setIsDropdownOpen(false);
      setHoveredItemIndex(null);
    }
  }, [selectedElement]);

  // Update bounds and opacity based on active state and target element
  useEffect(() => {
    if (!isActive || !targetElement) {
      // Fade out before clearing bounds
      setOpacity(0);
      const timeout = setTimeout(() => {
        setBounds(null);
      }, 150); // Match transition duration
      return () => clearTimeout(timeout);
    }

    // Set bounds first, then fade in
    const updateBounds = () => {
      const rect = targetElement.getBoundingClientRect();
      setBounds(rect);
      // Fade in after bounds are set
      requestAnimationFrame(() => {
        setOpacity(1);
      });
    };

    updateBounds();

    // Update bounds on scroll/resize
    window.addEventListener("scroll", updateBounds, true);
    window.addEventListener("resize", updateBounds);

    return () => {
      window.removeEventListener("scroll", updateBounds, true);
      window.removeEventListener("resize", updateBounds);
    };
  }, [targetElement, isActive]);

  // Position dropdown popover relative to source button using Floating UI
  useEffect(() => {
    if (!isDropdownOpen || !sourceButtonRef.current || !dropdownRef.current) {
      return;
    }

    const triggerElement = sourceButtonRef.current;
    const dropdownElement = dropdownRef.current;

    let cancelled = false;

    const updatePosition = async () => {
      if (cancelled) return;
      try {
        const { x, y } = await computePosition(
          triggerElement,
          dropdownElement,
          {
            placement: "bottom-start",
            strategy: "fixed",
            middleware: [
              offset(4),
              flip({
                fallbackPlacements: ["bottom-end", "top-start", "top-end"],
              }),
              shift({ padding: 8 }),
            ],
          }
        );
        if (!cancelled) {
          dropdownElement.style.left = `${x}px`;
          dropdownElement.style.top = `${y}px`;
          dropdownElement.style.visibility = "visible";
        }
      } catch (error) {
        // Error positioning dropdown
      }
    };

    dropdownElement.style.visibility = "hidden";
    updatePosition();
    const cleanup = autoUpdate(triggerElement, dropdownElement, updatePosition);

    return () => {
      cancelled = true;
      cleanup();
      // Hide dropdown when effect cleans up
      if (dropdownElement) {
        dropdownElement.style.visibility = "hidden";
      }
    };
  }, [isDropdownOpen]);

  // Position source popover below hovered dropdown item using Floating UI
  useEffect(() => {
    if (
      hoveredItemIndex === null ||
      !isDropdownOpen ||
      !sourcePopoverRef.current
    ) {
      return;
    }

    const triggerElement = itemRefs.current.get(hoveredItemIndex);
    const popoverElement = sourcePopoverRef.current;

    if (!triggerElement || !popoverElement) {
      return;
    }

    let cancelled = false;

    const updatePosition = async () => {
      if (cancelled) return;
      try {
        const { x, y } = await computePosition(triggerElement, popoverElement, {
          placement: "bottom-start",
          strategy: "fixed",
          middleware: [
            offset(4),
            flip({
              fallbackPlacements: ["bottom-end", "top-start", "top-end"],
            }),
            shift({ padding: 8 }),
          ],
        });
        if (!cancelled) {
          popoverElement.style.left = `${x}px`;
          popoverElement.style.top = `${y}px`;
          popoverElement.style.visibility = "visible";
        }
      } catch (error) {
        // Error positioning popover
      }
    };

    popoverElement.style.visibility = "hidden";
    updatePosition();
    const cleanup = autoUpdate(triggerElement, popoverElement, updatePosition);

    return () => {
      cancelled = true;
      cleanup();
      // Hide popover when effect cleans up
      if (popoverElement) {
        popoverElement.style.visibility = "hidden";
      }
    };
  }, [hoveredItemIndex, isDropdownOpen]);

  // Early return after all hooks have been called
  if (!isActive || !targetElement || !bounds) {
    return null;
  }

  const portalRoot = document.getElementById("uifork-root") || document.body;

  // Add 2px padding/offset around the element
  const padding = 2;
  const highlightBounds = {
    left: bounds.left - padding,
    top: bounds.top - padding,
    width: bounds.width + padding * 2,
    height: bounds.height + padding * 2,
  };

  // Show source info above only when hovering (not when selected)
  const showSourceInfo =
    !selectedElement && hoveredElement && hoveredSourceInfo?.filePath;

  // Show dropdown when element is selected (replaces the source info)
  const showDropdown = selectedElement && selectedComponentStack;

  // Build stack items for dropdown - show all frames in the stack with hierarchy
  const stackItems: Array<{
    label: string;
    filePath: string | null;
    componentName: string | null;
    isCurrent: boolean;
    index: number;
    level: number; // Hierarchy level for indentation
    isChild: boolean; // Whether this is a child component
    frame: ComponentStackFrame; // Store the full frame for element lookup
  }> = [];

  if (selectedComponentStack) {
    // Use the full stack if available, otherwise fall back to above/current/below
    const allFrames = selectedComponentStack.all || [];

    if (allFrames.length > 0) {
      // Determine which component is marked as CURRENT (may not be index 0)
      const currentFrame = selectedComponentStack.current;
      const currentIndex = currentFrame
        ? allFrames.findIndex(
            (f) =>
              f.componentName === currentFrame.componentName &&
              f.filePath === currentFrame.filePath
          )
        : 0;

      // Reverse the stack to show root -> parents -> current (most indented)
      // The stack goes from DOM element's component (index 0) to root (last index)
      // We want to display: root (least indented) -> parents -> current (most indented)
      const reversedFrames = [...allFrames].reverse();

      // Show all frames, marking the one that matches currentFrame as CURRENT
      reversedFrames.forEach((frame: ComponentStackFrame, index: number) => {
        const originalIndex = allFrames.length - 1 - index;
        // Check if this frame matches the current frame (not just index 0)
        const isCurrent =
          currentFrame &&
          frame.componentName === currentFrame.componentName &&
          frame.filePath === currentFrame.filePath;
        const isRoot = index === 0; // The reversed first item is root
        const isParent = !isCurrent && !isRoot;

        // Calculate hierarchy level based on position in reversed stack
        // Level 0 = Root (no indent)
        // Level increases for each parent
        // Current gets the highest level (most indented)
        const level = isCurrent
          ? allFrames.length - 1 // Current is most indented
          : index; // Others based on their position

        let label = "";
        if (isCurrent) {
          label = "CURRENT";
        } else if (isRoot) {
          label = "ROOT";
        } else {
          label = "PARENT";
        }

        stackItems.push({
          label,
          filePath: frame.filePath,
          componentName: frame.componentName,
          isCurrent: !!isCurrent,
          index: originalIndex,
          level,
          isChild: false, // We're showing parents, not children
          frame, // Store the full frame
        });
      });
    } else {
      // Fallback to the old above/current/below structure
      if (selectedComponentStack.above) {
        stackItems.push({
          label: "PARENT",
          filePath: selectedComponentStack.above.filePath,
          componentName: selectedComponentStack.above.componentName,
          isCurrent: false,
          index: 1,
          level: 1,
          isChild: false,
          frame: selectedComponentStack.above,
        });
      }
      if (selectedComponentStack.current) {
        stackItems.push({
          label: "CURRENT",
          filePath: selectedComponentStack.current.filePath,
          componentName: selectedComponentStack.current.componentName,
          isCurrent: true,
          index: 0,
          level: 0,
          isChild: false,
          frame: selectedComponentStack.current,
        });
      }
      if (selectedComponentStack.below) {
        stackItems.push({
          label: "CHILD",
          filePath: selectedComponentStack.below.filePath,
          componentName: selectedComponentStack.below.componentName,
          isCurrent: false,
          index: 2,
          level: 1,
          isChild: true,
          frame: selectedComponentStack.below,
        });
      }
    }
  }

  // Determine which source info to display
  const displaySourceInfo = showDropdown
    ? selectedSourceInfo
    : hoveredSourceInfo;

  // Determine if we should show the button row
  const showButtonRow = (showSourceInfo || showDropdown) && displaySourceInfo;

  return createPortal(
    <div className={styles.elementSelectionOverlay}>
      {/* Highlight box around the selected/hovered element */}
      <div
        className={styles.elementSelectionHighlight}
        style={{
          left: `${highlightBounds.left}px`,
          top: `${highlightBounds.top}px`,
          width: `${highlightBounds.width}px`,
          height: `${highlightBounds.height}px`,
          opacity,
        }}
      />

      {/* Button Row: Dropdown trigger + Fork button */}
      {showButtonRow && (
        <div
          className={styles.elementSelectionButtonRow}
          style={{
            left: `${highlightBounds.left}px`,
            top: `${highlightBounds.top - 8}px`,
            opacity,
            transform: "translateY(-100%)",
          }}
        >
          {/* Dropdown trigger button - shows source info */}
          <button
            ref={showDropdown ? sourceButtonRef : null}
            className={styles.elementSelectionSourceButton}
            data-element-selection-control
            onClick={
              showDropdown
                ? (e) => {
                    e.stopPropagation();
                    setIsDropdownOpen(!isDropdownOpen);
                  }
                : undefined
            }
          >
            {displaySourceInfo?.filePath}
            {displaySourceInfo?.componentName && (
              <span className={styles.elementSelectionComponentName}>
                {" "}
                ({displaySourceInfo.componentName})
              </span>
            )}
            <span className={styles.elementSelectionSourceButtonArrow}>
              <SelectorIcon />
            </span>
          </button>

          {/* Fork button - only shown when element is selected */}
          {showDropdown && selectedSourceInfo?.filePath && (
            <button
              ref={forkButtonRef}
              className={styles.elementSelectionForkButton}
              data-element-selection-control
              onClick={(e) => {
                e.stopPropagation();
                if (selectedSourceInfo?.filePath && sendMessage) {
                  // Extract component name from file path (basename without extension)
                  // This matches how the server extracts it: path.parse(resolvedPath).name
                  const filePath = selectedSourceInfo.filePath;
                  const pathParts = filePath.split("/");
                  const fileName = pathParts[pathParts.length - 1];
                  const componentName = fileName.replace(/\.[^/.]+$/, ""); // Remove extension

                  // Set component in localStorage immediately (optimistic update)
                  // The WebSocket ack will confirm and ensure it's set correctly
                  if (onForkComplete) {
                    onForkComplete(componentName);
                  }

                  // Send the init_component message
                  sendMessage("init_component", {
                    componentPath: selectedSourceInfo.filePath,
                  });
                } else {
                  console.log(`Fake forking ${selectedSourceInfo?.filePath}`);
                }
              }}
              title={`Fork ${selectedSourceInfo?.filePath}`}
            >
              <GitForkIcon className={styles.elementSelectionForkIcon} />
            </button>
          )}
        </div>
      )}

      {/* Component Stack Dropdown - opens below button row */}
      {isDropdownOpen && stackItems.length > 0 && (
        <div
          ref={dropdownRef}
          className={styles.elementSelectionStackDropdown}
          data-element-selection-control
          style={{
            visibility: "hidden",
          }}
        >
          <div className={styles.elementSelectionStackDropdownContent}>
            {stackItems.map((item, index) => {
              const handleItemClick = async (e: React.MouseEvent) => {
                e.stopPropagation();

                // Find DOM element associated with this component frame
                const element = await findElementFromStackFrame(
                  item.frame,
                  selectedElement
                );

                if (element && onStackItemSelect) {
                  onStackItemSelect(element, item.frame);
                  setIsDropdownOpen(false);
                }
              };

              return (
                <div
                  key={`${item.filePath}-${item.index}`}
                  ref={(el) => {
                    if (el) {
                      itemRefs.current.set(index, el);
                    } else {
                      itemRefs.current.delete(index);
                    }
                  }}
                  className={`${styles.elementSelectionStackItem} ${
                    item.isCurrent
                      ? styles.elementSelectionStackItemCurrent
                      : ""
                  } ${
                    item.isChild ? styles.elementSelectionStackItemChild : ""
                  } ${
                    !item.isCurrent
                      ? styles.elementSelectionStackItemClickable
                      : ""
                  }`}
                  style={{
                    paddingLeft: `${12 + item.level * 20}px`,
                  }}
                  onClick={!item.isCurrent ? handleItemClick : undefined}
                  onMouseEnter={() => setHoveredItemIndex(index)}
                  onMouseLeave={() => setHoveredItemIndex(null)}
                >
                  {item.componentName && (
                    <div className={styles.elementSelectionStackItemComponent}>
                      {item.componentName}
                    </div>
                  )}
                  {item.filePath && (
                    <div className={styles.elementSelectionStackItemPath}>
                      {item.filePath}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>,
    portalRoot
  );
}
