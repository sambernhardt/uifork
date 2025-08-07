# uifork

A CLI tool for managing UI component versions and switching between them.

## Installation

### Global Installation

```bash
npm install -g uifork
```

### Local Development Setup

1. Clone this repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Make the CLI script executable:
   ```bash
   chmod +x cli.js
   ```
4. Link the package globally for development:
   ```bash
   npm link
   ```

## Usage

### Initialize a UI Switcher

Convert a single component file into a versioned UI switcher:

```bash
uifork init frontend/src/SomeDropdownComponent.tsx
```

This will:

- Create a new directory with the component name
- Move the original file to `v1.tsx`
- Generate a `versions.ts` file
- Create a `UISwitcher.tsx` component
- Create an `index.tsx` entry point
- Add a README with instructions

### Watch for Changes

Watch a component directory for version file changes:

```bash
uifork watch SomeDropdownComponent
```

The watch command will:

- Automatically find directories containing `versions.ts` files
- Watch for new version files (v\*.tsx)
- Auto-update imports in `versions.ts`
- Handle file renames bidirectionally

## Component Structure

After running `uifork init`, your component directory will contain:

```
ComponentName/
├── index.tsx          # Main export using UISwitcher
├── UISwitcher.tsx     # Version switcher component
├── versions.ts        # Version configuration
├── v1.tsx            # Your original component (version 1)
├── v2.tsx            # Additional versions as needed
└── README.md         # Component-specific documentation
```

## Adding New Versions

1. Create new version files: `v2.tsx`, `v1_1.tsx`, etc.
2. Run `uifork watch ComponentName` to automatically update `versions.ts`
3. Or manually add imports and version entries to `versions.ts`

## UI Switcher Controls

- **Cmd + Arrow Up/Down**: Cycle through versions
- **Bottom-right selector**: Click to choose specific version
- Selections are saved to localStorage per component ID

## Commands

- `uifork init <component-path>` - Initialize a UI switcher from a component file
- `uifork watch <component-name>` - Watch for version changes in a component
- `uifork --help` - Show help information
- `uifork --version` - Show version number

## Examples

```bash
# Initialize a new UI switcher
uifork init src/components/Button.tsx

# Watch for changes (by component name)
uifork watch Button

# Watch for changes (by path)
uifork watch src/components/Button
```
