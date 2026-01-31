import { useEffect, useMemo, useState, useRef, RefObject } from "react";
import { autoUpdate, computePosition, flip, offset, shift } from "@floating-ui/dom";
import {
  getContainerPosition,
  getTransformOrigin,
  type Position,
  type ContainerPosition,
} from "../utils/positioning";

interface UseContainerPositioningProps {
  position: Position;
  isComponentSelectorOpen: boolean;
  containerRef: RefObject<HTMLDivElement | null>;
  componentSelectorRef: RefObject<HTMLDivElement | null>;
  /**
   * If true, will detect and position relative to other fixed position dev tools
   * in the same corner. Defaults to false.
   */
  enableElementAwarePositioning?: boolean;
}

interface UseContainerPositioningReturn {
  containerPosition: ContainerPosition;
  transformOrigin: string;
  componentSelectorPosition: { x: number; y: number };
}

/**
 * Hook that manages container positioning and component selector dropdown positioning.
 * Combines the memoized container position calculations with the floating-ui
 * positioning for the component selector dropdown.
 */
export function useContainerPositioning({
  position,
  isComponentSelectorOpen,
  containerRef,
  componentSelectorRef,
  enableElementAwarePositioning = true,
}: UseContainerPositioningProps): UseContainerPositioningReturn {
  const [componentSelectorPosition, setComponentSelectorPosition] = useState({
    x: 0,
    y: 0,
  });

  // Find existing fixed position dev tools
  const foundElements = useExistingDevToolPositions(enableElementAwarePositioning);

  // Calculate container position based on settings, adjusting for found elements
  const containerPosition = useMemo(() => {
    const basePosition = getContainerPosition(position);
    
    // Only apply element-aware positioning if enabled
    if (!enableElementAwarePositioning) {
      return basePosition;
    }
    
    // Filter elements to only include those within the corner offset threshold
    const elementsInCorner = (foundElements || []).filter(
      (el) => el.position === position && el.offset <= CORNER_OFFSET_THRESHOLD
    );
    
    // Find if there's an element in the same corner that passes the threshold
    const elementInCorner = elementsInCorner[0];
    
    if (elementInCorner) {
      // Calculate adjusted position: place horizontally next to the found element
      // Horizontal position = offset + width + offset (for gap)
      const adjustedHorizontal = elementInCorner.offset + elementInCorner.width + elementInCorner.offset;
      
      // Align vertically with the found element's y position
      const viewportHeight = window.innerHeight;
      
      // Adjust based on corner
      switch (position) {
        case "top-left":
          return {
            ...basePosition,
            top: `${elementInCorner.rect.top}px`,
            left: `${adjustedHorizontal}px`,
          };
        case "top-right":
          return {
            ...basePosition,
            top: `${elementInCorner.rect.top}px`,
            right: `${adjustedHorizontal}px`,
          };
        case "bottom-left":
          return {
            ...basePosition,
            bottom: `${viewportHeight - elementInCorner.rect.bottom}px`,
            left: `${adjustedHorizontal}px`,
          };
        case "bottom-right":
          return {
            ...basePosition,
            bottom: `${viewportHeight - elementInCorner.rect.bottom}px`,
            right: `${adjustedHorizontal}px`,
          };
      }
    }
    
    return basePosition;
  }, [position, foundElements, enableElementAwarePositioning]);
  
  const transformOrigin = useMemo(() => getTransformOrigin(position), [position]);

  // Position component selector dropdown using floating-ui
  useEffect(() => {
    if (!isComponentSelectorOpen || !containerRef.current || !componentSelectorRef.current) return;

    const updatePosition = async () => {
      try {
        const { x, y } = await computePosition(
          containerRef.current!,
          componentSelectorRef.current!,
          {
            placement: "left-start",
            strategy: "fixed",
            middleware: [offset(4), flip(), shift({ padding: 8 })],
          },
        );
        setComponentSelectorPosition({ x, y });
        if (componentSelectorRef.current) componentSelectorRef.current.style.visibility = "visible";
      } catch {
        // Error positioning component selector
      }
    };

    if (componentSelectorRef.current) componentSelectorRef.current.style.visibility = "hidden";
    updatePosition();
    const cleanup = autoUpdate(containerRef.current, componentSelectorRef.current, updatePosition);
    return cleanup;
  }, [isComponentSelectorOpen, containerRef, componentSelectorRef]);

  return {
    containerPosition,
    transformOrigin,
    componentSelectorPosition,
  };
}

type CornerPosition = "top-left" | "top-right" | "bottom-left" | "bottom-right";

// Maximum offset from window edge to consider an element as being in a corner
const CORNER_OFFSET_THRESHOLD = 50;

interface DevToolPosition {
  element: HTMLElement;
  position: CornerPosition;
  offset: number;
  width: number;
  height: number;
  rect: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
}

/**
 * Core function that finds all fixed position elements and calculates their positions.
 * Returns all fixed elements regardless of their offset from corners.
 * This can be called multiple times when positions change.
 */
