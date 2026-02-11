#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { UISwitcherScaffold } = require("./lib/init");
const { VersionSync } = require("./lib/watch");
const { VersionPromoter } = require("./lib/promote");
const { findComponentManager } = require("./lib/cli-helpers");
const { getVersionComponentIdentifier } = require("./lib/component-naming");

function showHelp() {
  console.log(`
uifork - A CLI tool for managing UI component versions

Usage:
  uifork <component-path>                         Initialize a new forked component (shorthand)
  uifork init <component-path>                    Initialize a new forked component (explicit)
  uifork watch [directory] [--port <port>]         Watch for version changes (defaults to current directory)
  uifork new <component-path> [version-id]        Create a new version
  uifork fork <component-path> <version-id> [target-version]  Fork/duplicate a version
  uifork rename <component-path> <version-id> <new-version-id>  Rename a version
  uifork delete <component-path> <version-id>    Delete a version
  uifork promote <component-path> <version-id>   Promote a version to be the main component

Examples:
  uifork frontend/src/SomeDropdownComponent.tsx
  uifork init frontend/src/SomeDropdownComponent.tsx
  uifork watch
  uifork watch ./src
  uifork watch --port 3002
  uifork watch ./src --port 3002
  uifork new SomeDropdownComponent
  uifork new SomeDropdownComponent v3
  uifork fork SomeDropdownComponent v1 v2
  uifork rename SomeDropdownComponent v1 v2
  uifork delete SomeDropdownComponent v2
  uifork promote SomeDropdownComponent v2

Commands:
  init      Convert a single component file into a versioned forked component (explicit form)
  watch     Start the watch server and discover all versioned components
  new       Create a new version (auto-increments if version-id not provided)
  fork      Fork/duplicate a version (auto-increments target if not provided)
  rename    Rename a version
  delete    Delete a version
  promote   Promote a version to be the main component and remove versioning scaffolding

Aliases:
  duplicate  Alias for fork

Options:
  -h, --help     Show this help message
  -v, --version  Show version number
  -w             Start watching after init (init command only)
  --port <port>  Port for the watch server (default: 3030); also respects PORT env var
  --lazy         Use lazy loading for component versions (watch command only)
`);
}

function showVersion() {
  const packageJson = require("./package.json");
  console.log(`uifork v${packageJson.version}`);
}

// Parse command line arguments
const args = process.argv.slice(2);
const command = args[0];
const argument = args[1];

// Known commands
const knownCommands = [
  "init",
  "watch",
  "new",
  "fork",
  "rename",
  "delete",
  "promote",
  "duplicate",
  "create",
];

// Handle help and version flags
if (args.includes("-h") || args.includes("--help")) {
  showHelp();
  process.exit(0);
}

if (args.includes("-v") || args.includes("--version")) {
  showVersion();
  process.exit(0);
}

// If command is not a known command and exists, treat it as a component path (shorthand init)
if (command && !knownCommands.includes(command)) {
  // Treat command as component path and initialize
  try {
    const shouldWatch = args.includes("-w") || args.includes("--watch");
    const scaffolder = new UISwitcherScaffold(command, shouldWatch);
    scaffolder.scaffold();
  } catch (error) {
    console.error(`Error during scaffolding: ${error.message}`);
    console.error(
      "Usage: uifork <component-path> or uifork init <component-path>",
    );
    console.error(
      "Example: uifork frontend/src/modules/chart-builder/ZoomDatePickerDropdown.tsx",
    );
    process.exit(1);
  }
  process.exit(0);
}

