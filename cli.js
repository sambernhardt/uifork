#!/usr/bin/env node

const { UISwitcherScaffold } = require("./lib/init");
const { VersionSync } = require("./lib/watch");

function showHelp() {
  console.log(`
uifork - A CLI tool for managing UI component versions

Usage:
  uifork init <component-path>    Initialize a new UI switcher from a component file
  uifork watch <component-name>   Watch a component directory for version changes

Examples:
  uifork init frontend/src/SomeDropdownComponent.tsx
  uifork watch SomeDropdownComponent

Commands:
  init     Convert a single component file into a versioned UI switcher
  watch    Watch for changes in version files and automatically update versions.ts

Options:
  -h, --help     Show this help message
  -v, --version  Show version number
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
        "Example: uifork init frontend/src/modules/chart-builder/ZoomDatePickerDropdown.tsx"
      );
      process.exit(1);
    }

    try {
      const scaffolder = new UISwitcherScaffold(argument);
      scaffolder.scaffold();
    } catch (error) {
      console.error(`Error during scaffolding: ${error.message}`);
      process.exit(1);
    }
    break;

  case "watch":
    if (!argument) {
      console.error(
        "Error: Component name or path is required for watch command"
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
