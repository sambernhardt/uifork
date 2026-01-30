import { useEffect, useRef, useState, useCallback } from 'react';

export interface UseElementSelectionOptions {
  /** Keyboard shortcut to activate selection mode (default: 'Cmd+Shift+E' or 'Ctrl+Shift+E') */
  activationShortcut?: string;
  /** Callback when an element is selected */
  onSelect?: (element: Element) => void;
}

export interface UseElementSelectionReturn {
  /** Whether selection mode is currently active */
  isSelectionMode: boolean;
  /** The element currently being hovered */
  hoveredElement: Element | null;
  /** The element that was selected */
  selectedElement: Element | null;
  /** Manually toggle selection mode */
  toggleSelectionMode: () => void;
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
  const [selectedElement, setSelectedElement] = useState<Element | null>(null);
  
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
  const getElementAtPoint = useCallback((x: number, y: number): Element | null => {
    const elements = document.elementsFromPoint(x, y);
    for (const el of elements) {
      // Skip our own overlay and UI elements
      if (el.closest('[data-uifork]')) {
        continue;
      }
      // Skip html/body
      if (el === document.body || el === document.documentElement) {
        continue;
      }
      return el;
    }
    return null;
  }, []);

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
    (e: MouseEvent) => {
      if (!isSelectionMode) return;

      e.preventDefault();
      e.stopPropagation();

      const element = getElementAtPoint(e.clientX, e.clientY);
      if (element) {
        selectedElementRef.current = element;
        setSelectedElement(element);
        console.log('[UIFork] Selected element:', {
          tag: element.tagName,
          className: element.className,
          id: element.id,
          textContent: element.textContent?.substring(0, 100),
          element,
        });
        onSelect?.(element);
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
      const isInputField = target.tagName === 'INPUT' || 
                          target.tagName === 'TEXTAREA' || 
                          target.isContentEditable;
      
      // Toggle selection mode with 'E' key (but not when typing in inputs)
      if (!isInputField && (e.key === 'E' || e.key === 'e')) {
        e.preventDefault();
        setIsSelectionMode((prev) => {
          const newValue = !prev;
          return newValue;
        });
        // Clear selected element when toggling off
        if (isSelectionMode) {
          selectedElementRef.current = null;
          setSelectedElement(null);
          setHoveredElement(null);
        }
        return;
      }

      // Handle Escape key
      if (isSelectionMode && e.key === 'Escape') {
        e.preventDefault();
        
        // Check if there's a selected element using ref for synchronous access
        if (selectedElementRef.current) {
          // If there's a selected element, clear it but stay in selection mode
          selectedElementRef.current = null;
          setSelectedElement(null);
          setHoveredElement(null);
        } else {
          // No selected element, exit selection mode
          setIsSelectionMode(false);
          setSelectedElement(null);
          setHoveredElement(null);
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
      if (e.type === 'click') return;
      e.preventDefault();
    };

    // Prevent context menu, text selection, etc.
    document.addEventListener('contextmenu', preventDefault);
    document.addEventListener('selectstart', preventDefault);
    document.addEventListener('dragstart', preventDefault);

    return () => {
      document.removeEventListener('contextmenu', preventDefault);
      document.removeEventListener('selectstart', preventDefault);
      document.removeEventListener('dragstart', preventDefault);
    };
  }, [isSelectionMode]);

  /**
   * Set up mouse and keyboard event listeners
   */
  useEffect(() => {
    if (isSelectionMode) {
      // Change cursor to crosshair
      document.body.style.cursor = 'crosshair';
      document.body.style.userSelect = 'none';
    } else {
      // Reset cursor
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      setHoveredElement(null);
    }

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('click', handleClick, true); // Use capture phase
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('click', handleClick, true);
      window.removeEventListener('keydown', handleKeyDown);
      
      // Cleanup cursor
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      
      // Cancel any pending RAF
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };
  }, [isSelectionMode, handleMouseMove, handleClick, handleKeyDown]);

  const toggleSelectionMode = useCallback(() => {
    setIsSelectionMode((prev) => {
      const newValue = !prev;
      if (!newValue) {
        selectedElementRef.current = null;
        setSelectedElement(null);
        setHoveredElement(null);
      }
      return newValue;
    });
  }, []);

  return {
    isSelectionMode,
    hoveredElement,
    selectedElement,
    toggleSelectionMode,
  };
}
