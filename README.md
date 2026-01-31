# uifork

A CLI tool and React component library for managing UI component versions. Create multiple versions of your components, switch between them in real-time during development, and promote the best one when you're ready.

## Installation

```bash
npm install uifork
```

## Quick Start

### 1. Add UIFork to your app

UIFork can be automatically initialized by importing it in your HTML or app entry point. Choose the method that works best for your setup:

#### Option A: Auto-initialization (Recommended)

**For Vite projects:**

Add to your `index.html` `<head>`:

```html
<!doctype html>
<html lang="en">
  <head>
    <script type="module">
      // Only load in development
      if (import.meta.env.DEV) {
        import("uifork/auto-init");
      }
    </script>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

**For Next.js (App Router):**

Add to your `app/layout.tsx`:

```tsx
import Script from "next/script";

export default function RootLayout({ children }) {
  return (
    <html>
      <head>
        {process.env.NODE_ENV === "development" && (
          <Script
            src="//unpkg.com/uifork/dist/index.global.js"
            crossOrigin="anonymous"
            strategy="beforeInteractive"
          />
          <link rel="stylesheet" href="//unpkg.com/uifork/dist/index.global.css" />
        )}
      </head>
      <body>{children}</body>
    </html>
  );
}
```

**For Next.js (Pages Router):**

Add to your `pages/_document.tsx`:

```tsx
import { Html, Head, Main, NextScript } from "next/document";
import Script from "next/script";

export default function Document() {
  return (
    <Html>
      <Head>
        {process.env.NODE_ENV === "development" && (
          <>
            <Script
              src="//unpkg.com/uifork/dist/index.global.js"
              crossOrigin="anonymous"
              strategy="beforeInteractive"
            />
            <link rel="stylesheet" href="//unpkg.com/uifork/dist/index.global.css" />
          </>
        )}
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
```

**For Webpack/Other bundlers:**

Import in your app entry point:

```tsx
// In your main.tsx or index.tsx
if (process.env.NODE_ENV === "development") {
  import("uifork/auto-init");
}
```

#### Option B: Manual initialization

If you prefer to manually add the component:

```tsx
import { UIFork } from "uifork";
import "uifork/style.css";

function App() {
  return (
    <>
      <YourApp />
      {process.env.NODE_ENV === "development" && <UIFork />}
    </>
  );
}
```

### 2. Initialize a component for versioning

```bash
uifork init src/components/Button.tsx
```

This will:

- Convert your component into a branched component that can be versioned
- Generate a `versions.ts` file to track all versions
- Start the watch server

### 3. Use your component as usual

```tsx
import Button from "./components/Button";

// Works exactly as before - the active version is controlled by the UIFork widget
<Button onClick={handleClick}>Click me</Button>;
```

## CLI Commands

### `uifork init <component-path>`

Initialize versioning for an existing component.

```bash
uifork init src/components/Dropdown.tsx
```

Options:

- `--W` - Don't start watching after init

### `uifork watch [directory]`

Start the watch server. This enables the UI widget to communicate with your codebase.

```bash
# Watch current directory (default)
uifork watch

# Watch a specific directory
uifork watch ./src
```

### `uifork new <component-path> [version-id]`

Create a new empty version file.

```bash
# Auto-increment version number
uifork new Button

# Specify version explicitly
uifork new Button v3
```

### `uifork fork <component-path> <version-id> [target-version]`

Fork an existing version to create a new one.

```bash
# Fork v1 to auto-incremented version
uifork fork Button v1

# Fork v1 to specific version
uifork fork Button v1 v2
```

Alias: `uifork duplicate`

### `uifork rename <component-path> <version-id> <new-version-id>`

Rename a version.

```bash
uifork rename Button v1 v2
```

### `uifork delete <component-path> <version-id>`

Delete a version (must have at least one version remaining).

```bash
uifork delete Button v2
```

### `uifork promote <component-path> <version-id>`

Promote a version to be the main component and remove all versioning scaffolding.

```bash
uifork promote Button v2
```

This will:

- Replace `Button.tsx` with the content from `Button.v2.tsx`
- Delete all version files (`Button.v*.tsx`)
- Delete `Button.versions.ts`
- Effectively "undo" the versioning system, leaving just the promoted version

## React Components

### `UIFork`

A floating UI widget that appears in your app during development. It connects to the watch server via WebSocket and allows you to:

- **Switch versions** - Click on any version to switch to it
- **Create new versions** - Click the "+" button to create a blank version
- **Fork versions** - Fork an existing version to iterate on it
- **Rename versions** - Give versions meaningful names
- **Delete versions** - Remove versions you no longer need
- **Promote versions** - When satisfied, promote a version to become the main component
- **Open in editor** - Click to open the version file in VS Code or Cursor

**Auto-initialization:**

UIFork automatically mounts itself when imported via `uifork/auto-init` or loaded via the global script. No manual component rendering needed!

**Manual usage:**

If you prefer manual control:

```tsx
import { UIFork } from "uifork";
import "uifork/style.css";

<UIFork port={3001} />; // port defaults to 3001
```

**Configuration:**

You can configure UIFork via HTML data attributes:

```html
<!-- Set custom port -->
<html data-uifork-port="3002">
  <!-- ... -->
</html>

<!-- Force enable in production (not recommended) -->
<html data-uifork-enable="true">
  <!-- ... -->
</html>
```

**Features:**

- Draggable to any corner of the screen
- Keyboard shortcuts: `Cmd/Ctrl + Arrow Up/Down` to cycle through versions
- Settings panel for theme (light/dark/system), position, and code editor preference
- Automatically discovers all versioned components in your app

### `BranchedComponent`

The wrapper component that renders the active version. This is automatically generated when you run `uifork init`, but you can also use it manually:

```tsx
import { BranchedComponent } from "uifork";
import { VERSIONS } from "./Button.versions";

export default function Button(props) {
  return (
    <BranchedComponent
      id="Button"
      versions={VERSIONS}
      props={props}
      defaultVersion="v1" // optional
    />
  );
}
```

## File Structure

After running `uifork init src/components/Button.tsx`:

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

1. **`BranchedComponent`** reads the active version from localStorage and renders the corresponding component
2. **`UIFork`** connects to the watch server and displays all available versions
3. When you select a version in the UI, it updates localStorage, which triggers `BranchedComponent` to re-render with the new version
4. The watch server monitors your file system for new version files and automatically updates the `versions.ts` file

## Development Setup

This is a monorepo managed by Turborepo with the following packages:

- **`packages/uifork`** - React components library (the main package)
- **`packages/cli`** - CLI tool (`@uifork/cli`)
- **`apps/sandbox`** - Development sandbox for testing components

For local development:

```bash
# Clone and install
git clone <repo>
cd uifork
npm install

# Build all packages
npm run build

# Run dev mode (watches for changes)
npm run dev

# Run sandbox app
npm run sandbox

# Link CLI globally for testing
cd packages/cli
npm link
```

# To-dos

- ~~Make local react app for testing~~
- Use component file trace for easier initialization
- ~~Use react lazy imports for versions.ts~~
- Named exports
- Add skills

## License

MIT

---