// Handle commands
switch (command) {
  case "init":
    if (!argument) {
      console.error("Error: Component path is required for init command");
      console.error("Usage: uifork <component-path> or uifork init <component-path>");
      console.error(
        "Example: uifork frontend/src/modules/chart-builder/ZoomDatePickerDropdown.tsx",
      );
      console.error(
        "Example: uifork init frontend/src/modules/chart-builder/ZoomDatePickerDropdown.tsx",
      );
      process.exit(1);
    }

    try {
      const shouldWatch = args.includes("-w") || args.includes("--watch");
      const scaffolder = new UISwitcherScaffold(argument, shouldWatch);
      scaffolder.scaffold();
    } catch (error) {
      console.error(`Error during scaffolding: ${error.message}`);
      process.exit(1);
    }
    break;

  case "watch":
    // Watch can be called without arguments - defaults to current directory
    // Parse --lazy flag
    const lazyMode = args.includes("--lazy");
    // Parse --port flag
    const portIndex = args.indexOf("--port");
    const watchPort =
      portIndex !== -1 && args[portIndex + 1]
        ? parseInt(args[portIndex + 1], 10)
        : undefined;
    // Filter out flags to get the actual directory argument
    const watchDir = args.find(
      (arg, index) =>
        index > 0 &&
        !arg.startsWith("--") &&
        arg !== "watch" &&
        (index !== portIndex + 1 || isNaN(parseInt(arg, 10))),
    );
    try {
      new VersionSync(watchDir || process.cwd(), {
        lazy: lazyMode,
        ...(watchPort && !isNaN(watchPort) ? { port: watchPort } : {}),
      });
    } catch (error) {
      console.error(`Error during watching: ${error.message}`);
      process.exit(1);
    }
    break;

  case "promote":
    if (!argument) {
      console.error("Error: Component path and version ID are required for promote command");
      console.error("Usage: uifork promote <component-path> <version-id>");
      console.error("Example: uifork promote SomeDropdownComponent v2");
      console.error("Example: uifork promote frontend/src/SomeDropdownComponent.tsx v1_2");
      process.exit(1);
    }

    const versionId = args[2];
    if (!versionId) {
      console.error("Error: Version ID is required for promote command");
      console.error("Usage: uifork promote <component-path> <version-id>");
      console.error("Example: uifork promote SomeDropdownComponent v2");
      console.error("Example: uifork promote frontend/src/SomeDropdownComponent.tsx v1_2");
      process.exit(1);
    }

    try {
      const promoter = new VersionPromoter(argument, versionId);
      promoter.promote();
    } catch (error) {
      console.error(`Error during promotion: ${error.message}`);
      process.exit(1);
    }
    break;

  case "new":
  case "create":
    if (!argument) {
      console.error("Error: Component path is required");
      console.error("Usage: uifork new <component-path> [version-id]");
      console.error("Example: uifork new SomeDropdownComponent");
      console.error("Example: uifork new SomeDropdownComponent v3");
      process.exit(1);
    }

    try {
      const manager = findComponentManager(argument);
      const versionId = args[2]; // Optional version ID

      let targetVersion;
      if (versionId) {
        if (!manager.validateVersionKey(versionId)) {
          throw new Error(`Invalid version format: ${versionId}`);
        }
        targetVersion = versionId;
      } else {
        const nextVersionNum = manager.getNextVersionNumber();
        targetVersion = manager.versionNumberToKey(nextVersionNum);
      }

      const targetFilePath = manager.getVersionFilePath(targetVersion);
      if (fs.existsSync(targetFilePath)) {
        throw new Error(`Version already exists: ${targetVersion}`);
      }

      const extension = manager.getMostCommonExtension();
      const fileVersion = manager.versionKeyToFileVersion(targetVersion);
      const finalFilePath = path.join(
        manager.watchDir,
        `${manager.componentName}.v${fileVersion}${extension}`,
      );

      const displayVersion = targetVersion.replace(/^v/, "").replace(/_/g, ".").toUpperCase();

      const componentName = getVersionComponentIdentifier(manager.componentName, fileVersion);

      let templateContent;
      if (extension === ".tsx" || extension === ".jsx") {
        templateContent = `import React from 'react';

export default function ${componentName}() {
  return (
    <div>
      ${displayVersion}
    </div>
  );
}
`;
      } else {
        templateContent = `import React from 'react';

export default function ${componentName}() {
  return React.createElement('div', null, '${displayVersion}');
}
`;
      }

      fs.writeFileSync(finalFilePath, templateContent, "utf8");
      manager.generateVersionsFile();

      console.log(`✅ Created new version: ${targetVersion}`);
      console.log(`   Component: ${manager.componentName}`);
      console.log(`   File: ${path.basename(finalFilePath)}`);
    } catch (error) {
      console.error(`Error creating version: ${error.message}`);
      process.exit(1);
    }
    break;

  case "fork":
  case "duplicate":
    if (!argument) {
      console.error("Error: Component path and version ID are required");
      console.error("Usage: uifork fork <component-path> <version-id> [target-version]");
      console.error("Example: uifork fork SomeDropdownComponent v1");
      console.error("Example: uifork fork SomeDropdownComponent v1 v2");
      process.exit(1);
    }

    const sourceVersion = args[2];
    if (!sourceVersion) {
      console.error("Error: Source version ID is required");
      console.error("Usage: uifork fork <component-path> <version-id> [target-version]");
      process.exit(1);
    }

    try {
      const manager = findComponentManager(argument);

      if (!manager.validateVersionKey(sourceVersion)) {
        throw new Error(`Invalid source version format: ${sourceVersion}`);
      }

      const sourceFilePath = manager.getVersionFilePath(sourceVersion);
      if (!fs.existsSync(sourceFilePath)) {
        throw new Error(`Source version file not found: ${sourceVersion}`);
      }

      let targetVersion;
      const newVersion = args[3]; // Optional target version
      if (newVersion) {
        if (!manager.validateVersionKey(newVersion)) {
          throw new Error(`Invalid target version format: ${newVersion}`);
        }
        targetVersion = newVersion;
      } else {
        const nextVersionNum = manager.getNextVersionNumber();
        targetVersion = manager.versionNumberToKey(nextVersionNum);
      }

      const targetFilePath = manager.getVersionFilePath(targetVersion);
      if (fs.existsSync(targetFilePath)) {
        throw new Error(`Target version already exists: ${targetVersion}`);
      }

      const sourceContent = fs.readFileSync(sourceFilePath, "utf8");
      const extension = path.extname(sourceFilePath);
      const fileVersion = manager.versionKeyToFileVersion(targetVersion);
      const finalTargetPath = path.join(
        manager.watchDir,
        `${manager.componentName}.v${fileVersion}${extension}`,
      );

      fs.writeFileSync(finalTargetPath, sourceContent, "utf8");
      manager.generateVersionsFile();

      console.log(`✅ Forked version: ${sourceVersion} → ${targetVersion}`);
      console.log(`   Component: ${manager.componentName}`);
      console.log(`   Source: ${path.basename(sourceFilePath)}`);
      console.log(`   Target: ${path.basename(finalTargetPath)}`);
    } catch (error) {
      console.error(`Error forking version: ${error.message}`);
      process.exit(1);
    }
    break;

  case "rename":
    if (!argument) {
      console.error("Error: Component path, version ID, and new version ID are required");
      console.error("Usage: uifork rename <component-path> <version-id> <new-version-id>");
      console.error("Example: uifork rename SomeDropdownComponent v1 v2");
      process.exit(1);
    }

    const oldVersion = args[2];
    const newVersionId = args[3];

    if (!oldVersion || !newVersionId) {
      console.error("Error: Both version ID and new version ID are required");
      console.error("Usage: uifork rename <component-path> <version-id> <new-version-id>");
      process.exit(1);
    }

    try {
      const manager = findComponentManager(argument);

      if (!manager.validateVersionKey(oldVersion)) {
        throw new Error(`Invalid source version format: ${oldVersion}`);
      }

      if (!manager.validateVersionKey(newVersionId)) {
        throw new Error(`Invalid target version format: ${newVersionId}`);
      }

      if (oldVersion === newVersionId) {
        throw new Error("Source and target versions are the same");
      }

      const fileVersion = manager.versionKeyToFileVersion(oldVersion);
      const extensions = [".tsx", ".ts", ".jsx", ".js"];
      let sourceFilePath = null;

      for (const ext of extensions) {
        const candidatePath = path.join(
          manager.watchDir,
          `${manager.componentName}.v${fileVersion}${ext}`,
        );
        if (fs.existsSync(candidatePath)) {
          sourceFilePath = candidatePath;
          break;
        }
      }

      if (!sourceFilePath) {
        throw new Error(
          `Source version file not found: ${oldVersion}. Checked: ${extensions
            .map((ext) => `${manager.componentName}.v${fileVersion}${ext}`)
            .join(", ")}`,
        );
      }

      const targetFileVersion = manager.versionKeyToFileVersion(newVersionId);
      let targetFilePath = null;
      for (const ext of extensions) {
        const candidatePath = path.join(
          manager.watchDir,
          `${manager.componentName}.v${targetFileVersion}${ext}`,
        );
        if (fs.existsSync(candidatePath)) {
          targetFilePath = candidatePath;
          break;
        }
      }

      if (targetFilePath) {
        throw new Error(`Target version already exists: ${newVersionId}`);
      }

      const extension = path.extname(sourceFilePath);
      const finalTargetPath = path.join(
        manager.watchDir,
        `${manager.componentName}.v${targetFileVersion}${extension}`,
      );

      const sourceContent = fs.readFileSync(sourceFilePath, "utf8");

      const oldComponentName = getVersionComponentIdentifier(manager.componentName, fileVersion);
      const newComponentName = getVersionComponentIdentifier(
        manager.componentName,
        targetFileVersion,
      );

      const updatedContent = sourceContent.replace(
        new RegExp(oldComponentName, "g"),
        newComponentName,
      );

      fs.writeFileSync(finalTargetPath, updatedContent, "utf8");
      fs.unlinkSync(sourceFilePath);
      manager.generateVersionsFile();

      console.log(`✅ Renamed version: ${oldVersion} → ${newVersionId}`);
      console.log(`   Component: ${manager.componentName}`);
      console.log(`   Source: ${path.basename(sourceFilePath)}`);
      console.log(`   Target: ${path.basename(finalTargetPath)}`);
    } catch (error) {
      console.error(`Error renaming version: ${error.message}`);
      process.exit(1);
    }
    break;

  case "delete":
    if (!argument) {
      console.error("Error: Component path and version ID are required");
      console.error("Usage: uifork delete <component-path> <version-id>");
      console.error("Example: uifork delete SomeDropdownComponent v2");
      process.exit(1);
    }

    const deleteVersionId = args[2];
    if (!deleteVersionId) {
      console.error("Error: Version ID is required");
      console.error("Usage: uifork delete <component-path> <version-id>");
      process.exit(1);
    }

    try {
      const manager = findComponentManager(argument);

      if (!manager.validateVersionKey(deleteVersionId)) {
        throw new Error(`Invalid version format: ${deleteVersionId}`);
      }

      const filePath = manager.getVersionFilePath(deleteVersionId);
      if (!fs.existsSync(filePath)) {
        throw new Error(`Version file not found: ${deleteVersionId}`);
      }

      const versionFiles = manager.getVersionFiles();
      if (versionFiles.length === 1) {
        throw new Error(
          "Cannot delete the last remaining version. At least one version must exist.",
        );
      }

      fs.unlinkSync(filePath);
      manager.generateVersionsFile();

      console.log(`✅ Deleted version: ${deleteVersionId}`);
      console.log(`   Component: ${manager.componentName}`);
      console.log(`   File: ${path.basename(filePath)}`);
    } catch (error) {
      console.error(`Error deleting version: ${error.message}`);
      process.exit(1);
    }
    break;

  default:
    if (!command) {
      showHelp();
      process.exit(0);
    } else {
      console.error(`Unknown command: ${command}`);
      console.error('Run "uifork --help" for available commands');
      process.exit(1);
    }
}
