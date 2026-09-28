import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { ApiClient } from "./api_client.js";

const READ_ONLY = { readOnlyHint: true, openWorldHint: true };

const deviceIdOrAll = z
  .string()
  .trim()
  .min(1)
  .describe('A device_id from list_devices, or "all" for every device on the account in one request.');

// A failed API call goes back to the model as a tool error rather than a
// protocol error, so it can read the message and correct itself. For a bad
// command the API's message says exactly what the device accepts.
async function run(fn: () => Promise<unknown>): Promise<CallToolResult> {
  try {
    return { content: [{ type: "text", text: JSON.stringify(await fn()) }] };
  } catch (e) {
    return { isError: true, content: [{ type: "text", text: e instanceof Error ? e.message : String(e) }] };
  }
}

export function registerTools(server: McpServer, api: ApiClient): void {
  server.registerTool(
    "list_devices",
    {
      title: "List devices",
      description:
        "List every device on the account with its device_id, name, series, device_type (fan, water_purifier " +
        "or lock) and supported_commands: the exact command keys and values send_command accepts for that " +
        "device. Call this first, since the other tools need a device_id from here. Locks have an empty " +
        "supported_commands: they can be read but not commanded.",
      annotations: READ_ONLY,
    },
    () => run(async () => (await api.get("/get_list_of_devices")).message?.devices_list)
  );

  server.registerTool(
    "get_device_state",
    {
      title: "Get device state",
      description:
        'Current state of one device, or of every device when device_id is "all" (one request instead of one ' +
        "per device, so prefer it when checking more than one). Field names match send_command keys, so a " +
        "value read here can be sent back as-is.\n" +
        "Fans: power, last_recorded_speed (1-6), sleep_mode, led, timer_hours, timer_time_elapsed_mins, plus " +
        "brightness, colour and motion fields depending on series. routine_status is 0 idle, 1 mop, 2 sweep.\n" +
        "Water purifiers: mode, fallback_mode, tds_threshold, input_tds and tank_tds (ppm), and decoded " +
        "choking_faults and system_faults. Before reporting several valve faults, check system_faults for " +
        "NO_WATER, FLOW_SENSOR_FAILURE or PUMP_CHOKE: a dead inlet trips every valve bit.\n" +
        "Locks: battery, firmware and settings.\n" +
        "ts_epoch_seconds is when the device last reported. When is_online is false the state may be stale.",
      inputSchema: { device_id: deviceIdOrAll },
      annotations: READ_ONLY,
    },
    ({ device_id }) =>
      run(async () => (await api.get("/get_device_state", { device_id })).message?.device_state)
  );

  server.registerTool(
    "get_device_analytics",
    {
      title: "Get device analytics",
      description:
        'Lifetime usage counters for one device, or every device when device_id is "all".\n' +
        "Fans: power_consumption in kWh and runtime in hours.\n" +
        "Water purifiers: water_saved_liters and uv_runtime_hours.\n" +
        "Locks have no analytics and are skipped. A null field means the device has never reported that counter.",
      inputSchema: { device_id: deviceIdOrAll },
      annotations: READ_ONLY,
    },
    // The API returns analytics under device_state, not device_analytics.
    ({ device_id }) =>
      run(async () => (await api.get("/get_device_analytics", { device_id })).message?.device_state)
  );

  server.registerTool(
    "send_command",
    {
      title: "Send command",
      description:
        "Change settings on a fan or water purifier. command holds one or more keys from that device's " +
        "supported_commands (see list_devices). All keys are validated together, and a rejected command never " +
        "reaches the device.\n" +
        "Fans: power (bool), speed (1-6), speedDelta (relative to the current speed, so prefer speed when the " +
        "target is known), sleep (bool), led (bool), timer (0 off, 1 = 1h, 2 = 2h, 3 = 3h, 4 = 6h; not a count " +
        "of hours), and where supported brightness (10-100), light_mode (warm, cool, daylight) and motion " +
        "extras. sweep and mop start routines: send them alone, and only as true.\n" +
        "Water purifiers: sleep_mode must be sent together with start_utc and stop_utc (epoch seconds; only the " +
        "time of day is used, and the window repeats daily).\n" +
        "Locks accept no commands.\n" +
        'Example: {"device_id": "6867258b9d78", "command": {"power": true, "speed": 3}}',
      inputSchema: {
        device_id: z.string().trim().min(1).describe("A device_id from list_devices."),
        command: z
          .record(z.string(), z.union([z.boolean(), z.number(), z.string()]))
          .describe("Command keys and values from the device's supported_commands."),
      },
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: true },
    },
    ({ device_id, command }) => run(() => api.post("/send_command", { device_id, command }))
  );
}
