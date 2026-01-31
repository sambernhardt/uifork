import { autoUpdate, computePosition, offset, shift } from "@floating-ui/dom";
import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import styles from "./UIFork.module.css";
import { registerTooltipHide, registerTooltipShow, shouldSkipDelay } from "../utils/tooltipManager";

interface TooltipProps {
  label: string;
  children: React.ReactElement;
  placement?: "top" | "bottom" | "left" | "right";
}

export function Tooltip({ label, children, placement = "top" }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const triggerRef = useRef<HTMLElement | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const showTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const portalRootRef = useRef<HTMLElement | null>(null);

  // Find uifork-root element for portal
  useEffect(() => {
    const rootEl = document.getElementById("uifork-root");
    if (rootEl) {
      portalRootRef.current = rootEl;
    }
  }, []);

  useEffect(() => {
    if (!isVisible || !triggerRef.current || !tooltipRef.current) return;

    let cleanup: (() => void) | null = null;
    let cancelled = false;

    const updatePosition = async () => {
      if (cancelled || !triggerRef.current || !tooltipRef.current) return;
      try {
        const { x, y } = await computePosition(triggerRef.current, tooltipRef.current, {
          placement,
          strategy: "fixed",
          middleware: [offset(8), shift({ padding: 8 })],
        });
        if (!cancelled) {
          setPosition({ x, y });
          if (tooltipRef.current) {
            tooltipRef.current.style.visibility = "visible";
            tooltipRef.current.classList.add(styles.tooltipVisible);
          }
        }
      } catch {
        // Error positioning tooltip
      }
    };

    // Initial positioning
    if (tooltipRef.current) {
      tooltipRef.current.style.visibility = "hidden";
    }
    updatePosition();

    // Auto-update position
    if (triggerRef.current && tooltipRef.current) {
      cleanup = autoUpdate(triggerRef.current, tooltipRef.current, updatePosition);
    }

    return () => {
      cancelled = true;
      if (cleanup) cleanup();
      if (tooltipRef.current) {
        tooltipRef.current.classList.remove(styles.tooltipVisible);
      }
    };
  }, [isVisible, placement]);

  const handleMouseEnter = () => {
    // Clear any pending hide timeout (user is hovering again)
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }

    // Clear any pending show timeout
    if (showTimeoutRef.current) {
      clearTimeout(showTimeoutRef.current);
    }

    // Check if we should skip delay (another tooltip is visible or was recently shown)
    const skipDelay = shouldSkipDelay();
    const delay = skipDelay ? 0 : 300;

    // Show tooltip after delay (or immediately if skipping)
    showTimeoutRef.current = setTimeout(() => {
      setIsVisible(true);
      showTimeoutRef.current = null;
    }, delay);
  };

  const handleMouseLeave = () => {
    // Clear any pending show timeout
    if (showTimeoutRef.current) {
      clearTimeout(showTimeoutRef.current);
      showTimeoutRef.current = null;
    }

    // Add a delay before hiding to allow smooth handoff between tooltips
    hideTimeoutRef.current = setTimeout(() => {
      setIsVisible(false);
      registerTooltipHide();
      hideTimeoutRef.current = null;
    }, 150);
  };

  // Register/unregister tooltip visibility with global manager
  useEffect(() => {
    if (isVisible) {
      registerTooltipShow();
    } else {
      registerTooltipHide();
    }
  }, [isVisible]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (showTimeoutRef.current) {
        clearTimeout(showTimeoutRef.current);
      }
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
      if (isVisible) {
        registerTooltipHide();
      }
    };
  }, [isVisible]);

  // Clone the child element and add ref and event handlers
  const childWithProps = React.cloneElement(children, {
    ref: (node: HTMLElement | null) => {
      triggerRef.current = node;
      // Preserve original ref if it exists
      const originalRef = (children as any).ref;
      if (originalRef) {
        if (typeof originalRef === "function") {
          originalRef(node);
        } else {
          originalRef.current = node;
        }
      }
    },
    onMouseEnter: (e: React.MouseEvent) => {
      handleMouseEnter();
      children.props.onMouseEnter?.(e);
    },
    onMouseLeave: (e: React.MouseEvent) => {
      handleMouseLeave();
      children.props.onMouseLeave?.(e);
    },
  } as any);

  const portalRoot =
    portalRootRef.current || document.getElementById("uifork-root") || document.body;

  return (
    <>
      {childWithProps}
      {isVisible &&
        createPortal(
          <div
            ref={tooltipRef}
            className={styles.tooltip}
            style={{
              left: `${position.x}px`,
              top: `${position.y}px`,
              visibility: "hidden",
            }}
            role="tooltip"
          >
            {label}
          </div>,
          portalRoot,
        )}
    </>
  );
}
