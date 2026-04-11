const fs = require("fs");
const path = require("path");
const {
  getVersionComponentIdentifier,
  toPascalCaseIdentifier,
  versionToImportSuffix,
} = require("./component-naming");

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

class VersionPromoter {
  constructor(componentPath, versionId) {
    // Find the component directory and files
    this.componentPath = componentPath;
    this.versionId = versionId;

    // Validate version ID format
    if (!this.validateVersionId(versionId)) {
      throw new Error(
        `Invalid version ID format: ${versionId}. Expected format: v1, v2, v1_2, etc.`,
      );
    }

    // Find the versions file to determine component name and directory
    this.versionsFile = this.findVersionsFile(componentPath);
    if (!this.versionsFile || !fs.existsSync(this.versionsFile)) {
      throw new Error(`Versions file not found for: ${componentPath}`);
    }

    this.watchDir = path.dirname(this.versionsFile);
    this.componentName = this.extractComponentName(this.versionsFile);

    // Determine file extension from existing version files
    this.extension = this.detectFileExtension(versionId);

    // Set up file paths
    this.wrapperFile = path.join(this.watchDir, `${this.componentName}${this.extension}`);
    this.versionsFilePath = path.join(this.watchDir, `${this.componentName}.versions.ts`);
    this.uiSwitcherFile = path.join(this.watchDir, `${this.componentName}.UISwitcher.tsx`);
    this.versionFile = this.getVersionFilePath(versionId);

    console.log(`Promoting version: ${versionId}`);
    console.log(`Component name: ${this.componentName}`);
    console.log(`Target directory: ${this.watchDir}`);
  }

  validateVersionId(versionId) {
    // Validate version key format: v{number}[_{number}]
    return /^v\d+(_\d+)?$/.test(versionId);
  }

  extractComponentName(versionsFilePath) {
    const basename = path.basename(versionsFilePath, ".versions.ts");
    // Only strip known source extensions; dots in names (e.g. Button.icon) are preserved
    const ext = path.extname(basename);
    if ([".tsx", ".ts", ".jsx", ".js"].includes(ext)) {
      return basename.slice(0, -ext.length);
    }
    return basename;
  }

  findVersionsFile(componentPath) {
    const resolvedPath = path.resolve(componentPath);

    // If it's a direct path to versions file
    if (fs.existsSync(resolvedPath) && resolvedPath.endsWith(".versions.ts")) {
      return resolvedPath;
    }

    // If it's a directory, look for versions file
    if (fs.existsSync(resolvedPath)) {
      const stat = fs.statSync(resolvedPath);
      if (stat.isDirectory()) {
        const files = fs.readdirSync(resolvedPath);
        const versionsFile = files.find((f) => f.endsWith(".versions.ts"));
        if (versionsFile) {
          return path.join(resolvedPath, versionsFile);
        }
      } else if (stat.isFile()) {
        // If it's a component file, look in the same directory
        const dir = path.dirname(resolvedPath);
        const componentName = path.basename(resolvedPath, path.extname(resolvedPath));
        const versionsFile = path.join(dir, `${componentName}.versions.ts`);
        if (fs.existsSync(versionsFile)) {
          return versionsFile;
        }
      }
    }

    // Path doesn't exist as-is — try treating it as a component reference
    // e.g. "src/app/[orgSlug]/page" where "page.versions.ts" sits in that directory
    // Only strip known source extensions; dots in names (e.g. Button.icon) are preserved
    const dir = path.dirname(resolvedPath);
    let baseName = path.basename(resolvedPath);
    const ext = path.extname(baseName);
    if ([".tsx", ".ts", ".jsx", ".js"].includes(ext)) {
      baseName = baseName.slice(0, -ext.length);
    }
    if (fs.existsSync(dir) && fs.statSync(dir).isDirectory()) {
      const versionsFile = path.join(dir, `${baseName}.versions.ts`);
      if (fs.existsSync(versionsFile)) {
        return versionsFile;
      }
    }

    // Try searching by component name
    if (!componentPath.includes("/") && !componentPath.includes("\\")) {
      return this.recursiveSearchVersionsFile(process.cwd(), componentPath);
    }

    return null;
  }

