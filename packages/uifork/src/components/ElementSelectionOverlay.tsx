import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import styles from './UIFork.module.css';

export interface ElementSelectionOverlayProps {
  /** The element currently being hovered */
  hoveredElement: Element | null;
  /** The element that was selected (takes priority over hovered) */
  selectedElement: Element | null;
  /** Whether selection mode is active */
  isActive: boolean;
}

/**
 * Overlay component that shows a highlight box around the hovered or selected element
 */
export function ElementSelectionOverlay({
  hoveredElement,
  selectedElement,
  isActive,
}: ElementSelectionOverlayProps) {
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
    window.addEventListener('scroll', updateBounds, true);
    window.addEventListener('resize', updateBounds);

    return () => {
      window.removeEventListener('scroll', updateBounds, true);
      window.removeEventListener('resize', updateBounds);
    };
  }, [targetElement, isActive]);

  if (!isActive || !targetElement || !bounds) {
    return null;
  }

  const portalRoot = document.getElementById('uifork-root') || document.body;

  // Add 2px padding/offset around the element
  const padding = 2;
  const highlightBounds = {
    left: bounds.left - padding,
    top: bounds.top - padding,
    width: bounds.width + padding * 2,
    height: bounds.height + padding * 2,
  };

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
    </div>,
    portalRoot
  );
}
