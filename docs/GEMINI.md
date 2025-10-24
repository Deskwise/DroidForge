# Gemini Context: DroidForge MCP Server

This document provides an overview of the DroidForge MCP Server project, its structure, and development conventions.

## Project Overview

DroidForge is a Model Context Protocol (MCP) server designed to work within the Droid CLI environment. Its primary purpose is to assemble and manage a team of specialized AI agents (known as "droids") to automate tasks within a given code repository.

The server handles the entire lifecycle of these droids, from initial project analysis and droid creation ("forging") to providing a conversational interface for users to interact with the droid team. It achieves this by exposing a set of tools and prompts that the Droid CLI can invoke.

**Key Technologies:**

*   **TypeScript:** The project is written entirely in TypeScript.
*   **Node.js:** The server runs on a Node.js environment.
*   **Express:** Used for the underlying HTTP server.
*   **MCP (Model Context Protocol):** The server adheres to this protocol to communicate with the Droid CLI.

## Building and Running

The following scripts are available in `package.json` for managing the project:

*   **Installation:**
    ```bash
    npm install
    ```

*   **Development:** To run the server in development mode with live reloading:
    ```bash
    npm run dev
    ```

*   **Building:** To compile the TypeScript code into JavaScript for production:
    ```bash
    npm run build
    ```
    This will output the compiled files to the `dist` directory.

*   **Testing:** To run the test suite:
    ```bash
    npm run test
    ```

*   **Linting and Formatting:**
    ```bash
    npm run lint       # Check for linting errors
    npm run lint:fix   # Automatically fix linting errors
    npm run format     # Format the code with Prettier
    ```

## Development Conventions

*   **Coding Style:** The project uses ESLint and Prettier to enforce a consistent coding style. Key aspects include:
    *   2-space indentation.
    *   Unix-style linebreaks.
    *   Single quotes for strings.
    *   Semicolons at the end of statements.
*   **Contribution:** The `CONTRIBUTING.md` file (if it existed) would be the primary source for contribution guidelines. The `README.md` mentions that if you contribute changes, you should update the spec first, keep the README in sync, and add checklist entries in `docs/droidforge_full_cli_spec.md` where relevant.
*   **Branching and Commits:** No explicit conventions are documented, but standard Git practices should be followed.

## Project Structure

The project is organized into the following key directories:

*   `src/`: Contains the source code for the MCP server.
    *   `src/mcp/`: The core of the MCP server implementation.
        *   `src/mcp/server.ts`: The main entry point for the server.
        *   `src/mcp/tools/`: Contains the definitions for the tools that the server exposes (e.g., `smart_scan`, `forge_roster`).
        *   `src/mcp/prompts/`: Defines the multi-step conversational flows (e.g., `onboarding`, `cleanup`).
        *   `src/mcp/execution/`: Manages the execution of droid tasks.
    *   `src/detectors/`: Utilities for scanning the repository and extracting information.
*   `docs/`: Contains detailed specification documents.
    *   `docs/droidforge_full_cli_spec.md`: The complete specification for the DroidForge MCP server and its slash commands. This is a critical document for understanding the project's design.
*   `dist/`: Contains the compiled JavaScript code after running `npm run build`.
*   `.github/`: Contains GitHub-specific files, including workflow definitions for CI/CD.

## Core Concepts

*   **Droids:** These are specialized AI agents designed to perform specific tasks within the repository (e.g., `df-builder`, `df-tester`). Their definitions are stored in `.droidforge/droids/*.json`.
*   **MCP (Model Context Protocol):** This is the communication protocol between the Droid CLI and the DroidForge server. The server exposes "tools" (single actions) and "prompts" (multi-step flows) that the client can invoke.
*   **Forging:** This is the process of creating and configuring a team of droids for a repository. It's initiated by the `/forge-start` command.
*   **Slash Commands:** The server dynamically installs a set of slash commands (e.g., `/forge-start`, `/df`) into the `.factory/commands/` directory, making the DroidForge functionality easily accessible from the Droid CLI.
*   **Orchestrator:** The `df-orchestrator` is the primary point of contact for the user. It receives requests and delegates tasks to the other droids in the team.
