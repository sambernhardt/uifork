import { useEffect, useRef, useState, useCallback } from "react";
import {
  getSourceFromElement,
  getComponentStackWithContext,
  SourceInfo,
  ComponentStackFrame,
} from "../utils/sourceTracing";
import { getMountedComponents, subscribe } from "../utils/componentRegistry";
import { getFiberFromHostInstance } from "bippy";
import { BranchedComponent } from "../components/BranchedComponent";
import { LazyBranchedComponent } from "../components/LazyBranchedComponent";

export interface UseElementSelectionOptions {
  /** Keyboard shortcut to activate selection mode (default: 'Cmd+Shift+E' or 'Ctrl+Shift+E') */
  activationShortcut?: string;
  /** Callback when an element is selected */
  onSelect?: (element: Element, sourceInfo: SourceInfo) => void;
}

export interface ComponentStackContext {
  above: ComponentStackFrame | null;
  current: ComponentStackFrame | null;
  below: ComponentStackFrame | null;
  all: ComponentStackFrame[];
}

export interface UseElementSelectionReturn {
  /** Whether selection mode is currently active */
  isSelectionMode: boolean;
  /** The element currently being hovered */
  hoveredElement: Element | null;
  /** Source info for the hovered element */
  hoveredSourceInfo: SourceInfo | null;
  /** The element that was selected */
  selectedElement: Element | null;
  /** Source info for the selected element */
  selectedSourceInfo: SourceInfo | null;
  /** Component stack context for the selected element */
  selectedComponentStack: ComponentStackContext | null;
  /** Map of branched component elements to their component IDs */
  branchedComponentElements: Map<Element, string>;
  /** Manually toggle selection mode */
  toggleSelectionMode: () => void;
  /** Programmatically select an element */
  selectElement: (element: Element, targetFrame?: ComponentStackFrame | null) => Promise<void>;
}

/**
 * Hook for element selection mode with keyboard activation and mouse tracking
 */
