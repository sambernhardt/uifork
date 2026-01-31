const fs = require("fs");
const path = require("path");
const { ComponentManager } = require("./watch");

/**
 * Find a ComponentManager from a component path (similar to VersionPromoter.findVersionsFile)
 */
function findComponentManager(componentPath) {
  const resolvedPath = path.resolve(componentPath);

  // If it's a direct path to versions file
  if (fs.existsSync(resolvedPath) && resolvedPath.endsWith(".versions.ts")) {
    return new ComponentManager(resolvedPath);
  }

  // If it's a directory, look for versions file
  if (fs.existsSync(resolvedPath)) {
    const stat = fs.statSync(resolvedPath);
    if (stat.isDirectory()) {
      const files = fs.readdirSync(resolvedPath);
      const versionsFile = files.find((f) => f.endsWith(".versions.ts"));
      if (versionsFile) {
        return new ComponentManager(path.join(resolvedPath, versionsFile));
      }
    } else if (stat.isFile()) {
      // If it's a component file, look in the same directory
      const dir = path.dirname(resolvedPath);
      const componentName = path.basename(resolvedPath, path.extname(resolvedPath));
      const versionsFile = path.join(dir, `${componentName}.versions.ts`);
      if (fs.existsSync(versionsFile)) {
        return new ComponentManager(versionsFile);
      }
    }
  }

  // Try searching by component name
  if (!componentPath.includes("/") && !componentPath.includes("\\")) {
    const found = recursiveSearchVersionsFile(process.cwd(), componentPath);
    if (found) {
      return new ComponentManager(found);
    }
  }

  throw new Error(`Component not found: ${componentPath}`);
}

function recursiveSearchVersionsFile(dir, componentName) {
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isFile()) {
        const fullPath = path.join(dir, entry.name);
        if (entry.name === `${componentName}.versions.ts`) {
          return fullPath;
        }
      } else if (entry.isDirectory()) {
        if (!entry.name.startsWith(".") && entry.name !== "node_modules") {
          const found = recursiveSearchVersionsFile(path.join(dir, entry.name), componentName);
          if (found) return found;
        }
      }
    }
  } catch {
    // Skip directories we can't read
  }

  return null;
}

module.exports = { findComponentManager };
