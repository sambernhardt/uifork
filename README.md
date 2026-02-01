# uifork

A CLI tool and React component library for managing UI component versions. Create multiple versions of your components, let stakeholders switch between them to test and gather feedback, and promote the best one when you're ready.

UIFork is designed for **testing and feedback** - use it locally during development, or deploy it to preview/staging environments so team members and stakeholders can compare UI variations before going to production.

## Installation

```bash
npm install uifork
```

Or use yarn, pnpm, or bun.

## Quick Start

### 1. Add UIFork to your app

Add the component anywhere in your React app, ideally at the root level. You control when it's shown - typically in local development and preview/staging environments (but not production).

```tsx
import { UIFork } from "uifork";

const showUIFork = process.env.NODE_ENV !== "production";

function App() {
  return (
    <>
      <YourApp />
      {showUIFork && <UIFork />}
    </>
  );
}
```

No separate CSS import is needed - styles are automatically included.

### 2. Initialize a component for versioning

```bash
npx uifork init src/components/Button.tsx
```

This will:

- Convert your component into a forked component that can be versioned
- Generate a `versions.ts` file to track all versions
- Start the watch server

### 3. Use your component as usual

```tsx
import Button from "./components/Button";

// Works exactly as before - the active version is controlled by the UIFork widget
<Button onClick={handleClick}>Click me</Button>;
```

## Framework Examples

### Vite

```tsx
import { UIFork } from "uifork";

// Show in dev and preview, hide in production
const showUIFork = import.meta.env.MODE !== "production";

function App() {
  return (
    <>
      <YourApp />
      {showUIFork && <UIFork />}
    </>
  );
}
```

### Next.js (App Router)

```tsx
// components/UIForkProvider.tsx
"use client";
import { UIFork } from "uifork";

export function UIForkProvider() {
  // Show in dev and preview, hide in production
  if (process.env.NODE_ENV === "production") return null;
  return <UIFork />;
}

// app/layout.tsx
import { UIForkProvider } from "@/components/UIForkProvider";

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <UIForkProvider />
      </body>
    </html>
  );
}
```

### Next.js (Pages Router)

```tsx
// pages/_app.tsx
import { UIFork } from "uifork";

export default function App({ Component, pageProps }) {
  return (
    <>
      <Component {...pageProps} />
      {process.env.NODE_ENV !== "production" && <UIFork />}
    </>
  );
}
```

### Custom Environment Gating

For more control over when UIFork appears, use custom environment variables:

```tsx
// Enable via NEXT_PUBLIC_ENABLE_UIFORK=true or VITE_ENABLE_UIFORK=true
const showUIFork =
  process.env.NODE_ENV !== "production" ||
  process.env.NEXT_PUBLIC_ENABLE_UIFORK === "true";

function App() {
  return (
    <>
      <YourApp />
      {showUIFork && <UIFork />}
    </>
  );
}
```

This is useful when you want to:
- Show UIFork on specific preview branches
- Enable it for internal stakeholders on a staging domain
- Gate it behind a feature flag

## CLI Commands

After installing `uifork` locally, use `npx` to run the CLI commands:

### `npx uifork init <component-path>`

Initialize versioning for an existing component.

```bash
npx uifork init src/components/Dropdown.tsx
```

Options:

- `-w` - Start watching after init (default: don't watch)

### `npx uifork watch [directory]`

Start the watch server. This enables the UI widget to communicate with your codebase.

```bash
# Watch current directory (default)
npx uifork watch

# Watch a specific directory
npx uifork watch ./src
```

### `npx uifork new <component-path> [version-id]`

Create a new empty version file.

```bash
# Auto-increment version number
npx uifork new Button

# Specify version explicitly
npx uifork new Button v3
```

### `npx uifork fork <component-path> <version-id> [target-version]`

Fork an existing version to create a new one.

```bash
# Fork v1 to auto-incremented version
npx uifork fork Button v1

# Fork v1 to specific version
npx uifork fork Button v1 v2
```

Alias: `npx uifork duplicate`

### `npx uifork rename <component-path> <version-id> <new-version-id>`

Rename a version.

```bash
npx uifork rename Button v1 v2
```

### `npx uifork delete <component-path> <version-id>`

Delete a version (must have at least one version remaining).

```bash
npx uifork delete Button v2
```

### `npx uifork promote <component-path> <version-id>`

Promote a version to be the main component and remove all versioning scaffolding.

```bash
npx uifork promote Button v2
```

This will:

- Replace `Button.tsx` with the content from `Button.v2.tsx`
- Delete all version files (`Button.v*.tsx`)
- Delete `Button.versions.ts`
- Effectively "undo" the versioning system, leaving just the promoted version

## React Components

### `UIFork`

A floating UI widget for testing and gathering feedback on component variations. It connects to the watch server via WebSocket and allows you and your stakeholders to:

- **Switch versions** - Click on any version to switch to it
- **Create new versions** - Click the "+" button to create a blank version
- **Fork versions** - Fork an existing version to iterate on it
- **Rename versions** - Give versions meaningful names
- **Delete versions** - Remove versions you no longer need
- **Promote versions** - When satisfied, promote a version to become the main component
- **Open in editor** - Click to open the version file in VS Code or Cursor

```tsx
import { UIFork } from "uifork";

<UIFork port={3001} />; // port defaults to 3001
```

**Features:**

- Draggable to any corner of the screen
- Keyboard shortcuts: `Cmd/Ctrl + Arrow Up/Down` to cycle through versions
- Settings panel for theme (light/dark/system), position, and code editor preference
- Automatically discovers all versioned components in your app

### `ForkedComponent`

The wrapper component that renders the active version. This is automatically generated when you run `npx uifork init`, but you can also use it manually:

```tsx
import { ForkedComponent } from "uifork";
import { VERSIONS } from "./Button.versions";

export default function Button(props) {
  return (
    <ForkedComponent
      id="Button"
      versions={VERSIONS}
      props={props}
      defaultVersion="v1" // optional
    />
  );
}
```

## File Structure

After running `npx uifork init src/components/Button.tsx`:

```
src/components/
├── Button.tsx              # Wrapper component (import this)
├── Button.versions.ts      # Version configuration
├── Button.v1.tsx           # Original component (version 1)
├── Button.v2.tsx           # Additional versions
└── Button.v1_1.tsx         # Sub-versions (v1.1, v2.1, etc.)
```

## Version Naming

Versions follow a simple naming convention:

- `v1`, `v2`, `v3` - Major versions
- `v1_1`, `v1_2` - Sub-versions (displayed as V1.1, V1.2 in the UI)
- `v2_1`, `v2_2` - Sub-versions of v2

## How It Works

1. **`ForkedComponent`** reads the active version from localStorage and renders the corresponding component
2. **`UIFork`** connects to the watch server and displays all available versions
3. When you select a version in the UI, it updates localStorage, which triggers `ForkedComponent` to re-render with the new version
4. The watch server monitors your file system for new version files and automatically updates the `versions.ts` file

## Potential Future Options

These are not currently supported but may be considered in the future:

### Auto-init (side-effect import)

```html
<script type="module">
  if (import.meta.env.DEV) {
    import("uifork/auto-init");
  }
</script>
```

### Script tag (global bundle)

```html
<script src="https://unpkg.com/uifork/dist/index.global.js"></script>
<script>
  window.uifork.init();
</script>
```

## Development Setup

This is a monorepo managed by Turborepo with the following packages:

- **`packages/uifork`** - React components library (the main package)
- **`apps/sandbox`** - Development sandbox for testing components

For local development:

```bash
# Clone and install
git clone <repo>
cd uifork
npm install

# Build all packages
npm run build

# Run sandbox with HMR from package source
cd apps/sandbox && npm run dev:local

# Run sandbox with built package
cd apps/sandbox && npm run dev
```

## License

MIT
