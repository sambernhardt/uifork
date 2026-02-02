---
name: uifork
description: Install and work with uifork, a CLI tool and React component library for managing UI component versions. Use when the user wants to version components, test UI variations, gather stakeholder feedback, or work with uifork commands like init, watch, new, fork, promote.
---

# UIFork

UIFork is a CLI tool and React component library for managing UI component versions. Create multiple versions of components, let stakeholders switch between them to test and gather feedback, and promote the best one when ready.

## When to Use

- User wants to version React components for A/B testing or stakeholder feedback
- User mentions uifork, component versioning, or UI variations
- User needs help with uifork CLI commands (init, watch, new, fork, promote, etc.)
- User wants to set up uifork in a React app (Vite, Next.js, etc.)

## Installation

```bash
npm install uifork
```

Or use yarn, pnpm, or bun.

## Quick Setup

### 1. Add UIFork Component

Add the `UIFork` component to your React app root. Typically shown in development and preview/staging (not production):

**Vite:**

```tsx
import { UIFork } from "uifork";

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

**Next.js (App Router):**

```tsx
// components/UIForkProvider.tsx
"use client";
import { UIFork } from "uifork";

export function UIForkProvider() {
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

**Next.js (Pages Router):**

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

No separate CSS import needed - styles are automatically included.

### 2. Initialize Component Versioning

```bash
npx uifork init src/components/Button.tsx
```

This will:

- Convert the component into a forked component that can be versioned
- Generate a `versions.ts` file to track all versions
- Optionally start the watch server (use `-w` flag)

### 3. Use Component Normally

```tsx
import Button from "./components/Button";

// Works exactly as before - active version controlled by UIFork widget
<Button onClick={handleClick}>Click me</Button>;
```

## CLI Commands

All commands use `npx uifork`:

### `init <component-path>`

Initialize versioning for an existing component.

```bash
npx uifork init src/components/Dropdown.tsx
npx uifork init src/components/Dropdown.tsx -w  # Start watching after init
```

### `watch [directory]`

Start the watch server (enables UI widget communication).

```bash
npx uifork watch              # Watch current directory
npx uifork watch ./src        # Watch specific directory
```

### `new <component-path> [version-id]`

Create a new empty version file.

```bash
npx uifork new Button         # Auto-increment version number
npx uifork new Button v3      # Specify version explicitly
```

### `fork <component-path> <version-id> [target-version]`

Fork an existing version to create a new one.

```bash
npx uifork fork Button v1           # Fork v1 to auto-incremented version
npx uifork fork Button v1 v2        # Fork v1 to specific version
npx uifork duplicate Button v1 v2   # Alias for fork
```

### `rename <component-path> <version-id> <new-version-id>`

Rename a version.

```bash
npx uifork rename Button v1 v2
```

### `delete <component-path> <version-id>`

Delete a version (must have at least one version remaining).

```bash
npx uifork delete Button v2
```

### `promote <component-path> <version-id>`

Promote a version to be the main component and remove all versioning scaffolding.

```bash
npx uifork promote Button v2
```

This will:

- Replace `Button.tsx` with content from `Button.v2.tsx`
- Delete all version files (`Button.v*.tsx`)
- Delete `Button.versions.ts`
- Effectively "undo" the versioning system

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

- `v1`, `v2`, `v3` - Major versions
- `v1_1`, `v1_2` - Sub-versions (displayed as V1.1, V1.2 in UI)
- `v2_1`, `v2_2` - Sub-versions of v2

## UIFork Widget Features

The `UIFork` component provides a floating UI widget that allows:

- **Switch versions** - Click to switch between versions
- **Create new versions** - Click "+" to create blank version
- **Fork versions** - Fork existing version to iterate
- **Rename versions** - Give versions meaningful names
- **Delete versions** - Remove versions no longer needed
- **Promote versions** - Promote version to become main component
- **Open in editor** - Click to open version file in VS Code/Cursor

**Keyboard shortcuts:** `Cmd/Ctrl + Arrow Up/Down` to cycle through versions

**Settings:** Theme (light/dark/system), position, code editor preference

## Custom Environment Gating

For more control over when UIFork appears:

```tsx
// Enable via NEXT_PUBLIC_ENABLE_UIFORK=true or VITE_ENABLE_UIFORK=true
const showUIFork =
  process.env.NODE_ENV !== "production" ||
  process.env.NEXT_PUBLIC_ENABLE_UIFORK === "true";
```

Useful for:

- Showing on specific preview branches
- Enabling for internal stakeholders on staging
- Gating behind feature flags

## Common Workflows

### Starting Versioning on a Component

1. Install uifork: `npm install uifork`
2. Add `<UIFork />` component to app root
3. Initialize: `npx uifork init src/components/MyComponent.tsx`
4. Start watch server: `npx uifork watch`
5. Use the widget to create and switch between versions

### Creating a New Version

```bash
# Create empty version
npx uifork new Button

# Or fork existing version
npx uifork fork Button v1
```

### Promoting a Version to Production

```bash
npx uifork promote Button v2
```

This removes all versioning and makes v2 the main component.

## How It Works

1. `ForkedComponent` reads active version from localStorage and renders corresponding component
2. `UIFork` connects to watch server and displays all available versions
3. Selecting a version updates localStorage, triggering `ForkedComponent` to re-render
4. Watch server monitors file system for new version files and updates `versions.ts` automatically
