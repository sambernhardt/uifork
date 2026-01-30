import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import styles from "./UIFork.module.css";
import {
  SourceInfo,
  ComponentStackContext,
} from "../utils/sourceTracing";

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

  // Build stack items for dropdown (above, current, below)
  const stackItems: Array<{
    label: string;
    filePath: string | null;
    componentName: string | null;
    isCurrent: boolean;
  }> = [];

  if (selectedComponentStack) {
    if (selectedComponentStack.above) {
      stackItems.push({
        label: "Above",
        filePath: selectedComponentStack.above.filePath,
        componentName: selectedComponentStack.above.componentName,
        isCurrent: false,
      });
    }
    if (selectedComponentStack.current) {
      stackItems.push({
        label: "Current",
        filePath: selectedComponentStack.current.filePath,
        componentName: selectedComponentStack.current.componentName,
        isCurrent: true,
      });
    }
    if (selectedComponentStack.below) {
      stackItems.push({
        label: "Below",
        filePath: selectedComponentStack.below.filePath,
        componentName: selectedComponentStack.below.componentName,
        isCurrent: false,
      });
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
          {isDropdownOpen && stackItems.length > 0 && (
            <div className={styles.elementSelectionStackDropdownContent}>
              {stackItems.map((item, index) => (
                <div
                  key={index}
                  className={`${styles.elementSelectionStackItem} ${
                    item.isCurrent ? styles.elementSelectionStackItemCurrent : ""
                  }`}
                >
                  <div className={styles.elementSelectionStackItemLabel}>
                    {item.label}
                  </div>
                  <div className={styles.elementSelectionStackItemPath}>
                    {item.filePath}
                  </div>
                  {item.componentName && (
                    <div className={styles.elementSelectionStackItemComponent}>
                      {item.componentName}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>,
    portalRoot
  );
}
