# Advisory Document: The Correct Way to Connect to DroidForge

This document provides the corrected, definitive instructions for how users can connect to your DroidForge MCP server. This process is unified across all of Factory.ai's platforms (CLI, Web, and VS Code).

**Please disregard the previous document, `factory_ai_modes_compatibility.md`. The information in it was incorrect.**

## TL;DR

To use your DroidForge server, a user needs to add its URL to a single configuration file on their computer. This is managed by a local service called **Factory Bridge**.

Once they add the server URL **one time**, its tools will automatically become available everywhere: in their CLI, in their VS Code extension, and in the Factory.ai web dashboard.

---

## The Core Concept: Factory Bridge

The key to understanding how Factory.ai works is a local service called **Factory Bridge**. This is a small application that runs on a user's machine, usually accessible from the system tray (Windows) or menu bar (macOS).

*   **What it does:** Factory Bridge acts as the central hub for all MCP server connections. It reads a configuration file and makes the tools from all configured servers available to all of Factory.ai's interfaces.
*   **Why it matters:** This means there is only **one place** a user needs to configure your DroidForge server to use it across the entire Factory.ai ecosystem.

## The Unified Setup Process for Your Users

Here is the single, correct set of instructions you should provide to anyone who wants to use your DroidForge server.

### Step 1: Install Factory Bridge

First, ensure you have the Factory.ai `droid` CLI and Factory Bridge installed on your machine.

### Step 2: Open the MCP Configuration File

The easiest way to configure a new server is through the Factory Bridge menu:

1.  Click the **Factory Bridge icon** in your system tray or menu bar.
2.  Select **"Open MCP Config File"** from the menu.
3.  This will open a file named `mcp.json` in your text editor.

### Step 3: Add the DroidForge Server URL

In the `mcp.json` file, add an entry for the DroidForge server inside the `mcpServers` object. It should look like this:

```json
{
  "mcpServers": {
    "droidforge": {
      "url": "https://api.droidforge.team",
      "disabled": false
    }
    // ... any other servers you have configured
  }
}
```

Your users will need to replace `"https://api.droidforge.team"` with the actual URL where your server is hosted. You can also include an `"headers"` object for authentication if needed.

### Step 4: Save and You're Done

Save the `mcp.json` file. Factory Bridge will automatically detect the change and connect to the DroidForge server. The tools from your server will now be available across the entire Factory.ai ecosystem.

## What This Means for Our Project

*   **No Design Changes Needed:** Our server is a standard HTTP MCP server and is already 100% compatible with this unified setup.
*   **Simple Instructions:** You only need to provide one set of instructions to your users, not three.

As your consultant, I will ensure that all future advice is based on this correct, unified model. Thank you for holding me to a higher standard of accuracy.