  recursiveSearchVersionsFile(dir, componentName) {
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
            const found = this.recursiveSearchVersionsFile(
              path.join(dir, entry.name),
              componentName,
            );
            if (found) return found;
          }
        }
      }
    } catch {
      // Skip directories we can't read
    }

    return null;
  }

  versionIdToFileVersion(versionId) {
    // Convert v1_2 to 1_2
    return versionId.replace(/^v/, "");
  }

  detectFileExtension(versionId) {
    // Check which extension exists for this version
    const fileVersion = this.versionIdToFileVersion(versionId);
    const extensions = [".tsx", ".ts", ".jsx", ".js"];

    for (const ext of extensions) {
      const filePath = path.join(this.watchDir, `${this.componentName}.v${fileVersion}${ext}`);
      if (fs.existsSync(filePath)) {
        return ext;
      }
    }

    // Default to .tsx if none found
    return ".tsx";
  }

  getVersionFilePath(versionId) {
    const fileVersion = this.versionIdToFileVersion(versionId);
    const extension = this.detectFileExtension(versionId);
    return path.join(this.watchDir, `${this.componentName}.v${fileVersion}${extension}`);
  }

  getAllVersionFiles() {
    const files = fs.readdirSync(this.watchDir);
    const escaped = escapeRegExp(this.componentName);
    const versionPattern = new RegExp(`^${escaped}\\.v([\\d_]+)\\.(tsx?|jsx?)$`);
    return files
      .filter((file) => {
        const match = file.match(versionPattern);
        return match && fs.statSync(path.join(this.watchDir, file)).isFile();
      })
      .map((file) => path.join(this.watchDir, file));
  }

  readVersionFile() {
    if (!fs.existsSync(this.versionFile)) {
      throw new Error(`Version file not found: ${this.versionFile}`);
    }

    return fs.readFileSync(this.versionFile, "utf8");
  }

  cleanUpVersionFiles() {
    const versionFiles = this.getAllVersionFiles();

    console.log("\nCleaning up version files:");
    for (const file of versionFiles) {
      console.log(`  Deleting: ${path.basename(file)}`);
      fs.unlinkSync(file);
    }

    // Delete versions.ts
    if (fs.existsSync(this.versionsFilePath)) {
      console.log(`  Deleting: ${path.basename(this.versionsFilePath)}`);
      fs.unlinkSync(this.versionsFilePath);
    }

    // Delete UISwitcher.tsx
    if (fs.existsSync(this.uiSwitcherFile)) {
      console.log(`  Deleting: ${path.basename(this.uiSwitcherFile)}`);
      fs.unlinkSync(this.uiSwitcherFile);
    }
  }

  parseExportNameFromVersionsFile() {
    try {
      const content = fs.readFileSync(this.versionsFilePath, "utf8");
      const match = content.match(/@uifork-export\s+(\S+)/);
      return match ? match[1] : "default";
    } catch {
      return "default";
    }
  }

  replaceWrapperWithVersion() {
    const versionContent = this.readVersionFile();
    const exportName = this.parseExportNameFromVersionsFile();

    const baseComponentIdentifier = toPascalCaseIdentifier(this.componentName);
    const importSuffix = this.versionToImportSuffix(this.versionIdToFileVersion(this.versionId));
    const versionedComponentName = getVersionComponentIdentifier(
      this.componentName,
      this.versionIdToFileVersion(this.versionId),
    );
    const legacyVersionedComponentName = `${this.componentName}${importSuffix}`;

    let cleanedContent = versionContent;

    // Replace the versioned component name with the base component name
    // Handle various export patterns:

    // 1a. export default function ComponentNameV2
    cleanedContent = cleanedContent.replace(
      new RegExp(`export default function ${versionedComponentName}\\b`, "g"),
      `export default function ${baseComponentIdentifier}`,
    );
    cleanedContent = cleanedContent.replace(
      new RegExp(`export default function ${legacyVersionedComponentName}\\b`, "g"),
      `export default function ${baseComponentIdentifier}`,
    );

    // 1b. export function ComponentNameV2 (named, non-default)
    cleanedContent = cleanedContent.replace(
      new RegExp(`export function ${versionedComponentName}\\b`, "g"),
      `export function ${baseComponentIdentifier}`,
    );
    cleanedContent = cleanedContent.replace(
      new RegExp(`export function ${legacyVersionedComponentName}\\b`, "g"),
      `export function ${baseComponentIdentifier}`,
    );

    // 1c. export const ComponentNameV2 (named arrow/const, non-default)
    cleanedContent = cleanedContent.replace(
      new RegExp(`export const ${versionedComponentName}\\s*=`, "g"),
      `export const ${baseComponentIdentifier} =`,
    );
    cleanedContent = cleanedContent.replace(
      new RegExp(`export const ${legacyVersionedComponentName}\\s*=`, "g"),
      `export const ${baseComponentIdentifier} =`,
    );

    // 2. function ComponentNameV2 (non-exported references)
    cleanedContent = cleanedContent.replace(
      new RegExp(`function ${versionedComponentName}\\b`, "g"),
      `function ${baseComponentIdentifier}`,
    );
    cleanedContent = cleanedContent.replace(
      new RegExp(`function ${legacyVersionedComponentName}\\b`, "g"),
      `function ${baseComponentIdentifier}`,
    );

    // 3. const ComponentNameV2 = (arrow function, non-exported)
    cleanedContent = cleanedContent.replace(
      new RegExp(`const ${versionedComponentName}\\s*=`, "g"),
      `const ${baseComponentIdentifier} =`,
    );
    cleanedContent = cleanedContent.replace(
      new RegExp(`const ${legacyVersionedComponentName}\\s*=`, "g"),
      `const ${baseComponentIdentifier} =`,
    );

    // 4. Any other references to the versioned component name
    cleanedContent = cleanedContent.replace(
      new RegExp(`\\b${versionedComponentName}\\b`, "g"),
      baseComponentIdentifier,
    );
    cleanedContent = cleanedContent.replace(
      new RegExp(`\\b${legacyVersionedComponentName}\\b`, "g"),
      baseComponentIdentifier,
    );

    // For named exports, if the version file used `export function X` the rename
    // above already preserved it. If the original was a named export but the version
    // file happens to use `export default`, convert it to a named export to match.
    if (exportName !== "default") {
      cleanedContent = cleanedContent.replace(
        new RegExp(`export default (function|const|class)\\s+${escapeRegExp(baseComponentIdentifier)}\\b`),
        `export $1 ${baseComponentIdentifier}`,
      );
    }

    fs.writeFileSync(this.wrapperFile, cleanedContent, "utf8");
    console.log(
      `\n✅ Replaced ${path.basename(this.wrapperFile)} with content from ${this.versionId}`,
    );
  }

  versionToImportSuffix(versionStr) {
    // Convert 1_2 to V1_2 for import names
    return versionToImportSuffix(versionStr);
  }

  promote() {
    // Validate that version file exists
    if (!fs.existsSync(this.versionFile)) {
      throw new Error(`Version file not found: ${this.versionFile}`);
    }

    // Validate that wrapper file exists
    if (!fs.existsSync(this.wrapperFile)) {
      throw new Error(
        `Wrapper file not found: ${this.wrapperFile}. Make sure you've run 'npx uifork init' first.`,
      );
    }

    // Replace wrapper with version content
    this.replaceWrapperWithVersion();

    // Clean up all version-related files
    this.cleanUpVersionFiles();

    console.log("\n✅ Promotion complete!");
    console.log(
      `\nThe component ${this.componentName} now uses version ${this.versionId} as its main implementation.`,
    );
    console.log(`All versioning scaffolding has been removed.`);
  }
}

module.exports = { VersionPromoter };
