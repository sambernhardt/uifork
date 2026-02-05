# UIFork Marketing

Local development environment for testing UIFork components (marketing app).

## Setup

Install dependencies:

```bash
npm install
```

Or from the root directory:

```bash
cd apps/marketing && npm install
```

## Development Modes

### Mode 1: Local Development with HMR (`dev:local`)

For actively developing the uifork package with hot module replacement. Changes to the package source will be reflected immediately.

```bash
npm run dev:local
```

This uses a Vite alias to point directly to `packages/uifork/src`, enabling full HMR when editing the package.

### Mode 2: Built Package Testing (`dev`)

For testing against the built workspace package (simulates how consumers will use it):

```bash
# Build the uifork package first
cd ../../packages/uifork && npm run build

# Then run marketing
cd ../../apps/marketing && npm run dev
```

### Mode 3: Published Version Testing

For testing against an actual npm-published version:

1. Change `package.json`: `"uifork": "^x.x.x"` (replace `*` with version)
2. Run `npm install`
3. Run `npm run build && npm run preview`

## How UIFork is Used

The marketing app uses the component-first approach:

```tsx
import { UIFork } from "uifork";

function App() {
  return (
    <>
      <YourApp />
      {import.meta.env.MODE !== "production" && <UIFork />}
    </>
  );
}
```

This shows UIFork in both local development and preview/staging builds, but hides it in production. No separate CSS import is needed - styles are automatically injected.

## Summary

| Command                            | What it does                                              |
| ---------------------------------- | --------------------------------------------------------- |
| `npm run dev:local`                | HMR from source - edit package, see changes instantly     |
| `npm run dev`                      | Uses built workspace version - test actual package output |
| `npm run build && npm run preview` | Production build and preview                              |
