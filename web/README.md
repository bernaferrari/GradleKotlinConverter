# Gradle Kotlin DSL Converter

A web-based tool that converts Gradle Groovy DSL build scripts to Kotlin DSL format for Android projects.

## Usage

### Web Interface

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to use the converter.

### CLI

You can also use the converter from the command line:

```bash
# Convert a file
pnpm cli build.gradle

# Save output to a new file
pnpm cli build.gradle > build.gradle.kts

# Pipe input
cat build.gradle | pnpm cli

# Read from stdin
pnpm cli < build.gradle
```

**Example:**
```bash
echo "apply plugin: 'kotlin-android'" | pnpm cli
# Output: apply(plugin = "kotlin-android")
```

## Features

- Real-time Groovy DSL to Kotlin DSL conversion
- Side-by-side editor view with syntax highlighting
- Copy/paste functionality
- Dark/light theme support
- CLI support for batch processing
- Comprehensive conversion rules:
  - Plugin declarations
  - Dependencies (including custom configurations like `modImplementation`)
  - Build types and product flavors
  - Signing configurations
  - Android DSL blocks
  - Task configurations
  - Version catalogs
  - Artifacts blocks
  - And more!

## Development

```bash
# Run tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Type checking
pnpm typecheck

# Linting
pnpm lint
```

## Technology Stack

- Next.js 15 with App Router
- React 19
- TypeScript
- Tailwind CSS
- Monaco Editor
- Vitest for testing
- Shadcn/ui components

## License

Licensed under the [MIT license](https://github.com/shadcn/ui/blob/main/LICENSE.md).
