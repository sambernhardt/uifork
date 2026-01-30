import { useEffect, useRef, useState, useCallback } from "react";
import {
  getSourceFromElement,
  getComponentStackWithContext,
  SourceInfo,
  ComponentStackFrame,
} from "../utils/sourceTracing";

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
  /** Manually toggle selection mode */
  toggleSelectionMode: () => void;
  /** Programmatically select an element */
  selectElement: (element: Element) => Promise<void>;
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

  // Keep ref in sync with selectedElement state
  useEffect(() => {
    selectedElementRef.current = selectedElement;
  }, [selectedElement]);

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
    toggleSelectionMode,
    selectElement,
  };
}
