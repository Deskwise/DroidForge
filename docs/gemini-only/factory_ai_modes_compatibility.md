# Advisory Document: DroidForge Compatibility with Factory.ai Modes

This document explains how the DroidForge MCP server will be accessible to users across the different Factory.ai platforms: the CLI, the Web Interface, and the VS Code extension.

## TL;DR

**Yes, the DroidForge server you are building will work with all three Factory.ai modes.**

No special changes to our server's design are needed. You just need to provide slightly different one-time setup instructions for users of each mode.

*   **For CLI users:** You'll give them a command to type.
*   **For VS Code users:** You'll provide a configuration file in your repository.
*   **For Web users:** You'll give them a URL to paste.

---

## How It Works for Each Mode

Think of your DroidForge MCP server as a public website. Anyone can access it, but their browser (or in this case, their Factory.ai tool) needs to be told the address.

### 1. For the CLI (`droid`)

This is the most direct method for a public user. They will configure their personal `droid` CLI to know about your server.

*   **Method:** The user runs a one-time command in their terminal.
*   **Command:** `/mcp add droidforge <your-server-url>`
*   **Result:** After running this, their `droid` CLI will be permanently aware of your DroidForge server and can use its tools on any project.

### 2. For the VS Code Extension

This method is ideal for users who clone a specific repository that is pre-configured to work with your server.

*   **Method:** You, as the publisher, will include a special configuration file in your public GitHub repository.
*   **File:** `.vscode/mcp.json`
*   **Result:** When a user clones your repository and opens it in VS Code, the Factory.ai extension automatically reads this file and knows about your DroidForge server. They don't have to type any commands.

### 3. For the Web Interface

This is for users who work primarily in the Factory.ai web dashboard.

*   **Method:** The user will likely need to navigate to a settings or connections area in the web interface and paste in the URL of your server.
*   **URL:** You will provide them with the public URL of your DroidForge server (e.g., `https://api.droidforge.team`).
*   **Result:** The web interface will then be able to communicate with your server and use its tools.

## What This Means for Our Project

**No architectural changes are required.**

Our server is a standard HTTP-based MCP server. The Factory.ai ecosystem is designed to connect to servers like ours in multiple ways. Our responsibility is not to change the server's design, but to provide clear and simple instructions for our users.

## Your Role as Publisher

To ensure a great experience for your users, you should:

1.  **Host the Server:** Deploy the DroidForge MCP server to a public URL (e.g., using Vercel, Render, or another provider as discussed in the previous document).

2.  **Provide Clear Instructions:** In your project's `README.md`, create a section called "How to Use" with three clear sub-sections:

    *   **For CLI Users:**
        > "Run the following command once to add DroidForge to your `droid` CLI:
        > ```bash
        > /mcp add droidforge https://api.droidforge.team
        > ```"

    *   **For VS Code Users:**
        > "If you have cloned this repository, our server is already configured for you in `.vscode/mcp.json`. The Factory.ai extension will pick it up automatically."

    *   **For Web Interface Users:**
        > "In the Factory.ai web dashboard, navigate to the MCP connections page and add a new server with the following URL: `https://api.droidforge.team`"

By providing these simple, distinct instructions, you will empower everyone to use your DroidForge server, no matter which Factory.ai environment they prefer.