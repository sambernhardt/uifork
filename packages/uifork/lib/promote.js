const fs = require("fs");
const path = require("path");

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
    // Remove file extension if present (e.g., "Component.tsx" -> "Component")
    // Version files are named like "Component.v1.tsx", not "Component.tsx.v1.tsx"
    const ext = path.extname(basename);
    if (ext) {
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
    const versionPattern = new RegExp(`^${this.componentName}\\.v([\\d_]+)\\.(tsx?|jsx?)$`);
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

  replaceWrapperWithVersion() {
    const versionContent = this.readVersionFile();

    // Clean up the version content - remove version-specific naming if needed
    // The component name in the version file might be like ComponentNameV2
    // We want to replace it with just ComponentName
    const importSuffix = this.versionToImportSuffix(this.versionIdToFileVersion(this.versionId));
    const versionedComponentName = `${this.componentName}${importSuffix}`;

    let cleanedContent = versionContent;

    // Replace the versioned component name with the base component name
    // Handle various export patterns:
    // 1. export default function ComponentNameV2
    cleanedContent = cleanedContent.replace(
      new RegExp(`export default function ${versionedComponentName}\\b`, "g"),
      `export default function ${this.componentName}`,
    );

    // 2. function ComponentNameV2 (in case it's not exported yet)
    cleanedContent = cleanedContent.replace(
      new RegExp(`function ${versionedComponentName}\\b`, "g"),
      `function ${this.componentName}`,
    );

    // 3. const ComponentNameV2 = (arrow function)
    cleanedContent = cleanedContent.replace(
      new RegExp(`const ${versionedComponentName}\\s*=`, "g"),
      `const ${this.componentName} =`,
    );

    // 4. Any other references to the versioned component name
    cleanedContent = cleanedContent.replace(
      new RegExp(`\\b${versionedComponentName}\\b`, "g"),
      this.componentName,
    );

    // Write the cleaned content to the wrapper file
    fs.writeFileSync(this.wrapperFile, cleanedContent, "utf8");
    console.log(
      `\n✅ Replaced ${path.basename(this.wrapperFile)} with content from ${this.versionId}`,
    );
  }

  versionToImportSuffix(versionStr) {
    // Convert 1_2 to V1_2 for import names
    return `V${versionStr.charAt(0).toUpperCase()}${versionStr.slice(1)}`;
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
