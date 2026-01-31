import { useCallback, useEffect, useState } from "react";

/**
 * A hook for persisting state in localStorage with optional cross-tab synchronization.
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T,
  syncAcrossTabs = false,
): [T, (value: T | ((val: T) => T)) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === "undefined") {
      return initialValue;
    }
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch {
      // Error reading localStorage key
      return initialValue;
    }
  });

  const setValue = useCallback(
    (value: T | ((val: T) => T)) => {
      try {
        setStoredValue((currentValue) => {
          const valueToStore = value instanceof Function ? value(currentValue) : value;
          if (typeof window !== "undefined") {
            // Remove the key if value is empty string (for string types)
            if (valueToStore === "" && typeof initialValue === "string") {
              window.localStorage.removeItem(key);
              if (syncAcrossTabs) {
                window.dispatchEvent(
                  new StorageEvent("storage", {
                    key,
                    newValue: null,
                  }),
                );
              }
            } else {
              window.localStorage.setItem(key, JSON.stringify(valueToStore));
              if (syncAcrossTabs) {
                window.dispatchEvent(
                  new StorageEvent("storage", {
                    key,
                    newValue: JSON.stringify(valueToStore),
                  }),
                );
              }
            }
          }
          return valueToStore;
        });
      } catch {
        // Error setting localStorage key
      }
    },
    [key, syncAcrossTabs, initialValue],
  );

  useEffect(() => {
    if (!syncAcrossTabs) return;

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === key && e.newValue) {
        try {
          setStoredValue(JSON.parse(e.newValue));
        } catch {
          // Error parsing localStorage value
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [key, syncAcrossTabs]);

  return [storedValue, setValue];
}
