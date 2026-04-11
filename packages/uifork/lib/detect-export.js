/**
 * Detects the exported component(s) from a source file's contents.
 *
 * Returns:
 *   { type: "default", name: string|null }
 *     — single default export found (name is the identifier if parseable)
 *   { type: "named", name: string }
 *     — exactly one PascalCase named export found
 *   { type: "ambiguous", candidates: string[] }
 *     — multiple component-like exports; caller must disambiguate
 */
function detectComponentExport(fileContents) {
  const lines = fileContents.split("\n");

  let hasDefault = false;
  let defaultName = null;
  const namedExports = [];

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip comments and strings (rough heuristic — skip lines starting with // or *)
    if (trimmed.startsWith("//") || trimmed.startsWith("*") || trimmed.startsWith("/*")) {
      continue;
    }

    // export default function Foo / export default class Foo
    const defaultFuncMatch = trimmed.match(
      /^export\s+default\s+(?:function|class)\s+([A-Za-z_$][A-Za-z0-9_$]*)/,
    );
    if (defaultFuncMatch) {
      hasDefault = true;
      defaultName = defaultFuncMatch[1];
      continue;
    }

    // export default Foo (identifier) or export default (arrow / expression)
    if (/^export\s+default\s+/.test(trimmed)) {
      hasDefault = true;
      const identMatch = trimmed.match(/^export\s+default\s+([A-Z][A-Za-z0-9_$]*)\s*[;,]?\s*$/);
      if (identMatch) {
        defaultName = identMatch[1];
      }
      continue;
    }

    // Named exports: export function Foo / export const Foo / export class Foo
    // Only capture PascalCase names (start with uppercase) — likely React components
    const namedMatch = trimmed.match(
      /^export\s+(?:function|const|class)\s+([A-Z][A-Za-z0-9_$]*)/,
    );
    if (namedMatch) {
      namedExports.push(namedMatch[1]);
    }
  }

  const candidates = [];
  if (hasDefault) candidates.push("default");
  candidates.push(...namedExports);

  // Single default, no competing named exports → default
  if (hasDefault && namedExports.length === 0) {
    return { type: "default", name: defaultName };
  }

  // No default, exactly one named PascalCase export → named
  if (!hasDefault && namedExports.length === 1) {
    return { type: "named", name: namedExports[0] };
  }

  // No exports found at all
  if (candidates.length === 0) {
    return { type: "ambiguous", candidates: [] };
  }

  // Everything else is ambiguous
  return { type: "ambiguous", candidates };
}

module.exports = { detectComponentExport };
