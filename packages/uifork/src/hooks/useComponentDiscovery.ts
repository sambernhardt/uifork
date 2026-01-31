import { useCallback, useEffect, useState } from "react";
import { useLocalStorage } from "./useLocalStorage";
import { getMountedComponents, subscribe } from "../utils/componentRegistry";
import type { ComponentInfo } from "../types";

interface UseComponentDiscoveryOptions {
  port: number;
}

export function useComponentDiscovery({ port: _port }: UseComponentDiscoveryOptions) {
  const [components, setComponents] = useState<ComponentInfo[]>([]);
  const [mountedComponentIds, setMountedComponentIds] = useState<string[]>([]);
  const [selectedComponent, setSelectedComponent] = useLocalStorage<string>(
    "uifork-selected-component",
    "",
    true,
  );

  // Filter components to only show mounted ones
  const mountedComponents = components.filter((c) => mountedComponentIds.includes(c.name));

  // Handle components update from WebSocket
  const handleComponentsUpdate = useCallback(
    (
      wsComponents: Array<{
        name: string;
        path: string;
        versions: string[];
      }>,
    ) => {
      setComponents(wsComponents);

      // If no component selected yet, select the first one
      if (!selectedComponent && wsComponents.length > 0) {
        setSelectedComponent(wsComponents[0].name);
      }
    },
    [selectedComponent, setSelectedComponent],
  );

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
      // Current selection is not mounted, switch to first mounted component
      const firstMounted = components.find((c) => mountedComponentIds.includes(c.name));
      if (firstMounted) {
        setSelectedComponent(firstMounted.name);
      }
    } else if (!selectedComponent && mountedComponentIds.length > 0 && components.length > 0) {
      // No selection yet, select first mounted component
      const firstMounted = components.find((c) => mountedComponentIds.includes(c.name));
      if (firstMounted) {
        setSelectedComponent(firstMounted.name);
      }
    }
  }, [selectedComponent, mountedComponentIds, components, setSelectedComponent]);

  return {
    components,
    mountedComponents,
    mountedComponentIds,
    selectedComponent,
    setSelectedComponent,
    onComponentsUpdate: handleComponentsUpdate,
  };
}
