#!/usr/bin/env node

const { UISwitcherScaffold } = require("./lib/init");
const { VersionSync } = require("./lib/watch");
const { VersionPromoter } = require("./lib/promote");

function showHelp() {
  console.log(`
uifork - A CLI tool for managing UI component versions

Usage:
  uifork init <component-path>    Initialize a new UI switcher from a component file
  uifork watch <component-name>   Watch a component directory for version changes
  uifork promote <component-path> <version-id>  Promote a version to be the main component

Examples:
  uifork init frontend/src/SomeDropdownComponent.tsx
  uifork watch SomeDropdownComponent
  uifork promote SomeDropdownComponent v2

Commands:
  init     Convert a single component file into a versioned UI switcher
  watch    Watch for changes in version files and automatically update versions.ts
  promote  Promote a version to be the main component and remove versioning scaffolding

Options:
  -h, --help     Show this help message
  -v, --version  Show version number
  --W            Don't start watching after init (init command only)
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

// Handle help and version flags
if (args.includes("-h") || args.includes("--help")) {
  showHelp();
  process.exit(0);
}

if (args.includes("-v") || args.includes("--version")) {
  showVersion();
  process.exit(0);
}

// Handle commands
switch (command) {
  case "init":
    if (!argument) {
      console.error("Error: Component path is required for init command");
      console.error("Usage: uifork init <component-path>");
      console.error(
        "Example: uifork init frontend/src/modules/chart-builder/ZoomDatePickerDropdown.tsx",
      );
      process.exit(1);
    }

    try {
      const shouldWatch = !args.includes("--W");
      const scaffolder = new UISwitcherScaffold(argument, shouldWatch);
      scaffolder.scaffold();
    } catch (error) {
      console.error(`Error during scaffolding: ${error.message}`);
      process.exit(1);
    }
    break;

  case "watch":
    if (!argument) {
      console.error(
        "Error: Component name or path is required for watch command",
      );
      console.error("Usage: uifork watch <component-name-or-path>");
      console.error("Example: uifork watch ZoomDatePickerDropdown");
      process.exit(1);
    }

    try {
      new VersionSync(argument);
    } catch (error) {
      console.error(`Error during watching: ${error.message}`);
      process.exit(1);
    }
    break;

  case "promote":
    if (!argument) {
      console.error(
        "Error: Component path and version ID are required for promote command",
      );
      console.error("Usage: uifork promote <component-path> <version-id>");
      console.error("Example: uifork promote SomeDropdownComponent v2");
      console.error(
        "Example: uifork promote frontend/src/SomeDropdownComponent.tsx v1_2",
      );
      process.exit(1);
    }

    const versionId = args[2];
    if (!versionId) {
      console.error("Error: Version ID is required for promote command");
      console.error("Usage: uifork promote <component-path> <version-id>");
      console.error("Example: uifork promote SomeDropdownComponent v2");
      console.error(
        "Example: uifork promote frontend/src/SomeDropdownComponent.tsx v1_2",
      );
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
