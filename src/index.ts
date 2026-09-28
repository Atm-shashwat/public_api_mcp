#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createApiClient } from "./api_client.js";
import { loadConfig, type Config } from "./config.js";
import { registerTools } from "./tools.js";

// Under stdio, stdout is the MCP channel: anything else written there corrupts
// the session. Diagnostics go to stderr only, which clients keep as a log.

const INSTRUCTIONS =
  "Reads and controls the Atomberg smart devices (fans, water purifiers, locks) on the user's account. " +
  "Start with list_devices to get device IDs and what each device accepts. " +
  "Every tool call spends one request from the account's daily API quota, so read several devices at once " +
  'with device_id "all" and do not poll.';

let config: Config;
try {
  config = loadConfig();
} catch (e) {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
}

const server = new McpServer({ name: "atomberg-iot", version: "0.1.0" }, { instructions: INSTRUCTIONS });
registerTools(server, createApiClient(config));

await server.connect(new StdioServerTransport());
console.error(`atomberg-iot MCP server running against ${config.baseUrl}`);
