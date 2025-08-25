# Docs Build System

This is a standalone build system for the docs -- I've found including MDX files in React projects
directly can be a source of pain, so instead they're pre-compiled when things change and committed
to various repos.

## Features

- Compiles `.md` and `.mdx` files to TSX components
- Extracts and exports frontmatter metadata
- Supports MDX features (JSX in Markdown)
- Watch mode for development
- Generates TypeScript components with proper types
- Creates an index file for easy imports

## Installation

```bash
pnpm install
```

## Usage

### Build All Docs

```bash
pnpm build
```

This will:
1. Read all `.md` and `.mdx` files from `../docs/`
2. Compile them to TSX components in `./generated/`
3. Create an `index.ts` file with all exports

### Watch Mode

```bash
pnpm watch
```

Watches for changes and automatically rebuilds affected files.

### Clean Generated Files

```bash
pnpm clean
```

## Generated Output

Each Markdown/MDX file is compiled to a TSX component:

- `docs/about.md` → `generated/about.tsx`
- Exports a default React component
- Exports metadata from frontmatter
- Components accept custom component overrides
- `generated/manifest.json` contains build information and file metadata

### Example Usage

```tsx
import { About, AboutMetadata } from './docs-build/generated';

function App() {
  return (
    <div>
      <h1>{AboutMetadata.title}</h1>
      <About />
    </div>
  );
}
```

### Custom Components

You can override default HTML components:

```tsx
<About 
  components={{
    h1: CustomHeading,
    a: CustomLink,
    code: CustomCode
  }}
/>
```

## File Structure

```
docs-build/
├── src/
│   ├── compiler.ts    # MDX to TSX compilation logic
│   ├── build.ts       # Build script and file processing
│   └── types.ts       # TypeScript types
├── generated/         # Output directory (gitignored)
│   ├── *.tsx         # Generated components
│   ├── index.ts      # Export index
│   └── manifest.json # Build manifest with file metadata
└── package.json
```

## How It Works

1. **Parse**: Reads MD/MDX files and extracts frontmatter using `gray-matter`
2. **Compile**: Uses `@mdx-js/mdx` to compile content to JSX
3. **Generate**: Wraps compiled JSX in a typed React component
4. **Export**: Creates an index file with all components and metadata

The generated files are intended to be committed to the repository, allowing the main application to import them without needing MDX compilation in the main build.

## Build Manifest

The build process generates a `manifest.json` file that contains detailed information about each compiled file:

```json
{
  "buildTimestamp": 1756083032886,
  "files": [
    {
      "sourceFile": "../docs/about.mdx",
      "outputFile": "generated/about.tsx",
      "metadata": { "title": "About" },
      "sourceHash": "ee8ef481fcc664b74f77c4a4d4d4fadea7d92af2a14a86a9cffba121f5e98e10",
      "buildTimestamp": 1756083032887,
      "lastModified": 1756082701549,
      "size": 2607
    }
  ],
  "totalFiles": 3,
  "buildDuration": 24
}
```

The manifest includes:
- **buildTimestamp**: When the build started
- **files**: Array of file information including:
  - Source and output file paths
  - Frontmatter metadata
  - SHA256 hash of source content (for detecting changes)
  - Individual build timestamp
  - Last modified time of source file
  - File size in bytes
- **totalFiles**: Count of processed files
- **buildDuration**: Total build time in milliseconds
