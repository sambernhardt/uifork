const fs = require("fs");
const path = require("path");
const { VersionSync } = require("./watch");

class UISwitcherScaffold {
  constructor(filePath, shouldWatch = true) {
    this.shouldWatch = shouldWatch;
    this.originalFilePath = path.resolve(filePath);

    if (!fs.existsSync(this.originalFilePath)) {
      console.error(`File does not exist: ${this.originalFilePath}`);
      process.exit(1);
    }

    const parsedPath = path.parse(this.originalFilePath);
    this.componentName = parsedPath.name;
    this.parentDir = parsedPath.dir;
    this.originalExtension = parsedPath.ext; // Preserve .tsx or .ts
    this.v1File = path.join(
      this.parentDir,
      `${this.componentName}.v1${this.originalExtension}`,
    );
    this.versionsFile = path.join(
      this.parentDir,
      `${this.componentName}.versions.ts`,
    );
    this.uiSwitcherFile = path.join(
      this.parentDir,
      `${this.componentName}.UISwitcher.tsx`,
    );

    console.log(`Scaffolding UI Switcher from: ${this.originalFilePath}`);
    console.log(`Component name: ${this.componentName}`);
    console.log(`Target directory: ${this.parentDir}`);
  }

  moveOriginalToV1() {
    // Move the original file to ComponentName.v1.tsx in the same directory
    fs.renameSync(this.originalFilePath, this.v1File);
    console.log(
      `Moved: ${path.basename(this.originalFilePath)} → ${path.basename(this.v1File)}`,
    );
  }

  createVersionsFile() {
    // Remove extension from import path (e.g., Button.v1.tsx -> ./Button.v1)
    const v1ImportPath = `./${this.componentName}.v1`;
    const versionsContent = `import ${this.componentName}V1 from "${v1ImportPath}"

export const VERSIONS = {
  "v1": {
    render: ${this.componentName}V1,
    label: "V1",
  },
}
`;

    fs.writeFileSync(this.versionsFile, versionsContent);
    console.log(`Created: ${path.basename(this.versionsFile)}`);
  }

  createUISwitcher() {
    // Resolve template path relative to the project root (lib/init.js -> ../templates/UISwitcher.tsx)
    const templatePath = path.join(
      __dirname,
      "..",
      "templates",
      "UISwitcher.tsx",
    );

    if (!fs.existsSync(templatePath)) {
      console.error(`Template file not found: ${templatePath}`);
      process.exit(1);
    }

    const uiSwitcherContent = fs.readFileSync(templatePath, "utf8");

    fs.writeFileSync(this.uiSwitcherFile, uiSwitcherContent);
    console.log(`Created: ${path.basename(this.uiSwitcherFile)}`);
  }

  createWrapper() {
    // Import paths don't include extensions
    const uiSwitcherImportPath = `./${this.componentName}.UISwitcher`;
    const versionsImportPath = `./${this.componentName}.versions`;
    const wrapperContent = `import { UISwitcher } from "${uiSwitcherImportPath}"
import { VERSIONS } from "${versionsImportPath}"

export default function ${this.componentName}(props: any) {
  return (
    <UISwitcher
      id="${this.componentName}-switcher"
      versions={VERSIONS}
      props={props}
    />
  )
}

export { UISwitcher, VERSIONS }
`;

    const wrapperFile = path.join(
      this.parentDir,
      `${this.componentName}${this.originalExtension}`,
    );
    fs.writeFileSync(wrapperFile, wrapperContent);
    console.log(`Created wrapper: ${path.basename(wrapperFile)}`);
  }

  scaffold() {
    this.moveOriginalToV1();
    this.createVersionsFile();
    this.createUISwitcher();
    this.createWrapper();

    console.log("\n✅ Scaffolding complete!");
    console.log("\nNext steps:");
    console.log(
      `1. Your original component is now ${this.componentName}.v1${this.originalExtension}`,
    );
    if (this.shouldWatch) {
      console.log("2. Starting watch mode...");
      console.log(
        `3. Add new versions by creating ${this.componentName}.v2${this.originalExtension}, ${this.componentName}.v1_1${this.originalExtension}, etc.`,
      );
      console.log(
        `4. Import the component: import ${this.componentName} from './${this.componentName}'`,
      );
      // Start watching automatically
      new VersionSync(this.versionsFile);
    } else {
      console.log(
        `2. Run: uifork watch ${path.relative(process.cwd(), this.versionsFile)} (to watch for changes)`,
      );
      console.log(
        `3. Add new versions by creating ${this.componentName}.v2${this.originalExtension}, ${this.componentName}.v1_1${this.originalExtension}, etc.`,
      );
      console.log(
        `4. Import the component: import ${this.componentName} from './${this.componentName}'`,
      );
    }
  }
}

module.exports = { UISwitcherScaffold };
