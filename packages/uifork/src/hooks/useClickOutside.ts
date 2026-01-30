import { useEffect, RefObject } from "react";

interface UseClickOutsideOptions {
  isActive: boolean;
  refs: RefObject<HTMLElement | null>[];
  onClickOutside: () => void;
  additionalCheck?: (target: Node) => boolean;
}

/**
 * Hook to handle clicks outside of specified elements
 * @param isActive - Whether the click outside detection is active
 * @param refs - Array of refs to elements that should not trigger the callback
 * @param onClickOutside - Callback when clicking outside all refs
 * @param additionalCheck - Optional function to check if click should be ignored (return true to ignore)
 */
export function useClickOutside({
  isActive,
  refs,
  onClickOutside,
  additionalCheck,
}: UseClickOutsideOptions) {
  useEffect(() => {
    if (!isActive) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;

      // Check if click is inside any of the refs
      for (const ref of refs) {
        if (ref.current?.contains(target)) {
          return;
        }
      }

      // Additional custom check
      if (additionalCheck?.(target)) {
        return;
      }

      onClickOutside();
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isActive, refs, onClickOutside, additionalCheck]);
}
