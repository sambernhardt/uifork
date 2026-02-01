/**
 * Environment detection utilities
 */

/**
 * Check if we're running in a development environment (localhost, local network, or file protocol)
 */
export function isDevelopment(): boolean {
  return (
    typeof window !== "undefined" &&
    (window.location.hostname === "localhost" ||
      window.location.hostname.startsWith("127.0.0.1") ||
      window.location.hostname.startsWith("192.168.") ||
      window.location.protocol === "file:")
  );
}
