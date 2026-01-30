import { lazy, Suspense, useEffect, useState } from "react";
import { useLocalStorage } from "../hooks/useLocalStorage";
import {
  registerComponent,
  unregisterComponent,
} from "../utils/componentRegistry";
import type { BranchedComponentProps } from "../types";

/**
 * A component that renders a specific version based on localStorage state.
 * Used to wrap components that have multiple versions managed by uifork.
 *
 * The UIFork component controls which version is active by writing to localStorage.
 * BranchedComponent reads from localStorage and renders the appropriate version.
 */
export function LazyBranchedComponent<T extends Record<string, unknown>>({
  id,
  versions,
  props,
  defaultVersion,
}: BranchedComponentProps<T>) {
  const versionKeys = Object.keys(versions);
  const initialVersion = defaultVersion || versionKeys[0];

  const [activeVersion, setActiveVersion] = useLocalStorage<string>(
    id,
    initialVersion,
    true, // sync across tabs
  );

  // Register/unregister this component when it mounts/unmounts
  useEffect(() => {
    registerComponent(id);
    return () => {
      unregisterComponent(id);
    };
  }, [id]);

  const [lastValidVersion, setLastValidVersion] = useState<string>(
    versionKeys.includes(activeVersion) ? activeVersion : initialVersion,
  );

  // Update last valid version when active version is found in versions
  useEffect(() => {
    if (versions[activeVersion]) {
      setLastValidVersion(activeVersion);
    }
  }, [activeVersion, versions]);

  // If active version no longer exists in versions, fall back to first version
  useEffect(() => {
    if (versionKeys.length > 0 && !versionKeys.includes(activeVersion)) {
      // Debounce the fallback to prevent race conditions during HMR/updates
      // where the version in localStorage might be newer than the props received.
      // 2500ms allows for slow HMR updates without reverting state
      const timer = setTimeout(() => {
        // Double check after delay
        if (!versionKeys.includes(activeVersion)) {
          setActiveVersion(versionKeys[0]);
        }
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [activeVersion, versionKeys, setActiveVersion]);

  // Get the version loader - prefer active, then last valid, then default
  const versionLoader =
    versions[activeVersion]?.render ??
    versions[lastValidVersion]?.render ??
    versions[versionKeys[0]].render;

  // Handle both static and dynamic imports
  const [LazyVersion, setLazyVersion] = useState<any>(null);

  useEffect(() => {
    // Check if it's a dynamic import (function) or static import (component)
    if (typeof versionLoader === "function") {
      // Dynamic import - create lazy component
      const component = lazy(versionLoader as any);
      setLazyVersion(() => component);
    } else {
      // Static import - use directly
      setLazyVersion(() => versionLoader);
    }
  }, [versionLoader]);

  if (!LazyVersion) {
    return null;
  }

  // Wrap dynamic imports with Suspense
  if (typeof versionLoader === "function") {
    return (
      <Suspense fallback={null}>
        <LazyVersion {...props} />
      </Suspense>
    );
  }

  return <LazyVersion {...props} />;
}
