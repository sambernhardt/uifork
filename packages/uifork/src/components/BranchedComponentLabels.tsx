import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import styles from "./UIFork.module.css";

export interface BranchedComponentLabelsProps {
  /** Map of branched component elements to their component IDs */
  branchedComponentElements: Map<Element, string>;
  /** Whether selection mode is active */
  isActive: boolean;
}

/**
 * Component that renders floating labels for branched components
 */
export function BranchedComponentLabels({
  branchedComponentElements,
  isActive,
}: BranchedComponentLabelsProps) {
  const [labelPositions, setLabelPositions] = useState<
    Array<{ element: Element; componentId: string; bounds: DOMRect }>
  >([]);

  useEffect(() => {
    if (!isActive || branchedComponentElements.size === 0) {
      setLabelPositions([]);
      return;
    }

    const updatePositions = () => {
      const positions: Array<{
        element: Element;
        componentId: string;
        bounds: DOMRect;
      }> = [];

      branchedComponentElements.forEach((componentId, element) => {
        try {
          const rect = element.getBoundingClientRect();
          // Only show label if element is visible
          if (rect.width > 0 && rect.height > 0) {
            positions.push({ element, componentId, bounds: rect });
          }
        } catch (e) {
          // Element might have been removed, skip it
        }
      });

      setLabelPositions(positions);
    };

    updatePositions();

    // Update positions on scroll/resize
    window.addEventListener("scroll", updatePositions, true);
    window.addEventListener("resize", updatePositions);

    return () => {
      window.removeEventListener("scroll", updatePositions, true);
      window.removeEventListener("resize", updatePositions);
    };
  }, [branchedComponentElements, isActive]);

  if (!isActive || labelPositions.length === 0) {
    return null;
  }

  const portalRoot = document.getElementById("uifork-root") || document.body;

  return createPortal(
    <>
      {labelPositions.map(({ element, componentId, bounds }, index) => (
        <div
          key={`${componentId}-${index}`}
          className={styles.branchedComponentLabel}
          style={{
            left: `${bounds.left}px`,
            top: `${bounds.top}px`,
          }}
        >
          {componentId}
        </div>
      ))}
    </>,
    portalRoot
  );
}
