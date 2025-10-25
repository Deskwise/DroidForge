# Advisory Document: Team Access to MCP Servers in Factory.ai

This document explains how team members can share access to a common MCP server within the Factory.ai ecosystem.

## Executive Summary

Yes, if an MCP server is configured correctly, any team member working on the project can use it without needing to manually configure it themselves. The access is not granted automatically by `factory.ai`'s backend, but is facilitated by sharing a configuration file within your project's version-controlled repository (e.g., Git).

**The short answer:** You define the remote MCP server in a shared configuration file (`.vscode/mcp.json`), and every team member who pulls the project repository gets the configuration automatically.

## How It Works: The `.vscode/mcp.json` File

The primary mechanism for sharing MCP server configurations across a team is the `.vscode/mcp.json` file. When you place this file in your project's `.vscode` directory, the `droid` CLI (and the Factory.ai extension in VS Code) will automatically detect and load the MCP servers defined within it.

### Example Configuration

Here is an example of what you would put in your project's `.vscode/mcp.json` file to configure a remote DroidForge server hosted at `https://api.droidforge.team`:

```json
{
  "servers": {
    "droidforge-prod": {
      "type": "http",
      "url": "https://api.droidforge.team/mcp",
      "headers": {
        "Authorization": "Bearer ${input:droidforge-api-key}"
      }
    }
  },
  "inputs": [
    {
      "type": "promptString",
      "id": "droidforge-api-key",
      "description": "Enter your DroidForge API Key"
    }
  ]
}
```

**In this example:**

*   `"type": "http"`: Specifies that this is a remote server accessed via HTTP.
*   `"url"`: The public endpoint of your deployed DroidForge MCP server.
*   `"headers"`: (Optional) If your server requires authentication, you can include headers. The `${input:droidforge-api-key}` syntax is a secure way to prompt each user for their individual API key without hardcoding it in the file.

## Recommended Workflow for Your Team

Here is the step-by-step process to set this up for the DroidForge project:

1.  **Create the Configuration File:** As the project lead, you will create a file named `mcp.json` inside the `.vscode` directory at the root of the DroidForge repository.

2.  **Add the Server Definition:** Add the JSON configuration for your hosted DroidForge MCP server to this file, similar to the example above.

3.  **Commit to Version Control:** Commit the `.vscode/mcp.json` file to your Git repository.

    ```bash
    git add .vscode/mcp.json
    git commit -m "feat: Add shared MCP server configuration for DroidForge"
    git push
    ```

4.  **Team Members Pull Changes:** When your team members pull the latest changes from the repository, they will receive the `.vscode/mcp.json` file.

5.  **Automatic Detection:** The `droid` CLI on their local machines will automatically detect the `droidforge-prod` server defined in the file. The first time they use a tool from this server, they will be prompted to enter their API key (as defined in the `inputs` section).

## Conclusion

By using a shared `.vscode/mcp.json` file, you ensure that your entire team has a consistent configuration for the DroidForge MCP server. This approach avoids the need for each developer to manually run `/mcp add` with the server URL, streamlining the onboarding process and ensuring everyone is connected to the correct production environment.