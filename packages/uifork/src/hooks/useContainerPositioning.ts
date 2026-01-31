import { useEffect, useMemo, useState, RefObject } from "react";
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
}: UseContainerPositioningProps): UseContainerPositioningReturn {
  const [componentSelectorPosition, setComponentSelectorPosition] = useState({
    x: 0,
    y: 0,
  });

  // Find existing fixed position dev tools
  const foundElements = useExistingDevToolPositions();

  // Calculate container position based on settings, adjusting for found elements
  const containerPosition = useMemo(() => {
    const basePosition = getContainerPosition(position);
    
    // Find if there's an element in the same corner
    const elementInCorner = foundElements.find((el) => el.position === position);
    
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
  }, [position, foundElements]);
  
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
 * Hook that finds all fixed position elements in the document body,
 * determines their corner position, calculates offset from edge,
 * returns them, and logs them to the console.
 */
export function useExistingDevToolPositions(): DevToolPosition[] {
  const [fixedElements, setFixedElements] = useState<DevToolPosition[]>([]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
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

      setFixedElements(fixed);
      console.log("Fixed position elements found:", fixed);
    }, 50);

    return () => clearTimeout(timeoutId);
  }, []);

  return fixedElements;
}
