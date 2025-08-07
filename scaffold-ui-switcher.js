#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

class UISwitcherScaffold {
  constructor(filePath) {
    this.originalFilePath = path.resolve(filePath);

    if (!fs.existsSync(this.originalFilePath)) {
      console.error(`File does not exist: ${this.originalFilePath}`);
      process.exit(1);
    }

    const parsedPath = path.parse(this.originalFilePath);
    this.componentName = parsedPath.name;
    this.parentDir = parsedPath.dir;
    this.componentDir = path.join(this.parentDir, this.componentName);
    this.v1File = path.join(this.componentDir, "v1.tsx");

    console.log(`Scaffolding UI Switcher from: ${this.originalFilePath}`);
    console.log(`Component name: ${this.componentName}`);
    console.log(`Target directory: ${this.componentDir}`);
  }

  createDirectory() {
    if (fs.existsSync(this.componentDir)) {
      console.log(`Directory ${this.componentName} already exists!`);
      process.exit(1);
    }

    fs.mkdirSync(this.componentDir, { recursive: true });
    console.log(`Created directory: ${this.componentName}/`);
  }

  moveOriginalToV1() {
    // Move the original file to v1.tsx in the new directory
    fs.renameSync(this.originalFilePath, this.v1File);
    console.log(`Moved: ${path.basename(this.originalFilePath)} → v1.tsx`);
  }

  createVersionsFile() {
    const versionsContent = `import ${this.componentName}V1 from "./v1"

export const VERSIONS = {
  "v1": {
    render: ${this.componentName}V1,
    label: "V1",
  },
}
`;

    const versionsFile = path.join(this.componentDir, "versions.ts");
    fs.writeFileSync(versionsFile, versionsContent);
    console.log("Created: versions.ts");
  }

  createUISwitcher() {
    const uiSwitcherContent = `import { SelectField } from "your-ui-library/SelectField"
import { useLocalStorage } from "hooks/useLocalStorage"
import { type ReactNode, useEffect } from "react"
import { createPortal } from "react-dom"

type VersionType<T extends Record<string, unknown>> = {
  render: (props: T) => ReactNode
  description?: string
  label: string
}

type VersionsType<T extends Record<string, unknown>> = {
  [key: string]: VersionType<T>
}

type UISwitcherProps<T extends Record<string, unknown>> = {
  id: string
  versions: VersionsType<T>
  defaultVersion?: string
  props: T
  showSwitcher?: boolean
}

export const UISwitcher = <T extends Record<string, unknown>>({
  id,
  versions,
  defaultVersion,
  props,
  showSwitcher = true,
}: UISwitcherProps<T>) => {
  const versionKeys = Object.keys(versions)
  const [activeVersion, setActiveVersion] = useLocalStorage<string>(
    id,
    defaultVersion || versionKeys[0],
    true
  )

  useEffect(() => {
    if (!versionKeys.includes(activeVersion)) {
      setActiveVersion(versionKeys[0])
    }
  }, [activeVersion, versionKeys, setActiveVersion])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!e.metaKey) return

      const currentIndex = versionKeys.indexOf(activeVersion)

      if (e.key === "ArrowDown") {
        e.preventDefault()
        const prevIndex = currentIndex - 1
        const newVersion =
          versionKeys[prevIndex >= 0 ? prevIndex : versionKeys.length - 1]
        setActiveVersion(newVersion)
      }

      if (e.key === "ArrowUp") {
        e.preventDefault()
        const nextIndex = currentIndex + 1
        const newVersion =
          versionKeys[nextIndex < versionKeys.length ? nextIndex : 0]
        setActiveVersion(newVersion)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [activeVersion, versionKeys, setActiveVersion])

  const Version =
    versions[activeVersion]?.render || versions[versionKeys[0]].render

  return (
    <>
      <Version {...props} />
      {createPortal(
        showSwitcher && (
          <div
            style={{
              position: "fixed",
              bottom: "20px",
              right: "20px",
              zIndex: 1000,
            }}
          >
            <SelectField
              selectedKey={activeVersion}
              onSelectionChange={setActiveVersion}
              aria-label="Select UI version"
              style={{
                padding: "8px",
                borderRadius: "4px",
                boxShadow: "0 2px 10px rgba(0, 0, 0, 0.1)",
              }}
            >
              {versionKeys.toReversed().map((key) => (
                <SelectField.Option key={key} id={key}>
                  <div className="flex flex-col">
                    <div>{versions[key].label}</div>
                    {versions[key].description && (
                      <div className="text-xs text-fg-secondary">
                        {versions[key].description}
                      </div>
                    )}
                  </div>
                </SelectField.Option>
              ))}
            </SelectField>
          </div>
        ),
        document.body
      )}
    </>
  )
}
`;

    const uiSwitcherFile = path.join(this.componentDir, "UISwitcher.tsx");
    fs.writeFileSync(uiSwitcherFile, uiSwitcherContent);
    console.log("Created: UISwitcher.tsx");
  }