export function useElementSelection(
  options: UseElementSelectionOptions = {}
): UseElementSelectionReturn {
  const { activationShortcut, onSelect } = options;
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [hoveredElement, setHoveredElement] = useState<Element | null>(null);
  const [hoveredSourceInfo, setHoveredSourceInfo] = useState<SourceInfo | null>(
    null
  );
  const [selectedElement, setSelectedElement] = useState<Element | null>(null);
  const [selectedSourceInfo, setSelectedSourceInfo] =
    useState<SourceInfo | null>(null);
  const [selectedComponentStack, setSelectedComponentStack] =
    useState<ComponentStackContext | null>(null);

  // Debounce source info fetching for hovered elements
  const hoveredSourceInfoTimeoutRef = useRef<number | null>(null);

  // Use refs to track mouse position for throttling
  const mousePositionRef = useRef<{ x: number; y: number } | null>(null);
  const rafIdRef = useRef<number | null>(null);
  // Ref to track selected element for synchronous access in event handlers
  const selectedElementRef = useRef<Element | null>(null);
  // Ref to track outlined elements for cleanup
  const outlinedElementsRef = useRef<Set<Element>>(new Set());
  // Ref to track mounted component IDs
  const mountedComponentIdsRef = useRef<string[]>([]);
  // State to track branched component elements and their IDs
  const [branchedComponentElements, setBranchedComponentElements] = useState<
    Map<Element, string>
  >(new Map());

  // Keep ref in sync with selectedElement state
  useEffect(() => {
    selectedElementRef.current = selectedElement;
  }, [selectedElement]);

  /**
   * Check if a fiber is a BranchedComponent instance
   */
  const isBranchedComponentFiber = useCallback((fiber: any): boolean => {
    if (!fiber || !fiber.type) return false;
    
    const componentType = fiber.type;
    return (
      componentType === BranchedComponent ||
      componentType === LazyBranchedComponent ||
      componentType.name === "BranchedComponent" ||
      componentType.name === "LazyBranchedComponent" ||
      componentType.displayName === "BranchedComponent" ||
      componentType.displayName === "LazyBranchedComponent"
    );
  }, []);

  /**
   * Find the root DOM element for a BranchedComponent fiber
   */
  const findRootElementForBranchedComponent = useCallback((fiber: any): Element | null => {
    if (!fiber) return null;

    // Traverse down the fiber tree to find the first host element
    let current: any = fiber.child;
    const visited = new Set<any>();

    while (current && !visited.has(current)) {
      visited.add(current);
      
      const isHostElement = current.type && typeof current.type === "string";
      
      if (isHostElement && current.stateNode instanceof Element) {
        const element = current.stateNode;
        // Skip our own UI elements
        if (!element.closest("[data-uifork]")) {
          return element;
        }
      }

      // Traverse children first, then siblings
      if (current.child) {
        current = current.child;
      } else if (current.sibling) {
        current = current.sibling;
      } else {
        // Go back up and try next sibling
        current = current.return?.sibling;
      }
    }

    return null;
  }, []);

  /**
   * Get component ID from BranchedComponent fiber props
   */
  const getComponentIdFromFiber = useCallback((fiber: any): string | null => {
    if (!fiber || !fiber.memoizedProps) return null;
    // BranchedComponent receives an `id` prop
    return fiber.memoizedProps.id || null;
  }, []);

  /**
   * Find all DOM elements that correspond to BranchedComponent instances
   * Returns a map of element -> component ID
   */
  const findBranchedComponentElements = useCallback((): Map<Element, string> => {
    const elementMap = new Map<Element, string>();
    const seenElements = new Set<Element>();

    // Get all elements in the document
    const allElements = document.querySelectorAll("*");

    for (const element of allElements) {
      // Skip our own UI elements
      if (element.closest("[data-uifork]")) {
        continue;
      }

      // Skip if we've already processed this element
      if (seenElements.has(element)) {
        continue;
      }

      // Get the fiber for this element
      const fiber = getFiberFromHostInstance(element);
      if (!fiber) continue;

      // Traverse up the fiber tree to find BranchedComponent instances
      let current: any = fiber;
      const visited = new Set<any>();

      while (current && !visited.has(current)) {
        visited.add(current);

        // Check if this fiber is a BranchedComponent
        if (isBranchedComponentFiber(current)) {
          // Get the component ID from the fiber props
          const componentId = getComponentIdFromFiber(current);
          
          // Find the root element for this BranchedComponent
          const rootElement = findRootElementForBranchedComponent(current);
          if (rootElement && !seenElements.has(rootElement)) {
            if (componentId) {
              elementMap.set(rootElement, componentId);
            }
            seenElements.add(rootElement);
          }
          // Once we find a BranchedComponent, we can stop traversing up
          // (we don't want to highlight nested BranchedComponents separately)
          break;
        }

        // Move up the tree
        current = current.return;
      }
    }

    return elementMap;
  }, [isBranchedComponentFiber, findRootElementForBranchedComponent, getComponentIdFromFiber]);

  /**
   * Update outlines for branched components
   */
  const updateBranchedComponentOutlines = useCallback(() => {
    // Remove existing outlines
    outlinedElementsRef.current.forEach((el) => {
      el.removeAttribute("data-uifork-branched-outline");
    });
    outlinedElementsRef.current.clear();

    if (!isSelectionMode) {
      setBranchedComponentElements(new Map());
      return;
    }

    // Find all branched component elements with their IDs
    const elementMap = findBranchedComponentElements();
    
    // Update state with the element map
    setBranchedComponentElements(elementMap);
    
    // Add outline to each element
    elementMap.forEach((_, el) => {
      el.setAttribute("data-uifork-branched-outline", "true");
      outlinedElementsRef.current.add(el);
    });
  }, [isSelectionMode, findBranchedComponentElements]);

  /**
   * Get element at point, filtering out our own UI elements
   */
  const getElementAtPoint = useCallback(
    (x: number, y: number): Element | null => {
      const elements = document.elementsFromPoint(x, y);
      for (const el of elements) {
        // Skip our own overlay and UI elements
        if (el.closest("[data-uifork]")) {
          continue;
        }
        // Skip html/body
        if (el === document.body || el === document.documentElement) {
          continue;
        }
        return el;
      }
      return null;
    },
    []
  );

  /**
   * Handle mouse move to update hovered element
   */
  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isSelectionMode) return;

      // Don't update hover if there's already a selected element
      // The highlight should stay on the selected element
      if (selectedElement) return;

      // Store mouse position
      mousePositionRef.current = { x: e.clientX, y: e.clientY };

      // Throttle using requestAnimationFrame
      if (rafIdRef.current === null) {
        rafIdRef.current = requestAnimationFrame(() => {
          rafIdRef.current = null;
          if (mousePositionRef.current) {
            const element = getElementAtPoint(
              mousePositionRef.current.x,
              mousePositionRef.current.y
            );
            setHoveredElement(element);

            // Clear previous timeout
            if (hoveredSourceInfoTimeoutRef.current !== null) {
              clearTimeout(hoveredSourceInfoTimeoutRef.current);
            }

            // Debounce source info fetching (100ms delay)
            hoveredSourceInfoTimeoutRef.current = window.setTimeout(
              async () => {
                if (element) {
                  const sourceInfo = await getSourceFromElement(element);
                  setHoveredSourceInfo(sourceInfo);
                } else {
                  setHoveredSourceInfo(null);
                }
              },
              100
            );
          }
        });
      }
    },
    [isSelectionMode, selectedElement, getElementAtPoint]
  );

  /**
   * Handle click to select element
   */
  const handleClick = useCallback(
    async (e: MouseEvent) => {
      if (!isSelectionMode) return;

      const target = e.target as HTMLElement;

      // Check if clicking inside the dropdown or UIFork UI
      // Try multiple selectors to catch the dropdown
      const isInsideDropdown =
        target.closest(".elementSelectionStackDropdown") ||
        target.closest('[class*="elementSelectionStack"]') ||
        target.classList.contains("elementSelectionStackDropdownTrigger") ||
        target.closest(".elementSelectionStackDropdownTrigger") ||
        target.closest(".elementSelectionStackDropdownContent");

      const isInsideUIFork = target.closest("[data-uifork]");

      // If there's a selected element and click is outside dropdown/UIFork, clear selection
      if (selectedElementRef.current && !isInsideDropdown && !isInsideUIFork) {
        e.preventDefault();
        e.stopPropagation();
        selectedElementRef.current = null;
        setSelectedElement(null);
        setSelectedSourceInfo(null);
        setSelectedComponentStack(null);
        return;
      }

      // If clicking inside dropdown or UIFork, don't do anything
      if (isInsideDropdown || isInsideUIFork) {
        return;
      }

      e.preventDefault();
      e.stopPropagation();

      const element = getElementAtPoint(e.clientX, e.clientY);
      if (element) {
        selectedElementRef.current = element;
        setSelectedElement(element);

        // Get source info and component stack from element
        const [sourceInfo, componentStack] = await Promise.all([
          getSourceFromElement(element),
          getComponentStackWithContext(element),
        ]);

        // Log the selected element and its path
        if (sourceInfo.filePath) {
          console.log(
            `[UIFork] Selected: ${sourceInfo.componentName || "Unknown"} @ ${sourceInfo.filePath}`
          );
        }

        setSelectedSourceInfo(sourceInfo);
        setSelectedComponentStack(componentStack);
        onSelect?.(element, sourceInfo);
      }
    },
    [isSelectionMode, getElementAtPoint, onSelect]
  );

  /**
   * Handle keyboard shortcuts
   */
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input field
      const target = e.target as HTMLElement;
      const isInputField =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable;

      // Toggle selection mode with 'E' key (but not when typing in inputs)
      if (!isInputField && (e.key === "E" || e.key === "e")) {
        e.preventDefault();
        setIsSelectionMode((prev) => {
          const newValue = !prev;
          return newValue;
        });
        // Clear selected element when toggling off
        if (isSelectionMode) {
          selectedElementRef.current = null;
          setSelectedElement(null);
          setSelectedSourceInfo(null);
          setSelectedComponentStack(null);
          setHoveredElement(null);
          setHoveredSourceInfo(null);
        }
        return;
      }

      // Handle Escape key
      if (isSelectionMode && e.key === "Escape") {
        e.preventDefault();

        // Check if there's a selected element using ref for synchronous access
        if (selectedElementRef.current) {
          // If there's a selected element, clear it but stay in selection mode
          selectedElementRef.current = null;
          setSelectedElement(null);
          setSelectedSourceInfo(null);
          setSelectedComponentStack(null);
          setHoveredElement(null);
          setHoveredSourceInfo(null);
        } else {
          // No selected element, exit selection mode
          setIsSelectionMode(false);
          setSelectedElement(null);
          setSelectedSourceInfo(null);
          setSelectedComponentStack(null);
          setHoveredElement(null);
          setHoveredSourceInfo(null);
        }
      }
    },
    [isSelectionMode]
  );

  /**
   * Prevent default browser behavior when in selection mode
   */
  useEffect(() => {
    if (!isSelectionMode) return;

    const preventDefault = (e: Event) => {
      // Allow clicks to go through for selection
      if (e.type === "click") return;
      e.preventDefault();
    };

    // Prevent context menu, text selection, etc.
    document.addEventListener("contextmenu", preventDefault);
    document.addEventListener("selectstart", preventDefault);
    document.addEventListener("dragstart", preventDefault);

    return () => {
      document.removeEventListener("contextmenu", preventDefault);
      document.removeEventListener("selectstart", preventDefault);
      document.removeEventListener("dragstart", preventDefault);
    };
  }, [isSelectionMode]);

  /**
   * Subscribe to component registry changes and update outlines
   */
  useEffect(() => {
    // Update mounted component IDs
    mountedComponentIdsRef.current = getMountedComponents();

    // Subscribe to changes
    const unsubscribe = subscribe(() => {
      mountedComponentIdsRef.current = getMountedComponents();
      // Update outlines when components change
      updateBranchedComponentOutlines();
    });

    return unsubscribe;
  }, [updateBranchedComponentOutlines]);

  /**
   * Update outlines when selection mode changes
   */
  useEffect(() => {
    updateBranchedComponentOutlines();

    return () => {
      // Cleanup outlines when selection mode is disabled
      if (!isSelectionMode) {
        outlinedElementsRef.current.forEach((el) => {
          el.removeAttribute("data-uifork-branched-outline");
        });
        outlinedElementsRef.current.clear();
      }
    };
  }, [isSelectionMode, updateBranchedComponentOutlines]);

  /**
   * Watch for DOM changes and update outlines accordingly
   */
  useEffect(() => {
    if (!isSelectionMode) return;

    // Debounce updates to avoid excessive recalculations
    let updateTimeout: number | null = null;
    const scheduleUpdate = () => {
      if (updateTimeout !== null) {
        clearTimeout(updateTimeout);
      }
      updateTimeout = window.setTimeout(() => {
        updateBranchedComponentOutlines();
        updateTimeout = null;
      }, 100);
    };

    // Watch for DOM mutations
    const observer = new MutationObserver(() => {
      scheduleUpdate();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    // Also update on scroll/resize in case elements move
    window.addEventListener("scroll", scheduleUpdate, true);
    window.addEventListener("resize", scheduleUpdate);

    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", scheduleUpdate, true);
      window.removeEventListener("resize", scheduleUpdate);
      if (updateTimeout !== null) {
        clearTimeout(updateTimeout);
      }
    };
  }, [isSelectionMode, updateBranchedComponentOutlines]);

  /**
   * Set up mouse and keyboard event listeners
   */
  useEffect(() => {
    if (isSelectionMode) {
      // If element selected, use default cursor, otherwise crosshair
      document.body.style.cursor = selectedElement ? "" : "crosshair";
      document.body.style.userSelect = "none";
    } else {
      // Reset cursor
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      setHoveredElement(null);
      setHoveredSourceInfo(null);
    }

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("click", handleClick, true); // Use capture phase
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("click", handleClick, true);
      window.removeEventListener("keydown", handleKeyDown);

      // Cleanup cursor
      document.body.style.cursor = "";
      document.body.style.userSelect = "";

      // Cancel any pending RAF
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }

      // Clear hovered source info timeout
      if (hoveredSourceInfoTimeoutRef.current !== null) {
        clearTimeout(hoveredSourceInfoTimeoutRef.current);
        hoveredSourceInfoTimeoutRef.current = null;
      }
    };
  }, [
    isSelectionMode,
    selectedElement,
    handleMouseMove,
    handleClick,
    handleKeyDown,
  ]);

  const toggleSelectionMode = useCallback(() => {
    setIsSelectionMode((prev) => {
      const newValue = !prev;
      if (!newValue) {
        selectedElementRef.current = null;
        setSelectedElement(null);
        setSelectedSourceInfo(null);
        setSelectedComponentStack(null);
        setHoveredElement(null);
        setHoveredSourceInfo(null);
      }
      return newValue;
    });
  }, []);

  /**
   * Programmatically select an element
   * This is used when clicking on a component in the stack dropdown
   */
  const selectElement = useCallback(
    async (
      element: Element,
      targetFrame?: ComponentStackFrame | null
    ) => {
      if (!isSelectionMode) {
        return;
      }

      selectedElementRef.current = element;
      setSelectedElement(element);

      // Get source info and component stack from element
      const [sourceInfo, componentStack] = await Promise.all([
        getSourceFromElement(element),
        getComponentStackWithContext(element),
      ]);

      // If we have a target frame (component clicked in dropdown), adjust the stack
      // to show that component as CURRENT, but preserve the original hierarchy order
      let adjustedStack = componentStack;
      let finalSourceInfo = sourceInfo;
      
      if (targetFrame && targetFrame.componentName) {
        // Find the target component in the stack
        const targetIndex = componentStack.all.findIndex(
          (frame) =>
            frame.componentName === targetFrame.componentName &&
            frame.filePath === targetFrame.filePath
        );

        if (targetIndex !== -1) {
          // Keep the original stack order (preserves hierarchy)
          // But mark the target component as CURRENT
          const preservedStack = [...componentStack.all];

          // Create adjusted stack context with target as current
          // but keeping the original order
          adjustedStack = {
            current: preservedStack[targetIndex] || null,
            above: targetIndex > 0 ? preservedStack[targetIndex - 1] : null,
            below: targetIndex < preservedStack.length - 1 ? preservedStack[targetIndex + 1] : null,
            all: preservedStack, // Keep original order
          };

          // Update source info to match the target component
          finalSourceInfo = {
            filePath: targetFrame.filePath,
            lineNumber: targetFrame.lineNumber,
            columnNumber: targetFrame.columnNumber,
            componentName: targetFrame.componentName,
          };
        }
      }

      // Log the selected element and its path
      if (finalSourceInfo.filePath) {
        console.log(
          `[UIFork] Selected: ${finalSourceInfo.componentName || "Unknown"} @ ${finalSourceInfo.filePath}`
        );
      }

      setSelectedSourceInfo(finalSourceInfo);
      setSelectedComponentStack(adjustedStack);
      onSelect?.(element, finalSourceInfo);
    },
    [isSelectionMode, onSelect]
  );

  return {
    isSelectionMode,
    hoveredElement,
    hoveredSourceInfo,
    selectedElement,
    selectedSourceInfo,
    selectedComponentStack,
    branchedComponentElements,
    toggleSelectionMode,
    selectElement,
  };
}
