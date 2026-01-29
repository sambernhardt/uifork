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

    console.log(
      `Scaffolding branched component from: ${this.originalFilePath}`,
    );
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

  createWrapper() {
    // Import BranchedComponent from uifork package
    const versionsImportPath = `./${this.componentName}.versions`;
    const wrapperContent = `import { BranchedComponent } from "uifork"
import { VERSIONS } from "${versionsImportPath}"

export default function ${this.componentName}(props: any) {
  return (
    <BranchedComponent
      id="${this.componentName}"
      versions={VERSIONS}
      props={props}
    />
  )
}

export { VERSIONS }
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
    this.createWrapper();

    console.log("\n✅ Scaffolding complete!");
    console.log("\nNext steps:");
    console.log(
      `1. Your original component is now ${this.componentName}.v1${this.originalExtension}`,
    );
    console.log(`2. Add <UIFork /> to your app root (only in development):`);
    console.log(`
   import { UIFork } from "uifork"
   
   function App() {
     return (
       <>
         <YourApp />
         {process.env.NODE_ENV === "development" && <UIFork />}
       </>
     )
   }
`);
    if (this.shouldWatch) {
      console.log("3. Starting watch mode...");
      console.log(
        `4. Add new versions by creating ${this.componentName}.v2${this.originalExtension}, ${this.componentName}.v1_1${this.originalExtension}, etc.`,
      );
      console.log(
        `5. Import the component: import ${this.componentName} from './${this.componentName}'`,
      );
      // Start watching automatically
      new VersionSync(this.parentDir);
    } else {
      console.log(`3. Run: uifork watch (to start the watch server)`);
      console.log(
        `4. Add new versions by creating ${this.componentName}.v2${this.originalExtension}, ${this.componentName}.v1_1${this.originalExtension}, etc.`,
      );
      console.log(
        `5. Import the component: import ${this.componentName} from './${this.componentName}'`,
      );
    }
  }
}

module.exports = { UISwitcherScaffold };
