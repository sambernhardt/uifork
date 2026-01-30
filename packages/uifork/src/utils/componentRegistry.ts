/**
 * Registry to track which components are currently mounted in the React tree.
 * This allows UIFork to only show components that are actually being used.
 */

const mountedComponents = new Set<string>();
const listeners = new Set<() => void>();

/**
 * Register a component as mounted
 */
export function registerComponent(id: string): void {
  mountedComponents.add(id);
  notifyListeners();
}

/**
 * Unregister a component (when it unmounts)
 */
export function unregisterComponent(id: string): void {
  mountedComponents.delete(id);
  notifyListeners();
}

/**
 * Check if a component is currently mounted
 */
export function isComponentMounted(id: string): boolean {
  return mountedComponents.has(id);
}

/**
 * Get all currently mounted component IDs
 */
export function getMountedComponents(): string[] {
  return Array.from(mountedComponents);
}

/**
 * Subscribe to changes in the mounted components registry
 * Returns an unsubscribe function
 */
export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function notifyListeners(): void {
  listeners.forEach((listener) => listener());
}
