import type { ComponentType } from "react";

export type VersionType<T extends Record<string, unknown> = Record<string, unknown>> = {
  render: ComponentType<T> | (() => Promise<{ default: ComponentType<T> }>);
  description?: string;
  label: string;
};

export type VersionsType<T extends Record<string, unknown> = Record<string, unknown>> = {
  [key: string]: VersionType<T>;
};

export type BranchedComponentProps<T extends Record<string, unknown> = Record<string, unknown>> = {
  id: string;
  versions: VersionsType<T>;
  props: T;
  defaultVersion?: string;
};

export type UIForkProps = {
  /** Port for the watch server (default: 3001) */
  port?: number;
};

/** Component info returned from the watch server */
export type ComponentInfo = {
  name: string;
  path: string;
  versions: string[];
};
