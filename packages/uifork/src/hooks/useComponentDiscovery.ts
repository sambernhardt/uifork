import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocalStorage } from "./useLocalStorage";
import { getMountedComponents, getAllComponentsWithVersions, subscribe } from "../utils/componentRegistry";
import type { ComponentInfo, VersionInfo } from "../types";

interface UseComponentDiscoveryOptions {
  port: number;
}

export function useComponentDiscovery({ port: _port }: UseComponentDiscoveryOptions) {
  // WebSocket-provided components (has file paths, but only version keys without labels)
  const [wsComponents, setWsComponents] = useState<Array<{
    name: string;
    path: string;
    versions: string[];
  }>>([]);
  // Local registry components (built from ForkedComponent registrations, has labels)
  const [localComponents, setLocalComponents] = useState<Array<{ name: string; versions: VersionInfo[] }>>([]);
  const [mountedComponentIds, setMountedComponentIds] = useState<string[]>([]);
  const [selectedComponent, setSelectedComponent] = useLocalStorage<string>(
    "uifork-selected-component",
    "",
    true,
  );

  // Build effective components list:
  // - Use WebSocket data for component list and paths
  // - Merge with local registry to get version labels (since ForkedComponent has labels)
  const components: ComponentInfo[] = useMemo(() => {
    return wsComponents.length > 0
      ? wsComponents.map((wsComp) => {
          // Find the local component to get labels
          const localComp = localComponents.find((lc) => lc.name === wsComp.name);

          // Merge: use WS version keys, but add labels from local registry
          const versionsWithLabels: VersionInfo[] = wsComp.versions.map((key) => {
            const localVersion = localComp?.versions.find((v) => v.key === key);
            return {
              key,
              label: localVersion?.label,
            };
          });

          return {
            name: wsComp.name,
            path: wsComp.path,
            versions: versionsWithLabels,
          };
        })
      : localComponents.map((c) => ({ name: c.name, path: "", versions: c.versions }));
  }, [wsComponents, localComponents]);

  // Filter components to only show mounted ones
  const mountedComponents = useMemo(
    () => components.filter((c) => mountedComponentIds.includes(c.name)),
    [components, mountedComponentIds],
  );

  // Handle components update from WebSocket
  const handleComponentsUpdate = useCallback(
    (
      newWsComponents: Array<{
        name: string;
        path: string;
        versions: string[];
      }>,
      _activePrompts?: string[],
    ) => {
      setWsComponents(newWsComponents);

      // If no component selected yet, select the first one
      if (!selectedComponent && newWsComponents.length > 0) {
        setSelectedComponent(newWsComponents[0].name);
      }
    },
    [selectedComponent, setSelectedComponent],
  );

  // Subscribe to component registry changes (for both mounted IDs and local versions)
  useEffect(() => {
    const updateFromRegistry = () => {
      setMountedComponentIds(getMountedComponents());
      setLocalComponents(getAllComponentsWithVersions());
    };

    // Initialize with current mounted components
    updateFromRegistry();

    // Subscribe to changes
    const unsubscribe = subscribe(updateFromRegistry);

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
