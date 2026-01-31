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
  /** Whether this element is the Next.js dev tools indicator */
  isNextJSDevTools: boolean;
}

/**
 * Helper function to find Next.js devtools indicator in shadow DOM.
 * Looks for elements with data-nextjs-dev-overlay="true" and traverses
 * their children (nextjs-portal) to find shadow roots containing #devtools-indicator.
 */
function findNextJSDevToolsIndicator(): HTMLElement | null {
  // Find all elements with data-nextjs-dev-overlay="true"
  const overlayElements = document.querySelectorAll('[data-nextjs-dev-overlay="true"]');
  
  for (const overlayElement of overlayElements) {
    if (overlayElement instanceof HTMLElement) {
      // Check if this element has a shadow root
      const overlayShadowRoot = overlayElement.shadowRoot;
      
      // Look for nextjs-portal as a child element (not in shadow root)
      const portal = overlayElement.querySelector("nextjs-portal");
      
      if (portal instanceof HTMLElement) {
        // The shadow root is on the portal element
        const portalShadowRoot = portal.shadowRoot;
        
        if (portalShadowRoot) {
          // Look for #devtools-indicator inside the portal's shadow root
          const indicator = portalShadowRoot.getElementById("devtools-indicator");
          
          if (indicator instanceof HTMLElement) {
            return indicator;
          }
          
          // Also try querySelector as fallback
          const indicatorByQuery = portalShadowRoot.querySelector("#devtools-indicator");
          
          if (indicatorByQuery instanceof HTMLElement) {
            return indicatorByQuery;
          }
        }
      }
      
      // Fallback: check if overlay element itself has shadow root
      if (overlayShadowRoot) {
        const indicator = overlayShadowRoot.getElementById("devtools-indicator");
        
        if (indicator instanceof HTMLElement) {
          return indicator;
        }
      }
    }
  }
  
  return null;
}

/**
 * Parse the CSS translate property value.
 * Handles formats like "10px 20px", "10px", or "none"
 * Returns { x: number, y: number } with pixel values, or { x: 0, y: 0 } if not found.
 */
function parseTranslateValue(translateValue: string): { x: number; y: number } {
  if (!translateValue || translateValue === "none") return { x: 0, y: 0 };
  
  // CSS translate property format: "Xpx Ypx" or "Xpx"
  const parts = translateValue.trim().split(/\s+/);
  
  const x = parseFloat(parts[0]) || 0;
  const y = parseFloat(parts[1]) || 0;
  
  return { x, y };
}

/**
 * Get the translate offset for a Next.js dev tools indicator.
 * Looks for a child element with class "dev-tools-grabbing" and reads its translate style.
 */
function getNextJSDevToolsTranslate(indicator: HTMLElement): { x: number; y: number } {
  // Look for the dev-tools-grabbing element within the indicator
  const grabbingElement = indicator.querySelector(".dev-tools-grabbing");
  
  if (grabbingElement instanceof HTMLElement) {
    const translateValue = grabbingElement.style.translate;
    return parseTranslateValue(translateValue);
  }
  
  return { x: 0, y: 0 };
}

/**
 * Calculate the DevToolPosition data for a single fixed element.
 * Returns null if the element is not in fixed position or should be skipped.
 */
function calculateElementPosition(
  element: HTMLElement,
  uiforkRoot: HTMLElement | null,
  viewportWidth: number,
  viewportHeight: number,
  viewportCenterX: number,
  viewportCenterY: number,
  isNextJSDevTools: boolean = false
): DevToolPosition | null {
  // Skip elements inside #uifork-root
  if (uiforkRoot && uiforkRoot.contains(element)) {
    return null;
  }

  const computedStyle = window.getComputedStyle(element);
  if (computedStyle.position !== "fixed") {
    return null;
  }

  const rect = element.getBoundingClientRect();
  
  // For Next.js dev tools, get any translate offset from the dev-tools-grabbing child
  const translate = isNextJSDevTools ? getNextJSDevToolsTranslate(element) : { x: 0, y: 0 };
  
  // Apply translate to get the effective position
  const effectiveRect = {
    top: rect.top + translate.y,
    bottom: rect.bottom + translate.y,
    left: rect.left + translate.x,
    right: rect.right + translate.x,
  };
  
  const elementCenterX = effectiveRect.left + rect.width / 2;
  const elementCenterY = effectiveRect.top + rect.height / 2;

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
      offset = Math.max(effectiveRect.left, effectiveRect.top);
      break;
    case "top-right":
      offset = Math.max(viewportWidth - effectiveRect.right, effectiveRect.top);
      break;
    case "bottom-left":
      offset = Math.max(effectiveRect.left, viewportHeight - effectiveRect.bottom);
      break;
    case "bottom-right":
      offset = Math.max(viewportWidth - effectiveRect.right, viewportHeight - effectiveRect.bottom);
      break;
  }

  return {
    element,
    position,
    offset,
    width: rect.width,
    height: rect.height,
    rect: effectiveRect,
    isNextJSDevTools,
  };
}

/**
 * Helper function to process a fixed position element and add it to the results.
 */
