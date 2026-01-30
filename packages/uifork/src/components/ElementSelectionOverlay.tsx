import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import styles from "./UIFork.module.css";
import {
  SourceInfo,
  ComponentStackFrame,
  findElementFromStackFrame,
  getSourceFromElement,
  getComponentStackWithContext,
} from "../utils/sourceTracing";
import { GitForkIcon } from "./icons/GitForkIcon";
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
  sendMessage?: (type: WebSocketMessageType, payload: Record<string, unknown>) => void;
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
}: ElementSelectionOverlayProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Close dropdown when selection changes
  useEffect(() => {
    if (!selectedElement) {
      setIsDropdownOpen(false);
    }
  }, [selectedElement]);
  const [bounds, setBounds] = useState<DOMRect | null>(null);
  const [opacity, setOpacity] = useState(0);

  // Use selected element if available, otherwise use hovered element
  const targetElement = selectedElement || hoveredElement;

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

  return createPortal(
    <div className={styles.elementSelectionOverlay}>
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

      {/* Show source info above the selection outline when hovering */}
      {showSourceInfo && hoveredSourceInfo && (
        <div
          className={styles.elementSelectionSourceInfo}
          style={{
            left: `${highlightBounds.left}px`,
            top: `${highlightBounds.top - 8}px`,
            opacity,
            transform: "translateY(-100%)",
          }}
        >
          {hoveredSourceInfo.filePath}
          {hoveredSourceInfo.componentName && (
            <span className={styles.elementSelectionComponentName}>
              {" "}
              ({hoveredSourceInfo.componentName})
            </span>
          )}
        </div>
      )}

      {/* Show dropdown above when element is selected (replaces source info) */}
      {showDropdown && selectedSourceInfo?.filePath && (
        <div
          className={styles.elementSelectionStackDropdown}
          style={{
            left: `${highlightBounds.left}px`,
            top: `${highlightBounds.top - 8}px`,
            opacity,
            transform: "translateY(-100%)",
          }}
        >
          <div className={styles.elementSelectionStackDropdownHeader}>
            <button
              className={styles.elementSelectionStackDropdownTrigger}
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            >
              <span>
                {selectedSourceInfo.filePath}
                {selectedSourceInfo.componentName && (
                  <span className={styles.elementSelectionComponentName}>
                    {" "}
                    ({selectedSourceInfo.componentName})
                  </span>
                )}
              </span>
              <span className={styles.elementSelectionStackDropdownArrow}>
                {isDropdownOpen ? "▲" : "▼"}
              </span>
            </button>
            <button
              className={styles.elementSelectionStackForkButton}
              onClick={(e) => {
                e.stopPropagation();
                if (selectedSourceInfo?.filePath && sendMessage) {
                  sendMessage("init_component", {
                    componentPath: selectedSourceInfo.filePath,
                  });
                } else {
                  console.log(`Fake forking ${selectedSourceInfo?.filePath}`);
                }
              }}
              title={`Fork ${selectedSourceInfo?.filePath}`}
            >
              <GitForkIcon className={styles.elementSelectionStackForkIcon} />
            </button>
          </div>
          {isDropdownOpen && stackItems.length > 0 && (
            <div className={styles.elementSelectionStackDropdownContent}>
              {stackItems.map((item, index) => {
                const handleItemClick = async (e: React.MouseEvent) => {
                  e.stopPropagation();

                  // Find DOM element associated with this component frame
                  // Pass the currently selected element as context
                  const element = await findElementFromStackFrame(
                    item.frame,
                    selectedElement
                  );

                  if (element && onStackItemSelect) {
                    // Call the callback with the new element and target frame
                    // The hook will update source info and component stack to show
                    // the clicked component as CURRENT
                    onStackItemSelect(element, item.frame);
                    // Close the dropdown to revert to compact display
                    setIsDropdownOpen(false);
                  }
                };

                return (
                  <div
                    key={`${item.filePath}-${item.index}`}
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
                  >
                    {item.label && (
                      <div className={styles.elementSelectionStackItemLabel}>
                        {item.label}
                      </div>
                    )}
                    <div className={styles.elementSelectionStackItemPath}>
                      {item.filePath}
                    </div>
                    {item.componentName && (
                      <div
                        className={styles.elementSelectionStackItemComponent}
                      >
                        {item.componentName}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>,
    portalRoot
  );
}