  createIndexFile() {
    const indexContent = `import { UISwitcher } from "./UISwitcher"
import { VERSIONS } from "./versions"

export default function ${this.componentName}(props: any) {
  return (
    <UISwitcher
      id="my-switcher-component"
      versions={VERSIONS}
      props={props}
    />
  )
}

export { UISwitcher, VERSIONS }
`;

    const indexFile = path.join(this.componentDir, "index.tsx");
    fs.writeFileSync(indexFile, indexContent);
    console.log("Created: index.tsx");
  }

  createReadme() {
    const readmeContent = `# ${this.componentName} UI Switcher

This directory contains a versioned UI component with a switcher interface.

## Structure

- \`index.tsx\` - Main export that uses the UISwitcher
- \`UISwitcher.tsx\` - The switcher component that manages versions
- \`versions.ts\` - Configuration file that exports all versions
- \`v1.tsx\` - Version 1 of your component
- \`v*.tsx\` - Additional versions (create as needed)

## Usage

\`\`\`tsx
import ${this.componentName} from "./${this.componentName}"

// Use the component with the switcher
<${this.componentName} yourProp="value" />

// Or import individual parts
import { UISwitcher, VERSIONS } from "./${this.componentName}"
<UISwitcher id="custom-id" versions={VERSIONS} props={{ yourProp: "value" }} />
\`\`\`

## Adding New Versions

1. Create a new version file: \`v2.tsx\`, \`v1_1.tsx\`, etc.
2. The \`version-sync.js\` script will automatically update \`versions.ts\`
3. Or manually add the import and version to \`versions.ts\`

## Controls

- **Cmd + Arrow Up/Down**: Cycle through versions
- **Bottom-right selector**: Click to choose specific version
- Selections are saved to localStorage per component ID

## File Watching

Use the \`version-sync.js\` script to automatically sync version files:

\`\`\`bash
node version-sync.js ${this.componentName}
\`\`\`

This will:
- Watch for new version files (v*.tsx)
- Auto-update imports in versions.ts
- Handle file renames bidirectionally
`;

    const readmeFile = path.join(this.componentDir, "README.md");
    fs.writeFileSync(readmeFile, readmeContent);
    console.log("Created: README.md");
  }

  scaffold() {
    this.createDirectory();
    this.moveOriginalToV1();
    this.createVersionsFile();
    this.createUISwitcher();
    this.createIndexFile();
    this.createReadme();

    console.log("\\n✅ Scaffolding complete!");
    console.log("\\nNext steps:");
    console.log(`1. cd ${this.componentName}`);
    console.log("2. Your original component is now v1.tsx");
    console.log("3. Run: node ../../version-sync.js . (to watch for changes)");
    console.log("4. Add new versions by creating v2.tsx, v1_1.tsx, etc.");
    console.log(
      `5. Import the new switcher: import ${this.componentName} from './${this.componentName}'`
    );
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const filePath = args[0];

if (!filePath) {
  console.error("Usage: node scaffold-ui-switcher.js <path-to-component-file>");
  console.error(
    "Example: node scaffold-ui-switcher.js frontend/src/SomeDropdownComponent.tsx"
  );
  process.exit(1);
}

// Start scaffolding
const scaffolder = new UISwitcherScaffold(filePath);
scaffolder.scaffold();