function findFixedPositionElements(): DevToolPosition[] {
  // Find all elements with position: fixed
  const allElements = document.body.querySelectorAll("*");
  const uiforkRoot = document.getElementById("uifork-root");
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const viewportCenterX = viewportWidth / 2;
  const viewportCenterY = viewportHeight / 2;
  const fixed: DevToolPosition[] = [];

  allElements.forEach((element) => {
    if (element instanceof HTMLElement) {
      // Skip elements inside #uifork-root
      if (uiforkRoot && uiforkRoot.contains(element)) {
        return;
      }

      const computedStyle = window.getComputedStyle(element);
      if (computedStyle.position === "fixed") {
        const rect = element.getBoundingClientRect();
        const elementCenterX = rect.left + rect.width / 2;
        const elementCenterY = rect.top + rect.height / 2;

        // Determine corner position
        let position: CornerPosition;
        if (elementCenterY < viewportCenterY) {
          // Top half
          position = elementCenterX < viewportCenterX ? "top-left" : "top-right";
        } else {
          // Bottom half
          position = elementCenterX < viewportCenterX ? "bottom-left" : "bottom-right";
        }

        // Calculate offset from nearest edge (max of x and y offsets)
        let offset: number;
        switch (position) {
          case "top-left":
            offset = Math.max(rect.left, rect.top);
            break;
          case "top-right":
            offset = Math.max(viewportWidth - rect.right, rect.top);
            break;
          case "bottom-left":
            offset = Math.max(rect.left, viewportHeight - rect.bottom);
            break;
          case "bottom-right":
            offset = Math.max(viewportWidth - rect.right, viewportHeight - rect.bottom);
            break;
        }

        fixed.push({
          element,
          position,
          offset,
          width: rect.width,
          height: rect.height,
          rect: {
            top: rect.top,
            bottom: rect.bottom,
            left: rect.left,
            right: rect.right,
          },
        });
      }
    }
  });

  return fixed;
}

/**
 * Hook that finds all fixed position elements in the document body,
 * determines their corner position, calculates offset from edge,
 * returns them, and logs them to the console.
 * Sets up observers to detect when elements move or change position.
 */
export function useExistingDevToolPositions(enabled: boolean = true): DevToolPosition[] {
  const [fixedElements, setFixedElements] = useState<DevToolPosition[]>([]);
  const fixedElementsRef = useRef<DevToolPosition[]>([]);

  useEffect(() => {
    if (!enabled) {
      setFixedElements([]);
      fixedElementsRef.current = [];
      return;
    }

    let resizeObservers: ResizeObserver[] = [];
    let mutationObserver: MutationObserver | null = null;
    let isMounted = true;
    let isSettingUpObservers = false;
    let updateTimeout: ReturnType<typeof setTimeout> | null = null;

    // Helper to check if two arrays have the same elements
    const elementsEqual = (a: DevToolPosition[], b: DevToolPosition[]): boolean => {
      if (a.length !== b.length) return false;
      return a.every((elA, idx) => {
        const elB = b[idx];
        return (
          elA.element === elB.element &&
          elA.position === elB.position &&
          elA.offset === elB.offset &&
          elA.width === elB.width &&
          elA.height === elB.height &&
          elA.rect.top === elB.rect.top &&
          elA.rect.bottom === elB.rect.bottom &&
          elA.rect.left === elB.rect.left &&
          elA.rect.right === elB.rect.right
        );
      });
    };

    const setupObservers = (fixed: DevToolPosition[]) => {
      if (isSettingUpObservers) return; // Prevent recursive calls
      isSettingUpObservers = true;

      // Clean up existing resize observers
      resizeObservers.forEach((observer) => observer.disconnect());
      resizeObservers = [];

      // Set up ResizeObserver for each fixed element to detect position/size changes
      fixed.forEach(({ element }) => {
        const resizeObserver = new ResizeObserver(() => {
          if (!isMounted || isSettingUpObservers) return;
          
          // Debounce updates
          if (updateTimeout) {
            clearTimeout(updateTimeout);
          }
          
          updateTimeout = setTimeout(() => {
            if (!isMounted) return;
            // Element size or position changed, update positions
            const updated = findFixedPositionElements();
            
            // Only update if something actually changed
            const current = fixedElementsRef.current;
            if (!elementsEqual(updated, current)) {
              fixedElementsRef.current = updated;
              setFixedElements(updated);
              // Re-setup observers for potentially new elements
              setupObservers(updated);
            }
          }, 100);
        });
        resizeObserver.observe(element);
        resizeObservers.push(resizeObserver);
      });

      isSettingUpObservers = false;
    };

    const updateFixedElements = () => {
      if (!isMounted || isSettingUpObservers) return;
      
      // Debounce updates
      if (updateTimeout) {
        clearTimeout(updateTimeout);
      }
      
      updateTimeout = setTimeout(() => {
        if (!isMounted) return;
        const fixed = findFixedPositionElements();
        
        // Only update if something actually changed
        if (!elementsEqual(fixed, fixedElementsRef.current)) {
          fixedElementsRef.current = fixed;
          setFixedElements(fixed);
          setupObservers(fixed);
        }
      }, 100);
    };

    const handleResize = () => {
      if (!isMounted) return;
      updateFixedElements();
    };

    // Initial scan with delay
    const timeoutId = setTimeout(() => {
      const fixed = findFixedPositionElements();
      fixedElementsRef.current = fixed;
      setFixedElements(fixed);
      setupObservers(fixed);

      // Observe the document body for new fixed position elements
      mutationObserver = new MutationObserver(() => {
        if (!isMounted) return;
        // When DOM changes, rescan for new fixed elements
        updateFixedElements();
      });

      mutationObserver.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["style", "class"],
      });

      // Handle viewport resize which affects corner calculations
      window.addEventListener("resize", handleResize);
    }, 50);

    // Cleanup function
    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
      if (updateTimeout) {
        clearTimeout(updateTimeout);
      }
      resizeObservers.forEach((observer) => observer.disconnect());
      if (mutationObserver) {
        mutationObserver.disconnect();
      }
      window.removeEventListener("resize", handleResize);
    };
  }, [enabled]);

  return fixedElements;
}
