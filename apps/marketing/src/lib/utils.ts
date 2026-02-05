import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Creates an animation delay value based on a position (0-1) and total duration.
 * @param position - A value between 0 and 1 representing position from top-left (0) to bottom-right (1)
 * @param totalDuration - Total duration in seconds for the staggered animation sequence
 * @returns Animation delay in seconds as a string (e.g., "0.2s")
 */
export function makeAnimationDelay(position: number, totalDuration: number = 1.0): string {
  // Clamp position between 0 and 1
  const clampedPosition = Math.max(0, Math.min(1, position));
  // Calculate delay as a percentage of total duration
  const delay = clampedPosition * totalDuration;
  return `${delay}s`;
}
