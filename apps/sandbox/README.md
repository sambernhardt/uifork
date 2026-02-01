# UIFork Sandbox

Local development environment for testing UIFork components directly from source.

## Setup

1. Install dependencies:

```bash
npm install
```

Or from the root directory:

```bash
cd sandbox && npm install
```

## Development

Run the dev server:

```bash
npm run dev
```

Or from the root directory:

```bash
npm run sandbox
```

The sandbox is configured to import the UIFork package directly from the `../../packages/uifork/src` directory, so any changes you make to the source code will be reflected immediately in the sandbox.

## How it works

The `vite.config.ts` uses an alias to map `uifork` imports to the parent `src` directory:

```ts
resolve: {
  alias: {
    uifork: resolve(__dirname, "../../packages/uifork/src"),
  },
}
```

This allows you to import components like:

```ts
import { UIFork, ForkedComponent } from "uifork";
```

And they'll be loaded directly from the source files, enabling hot module replacement during development.

## Development

To use the development version of the UIFork package, install uifork with a local link:

```json
"uifork": "file:../../uifork/packages/uifork"
```

Uncomment the alias in the `vite.config.ts` file to use the development version of the UIFork package.

```ts
alias: {
  // uifork: resolve(__dirname, "../../packages/uifork/src"),
}
```
