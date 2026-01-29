import { useEffect } from "react";
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
export function BranchedComponent<T extends Record<string, unknown>>({
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

  // If active version no longer exists in versions, fall back to first version
  useEffect(() => {
    if (!versionKeys.includes(activeVersion)) {
      setActiveVersion(versionKeys[0]);
    }
  }, [activeVersion, versionKeys, setActiveVersion]);

  // Get the version to render
  const Version =
    versions[activeVersion]?.render ?? versions[versionKeys[0]].render;

  return <Version {...props} />;
}