function processFixedElement(
  element: HTMLElement,
  uiforkRoot: HTMLElement | null,
  viewportWidth: number,
  viewportHeight: number,
  viewportCenterX: number,
  viewportCenterY: number,
  fixed: DevToolPosition[],
  isNextJSDevTools: boolean = false
): void {
  const result = calculateElementPosition(
    element,
    uiforkRoot,
    viewportWidth,
    viewportHeight,
    viewportCenterX,
    viewportCenterY,
    isNextJSDevTools
  );
  if (result) {
    fixed.push(result);
  }
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

  // Process all regular fixed position elements
  allElements.forEach((element) => {
    if (element instanceof HTMLElement) {
      processFixedElement(
        element,
        uiforkRoot,
        viewportWidth,
        viewportHeight,
        viewportCenterX,
        viewportCenterY,
        fixed
      );
    }
  });

  // Specifically look for Next.js devtools indicator in shadow DOM
  const nextjsIndicator = findNextJSDevToolsIndicator();
  if (nextjsIndicator) {
    processFixedElement(
      nextjsIndicator,
      uiforkRoot,
      viewportWidth,
      viewportHeight,
      viewportCenterX,
      viewportCenterY,
      fixed,
      true // isNextJSDevTools
    );
  }

  return fixed;
}

/**
 * Hook that finds all fixed position elements in the document body,
 * determines their corner position, calculates offset from edge,
 * and returns them. Sets up mutation observers on tracked elements
 * to detect style changes and re-calculate positions.
 */
export function useExistingDevToolPositions(enabled: boolean = true): DevToolPosition[] {
  const [fixedElements, setFixedElements] = useState<DevToolPosition[]>([]);
  const mutationObserversRef = useRef<Map<HTMLElement, MutationObserver>>(new Map());

  useEffect(() => {
    if (!enabled) {
      setFixedElements([]);
      // Clean up any existing mutation observers
      mutationObserversRef.current.forEach((observer) => observer.disconnect());
      mutationObserversRef.current.clear();
      return;
    }

    let isMounted = true;

    // Re-process a single element and update its data in state
    const reprocessElement = (element: HTMLElement, isNextJSDevTools: boolean) => {
      if (!isMounted) return;

      const uiforkRoot = document.getElementById("uifork-root");
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const viewportCenterX = viewportWidth / 2;
      const viewportCenterY = viewportHeight / 2;

      const updatedData = calculateElementPosition(
        element,
        uiforkRoot,
        viewportWidth,
        viewportHeight,
        viewportCenterX,
        viewportCenterY,
        isNextJSDevTools
      );

      if (!updatedData) {
        // Element is no longer fixed or should be skipped, remove it from tracking
        setFixedElements((prev) => prev.filter((el) => el.element !== element));
        const observer = mutationObserversRef.current.get(element);
        if (observer) {
          observer.disconnect();
          mutationObserversRef.current.delete(element);
        }
        return;
      }

      // Update the element in state
      setFixedElements((prev) => {
        const index = prev.findIndex((el) => el.element === element);
        if (index === -1) return prev;
        const updated = [...prev];
        updated[index] = updatedData;
        return updated;
      });
    };

    // Set up a MutationObserver for a tracked element
    const setupMutationObserver = (element: HTMLElement, isNextJSDevTools: boolean) => {
      // Skip if we already have an observer for this element
      if (mutationObserversRef.current.has(element)) return;

      const observer = new MutationObserver(() => {
        if (!isMounted) return;
        reprocessElement(element, isNextJSDevTools);
      });

      observer.observe(element, {
        attributes: true,
        attributeFilter: ["style"],
        subtree: true,
      });

      mutationObserversRef.current.set(element, observer);
    };

    // Handle viewport resize - re-process all tracked elements
    const handleResize = () => {
      if (!isMounted) return;

      const uiforkRoot = document.getElementById("uifork-root");
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const viewportCenterX = viewportWidth / 2;
      const viewportCenterY = viewportHeight / 2;

      setFixedElements((prev) => {
        return prev
          .map(({ element, isNextJSDevTools }) =>
            calculateElementPosition(
              element,
              uiforkRoot,
              viewportWidth,
              viewportHeight,
              viewportCenterX,
              viewportCenterY,
              isNextJSDevTools
            )
          )
          .filter((el): el is DevToolPosition => el !== null);
      });
    };

    // Perform initial scan after delay to allow page to load
    const timeoutId = setTimeout(() => {
      if (!isMounted) return;

      const fixed = findFixedPositionElements();
      setFixedElements(fixed);

      // Set up mutation observers for each found element
      fixed.forEach(({ element, isNextJSDevTools }) => {
        setupMutationObserver(element, isNextJSDevTools);
      });
    }, 250);

    // Set up resize listener
    window.addEventListener("resize", handleResize);

    // Cleanup function
    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
      mutationObserversRef.current.forEach((observer) => observer.disconnect());
      mutationObserversRef.current.clear();
      window.removeEventListener("resize", handleResize);
    };
  }, [enabled]);

  return fixedElements;
}
