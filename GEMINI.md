
# Gemini Project Context: DroidForge

This document provides Gemini with a comprehensive overview of the DroidForge project, including its purpose, architecture, key commands, and development conventions.

## 1. Project Overview

**DroidForge** is a Model Context Protocol (MCP) server designed to work with the Factory.ai Droid CLI. Its core purpose is to analyze a user's codebase and dynamically assemble a team of specialized AI agents, called "droids." These droids are experts in the specific technologies and patterns found in the repository.

The system coordinates these droids to perform complex development tasks in parallel, ensuring safety through intelligent resource locking, isolated staging environments, and atomic merging. This allows for significant acceleration of development tasks, from feature implementation to refactoring.

### Key Technologies

*   **Language:** TypeScript
*   **Platform:** Node.js (>=16.0.0)
*   **Framework:** Express.js (for HTTP server)
*   **Core Dependencies:**
    *   `@modelcontextprotocol/sdk`: For MCP server implementation.
    *   `async-mutex`: For handling concurrency.
    *   `globby`, `micromatch`: For file path matching and locking.
*   **Testing:** Built-in Node.js test runner (`node:test`), `tsx` for execution.
*   **Linting/Formatting:** ESLint and Prettier.

### Architecture

The project is structured as a monorepo with the following key directories:

*   `src/mcp/`: Contains the core logic for the MCP server.
    *   `server.ts`: The main application entry point.
    *   `stdio-server.ts` / `http-server.ts`: Entry points for the two server types.
    *   `tools/`: Implements the slash commands available to the user (e.g., `/forge-start`, `/df`).
    *   `prompts/`: Manages the conversational logic and orchestration of droids.
    *   `execution/`: The "secret sauce" for safe parallel execution. It includes modules for resource locking (`resourceLocks.ts`), task management (`manager.ts`), isolated work areas (`staging.ts`), and safe merging (`merger.ts`).
    *   `generation/`: Handles the dynamic creation of droid personalities based on repository analysis.
    *   `detectors/`: Contains the logic for scanning a repository and identifying its technical characteristics.
*   `dist/`: Contains the compiled JavaScript code that is published to npm.
*   `docs/`: Contains all project documentation.
*   `scripts/`: Includes helper scripts, notably for automated UAT testing.

## 2. Building and Running

### Development Setup

1.  **Install Dependencies:**
    ```bash
    npm install
    ```
2.  **Build the Project:**
    ```bash
    npm run build
    ```
    This compiles all TypeScript files from `src/` to JavaScript in `dist/`.

### Running the Server

*   **For Local Development (with hot-reloading):**
    ```bash
    npm run dev
    ```
    This runs the stdio server directly from the TypeScript source using `ts-node`.

*   **Running the Compiled Server:**
    *   **STDIO:** `npm run start:stdio` or `node dist/mcp/stdio-server.js`
    *   **HTTP:** `npm run start:http` or `node dist/mcp/http-server.js`

### Testing

The project uses the native Node.js test runner.

*   **Run all tests:**
    ```bash
    npm test
    ```
    This command uses `tsx` to execute all `*.test.ts` and `*.e2e.test.ts` files within the `src/mcp/` directory.

*   **Local E2E Testing:** The `scripts/automated-uat2.exp` script provides a powerful way to test the full onboarding and execution flow against a local repository without needing to publish to npm.
    ```bash
    # Run against the current repo, automatically building and linking
    UAT_SKIP_INSTALL=1 scripts/automated-uat2.exp
    ```

## 3. Development Conventions

### Coding Style

*   **Language:** All new code must be written in TypeScript.
*   **Formatting:** The project uses **Prettier** for consistent code formatting and **ESLint** for code quality. Always run `npm run format` and `npm run lint` before committing.
*   **Modules:** Use ES Module syntax (`import`/`export`).
*   **Naming:** Use descriptive names for variables and functions. Droids created by the system should have the `df-` prefix.

### Commit Messages

Follow the **Conventional Commits** specification. This is crucial for automated versioning and changelog generation.
*   `feat:` for new features.
*   `fix:` for bug fixes.
*   `docs:` for documentation changes.
*   `test:` for adding or improving tests.
*   `refactor:` for code changes that neither fix a bug nor add a feature.
*   `chore:` for build process or auxiliary tool changes.

### Branching Strategy

*   Feature branches should be named `feature/<your-feature-name>`.
*   Bugfix branches should be named `fix/<your-bug-fix>`.

### Testing Practices

*   New features must be accompanied by tests.
*   Bug fixes should include a regression test.
*   Tests are located in the `__tests__` subdirectories, colocated with the code they are testing.
*   E2E tests are critical and live in `src/mcp/__tests__/e2e/`.

### Documentation

*   The `docs/` directory follows the Diátaxis framework (tutorials, how-to guides, reference, explanation).
*   Public-facing functions and classes should have JSDoc comments.
*   The `README.md` and `QUICKSTART.md` are the primary entry points for users.
