import { useEffect, useRef } from "react";
import { autoUpdate, computePosition, flip, offset, shift } from "@floating-ui/dom";
import styles from "../components/UIFork.module.css";

interface UsePopoverPositionOptions {
  openPopoverVersion: string | null;
}

export function usePopoverPosition({ openPopoverVersion }: UsePopoverPositionOptions) {
  const popoverTriggerRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const popoverDropdownRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const popoverPositions = useRef<Map<string, { x: number; y: number }>>(new Map());

  // Position popover menus
  useEffect(() => {
    if (!openPopoverVersion) return;

    let cleanup: (() => void) | null = null;
    let cancelled = false;

    const setupPositioning = () => {
      const trigger = popoverTriggerRefs.current.get(openPopoverVersion);
      const dropdown = popoverDropdownRefs.current.get(openPopoverVersion);

      if (!trigger || !dropdown) {
        // Retry on next frame if refs aren't ready yet
        if (!cancelled) {
          requestAnimationFrame(setupPositioning);
        }
        return;
      }

      const updatePosition = async () => {
        if (cancelled) return;
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
          if (!cancelled) {
            popoverPositions.current.set(openPopoverVersion, { x, y });
            dropdown.style.left = `${x}px`;
            dropdown.style.top = `${y}px`;
            dropdown.style.visibility = "visible";
            // Add class to trigger CSS animation
            dropdown.classList.add(styles.popoverVisible);
          }
        } catch {
          // Error positioning popover
        }
      };

      dropdown.style.visibility = "hidden";
      updatePosition();
      cleanup = autoUpdate(trigger, dropdown, updatePosition);
    };

    // Use requestAnimationFrame to ensure refs are set and DOM is ready
    const frameId = requestAnimationFrame(setupPositioning);

    return () => {
      cancelled = true;
      cancelAnimationFrame(frameId);
      if (cleanup) cleanup();
      // Remove animation class when popover closes
      const dropdown = popoverDropdownRefs.current.get(openPopoverVersion);
      if (dropdown) {
        dropdown.classList.remove(styles.popoverVisible);
      }
    };
  }, [openPopoverVersion]);

  const setPopoverTriggerRef = (version: string, el: HTMLButtonElement | null) => {
    if (el) popoverTriggerRefs.current.set(version, el);
    else popoverTriggerRefs.current.delete(version);
  };

  const setPopoverDropdownRef = (version: string, el: HTMLDivElement | null) => {
    if (el) popoverDropdownRefs.current.set(version, el);
    else popoverDropdownRefs.current.delete(version);
  };

  return {
    popoverPositions: popoverPositions.current,
    setPopoverTriggerRef,
    setPopoverDropdownRef,
  };
}
