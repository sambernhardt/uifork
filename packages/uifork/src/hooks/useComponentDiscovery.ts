import { useCallback, useEffect, useState } from "react";
import { useLocalStorage } from "./useLocalStorage";
import { getMountedComponents, subscribe } from "../utils/componentRegistry";
import type { ComponentInfo } from "../types";

interface UseComponentDiscoveryOptions {
  port: number;
}

export function useComponentDiscovery({ port }: UseComponentDiscoveryOptions) {
  const [components, setComponents] = useState<ComponentInfo[]>([]);
  const [mountedComponentIds, setMountedComponentIds] = useState<string[]>([]);
  const [selectedComponent, setSelectedComponent] = useLocalStorage<string>(
    "uifork-selected-component",
    "",
    true,
  );

  // Filter components to only show mounted ones
  const mountedComponents = components.filter((c) =>
    mountedComponentIds.includes(c.name),
  );

  // Handle components update from WebSocket
  const handleComponentsUpdate = useCallback((wsComponents: Array<{
    name: string;
    path: string;
    versions: string[];
  }>) => {
    setComponents(wsComponents);

    // If we have a selected component, check if it still exists in the list
    // If it does, keep it selected (don't override)
    if (selectedComponent) {
      const stillExists = wsComponents.some((c) => c.name === selectedComponent);
      if (!stillExists && wsComponents.length > 0) {
        // Selected component no longer exists, switch to first one
        setSelectedComponent(wsComponents[0].name);
      }
      // If it still exists, keep it selected (don't change)
      return;
    }

    // If no component selected yet, select the first one
    if (wsComponents.length > 0) {
      setSelectedComponent(wsComponents[0].name);
    }
  }, [selectedComponent, setSelectedComponent]);

  // Subscribe to component registry changes
  useEffect(() => {
    // Initialize with current mounted components
    setMountedComponentIds(getMountedComponents());

    // Subscribe to changes
    const unsubscribe = subscribe(() => {
      setMountedComponentIds(getMountedComponents());
    });

    return unsubscribe;
  }, []);

  // Auto-select first mounted component if current selection is not mounted
  useEffect(() => {
    if (
      selectedComponent &&
      mountedComponentIds.length > 0 &&
      !mountedComponentIds.includes(selectedComponent)
    ) {
      // Check if the selected component exists in the components list
      // (even if not mounted yet - it might be newly initialized)
      const componentExists = components.some((c) => c.name === selectedComponent);
      
      // Only switch if the component doesn't exist in the list at all
      // If it exists but isn't mounted yet, keep it selected (it will mount soon)
      if (!componentExists) {
        // Current selection doesn't exist, switch to first mounted component
        const firstMounted = components.find((c) =>
          mountedComponentIds.includes(c.name),
        );
        if (firstMounted) {
          setSelectedComponent(firstMounted.name);
        }
      }
    } else if (
      !selectedComponent &&
      mountedComponentIds.length > 0 &&
      components.length > 0
    ) {
      // No selection yet, select first mounted component
      const firstMounted = components.find((c) =>
        mountedComponentIds.includes(c.name),
      );
      if (firstMounted) {
        setSelectedComponent(firstMounted.name);
      }
    }
  }, [
    selectedComponent,
    mountedComponentIds,
    components,
    setSelectedComponent,
  ]);

  return {
    components,
    mountedComponents,
    mountedComponentIds,
    selectedComponent,
    setSelectedComponent,
    onComponentsUpdate: handleComponentsUpdate,
  };
}
