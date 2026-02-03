# uifork

Manage UI component versions in React. Create multiple versions, switch between them to test and get feedback, and promote the winner when you're ready. Use it in local dev or on preview/staging—not production.

---

## Getting started

Install the package:

```tsx
npm install uifork
```

Continue installation:

- [Using agents & skills](#using-agents--skills)
- [Manually](#manual)

### Using agents & skills

**1. Add skill**

```bash
npx skills add sambernhardt/uifork
```

**2. Add UIFork to your project**

```bash
# Prompt
Add uifork to this application

# Or if the skill isn’t picked up:
/uifork add to this application
```

**3. Fork a version of a component**

```bash
# Prompt
Fork a version of {some component} and make the following changes
```

### Manual install

Note: even if you install manually, it's still recommended to [add the agent skill](#using-agents--skills) for the best experience when using AI.

**1. Add the UIFork component to your app**

Add the component anywhere in your React app, ideally at the root level. For framework-specific examples, see the [framework examples](#framework-examples) below.

```tsx
import { UIFork } from "uifork";

const showUIFork = process.env.NODE_ENV !== "production";

function App() {
  return (
    <>
      <YourApp />
      {showUIFork && <UIFork />}
    </->
  );
}
```

**2. Initialize a component for versioning**

```bash
npx uifork init {path/to/component}
```

This will:

- Convert your component into a forked component that can be versioned
- Generate a `versions.ts` file to track all versions

**3. Use your component as usual**

```tsx
import Button from "./components/Button";

// Works exactly as before - the active version is controlled by the UIFork widget
<Button onClick={handleClick}>Click me</Button>;
```

### Using the versioning UI

The versioning UI floats in the corner of your screen and lets you switch between versions of a forked component. Running the watch server lets you fork, rename, delete, and create new versions from the UI.

### Running the watch server

The watch server does two things:

1. Watches the filesystem for new version files and displays them as options in the UIFork component.
2. Allows the UIFork component to fork, rename, delete, and create new versions.

## Framework examples

### Vite

```tsx
const showUIFork = import.meta.env.MODE !== "production";
```

### Next.js (App Router)

```tsx
// components/UIForkProvider.tsx
"use client";
import { UIFork } from "uifork";

export function UIForkProvider() {
  if (process.env.NODE_ENV === "production") return null;
  return <UIFork />;
}

// app/layout.tsx — add <UIForkProvider /> inside <body>
```

### Next.js (Pages Router)

```tsx
// pages/_app.tsx
{
  process.env.NODE_ENV !== "production" && <UIFork />;
}
```

### Custom gating (preview branches, feature flags)

```tsx
const showUIFork =
  process.env.NODE_ENV !== "production" || process.env.NEXT_PUBLIC_ENABLE_UIFORK === "true";
```

---

## Widget & component

**UIFork** — The floating widget. Switch versions, create/fork/rename/delete/promote, open in editor. Draggable; supports `Cmd/Ctrl + Arrow Up/Down` to cycle versions. Optional: `<UIFork port={3001} />` (default port 3001).

**ForkedComponent** — The wrapper that renders the active version. `npx uifork init` generates this for you; you normally just import the component as before (e.g. `import Button from "./Button"`).

---

## File structure (after init)

```
src/components/
├── Button.tsx           # Wrapper (import this)
├── Button.versions.ts   # Version config
├── Button.v1.tsx        # Original
├── Button.v2.tsx        # More versions
└── Button.v1_1.tsx      # Sub-versions (v1.1, etc.)
```

**Version IDs:** `v1`, `v2`, `v3` = major; `v1_1`, `v1_2` = sub (shown as V1.1, V1.2 in the UI).

---

## How it works

1. **ForkedComponent** reads the active version from localStorage and renders that file.
2. **UIFork** talks to the watch server and lists versions.
3. Picking a version in the widget updates localStorage → component re-renders.
4. The watch server watches the filesystem and keeps `versions.ts` in sync.

---

## CLI reference

Use `npx uifork <command>`. All of these can also be done from the UIFork widget.

### `init <component-path>`

Initialize versioning for a component.

```bash
npx uifork init src/components/Dropdown.tsx
```

- **`-w`** — Start watch after init (default: off).

### `watch [directory]`

Start the watch server so the widget can talk to your codebase.

```bash
npx uifork watch          # current directory
npx uifork watch ./src    # specific directory
```

### `new <component-path> [version-id]`

Create a new empty version file.

```bash
npx uifork new Button       # auto-increment
npx uifork new Button v3    # explicit id
```

### `fork <component-path> <version-id> [target-version]`

Fork an existing version. Alias: `duplicate`.

```bash
npx uifork fork Button v1       # auto-increment target
npx uifork fork Button v1 v2    # target v2
```

### `rename <component-path> <version-id> <new-version-id>`

Rename a version.

```bash
npx uifork rename Button v1 v2
```

### `delete <component-path> <version-id>`

Delete a version (at least one must remain).

```bash
npx uifork delete Button v2
```

### `promote <component-path> <version-id>`

Promote a version to the main component and remove versioning for that file.

```bash
npx uifork promote Button v2
```

- Replaces `Button.tsx` with the content of `Button.v2.tsx`
- Deletes all `Button.v*.tsx` and `Button.versions.ts`
- You’re left with a single `Button.tsx`

---

## Development setup (this repo)

Monorepo (Turborepo): `packages/uifork` (library), `apps/sandbox` (dev app).

```bash
git clone <repo>
cd uifork
npm install
npm run build
cd apps/sandbox && npm run dev:local
```

---

## License

MIT
