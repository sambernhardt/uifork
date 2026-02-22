"use client";

import { UIFork } from "uifork";

export function UIForkProvider() {
  if (process.env.NODE_ENV === "production") return null;
  return <UIFork />;
}
